// src/main.js
const readlineSync = require('readline-sync');
const chalk = require('chalk').default; // <-- PASTIKAN .default
const ora = require('ora').default; // <-- PASTIKAN .default
const config = require('./config'); // <-- IMPORT CONFIG AGAR BISA DIAKSES GLOBAL
const proxyManager = require('./proxyManager');
const googleSearcher = require('./googleSearcher');
const { startVisitorThread } = require('./visitorCore');

const appStatus = new Map(); // Map untuk menyimpan status setiap thread: { threadId: 'status_message' }
let threads = []; // Array untuk menyimpan semua promise thread
let stopSignal = { isStopped: false };

/**
 * Menampilkan slogan aplikasi.
 */
function displaySlogan() {
    console.clear();
    console.log(chalk.bold.magenta('--- M.V.P Multi Visitor Pro ---'));
    console.log(chalk.cyan('         By : Akashi Rohman       '));
    console.log(chalk.bold.magenta('-------------------------------'));
    console.log('\n');
}

/**
 * Mengupdate status thread di UI.
 * @param {number} threadId - ID thread.
 * @param {string} statusMessage - Pesan status.
 */
function updateThreadStatus(threadId, statusMessage) {
    appStatus.set(threadId, statusMessage);
    renderStatusBar();
}

/**
 * Merender ulang bar status di terminal.
 */
function renderStatusBar() {
    // Bersihkan layar dari baris status sebelumnya (kecuali slogan)
    process.stdout.cursorTo(0, 7); // Pindah kursor ke baris setelah slogan + 2 baris kosong
    process.stdout.clearScreenDown(); // Bersihkan dari kursor ke bawah

    appStatus.forEach((status, id) => {
        console.log(chalk.white(`[Thread ${String(id).padStart(2, '0')}] ${status}`));
    });
    console.log('\n' + chalk.yellow('Ketik "stop" untuk menghentikan proses.'));
}

/**
 * Fungsi utama untuk menjalankan aplikasi.
 */
async function main() {
    displaySlogan();

    const proxyInitSpinner = ora(chalk.yellow('  [Sistem] Mengumpulkan & memvalidasi proxy...')).start();
    await proxyManager.initialize(); // Panggil initialize() yang sudah mengandung logika IPRoyal/gratis
    const activeProxiesCount = proxyManager.getProxyCount(); // Ambil jumlah proxy yang ditemukan
    proxyInitSpinner.succeed(chalk.green(`  [Sistem] Proxy siap! ${activeProxiesCount} proxy aktif tersedia.`));

    // Jika tidak ada proxy aktif dan tidak menggunakan IPRoyal, beri notifikasi akan berjalan tanpa proxy
    if (activeProxiesCount === 0 && !config.IPROYAL_PROXY.ENABLED) {
        console.warn(chalk.yellow('  [Sistem] Tidak ada proxy aktif ditemukan. Bot akan berjalan tanpa proxy.'));
    }

    const puppeteerInitSpinner = ora(chalk.yellow('  [Sistem] Memulai browser untuk pencarian Google...')).start();
    await googleSearcher.initializeBrowser();
    puppeteerInitSpinner.succeed(chalk.green('  [Sistem] Browser Puppeteer siap.'));


    // Ambil input dari pengguna
    const targetUrl = readlineSync.question(chalk.green('URL Target (contoh: https://example.com): ')).trim();
    if (!targetUrl) {
        console.error(chalk.red('URL Target tidak boleh kosong. Keluar.'));
        await googleSearcher.closeBrowser();
        return;
    }

    const keyword = readlineSync.question(chalk.green('Kata Kunci Pencarian Google (opsional, kosongkan jika tidak ingin mencari): ')).trim();

    let numThreads = parseInt(readlineSync.question(chalk.green('Jumlah Robot (Thread): ')), 10);
    if (isNaN(numThreads) || numThreads <= 0) {
        console.error(chalk.red('Jumlah Thread harus angka positif. Keluar.'));
        await googleSearcher.closeBrowser();
        return;
    }

    console.log(chalk.yellow('\nKetik "start" untuk memulai proses...'));
    let command = readlineSync.question('> ').toLowerCase().trim();

    if (command !== 'start') {
        console.log(chalk.red('Perintah tidak valid. Keluar.'));
        await googleSearcher.closeBrowser();
        return;
    }

    // --- Mulai Proses ---
    console.clear();
    displaySlogan();
    console.log(chalk.green(`URL Target: ${targetUrl}`));
    if (keyword) console.log(chalk.green(`Kata Kunci: ${keyword}`));
    console.log(chalk.green(`Jumlah Thread: ${numThreads}`));
    console.log(chalk.yellow('\nMemulai proses visitor...\n'));

    stopSignal.isStopped = false;
    threads = [];
    for (let i = 0; i < numThreads; i++) {
        const threadId = i + 1;
        appStatus.set(threadId, chalk.gray('Menunggu untuk memulai...')); // Status awal
        threads.push(startVisitorThread(threadId, targetUrl, keyword, updateThreadStatus, stopSignal));
    }
    renderStatusBar(); // Tampilkan status awal

    // Loop untuk menunggu perintah stop
    while (command !== 'stop') {
        command = readlineSync.question('> ').toLowerCase().trim();
    }

    // --- Hentikan Proses ---
    console.log(chalk.yellow('\nMenerima perintah "stop". Menghentikan semua thread...'));
    stopSignal.isStopped = true;

    // Tunggu semua thread selesai atau timeout
    await Promise.allSettled(threads);

    // Tutup browser Puppeteer
    await googleSearcher.closeBrowser();

    console.log(chalk.bold.green('\nSemua thread telah dihentikan. Multi Visitor Pro selesai.'));
    process.exit(0);
}

// Jalankan aplikasi
main().catch(async (error) => {
    console.error(chalk.bgRed(chalk.white('Terjadi kesalahan fatal:')), chalk.white(error.message));
    console.error(error.stack);
    await googleSearcher.closeBrowser(); // Pastikan browser ditutup
    process.exit(1);
});
