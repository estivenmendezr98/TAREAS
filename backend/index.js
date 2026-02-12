require('dotenv').config();
console.log("--- NUEVA VERSION DEL SERVIDOR (V3) ---");
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

const app = express();
const port = 3000;

// Configure Multer for disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the 'uploads' directory exists
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: Infinity } // No size limit as requested
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false, // Disable CORP to allow images to be loaded cross-origin
}));

// Rate Limiting (DDoS Protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter); // Apply to API routes

// CORS Configuration (Allow All)
app.use(cors());

app.use(express.json({ limit: '500mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Database connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Initialize Database
const initDB = async () => {
    try {
        // Create Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed Admin User
        await pool.query(`
            INSERT INTO users (username, password, role) 
            VALUES ('admin', 'admin123', 'admin') 
            ON CONFLICT (username) DO NOTHING;
        `);

        // Create Projects Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add user_id column if it doesn't exist (Migration for existing projects)
        // Note: Existing projects will have NULL user_id initially. 
        // Ideally we assign them to admin.
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN 
                    ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
                    -- Assign existing projects to the admin user (id 1 usually)
                    UPDATE projects SET user_id = (SELECT id FROM users WHERE username = 'admin');
                END IF;
            END $$;
        `);

        // Create Tasks Table with Foreign Key
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                descripcion TEXT NOT NULL,
                fecha_objetivo DATE,
                start_date DATE, -- Changed from TIMESTAMP to DATE to avoid timezone issues
                completada BOOLEAN DEFAULT FALSE,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create Task Evidence Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS task_evidence (
                id SERIAL PRIMARY KEY,
                task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                file_type TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add start_date column if it doesn't exist (Migration)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='start_date') THEN 
                    ALTER TABLE tasks ADD COLUMN start_date DATE; 
                END IF;
            END $$;
        `);

        // Migrate existing start_date from TIMESTAMP to DATE if needed
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='start_date' 
                    AND data_type='timestamp without time zone'
                ) THEN 
                    ALTER TABLE tasks ALTER COLUMN start_date TYPE DATE USING start_date::DATE;
                END IF;
            END $$;
        `);

        // Add report_content column if it doesn't exist (Migration)
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS report_content TEXT;
        `);

        // Add is_archived column to projects (Migration)
        await pool.query(`
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
        `);

        // Add is_archived column to tasks (Migration)
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
        `);

        // Add deleted_at column to projects (Migration for Recycle Bin)
        await pool.query(`
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
        `);

        // Add deleted_at column to tasks (Migration for Recycle Bin)
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
        `);

        // Create deleted_items table (for tracking deleted projects and tasks)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deleted_items (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL,
                item_type TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Tablas projects, tasks y task_evidence verificadas/creadas exitosamente.');
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
    }
};

