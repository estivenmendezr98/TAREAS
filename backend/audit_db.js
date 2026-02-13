
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function audit() {
    try {
        console.log('=== 1. USERS ===');
        const users = await pool.query('SELECT id, username, role, created_at FROM users');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('\n=== 2. PROJECTS ===');
        const projects = await pool.query(`
            SELECT p.id, p.title, p.user_id, u.username as owner, p.is_archived, p.deleted_at 
            FROM projects p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.id
        `);
        console.log(JSON.stringify(projects.rows, null, 2));

        console.log('\n=== 3. TASKS (First 10) ===');
        const tasks = await pool.query(`
            SELECT t.id, t.descripcion, t.project_id, p.title as project, t.completada, t.deleted_at
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            ORDER BY t.id DESC
            LIMIT 10
        `);
        console.log(JSON.stringify(tasks.rows, null, 2));

        console.log('\n=== 4. SUMMARY ===');
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM projects) as total_projects,
                (SELECT COUNT(*) FROM tasks) as total_tasks,
                (SELECT COUNT(*) FROM projects WHERE deleted_at IS NOT NULL) as deleted_projects,
                (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL) as deleted_tasks
        `);
        console.log(JSON.stringify(counts.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

audit();
