// src/userAgentManager.js
const config = require('./config');

class UserAgentManager {
    constructor() {
        this.userAgents = config.USER_AGENTS;
        if (this.userAgents.length === 0) {
            console.warn("Peringatan: Daftar User-Agent kosong di config.js.");
        }
    }

    /**
     * Mendapatkan User-Agent secara acak dari daftar.
     * @returns {string} User-Agent yang dipilih.
     */
    getRandomUserAgent() {
        if (this.userAgents.length === 0) {
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'; // Fallback
        }
        const randomIndex = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[randomIndex];
    }
}

module.exports = new UserAgentManager(); // Export instance tunggal
