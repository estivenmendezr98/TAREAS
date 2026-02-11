require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDB() {
    try {
        console.log('=== CHECKING DATABASE STATE ===\n');

        // Check if deleted_items table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'deleted_items'
            );
        `);
        console.log('deleted_items table exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            const deletedItems = await pool.query('SELECT * FROM deleted_items');
            console.log('\ndeleted_items table content:');
            console.log(JSON.stringify(deletedItems.rows, null, 2));
        }

        // Check projects
        console.log('\n=== PROJECTS ===');
        const projects = await pool.query('SELECT id, title, user_id, is_archived, deleted_at FROM projects');
        console.log('Total projects:', projects.rows.length);
        console.log(JSON.stringify(projects.rows, null, 2));

        // Simulate the actual query used by GET /api/projects
        console.log('\n=== SIMULATING GET /api/projects QUERY ===');
        const userId = 1;
        const projectQuery = `
            SELECT p.id, p.title, p.user_id, p.created_at, p.is_archived
            FROM projects p
            WHERE p.user_id = $1
            AND p.id NOT IN (SELECT item_id FROM deleted_items WHERE item_type = 'project' AND user_id = $1)
            ORDER BY p.created_at DESC
        `;

        try {
            const result = await pool.query(projectQuery, [userId]);
            console.log('Query executed successfully');
            console.log('Projects returned:', result.rows.length);
            console.log(JSON.stringify(result.rows, null, 2));
        } catch (err) {
            console.log('Query FAILED with error:', err.message);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkDB();