initDB();

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && user.password === password) { // Simple check for now

            // Fallback for admin if ID is somehow missing (shouldn't happen but...)
            const userId = user.id || (user.username === 'admin' ? 1 : null);

            const token = jwt.sign({ id: userId, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
            return res.json({
                success: true,
                token,
                user: { id: userId, username: user.username, role: user.role }
            });
        }
        res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Admin: Get Users
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Create User
app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { username, password, role } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, password, role || 'user']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// Admin: Update User
app.put('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { id } = req.params;
    const { username, password, role } = req.body;

    try {
        let result;
        if (password && password.trim() !== '') {
            result = await pool.query(
                'UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4 RETURNING id, username, role',
                [username, password, role, id]
            );
        } else {
            result = await pool.query(
                'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING id, username, role',
                [username, role, id]
            );
        }

        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Routes

// Get all active projects for the logged-in user
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        // Only fetch projects belonging to the user
        const statusParam = req.query.archived;
        let projectQuery = `
            SELECT p.id, p.title, p.user_id, p.created_at, p.is_archived
            FROM projects p
            WHERE p.user_id = $1
            AND p.deleted_at IS NULL
        `;

        // Filter by archived status ONLY if param is present
        if (statusParam !== undefined) {
            const showArchived = statusParam === 'true';
            if (showArchived) {
                projectQuery += ' AND p.is_archived = TRUE';
            } else {
                projectQuery += ' AND p.is_archived = FALSE';
            }
        }
        projectQuery += ' ORDER BY p.created_at DESC';

        const projectsResult = await pool.query(projectQuery, [req.user.id]);
        const projects = projectsResult.rows;

        // Fetch tasks (exclude deleted) for the user's projects
        const taskQuery = `
            SELECT 
                t.id, t.project_id, t.descripcion, t.completada, t.fecha_creacion, t.report_content, t.is_archived,
                TO_CHAR(t.start_date, 'YYYY-MM-DD') as start_date,
                TO_CHAR(t.fecha_objetivo, 'YYYY-MM-DD') as fecha_objetivo
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.user_id = $1
            AND t.deleted_at IS NULL
            ORDER BY t.completada ASC, t.fecha_objetivo ASC
        `;
        const tasksResult = await pool.query(taskQuery, [req.user.id]);
        const tasks = tasksResult.rows;

        // Fetch evidence for all tasks belonging to the user's projects
        const evidenceQuery = `
            SELECT te.*
            FROM task_evidence te
            JOIN tasks t ON te.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE p.user_id = $1
        `;
        const evidenceResult = await pool.query(evidenceQuery, [req.user.id]);
        const allEvidence = evidenceResult.rows;

        const data = projects.map(project => ({
            ...project,
            tasks: tasks.filter(task => task.project_id === project.id).map(task => ({
                ...task,
                evidence: allEvidence.filter(ev => ev.task_id === task.id)
            }))
        }));

        res.json(data);
    } catch (err) {
        console.error('Error in GET /api/projects:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a project
app.post('/api/projects', authenticateToken, async (req, res) => {
    const { title } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO projects (title, user_id) VALUES ($1, $2) RETURNING *',
            [title, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a task (needs project_id)
app.post('/api/tasks', authenticateToken, async (req, res) => {
    const { descripcion, fecha_objetivo, project_id, start_date } = req.body;
    try {
        // Verify project belongs to user
        const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [project_id, req.user.id]);
        if (projCheck.rows.length === 0) return res.status(403).json({ error: 'Project not found or unauthorized' });

        const result = await pool.query(
            `INSERT INTO tasks (descripcion, fecha_objetivo, project_id, start_date) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content,
                       TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, 
                       TO_CHAR(fecha_objetivo, 'YYYY-MM-DD') as fecha_objetivo`,
            [descripcion, fecha_objetivo, project_id, start_date || null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in POST /api/tasks:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update task (status, details, report, or archive)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { completada, descripcion, fecha_objetivo, report_content, is_archived } = req.body;

    try {
        let result;
        if (completada !== undefined) {
            result = await pool.query(
                `UPDATE tasks SET completada = $1 WHERE id = $2 
                 RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content, is_archived,
                           start_date::text as start_date, fecha_objetivo::text as fecha_objetivo`,
                [completada, id]
            );
        } else if (is_archived !== undefined) {
            result = await pool.query(
                `UPDATE tasks SET is_archived = $1 WHERE id = $2 
                 RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content, is_archived,
                           start_date::text as start_date, fecha_objetivo::text as fecha_objetivo`,
                [is_archived, id]
            );
        } else if (report_content !== undefined) {
            result = await pool.query(
                `UPDATE tasks SET report_content = $1 WHERE id = $2 
                 RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content, is_archived,
                           start_date::text as start_date, fecha_objetivo::text as fecha_objetivo`,
                [report_content, id]
            );
        } else {
            // Check if start_date is provided (it might be distinct from other updates)
            if (req.body.start_date !== undefined) {
                const { start_date } = req.body;
                result = await pool.query(
                    `UPDATE tasks SET descripcion = $1, fecha_objetivo = $2, start_date = $3 WHERE id = $4 
                     RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content, is_archived,
                               start_date::text as start_date, fecha_objetivo::text as fecha_objetivo`,
                    [descripcion, fecha_objetivo, start_date, id]
                );
            } else {
                result = await pool.query(
                    `UPDATE tasks SET descripcion = $1, fecha_objetivo = $2 WHERE id = $3 
                     RETURNING id, project_id, descripcion, completada, fecha_creacion, deleted_at, report_content, is_archived,
                               start_date::text as start_date, fecha_objetivo::text as fecha_objetivo`,
                    [descripcion, fecha_objetivo, id]
                );
            }
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task (Soft Delete)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Soft Check: If already deleted, maybe hard delete? 
        // For now, simpler: user clicks delete -> soft delete. 
        await pool.query('UPDATE tasks SET deleted_at = NOW() WHERE id = $1', [id]);
        res.json({ message: 'Task moved to recycle bin' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload Evidence
app.post('/api/tasks/:id/evidence', authenticateToken, upload.array('files'), async (req, res) => {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const uploadedFiles = [];
        for (const file of files) {
            // Store relative path to DB
            const filePath = `uploads/${file.filename}`;
            const result = await pool.query(
                'INSERT INTO task_evidence (task_id, file_path, file_type) VALUES ($1, $2, $3) RETURNING *',
                [id, filePath, file.mimetype]
            );
            uploadedFiles.push(result.rows[0]);
        }
        res.json(uploadedFiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Evidence (Optional but good to have)
app.delete('/api/evidence/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const fileResult = await pool.query('SELECT file_path FROM task_evidence WHERE id = $1', [id]);
        if (fileResult.rows.length > 0) {
            const filePath = path.join(__dirname, fileResult.rows[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await pool.query('DELETE FROM task_evidence WHERE id = $1', [id]);
        res.json({ message: 'Evidence deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, is_archived } = req.body;

    try {
        let result;
        if (is_archived !== undefined) {
            result = await pool.query(
                'UPDATE projects SET is_archived = $1 WHERE id = $2 RETURNING *',
                [is_archived, id]
            );
        } else {
            result = await pool.query(
                'UPDATE projects SET title = $1 WHERE id = $2 RETURNING *',
                [title, id]
            );
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete project (Soft Delete)
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Soft Delete Project
        await pool.query('UPDATE projects SET deleted_at = NOW() WHERE id = $1', [id]);

        res.json({ message: 'Project moved to recycle bin' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Text Improvement Route
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.post('/api/ai/improve', authenticateToken, async (req, res) => {
    const { text, mode, images } = req.body;

    // Validate input based on mode
    if (mode === 'analyze_images' && (!images || images.length === 0)) {
        return res.status(400).json({ error: 'No images provided for analysis' });
    }
    if (mode !== 'analyze_images' && (!text || text.trim().length === 0)) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let prompt = "";
        let imageParts = [];

        // Construct Prompt based on Mode
        if (mode === 'fix_grammar') {
            prompt = `
            Actúa como un corrector de estilo y ortografía experto.
            Tu ÚNICA tarea es CORREGIR la ortografía, gramática y puntuación del siguiente texto.
            
            REGLAS ESTRICTAS:
            1. NO cambies el significado del texto.
            2. NO agregues saludos, despedidas, ni explicaciones extra.
            3. NO uses Markdown, negritas (**), ni ningún formato especial. Solo texto plano.
            4. Solo devuelve el texto corregido final.
    
            Texto original:
            "${text}"
            `;
        } else if (mode === 'restructure') {
            prompt = `
            Actúa como un experto en redacción de informes técnicos.
            Tu tarea es REESTRUCTURAR y ORGANIZAR el siguiente texto para que sea claro, profesional y fácil de leer.
            
            REGLAS:
            1. Usa párrafos claros.
            2. Si hay listas de ideas, usa viñetas (guiones -).
            3. Mantén un tono profesional y objetivo.
            4. Corrige la ortografía y gramática mientras reestructuras.
            5. NO agregues información inventada.
            6. NO uses Markdown (negritas, cursivas), solo texto plano y saltos de línea.
            
            Texto desordenado:
            "${text}"
            `;
        } else if (mode === 'analyze_images') {
            prompt = `
            Actúa como un perito experto analizando evidencia visual.
            Analiza las imágenes proporcionadas y genera una descripción detallada y técnica de lo que observas.
            
            Contexto adicional del usuario (si existe): "${text || 'Sin contexto'}"
            
            REGLAS:
            1. Sé objetivo y descriptivo.
            2. Menciona detalles relevantes (estado, daños, ubicación, objetos clave).
            3. Usa un lenguaje formal y técnico.
            4. Organiza la respuesta en un párrafo cohesivo.
            5. NO uses Markdown.
            `;

            // Process Images
            // images is array of filenames relative to uploads folder, or full URLs. 
            // Assuming simplified filename or path relative to 'uploads'
            imageParts = images.map(img => {
                // Remove 'uploads/' prefix if present to safely join path
                const cleanPath = img.replace(/^uploads[\\/]/, '');
                const imagePath = path.join(__dirname, 'uploads', cleanPath);

                // Read image file
                const imageBuffer = fs.readFileSync(imagePath);
                return {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: "image/jpeg" // Adjust based on extension if needed, but jpeg usually works for both
                    },
                };
            });
        } else if (mode === 'generate_report') {
            prompt = `
            Actúa como un redactor técnico experto en informes de mantenimiento y obras.
            Tu tarea es ESCRIBIR un informe detallado y profesional basado en las siguientes instrucciones del usuario.

            Instrucciones del usuario:
            "${text}"

            REGLAS:
            1. Usa un lenguaje formal, técnico y objetivo.
            2. Estructura el informe con párrafos claros.
            3. Si la instrucción implica una lista de tareas, usa viñetas.
            4. NO inventes hechos no mencionados o implícitos en la instrucción, pero puedes expandir con redacción profesional estándar para dar contexto.
            5. NO uses Markdown (negritas, cursivas), solo texto plano y saltos de línea.
            6. Comienza directamente con el informe, SIN saludos ni introducciones como "Aquí tienes el informe".
            `;
        } else {
            // Default to grammar fix if no mode specified
            prompt = `Corregir ortografía y gramática: "${text}"`;
        }

        let result;
        if (imageParts.length > 0) {
            result = await model.generateContent([prompt, ...imageParts]);
        } else {
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        const improvedText = response.text();
        const usage = response.usageMetadata; // { promptTokenCount, candidatesTokenCount, totalTokenCount }

        res.json({ improvedText, usage });
    } catch (error) {
        console.error('Error improving text with AI:', error);
        res.status(500).json({ error: 'Failed to process AI request. ' + error.message });
    }
});

// --- Recycle Bin Routes ---

// Get all deleted items (projects and tasks)
app.get('/api/deleted', authenticateToken, async (req, res) => {
    try {
        // Get deleted projects
        const projectsResult = await pool.query(
            'SELECT * FROM projects WHERE deleted_at IS NOT NULL AND user_id = $1 ORDER BY deleted_at DESC',
            [req.user.id]
        );

        // Get deleted tasks
        const tasksResult = await pool.query(`
            SELECT t.*, p.title as project_title 
            FROM tasks t 
            LEFT JOIN projects p ON t.project_id = p.id 
            WHERE t.deleted_at IS NOT NULL 
            AND p.user_id = $1
            ORDER BY t.deleted_at DESC
        `, [req.user.id]);

        res.json({
            projects: projectsResult.rows,
            tasks: tasksResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Restore item
app.post('/api/restore/:type/:id', authenticateToken, async (req, res) => {
    const { type, id } = req.params; // type: 'project' or 'task'
    try {
        if (type === 'project') {
            await pool.query('UPDATE projects SET deleted_at = NULL, is_archived = FALSE WHERE id = $1', [id]);
        } else if (type === 'task') {
            // Restore the task
            await pool.query('UPDATE tasks SET deleted_at = NULL WHERE id = $1', [id]);

            // Also restore the parent project so the task is visible in the UI
            // Get project_id of the task
            const taskRes = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [id]);
            if (taskRes.rows.length > 0) {
                const projectId = taskRes.rows[0].project_id;
                await pool.query('UPDATE projects SET deleted_at = NULL, is_archived = FALSE WHERE id = $1', [projectId]);
            }
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: 'Item restored' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hard Delete (Permanent)
app.delete('/api/permanent/:type/:id', authenticateToken, async (req, res) => {
    const { type, id } = req.params;
    try {
        if (type === 'project') {
            // First delete evidence of all tasks in this project? 
            // Postgres CASCADE on foreign keys should handle tasks -> evidence if configured.
            // But strict chain: project -> tasks -> evidence.

            // Let's assume CASCADE DELETE is set up on DB schema for tasks->project.
            // Our Schema: 
            // tasks: project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
            // task_evidence: task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE
            // So deleting project permanently should wipe everything.
            await pool.query('DELETE FROM projects WHERE id = $1', [id]);
        } else if (type === 'task') {
            await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: 'Item permanently deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cleanup Logic (Run every hour or on startup)
const cleanupOldItems = async () => {
    try {
        // Delete items deleted more than 30 days ago
        const interval = '30 days';

        // Projects
        const projResult = await pool.query(`DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '${interval}' RETURNING id`);
        if (projResult.rowCount > 0) console.log(`Auto-deleted ${projResult.rowCount} old projects.`);

        // Tasks
        const taskResult = await pool.query(`DELETE FROM tasks WHERE deleted_at < NOW() - INTERVAL '${interval}' RETURNING id`);
        if (taskResult.rowCount > 0) console.log(`Auto-deleted ${taskResult.rowCount} old tasks.`);

    } catch (err) {
        console.error('Error during auto-cleanup:', err);
    }
};

// Run cleanup on start
cleanupOldItems();
// Run every 24 hours
setInterval(cleanupOldItems, 24 * 60 * 60 * 1000);

// Start server
app.listen(port, () => {
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
