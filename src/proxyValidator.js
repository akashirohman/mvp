// src/proxyValidator.js
const axios = require('axios');
const config = require('./config');
const chalk = require('chalk').default;

async function validateProxy(proxy) {
    const proxyUrl = `http://${proxy.ip}:${proxy.port}`;
    try {
        const response = await axios.get(config.PROXY_TEST_URL, {
            proxy: {
                host: proxy.ip,
                port: proxy.port,
                protocol: 'http'
            },
            timeout: config.PROXY_VALIDATION_TIMEOUT,
            headers: {
                'User-Agent': config.USER_AGENTS[0]
            }
        });

        // PASTIKAN BLOK KODE DI BAWAH INI ADALAH YANG AKTIF.
        // TIDAK BOLEH ADA FILTER `country === 'ID'` lagi.
        if (response.data && response.data.ip && response.data.ip === proxy.ip) {
            const country = response.data.countryCode || response.data.country || 'Unknown';
            return { ...proxy, country: country }; // Ini akan mengembalikan proxy dari negara manapun
        }

        return null; // Jika response.data.ip tidak cocok dengan proxy.ip atau respons tidak valid

    } catch (error) {
        // console.log(chalk.red(`    [Proxy Validator] ${proxyUrl} Gagal: ${error.code || error.message}`));
        return null;
    }
}

module.exports = {
    validateProxy
};
