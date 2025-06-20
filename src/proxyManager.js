// src/proxyManager.js
const { scrapeProxies } = require('./proxyScraper');
const { validateProxy } = require('./proxyValidator');
const config = require('./config');
const chalk = require('chalk').default;

class ProxyManager {
    constructor() {
        this.activeProxies = []; // Proxy yang siap digunakan
        this.failedProxies = new Map(); // Map: { 'ip:port': { failures: int, lastFailed: timestamp } }
        this.isScraping = false; // Flag untuk mencegah scraping ganda
        this.minRequiredProxies = 10; // Jumlah minimal proxy yang dibutuhkan untuk beroperasi
        this.proxyQueue = []; // Antrean proxy yang akan digunakan
        this.lastRotationIndex = -1; // Untuk rotasi berurutan
    }

    /**
     * Memulai proses scraping dan validasi proxy secara periodik.
     */
    async initialize() {
        console.log(chalk.magenta('  [Proxy Manager] Memulai inisialisasi proxy...'));
        await this.refreshProxies(); // Lakukan refresh awal

        // Jadwalkan refresh proxy berkala jika diperlukan (misal setiap 30 menit)
        // setInterval(() => this.refreshProxies(), 1800000); // 30 menit
    }

    /**
     * Mengumpulkan dan memvalidasi proxy baru, serta membersihkan proxy yang gagal.
     */
    async refreshProxies() {
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

        console.log(chalk.green(`  [Proxy Manager] Selesai validasi. Total ${validProxiesCount} proxy aktif (Indonesia) ditemukan.`));
        if (this.activeProxies.length < this.minRequiredProxies) {
            console.warn(chalk.yellow(`  [Proxy Manager] Peringatan: Jumlah proxy aktif (${this.activeProxies.length}) di bawah batas minimum (${this.minRequiredProxies}).`));
        }

        // Bersihkan proxy gagal yang sudah bisa dicoba lagi
        this.cleanFailedProxies();
        this.isScraping = false;
    }

    /**
     * Mengambil proxy berikutnya dari antrean secara round-robin.
     * Jika antrean kosong, mencoba merefresh.
     * @returns {Promise<{ip: string, port: number}|null>} Objek proxy atau null jika tidak ada yang tersedia.
     */
    async getNextProxy() {
        if (this.proxyQueue.length === 0) {
            console.warn(chalk.yellow('  [Proxy Manager] Antrean proxy kosong, mencoba merefresh proxy...'));
            await this.refreshProxies(); // Coba refresh jika antrean kosong
            if (this.proxyQueue.length === 0) {
                console.error(chalk.red('  [Proxy Manager] Gagal mendapatkan proxy setelah refresh. Tidak ada proxy yang tersedia.'));
                return null;
            }
        }

        // Rotasi sederhana (round-robin)
        this.lastRotationIndex = (this.lastRotationIndex + 1) % this.proxyQueue.length;
        return this.proxyQueue[this.lastRotationIndex];
    }

    /**
     * Melaporkan kegagalan penggunaan sebuah proxy.
     * Proxy akan dihapus dari daftar aktif jika gagal terlalu sering.
     * @param {{ip: string, port: number}} proxy - Objek proxy yang gagal.
     */
    reportProxyFailure(proxy) {
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
        return this.activeProxies.length;
    }
}

module.exports = new ProxyManager(); // Export instance tunggal
