// src/visitorCore.js
const axios = require('axios');
const chalk = require('chalk').default;
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
            proxy = await proxyManager.getNextProxy();
            // Tidak perlu pengecekan `if (!proxy)` di sini karena getNextProxy selalu mengembalikan sesuatu

            userAgent = userAgentManager.getRandomUserAgent();

            // NEW: Sesuaikan pesan status jika tidak menggunakan proxy
            if (proxy.noProxy) {
                updateStatusCb(threadId, chalk.red(`Menggunakan IP ASLI VPS (TANPA PROXY) | UA: ${userAgent.substring(0, 30)}...`));
            } else {
                updateStatusCb(threadId, chalk.white(`Menggunakan Proxy: ${proxy.ip}:${proxy.port} | UA: ${userAgent.substring(0, 30)}...`));
            }


            // NEW: Konfigurasi proxy untuk Axios. Null jika tidak menggunakan proxy.
            const axiosProxyConfig = proxy.noProxy ? null : {
                host: proxy.ip,
                port: proxy.port,
                protocol: 'http'
            };

            if (keyword) {
                updateStatusCb(threadId, chalk.yellow(`Mencari '${keyword}' di Google...`));
                // Puppeteer akan menggunakan IP asli jika tidak ada argumen --proxy-server
                const foundInGoogle = await googleSearcher.searchGoogleAndVisit(keyword, targetUrl, proxy, userAgent);
                if (foundInGoogle) {
                    updateStatusCb(threadId, chalk.green(`Ditemukan di Google. Mengunjungi ${targetUrl} (via Puppeteer).`));
                    visitSuccess = true;
                } else {
                    updateStatusCb(threadId, chalk.blue(`Tidak ditemukan di Google. Langsung mengunjungi ${targetUrl} (via Axios).`));
                    await axios.get(targetUrl, {
                        proxy: axiosProxyConfig, // <-- Gunakan konfigurasi proxy yang sudah disesuaikan
                        headers: {
                            'User-Agent': userAgent
                        },
                        timeout: config.REQUEST_TIMEOUT
                    });
                    visitSuccess = true;
                }
            } else {
                updateStatusCb(threadId, chalk.blue(`Langsung mengunjungi ${targetUrl} (via Axios).`));
                await axios.get(targetUrl, {
                    proxy: axiosProxyConfig, // <-- Gunakan konfigurasi proxy yang sudah disesuaikan
                    headers: {
                        'User-Agent': userAgent
                    },
                    timeout: config.REQUEST_TIMEOUT
                });
                visitSuccess = true;
            }

            if (visitSuccess) {
                updateStatusCb(threadId, chalk.green(`Berhasil mengunjungi ${targetUrl}.`));
            }

        } catch (error) {
            updateStatusCb(threadId, chalk.red(`Gagal mengunjungi ${targetUrl}: ${error.message}`));
            // Jangan laporkan kegagalan ke proxyManager jika kita sengaja tidak pakai proxy
            if (!proxy.noProxy && proxy) {
                proxyManager.reportProxyFailure(proxy);
            }
        } finally {
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
