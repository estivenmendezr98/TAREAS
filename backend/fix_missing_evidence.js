require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function cleanMissingEvidence() {
    try {
        console.log('=== STARTING EVIDENCE CLEANUP ===');

        // 1. Get all evidence
        const evidenceQuery = await pool.query('SELECT id, file_path FROM task_evidence');
        console.log(`Found ${evidenceQuery.rows.length} total evidence records.`);

        let deletedCount = 0;

        for (const row of evidenceQuery.rows) {
            // file_path is stored like "uploads/filename.ext"
            // We need to check if this file exists relative to the backend directory
            const fullPath = path.join(__dirname, row.file_path);

            if (!fs.existsSync(fullPath)) {
                console.log(`[MISSING] ID: ${row.id} - Path: ${row.file_path}`);

                // Delete from DB
                await pool.query('DELETE FROM task_evidence WHERE id = $1', [row.id]);
                deletedCount++;
            }
        }

        console.log('\n=== CLEANUP COMPLETE ===');
        console.log(`Deleted ${deletedCount} records where the file was missing on disk.`);

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        pool.end();
    }
}

cleanMissingEvidence();
