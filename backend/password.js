/**
 * seed-passwords.js
 * Run this ONCE from your backend folder to patch hospital_db.sql with real hashes.
 *
 * Usage:
 *   node seed-passwords.js
 *
 * It will print the 4 bcrypt hashes you need.
 * Then copy them into hospital_db.sql where indicated, OR
 * just run:  node seed-passwords.js | mysql -u root -p hospital_db
 */

const bcrypt = require('bcryptjs');

async function main() {
    const ROUNDS = 10;

    const [hAdmin, hReception, hDoctor, hPatient] = await Promise.all([
        bcrypt.hash('admin123', ROUNDS),
        bcrypt.hash('reception123', ROUNDS),
        bcrypt.hash('doctor123', ROUNDS),
        bcrypt.hash('patient123', ROUNDS),
    ]);

    console.log('-- Run these UPDATE statements in MySQL after importing hospital_db.sql');
    console.log('USE hospital_db;');
    console.log(`UPDATE users SET password='${hAdmin}'     WHERE email='admin@medicare.com';`);
    console.log(`UPDATE users SET password='${hReception}' WHERE email='reception@medicare.com';`);
    console.log(`UPDATE users SET password='${hDoctor}'    WHERE role='doctor';`);
    console.log(`UPDATE users SET password='${hPatient}'   WHERE role='patient';`);
    console.log('');
    console.log('-- Done! Passwords are now:');
    console.log('--   admin@medicare.com     → admin123');
    console.log('--   reception@medicare.com → reception123');
    console.log('--   All doctors            → doctor123');
    console.log('--   All patients           → patient123');
}

main().catch(console.error);