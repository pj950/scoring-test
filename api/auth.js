import { Pool } from '@neondatabase/serverless';
import cookie from 'cookie';

export default async function handler(req, res) {
    try {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
        res.setHeader('Content-Type', 'application/json');
        
        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const action = req.query.action || 'unknown';
        console.log('[AUTH] Request:', { action, method: req.method, hasDbUrl: !!process.env.DATABASE_URL });

        // If no database URL, use demo mode
        if (!process.env.DATABASE_URL) {
            console.log('[AUTH] No DATABASE_URL - using demo mode');
            if (req.method === 'POST' && action === 'login') {
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN',
                    message: 'Demo mode - logged in as admin'
                });
            }
            if (req.method === 'GET' && action === 'session') {
                return res.status(401).json({ error: 'No active session' });
            }
            if (req.method === 'POST' && action === 'logout') {
                return res.status(200).json({ success: true });
            }
            return res.status(404).json({ error: 'Action not found' });
        }

        // Database mode
        const client = new Pool({ connectionString: process.env.DATABASE_URL });

        try {
            // Test database connection
            await client.query('SELECT 1');
            console.log('[AUTH] Database connection successful');
        } catch (connError) {
            console.log('[AUTH] Database connection failed, using demo mode');
            if (req.method === 'POST' && action === 'login') {
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN',
                    message: 'Demo mode - database unavailable'
                });
            }
            if (req.method === 'GET' && action === 'session') {
                return res.status(401).json({ error: 'No active session' });
            }
            if (req.method === 'POST' && action === 'logout') {
                return res.status(200).json({ success: true });
            }
            return res.status(404).json({ error: 'Action not found' });
        }

        // Handle requests with database
        if (req.method === 'POST' && action === 'login') {
            const { loginCode } = req.body || {};
            const adminCode = process.env.VITE_ADMIN_LOGIN_CODE || 'ADMIN-2024';
            
            if (loginCode === adminCode) {
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN'
                });
            }
            
            // Check judges table
            try {
                const { rows } = await client.query('SELECT * FROM judges WHERE secret_id = $1', [loginCode]);
                if (rows.length > 0) {
                    return res.status(200).json({ 
                        success: true, 
                        role: 'JUDGE',
                        user: rows[0]
                    });
                }
            } catch (judgeError) {
                console.error('[AUTH] Judge lookup error:', judgeError);
            }
            
            return res.status(401).json({ error: 'Invalid login code' });
        }

        if (req.method === 'GET' && action === 'session') {
            return res.status(401).json({ error: 'No active session' });
        }

        if (req.method === 'POST' && action === 'logout') {
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Action not found' });

    } catch (error) {
        console.error('[AUTH] General error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message || 'Unknown error'
        });
    } finally {
        try {
            if (client) await client.end();
        } catch (e) {
            // Ignore close errors
        }
    }
}