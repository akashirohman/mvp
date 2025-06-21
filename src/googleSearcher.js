// src/googleSearcher.js
const puppeteer = require('puppeteer');
const config = require('./config');
const chalk = require('chalk').default; // <-- PASTIKAN .default

let browser; // Instansi browser Puppeteer

/**
 * Menginisialisasi browser Puppeteer.
 */
async function initializeBrowser() {
    if (!browser) {
        console.log(chalk.cyan('  [Google Searcher] Memulai browser Puppeteer...'));
        browser = await puppeteer.launch(config.PUPPETEER_LAUNCH_OPTIONS);
        console.log(chalk.green('  [Google Searcher] Browser Puppeteer siap.'));
    }
}

/**
 * Menutup browser Puppeteer.
 */
async function closeBrowser() {
    if (browser) {
        console.log(chalk.cyan('  [Google Searcher] Menutup browser Puppeteer...'));
        await browser.close();
        browser = null;
        console.log(chalk.green('  [Google Searcher] Browser Puppeteer ditutup.'));
    }
}

/**
 * Melakukan pencarian Google dan mencari URL target.
 * @param {string} keyword - Kata kunci pencarian.
 * @param {string} targetUrl - URL yang dicari.
 * @param {{ip: string, port: number, auth?: object, noProxy?: boolean}} proxy - Proxy untuk digunakan.
 * @param {string} userAgent - User-Agent untuk digunakan.
 * @returns {Promise<boolean>} True jika URL target ditemukan dan dikunjungi, false jika tidak.
 */
async function searchGoogleAndVisit(keyword, targetUrl, proxy, userAgent) {
    let page;
    
    // Perhatian: Mengatur proxy di Puppeteer untuk setiap halaman/permintaan secara dinamis itu rumit
    // tanpa plugin seperti `puppeteer-extra-plugin-proxy`.
    // Puppeteer akan menggunakan proxy yang disetel di `PUPPETEER_LAUNCH_OPTIONS` (global) saat peluncuran.
    // Jika IPRoyal diaktifkan, argumen `--proxy-server` di config.js akan menanganinya.
    // Jika proxy gratis/noProxy, Puppeteer akan pakai IP asli VPS.

    try {
        if (!browser) {
            await initializeBrowser(); // Pastikan browser sudah aktif
        }
        
        page = await browser.newPage();
        await page.setUserAgent(userAgent);
        await page.setViewport({ width: 1366, height: 768 });

        // Opsional: Autentikasi proxy jika menggunakan IPRoyal dan diperlukan per-page
        if (proxy.auth && proxy.auth.username && proxy.auth.password && config.IPROYAL_PROXY.ENABLED) {
            await page.authenticate({ username: proxy.auth.username, password: proxy.auth.password });
        } else {
            // Penting untuk proxy gratis/noProxy: Pastikan tidak ada otentikasi yang tersisa
            await page.authenticate(null); 
        }

        const searchUrl = `${config.Google Search_URL}${encodeURIComponent(keyword)}`;
        console.log(chalk.gray(`      [Thread] Mengunjungi Google untuk mencari '${keyword}'...`));
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: config.REQUEST_TIMEOUT });
        await page.waitForSelector('body', { timeout: 5000 }).catch(() => {}); // Tunggu body dimuat

        let currentPageNum = 1;
        let found = false;

        while (currentPageNum <= config.MAX_Google Search_PAGES && !found) {
            // Perbarui URL pencarian untuk halaman berikutnya jika ada
            const currentSearchPageUrl = `${config.Google Search_URL}${encodeURIComponent(keyword)}&start=${(currentPageNum - 1) * 10}`;
            if (currentPageNum > 1) { // Hanya navigate jika bukan halaman pertama atau sudah di halaman berikutnya
                console.log(chalk.gray(`      [Thread] Mencari di Google Page ${currentPageNum} untuk '${keyword}'...`));
                await page.goto(currentSearchPageUrl, { waitUntil: 'domcontentloaded', timeout: config.REQUEST_TIMEOUT });
                await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
            }

            const links = await page.$$eval('a', as => as.map(a => a.href));
            for (const link of links) {
                // Cek apakah link mengandung targetUrl atau domain targetUrl
                if (link && (link.includes(targetUrl) || new URL(link).hostname === new URL(targetUrl).hostname)) {
                    console.log(chalk.green(`      [Thread] Ditemukan URL target di Page ${currentPageNum}: ${link}`));
                    // Kunjungi link yang ditemukan via Puppeteer
                    await page.goto(link, { waitUntil: 'networkidle0', timeout: config.REQUEST_TIMEOUT });
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Coba temukan tombol "Next Page" atau link ke halaman berikutnya
                // Selector ini mungkin perlu disesuaikan jika Google mengubah UI mereka
                const nextPageButton = await page.$('a#pnnext, a[aria-label="Next page"]');
                if (nextPageButton) {
                    await Promise.all([
                        nextPageButton.click(),
                        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: config.REQUEST_TIMEOUT })
                    ]);
                    currentPageNum++;
                } else {
                    break; // Tidak ada tombol next page, hentikan pencarian
                }
            }
        }

        if (!found) {
            console.log(chalk.yellow(`      [Thread] URL target tidak ditemukan di ${config.MAX_Google Search_PAGES} halaman pertama Google.`));
        }
        return found;

    } catch (error) {
        console.error(chalk.red(`      [Thread] Gagal melakukan pencarian Google: ${error.message}`));
        return false;
    } finally {
        if (page) {
            await page.close(); // Tutup halaman setelah selesai
        }
    }
}

module.exports = {
    initializeBrowser,
    closeBrowser,
    searchGoogleAndVisit
};
