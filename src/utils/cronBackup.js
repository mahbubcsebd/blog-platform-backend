const cron = require('node-cron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('node:path');
const { MONGO_URI } = require('../config/env');

// 🔹 Backup ফাইল স্টোর করার জন্য ডিরেক্টরি
const backupDir = path.join(__dirname, 'backups');

// 🔹 পুরানো ব্যাকআপ ফাইল ডিলিট করার ফাংশন
function cleanupOldBackups() {
    fs.readdir(backupDir, (err, files) => {
        if (err) {
            console.error('❌ Error reading backup directory:', err);
            return;
        }

        // Sort files by creation time (newest first)
        const sortedFiles = files
            .map((file) => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).birthtime,
            }))
            .sort((a, b) => b.time - a.time);

        // Keep only the last 10 backups
        const filesToDelete = sortedFiles.slice(10);

        filesToDelete.forEach((file) => {
            fs.unlink(file.path, (error) => {
                if (error) {
                    console.error(`❌ Error deleting ${file.name}:`, error);
                } else {
                    console.log(`🗑️ Deleted old backup: ${file.name}`);
                }
            });
        });
    });
}

// 🔹 ডিরেক্টরি না থাকলে তৈরি করো
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// 🔹 Cron Job: প্রতি ৫ মিনিট পর পর ব্যাকআপ নিবে
cron.schedule('*/0.1 * * * *', () => {
    console.log('📢 Running Database Backup...');

    // 🔹 Backup File Name (Timestamp সহ)
    const backupFile = path.join(backupDir, `backup-${Date.now()}.gz`);

    // 🔹 MongoDB Dump Command (Compressed Backup)
    const command =
        process.platform === 'win32'
            ? `"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump" --uri="${MONGO_URI}" --gzip --archive="${backupFile}"`
            : `mongodump --uri="${MONGO_URI}" --gzip --archive="${backupFile}"`;

    // 🔹 Command Execute করানো
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Backup Failed:', error.message);
            return;
        }
        if (stderr) {
            console.warn('⚠️ Backup Warning:', stderr);
        }
        console.log('✅ Backup Successful:', backupFile);

        // Clean up old backups (keep last 10 backups)
        cleanupOldBackups();
    });
});

console.log('🔄 Cron Job Started: Taking backup every 5 minutes...');
console.log('📂 Backup Directory:', backupDir);
