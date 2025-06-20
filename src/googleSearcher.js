// src/googleSearcher.js
const puppeteer = require('puppeteer');
const config = require('./config');
const chalk = require('chalk').default;

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
 * @param {{ip: string, port: number}} proxy - Proxy untuk digunakan.
 * @param {string} userAgent - User-Agent untuk digunakan.
 * @returns {Promise<boolean>} True jika URL target ditemukan dan dikunjungi, false jika tidak.
 */
async function searchGoogleAndVisit(keyword, targetUrl, proxy, userAgent) {
    let page;
    let found = false;
    const proxyServer = `http://${proxy.ip}:${proxy.port}`;

    try {
        if (!browser) {
            await initializeBrowser(); // Pastikan browser sudah aktif
        }
        
        page = await browser.newPage();
        await page.setUserAgent(userAgent);
        await page.setViewport({ width: 1366, height: 768 }); // Resolusi umum

        // Set proxy untuk halaman
        await page.emulateNetworkConditions(puppeteer.networkConditions['Good 3G']); // Simulasi koneksi
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (request.resourceType() === 'document' || request.resourceType() === 'script') {
                request.continue({
                    headers: {
                        ...request.headers(),
                        'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.ip}:${proxy.port}`).toString('base64')}` // Untuk otentikasi proxy jika diperlukan
                    },
                    proxy: { server: proxyServer } // Ini mungkin tidak berfungsi langsung, Puppeteer set proxy di launch
                });
            } else {
                request.continue();
            }
        });
        
        // Catatan: Mengatur proxy per page di Puppeteer agak tricky,
        // biasanya proxy diatur saat puppeteer.launch.
        // Untuk saat ini, kita akan asumsikan proxy diatur via args di launch.
        // Jika Anda ingin proxy per halaman, ini akan membutuhkan lebih banyak konfigurasi
        // atau menggunakan library proxy-agent untuk Puppeteer.
        // Untuk contoh ini, proxy akan diatur di `visitorCore.js` saat membuat browser Puppeteer.
        // Tapi kita akan menggunakan proxy yang sama yang diberikan dari `visitorCore`
        // Ini adalah trade-off agar tidak perlu menginisialisasi browser berulang kali.


        let currentPageNum = 1;
        while (currentPageNum <= config.MAX_Google_Search_PAGES && !found) {
            const searchUrl = `${config.Google_Search_URL}${encodeURIComponent(keyword)}&start=${(currentPageNum - 1) * 10}`;
            console.log(chalk.gray(`      [Thread] Mencari di Google Page ${currentPageNum} untuk '${keyword}'...`));
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: config.REQUEST_TIMEOUT });
            await page.waitForSelector('body', { timeout: 5000 }).catch(() => {}); // Tunggu body dimuat

            const links = await page.$$eval('a', as => as.map(a => a.href));
            for (const link of links) {
                if (link && link.includes(targetUrl)) {
                    console.log(chalk.green(`      [Thread] Ditemukan URL target di Page ${currentPageNum}: ${link}`));
                    await page.goto(link, { waitUntil: 'networkidle0', timeout: config.REQUEST_TIMEOUT });
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Coba temukan tombol "Next Page" atau link ke halaman berikutnya
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
            console.log(chalk.yellow(`      [Thread] URL target tidak ditemukan di ${config.MAX_Google_Search_PAGES} halaman pertama Google.`));
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
