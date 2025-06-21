// src/proxyValidator.js
const axios = require('axios');
const config = require('./config');
const chalk = require('chalk').default; // <-- PASTIKAN .default

/**
 * Memvalidasi sebuah proxy dengan membuat permintaan ke URL pengujian.
 * @param {{ip: string, port: number}} proxy - Objek proxy.
 * @returns {Promise<{ip: string, port: number, country: string}|null>} Objek proxy yang valid dengan negara, atau null jika gagal.
 */
async function validateProxy(proxy) {
    const proxyUrl = `http://${proxy.ip}:${proxy.port}`;
    try {
        const response = await axios.get(config.PROXY_TEST_URL, {
            proxy: {
                host: proxy.ip,
                port: proxy.port,
                protocol: 'http' // Proxy gratis biasanya HTTP
            },
            timeout: config.PROXY_VALIDATION_TIMEOUT,
            headers: {
                'User-Agent': config.USER_AGENTS[0] // Gunakan User-Agent default untuk validasi
            }
        });

        // Verifikasi respons: pastikan status 200 dan ada data IP
        // Kita tidak lagi memfilter berdasarkan IP yang sama persis
        if (response.status === 200 && response.data && response.data.ip) {
            const country = response.data.countryCode || response.data.country || 'Unknown';
            return { ...proxy, country: country }; // Terima proxy dari negara manapun
        }

        return null; // Jika respons tidak OK atau tidak ada data IP

    } catch (error) {
        // console.log(chalk.red(`    [Proxy Validator] ${proxyUrl} Gagal: ${error.code || error.message}`));
        return null;
    }
}

module.exports = {
    validateProxy
};
