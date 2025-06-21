// src/proxyValidator.js
const axios = require('axios');
const config = require('./config');
const chalk = require('chalk').default;

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
                protocol: 'http' // atau 'https' jika proxy mendukung
            },
            timeout: config.PROXY_VALIDATION_TIMEOUT,
            headers: {
                'User-Agent': config.USER_AGENTS[0] // Gunakan User-Agent default untuk validasi
            }
        });

        // Periksa apakah respons berasal dari IP proxy, bukan IP asli kita
        // Beberapa proxy transparan mungkin tidak mengubah IP di respons
        if (response.data && response.data.ip && response.data.ip === proxy.ip) {
            const country = response.data.countryCode || response.data.country || 'Unknown';
            return { ...proxy, country: country }; // Terima proxy dari negara manapun
        }
        // console.log(chalk.red(`    [Proxy Validator] ${proxyUrl} Gagal (Bukan IP Proxy atau Bukan ID)`));
        return null;

    } catch (error) {
        // console.log(chalk.red(`    [Proxy Validator] ${proxyUrl} Gagal: ${error.code || error.message}`));
        return null;
    }
}

module.exports = {
    validateProxy
};
