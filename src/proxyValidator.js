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

        // PERUBAHAN DI SINI:
        // Cukup pastikan respons berhasil (status 200) dan ada data IP di dalamnya.
        // Tidak lagi secara ketat membandingkan response.data.ip === proxy.ip
        // karena beberapa proxy transparan tidak mengubah IP asal.
        if (response.status === 200 && response.data && response.data.ip) {
            const country = response.data.countryCode || response.data.country || 'Unknown';
            // Kita juga bisa log IP asli VPS kita untuk perbandingan, opsional.
            // const originalIpResponse = await axios.get('http://ip-api.com/json');
            // const originalIp = originalIpResponse.data.ip;
            // console.log(`Proxy IP: ${proxy.ip}, Reported IP: ${response.data.ip}, Original IP: ${originalIp}`);

            return { ...proxy, country: country }; // Terima proxy jika respons OK dan ada IP
        }

        return null; // Jika respons tidak OK atau tidak ada data IP

    } catch (error) {
        // Log error lebih detail untuk debugging jika Anda mau, tapi untuk tujuan ini biarkan null.
        // console.log(chalk.red(`    [Proxy Validator] ${proxyUrl} Gagal: ${error.code || error.message}`));
        return null;
    }
}

module.exports = {
    validateProxy
};
