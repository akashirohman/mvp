// src/proxyScraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('./config');
const chalk = require('chalk');

/**
 * Mengumpulkan proxy dari berbagai sumber web yang terdaftar di config.js.
 * @returns {Promise<Array<{ip: string, port: number}>>} Array of proxy objects.
 */
async function scrapeProxies() {
    let allProxies = new Set(); // Menggunakan Set untuk menghindari duplikasi

    console.log(chalk.blue('  [Proxy Scraper] Memulai pengumpulan proxy dari sumber...'));

    for (const sourceUrl of config.PROXY_SOURCES) {
        try {
            console.log(chalk.cyan(`  [Proxy Scraper] Mengunjungi: ${sourceUrl}`));
            const response = await axios.get(sourceUrl, { timeout: config.REQUEST_TIMEOUT });
            const $ = cheerio.load(response.data);

            // Logika scraping untuk Free-Proxy-List.net dan SSLProxies.org (struktur serupa)
            // Anda mungkin perlu menyesuaikan selector ini jika format website berubah
            $('table.table tbody tr').each((i, row) => {
                const ip = $(row).find('td').eq(0).text().trim();
                const port = parseInt($(row).find('td').eq(1).text().trim(), 10);
                const country = $(row).find('td').eq(2).text().trim(); // Kolom Negara
                const type = $(row).find('td').eq(6).text().trim(); // Kolom Tipe (HTTP/S)

                // Filter proxy Indonesia (jika ada data negara) dan yang valid
                if (ip && port && !isNaN(port) && (country === 'ID' || country === 'Indonesia' || country === '')) { // Memperbolehkan proxy tanpa info negara jika dari sumber umum
                    allProxies.add(JSON.stringify({ ip, port }));
                }
            });

            console.log(chalk.green(`  [Proxy Scraper] Berhasil mengumpulkan dari ${sourceUrl}.`));

        } catch (error) {
            console.error(chalk.red(`  [Proxy Scraper] Gagal mengumpulkan dari ${sourceUrl}: ${error.message}`));
        }
    }

    const uniqueProxies = Array.from(allProxies).map(proxyStr => JSON.parse(proxyStr));
    console.log(chalk.yellow(`  [Proxy Scraper] Total ${uniqueProxies.length} proxy unik ditemukan.`), '\n');
    return uniqueProxies;
}

module.exports = {
    scrapeProxies
};
