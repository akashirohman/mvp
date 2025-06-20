// src/visitorCore.js
const axios = require('axios');
const chalk = require('chalk');
const config = require('./config');
const userAgentManager = require('./userAgentManager');
const proxyManager = require('./proxyManager');
const googleSearcher = require('./googleSearcher');

/**
 * Fungsi utama untuk setiap thread visitor.
 * @param {number} threadId - ID unik untuk thread ini.
 * @param {string} targetUrl - URL website target.
 * @param {string} [keyword] - Kata kunci pencarian Google (opsional).
 * @param {function} updateStatusCb - Callback untuk memperbarui status di UI utama.
 * @param {object} stopSignal - Objek dengan properti `isStopped` untuk menghentikan loop.
 */
async function startVisitorThread(threadId, targetUrl, keyword, updateStatusCb, stopSignal) {
    console.log(chalk.green(`    [Thread ${threadId}] Memulai...`));

    while (!stopSignal.isStopped) {
        let proxy = null;
        let userAgent = null;
        let visitSuccess = false;

        try {
            // 1. Ambil Proxy dan User-Agent
            proxy = await proxyManager.getNextProxy();
            if (!proxy) {
                updateStatusCb(threadId, chalk.red(`Tidak ada proxy tersedia. Menunggu...`));
                await new Promise(resolve => setTimeout(resolve, 5000)); // Tunggu 5 detik
                continue; // Coba lagi di iterasi berikutnya
            }
            userAgent = userAgentManager.getRandomUserAgent();

            updateStatusCb(threadId, chalk.white(`Menggunakan Proxy: ${proxy.ip}:${proxy.port} | UA: ${userAgent.substring(0, 30)}...`));

            // 2. Lakukan Pencarian Google atau Langsung Kunjungi
            let actualTargetUrl = targetUrl; // URL yang akan dikunjungi

            if (keyword) {
                updateStatusCb(threadId, chalk.yellow(`Mencari '${keyword}' di Google...`));
                const foundInGoogle = await googleSearcher.searchGoogleAndVisit(keyword, targetUrl, proxy, userAgent);
                if (foundInGoogle) {
                    updateStatusCb(threadId, chalk.green(`Ditemukan di Google. Mengunjungi ${targetUrl}...`));
                    // Jika ditemukan di Google, puppeteer sudah mengunjungi,
                    // tapi kita tetap perlu pastikan Axios bisa mengaksesnya via proxy
                    // agar logika proxyManager tetap valid
                    // Atau kita bisa menganggap kunjungan via Puppeteer sudah cukup
                    // Untuk kesederhanaan awal, anggap Puppeteer sudah mengurus kunjungan jika ditemukan
                    visitSuccess = true; // Anggap berhasil jika Puppeteer berhasil mengunjungi
                } else {
                    updateStatusCb(threadId, chalk.blue(`Tidak ditemukan di Google. Langsung mengunjungi ${targetUrl}...`));
                    // Jika tidak ditemukan di Google, lanjutkan dengan kunjungan langsung via Axios
                    await axios.get(targetUrl, {
                        proxy: {
                            host: proxy.ip,
                            port: proxy.port,
                            protocol: 'http'
                        },
                        headers: {
                            'User-Agent': userAgent
                        },
                        timeout: config.REQUEST_TIMEOUT
                    });
                    visitSuccess = true;
                }
            } else {
                updateStatusCb(threadId, chalk.blue(`Langsung mengunjungi ${targetUrl}...`));
                await axios.get(targetUrl, {
                    proxy: {
                        host: proxy.ip,
                        port: proxy.port,
                        protocol: 'http'
                    },
                    headers: {
                        'User-Agent': userAgent
                    },
                    timeout: config.REQUEST_TIMEOUT
                });
                visitSuccess = true;
            }

            if (visitSuccess) {
                updateStatusCb(threadId, chalk.green(`Berhasil mengunjungi ${actualTargetUrl}.`));
            }

        } catch (error) {
            updateStatusCb(threadId, chalk.red(`Gagal mengunjungi ${targetUrl}: ${error.message}`));
            if (proxy) {
                proxyManager.reportProxyFailure(proxy);
            }
        } finally {
            // Jeda acak sebelum rotasi berikutnya untuk simulasi yang lebih alami
            const delay = Math.floor(Math.random() * (config.MAX_VISIT_DELAY_MS - config.MIN_VISIT_DELAY_MS + 1)) + config.MIN_VISIT_DELAY_MS;
            updateStatusCb(threadId, chalk.gray(`Menunggu ${delay / 1000} detik sebelum kunjungan berikutnya...`));
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    updateStatusCb(threadId, chalk.yellow(`Thread ${threadId} dihentikan.`));
}

module.exports = {
    startVisitorThread
};
