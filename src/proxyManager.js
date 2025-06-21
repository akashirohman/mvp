// src/proxyManager.js
const { scrapeProxies } = require('./proxyScraper');
const { validateProxy } = require('./proxyValidator');
// const config = require('./config'); // HAPUS ATAU KOMENTARI BARIS IMPOR CONFIG INI
const chalk = require('chalk').default; // Pastikan ini sudah .default

class ProxyManager {
    // NEW: Konstruktor sekarang menerima objek 'config' sebagai parameter
    constructor(configInstance) {
        this.config = configInstance; // Simpan instance config
        this.activeProxies = [];
        this.failedProxies = new Map();
        this.isScraping = false;
        this.minRequiredProxies = 10;
        this.proxyQueue = [];
        this.lastRotationIndex = -1;
    }

    /**
     * Memulai proses scraping dan validasi proxy secara periodik.
     * Termasuk inisialisasi IPRoyal jika diaktifkan.
     */
    async initialize() {
        // Sekarang, gunakan 'this.config' untuk mengakses properti config
        if (this.config.IPROYAL_PROXY.ENABLED) {
            this.activeProxies = [];
            this.activeProxies.push({
                ip: this.config.IPROYAL_PROXY.HOST,
                port: this.config.IPROYAL_PROXY.PORT,
                auth: {
                    username: this.config.IPROYAL_PROXY.USERNAME,
                    password: this.config.IPROYAL_PROXY.PASSWORD
                },
                protocol: this.config.IPROYAL_PROXY.PROTOCOL,
                isIProyal: true
            });
            this.proxyQueue = [...this.activeProxies];
            console.log(chalk.magenta('  [Proxy Manager] Menggunakan IPRoyal Proxy Gateway.'));
            console.log(chalk.magenta('  [Proxy Manager] IPRoyal Proxy sudah diinisialisasi. Melewatkan pengumpulan proxy gratis.'));
            return;
        }

        console.log(chalk.magenta('  [Proxy Manager] Memulai inisialisasi proxy gratis...'));
        await this.refreshProxies();

        // setInterval(() => this.refreshProxies(), 1800000);
    }

    async refreshProxies() {
        if (this.config.IPROYAL_PROXY.ENABLED) {
            console.log(chalk.gray('  [Proxy Manager] IPRoyal Proxy aktif, melewati refresh proxy gratis.'));
            return;
        }
        
        if (this.isScraping) {
            console.log(chalk.gray('  [Proxy Manager] Proses scraping proxy sedang berjalan, melewati refresh.'));
            return;
        }
        this.isScraping = true;
        console.log(chalk.blue('  [Proxy Manager] Memulai proses pengumpulan dan validasi proxy baru...'));

        const rawProxies = await scrapeProxies();
        let validProxiesCount = 0;
        let tempActiveProxies = [];

        const validationPromises = rawProxies.map(proxy =>
            validateProxy(proxy).then(validatedProxy => {
                if (validatedProxy) {
                    tempActiveProxies.push(validatedProxy);
                    validProxiesCount++;
                }
            })
        );

        await Promise.allSettled(validationPromises);

        this.activeProxies = tempActiveProxies;
        this.proxyQueue = [...this.activeProxies];

        console.log(chalk.green(`  [Proxy Manager] Selesai validasi. Total ${validProxiesCount} proxy aktif ditemukan.`));
        if (this.activeProxies.length < this.minRequiredProxies) {
            console.warn(chalk.yellow(`  [Proxy Manager] Peringatan: Jumlah proxy aktif (${this.activeProxies.length}) di bawah batas minimum (${this.minRequiredProxies}).`));
        }

        this.cleanFailedProxies();
        this.isScraping = false;
    }

    async getNextProxy() {
        if (this.proxyQueue.length === 0) {
            if (!this.config.IPROYAL_PROXY.ENABLED) { // Gunakan 'this.config'
                console.warn(chalk.yellow('  [Proxy Manager] Antrean proxy kosong.'));
                console.warn(chalk.yellow('  [Proxy Manager] Melanjutkan TANPA PROXY untuk pengujian fungsionalitas bot.'));
                return { ip: 'localhost', port: 0, protocol: 'http', noProxy: true };
            }
            console.error(chalk.red('  [Proxy Manager] Gagal mendapatkan proxy. IPRoyal diaktifkan tetapi proxyQueue kosong.'));
            return null;
        }

        this.lastRotationIndex = (this.lastRotationIndex + 1) % this.proxyQueue.length;
        return this.proxyQueue[this.lastRotationIndex];
    }

    reportProxyFailure(proxy) {
        if (proxy.isIProyal) {
            console.warn(chalk.yellow(`  [Proxy Manager] IPRoyal Gateway (${proxy.ip}:${proxy.port}) gagal. Ini mungkin masalah sementara atau blokir dari target. Tidak menghapus gateway.`));
            return;
        }
        if (proxy.noProxy) {
            return;
        }

        const proxyKey = `${proxy.ip}:${proxy.port}`;
        const failureInfo = this.failedProxies.get(proxyKey) || { failures: 0, lastFailed: 0 };

        failureInfo.failures++;
        failureInfo.lastFailed = Date.now();
        this.failedProxies.set(proxyKey, failureInfo);

        if (failureInfo.failures >= this.config.MAX_PROXY_FAILURES) { // Gunakan 'this.config'
            this.activeProxies = this.activeProxies.filter(p => `${p.ip}:${p.port}` !== proxyKey);
            this.proxyQueue = this.proxyQueue.filter(p => `${p.ip}:${p.port}` !== proxyKey);
            console.log(chalk.red(`  [Proxy Manager] Proxy ${proxyKey} dihapus sementara karena terlalu banyak gagal (${failureInfo.failures} kali).`));
        }
    }

    cleanFailedProxies() {
        const now = Date.now();
        for (const [proxyKey, info] of this.failedProxies.entries()) {
            if (now - info.lastFailed > this.config.PROXY_RETRY_INTERVAL_MS) { // Gunakan 'this.config'
                const [ip, portStr] = proxyKey.split(':');
                const port = parseInt(portStr, 10);
                if (!this.activeProxies.some(p => p.ip === ip && p.port === port)) {
                    this.activeProxies.push({ ip, port, country: 'Retried' });
                    this.proxyQueue.push({ ip, port, country: 'Retried' });
                    console.log(chalk.magenta(`  [Proxy Manager] Proxy ${proxyKey} ditambahkan kembali untuk dicoba. `));
                }
                this.failedProxies.delete(proxyKey);
            }
        }
    }

    getProxyCount() {
        return this.activeProxies.length;
    }
}

// Export kelasnya, bukan instansinya. Instansi akan dibuat di main.js
module.exports = ProxyManager;
