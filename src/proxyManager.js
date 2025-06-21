// src/proxyManager.js
const { scrapeProxies } = require('./proxyScraper');
const { validateProxy } = require('./proxyValidator');
const config = require('./config');
const chalk = require('chalk').default; // Pastikan ini sudah .default

class ProxyManager {
    constructor() {
        this.activeProxies = []; // Proxy yang siap digunakan
        this.failedProxies = new Map(); // Map: { 'ip:port': { failures: int, lastFailed: timestamp } }
        this.isScraping = false; // Flag untuk mencegah scraping ganda
        this.minRequiredProxies = 10; // Jumlah minimal proxy yang dibutuhkan (untuk proxy gratis)
        this.proxyQueue = []; // Antrean proxy yang akan digunakan
        this.lastRotationIndex = -1; // Untuk rotasi berurutan

        // Bagian IPRoyal dinonaktifkan di config.js, jadi fokus ke proxy gratis.
        // Jika Anda ingin kembali ke IPRoyal, aktifkan kembali di config.js
        // dan sesuaikan kode ini dengan yang sebelumnya saya berikan untuk IPRoyal.
    }

    /**
     * Memulai proses scraping dan validasi proxy secara periodik.
     */
    async initialize() {
        // Logika IPRoyal dinonaktifkan, jadi langsung inisialisasi proxy gratis
        console.log(chalk.magenta('  [Proxy Manager] Memulai inisialisasi proxy gratis...'));
        await this.refreshProxies();

        // Anda bisa aktifkan kembali jadwal refresh berkala jika perlu
        // setInterval(() => this.refreshProxies(), 1800000); // Contoh: setiap 30 menit
    }

    /**
     * Mengumpulkan dan memvalidasi proxy baru, serta membersihkan proxy yang gagal.
     */
    async refreshProxies() {
        // Logika IPRoyal dinonaktifkan, jadi langsung scraping dan validasi gratis
        if (this.isScraping) {
            console.log(chalk.gray('  [Proxy Manager] Proses scraping proxy sedang berjalan, melewati refresh.'));
            return;
        }
        this.isScraping = true;
        console.log(chalk.blue('  [Proxy Manager] Memulai proses pengumpulan dan validasi proxy baru...'));

        const rawProxies = await scrapeProxies();
        let validProxiesCount = 0;
        let tempActiveProxies = [];

        // Validasi proxy secara paralel
        const validationPromises = rawProxies.map(proxy =>
            validateProxy(proxy).then(validatedProxy => {
                if (validatedProxy) {
                    tempActiveProxies.push(validatedProxy);
                    validProxiesCount++;
                }
            })
        );

        await Promise.allSettled(validationPromises); // Tunggu semua validasi selesai

        this.activeProxies = tempActiveProxies;
        this.proxyQueue = [...this.activeProxies]; // Isi antrean dengan proxy baru

        // Pesan log yang sudah diubah agar tidak menyebut "Indonesia"
        console.log(chalk.green(`  [Proxy Manager] Selesai validasi. Total ${validProxiesCount} proxy aktif ditemukan.`));
        if (this.activeProxies.length < this.minRequiredProxies) {
            console.warn(chalk.yellow(`  [Proxy Manager] Peringatan: Jumlah proxy aktif (${this.activeProxies.length}) di bawah batas minimum (${this.minRequiredProxies}).`));
        }

        // Bersihkan proxy gagal yang sudah bisa dicoba lagi
        this.cleanFailedProxies();
        this.isScraping = false;
    }

    /**
     * Mengambil proxy berikutnya dari antrean secara round-robin.
     * Jika antrean kosong, mengembalikan objek "tanpa proxy" untuk pengujian.
     * @returns {Promise<{ip: string, port: number, protocol: string, noProxy?: boolean}|null>} Objek proxy atau objek "tanpa proxy".
     */
    async getNextProxy() {
        if (this.proxyQueue.length === 0) {
            console.warn(chalk.yellow('  [Proxy Manager] Antrean proxy kosong.'));
            console.warn(chalk.yellow('  [Proxy Manager] Melanjutkan TANPA PROXY untuk pengujian fungsionalitas bot.'));
            return { ip: 'localhost', port: 0, protocol: 'http', noProxy: true }; // Objek "tanpa proxy"
        }

        this.lastRotationIndex = (this.lastRotationIndex + 1) % this.proxyQueue.length;
        return this.proxyQueue[this.lastRotationIndex];
    }

    /**
     * Melaporkan kegagalan penggunaan sebuah proxy.
     * Proxy akan dihapus dari daftar aktif jika gagal terlalu sering.
     * @param {{ip: string, port: number, isIProyal?: boolean, noProxy?: boolean}} proxy - Objek proxy yang gagal.
     */
    reportProxyFailure(proxy) {
        // Jika menggunakan objek "tanpa proxy" untuk pengujian, jangan laporkan kegagalan
        if (proxy.noProxy) {
            // console.log(chalk.gray('  [Proxy Manager] Tidak melaporkan kegagalan untuk mode tanpa proxy.'));
            return;
        }

        // Logika IPRoyal dinonaktifkan, jadi langsung proses proxy gratis
        const proxyKey = `${proxy.ip}:${proxy.port}`;
        const failureInfo = this.failedProxies.get(proxyKey) || { failures: 0, lastFailed: 0 };

        failureInfo.failures++;
        failureInfo.lastFailed = Date.now();
        this.failedProxies.set(proxyKey, failureInfo);

        if (failureInfo.failures >= config.MAX_PROXY_FAILURES) {
            // Hapus dari activeProxies
            this.activeProxies = this.activeProxies.filter(p => `${p.ip}:${p.port}` !== proxyKey);
            this.proxyQueue = this.proxyQueue.filter(p => `${p.ip}:${p.port}` !== proxyKey); // Hapus dari antrean juga
            console.log(chalk.red(`  [Proxy Manager] Proxy ${proxyKey} dihapus sementara karena terlalu banyak gagal (${failureInfo.failures} kali).`));
        }
    }

    /**
     * Membersihkan proxy yang gagal dan sudah bisa dicoba lagi.
     */
    cleanFailedProxies() {
        const now = Date.now();
        for (const [proxyKey, info] of this.failedProxies.entries()) {
            if (now - info.lastFailed > config.PROXY_RETRY_INTERVAL_MS) {
                // Jika sudah waktunya mencoba lagi, tambahkan kembali ke activeProxies
                const [ip, portStr] = proxyKey.split(':');
                const port = parseInt(portStr, 10);
                // Hanya tambahkan jika belum ada di activeProxies
                if (!this.activeProxies.some(p => p.ip === ip && p.port === port)) {
                    this.activeProxies.push({ ip, port, country: 'Retried' }); // Tambahkan lagi dengan status "Retried"
                    this.proxyQueue.push({ ip, port, country: 'Retried' }); // Tambahkan ke antrean
                    console.log(chalk.magenta(`  [Proxy Manager] Proxy ${proxyKey} ditambahkan kembali untuk dicoba. `));
                }
                this.failedProxies.delete(proxyKey); // Hapus dari daftar failed
            }
        }
    }

    /**
     * Mengembalikan jumlah proxy aktif yang tersedia.
     * @returns {number} Jumlah proxy aktif.
     */
    getProxyCount() {
        // Jika IPRoyal diaktifkan, ini akan selalu 1 (gateway), jika tidak, ini adalah proxy gratis yang divalidasi.
        return this.activeProxies.length;
    }
}

module.exports = new ProxyManager();
