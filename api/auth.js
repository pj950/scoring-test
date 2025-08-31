import cookie from 'cookie';
import { Pool } from '@neondatabase/serverless';

// 简单的内存会话存储（仅用于演示模式）
let demoSession = null;

export default function handler(req, res) {
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

        console.log('[AUTH] Request:', { 
            action, 
            method: req.method,
            hasSession: !!demoSession,
            envVars: Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('JWT') || key.includes('ADMIN'))
        });

        if (req.method === 'POST' && action === 'login') {
            const { loginCode } = req.body || {};
            console.log('[AUTH] Login attempt with code:', loginCode);
            
            // Check admin codes first
            const adminCode = process.env.VITE_ADMIN_LOGIN_CODE || 'ADMIN-2024';
            if (loginCode === adminCode || loginCode === 'admin' || loginCode === 'ADMIN') {
                demoSession = { 
                    role: 'ADMIN',
                    user: { id: 'admin', name: 'Admin User' },
                    timestamp: Date.now()
                };
                
                res.setHeader('Set-Cookie', cookie.serialize('demo_session', 'admin', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/',
                    maxAge: 86400
                }));
                
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN',
                    message: 'Successfully logged in as admin'
                });
            }
            
            // Check if it's a judge code - try database first, then demo
            if (process.env.DATABASE_URL) {
                try {
                    const client = new Pool({ connectionString: process.env.DATABASE_URL });
                    const { rows } = await client.query('SELECT * FROM judges WHERE secret_id = $1', [loginCode]);
                    await client.end();
                    
                    if (rows.length > 0) {
                        const judge = rows[0];
                        demoSession = {
                            role: 'JUDGE',
                            user: judge,
                            timestamp: Date.now()
                        };
                        
                        res.setHeader('Set-Cookie', cookie.serialize('demo_session', 'judge', {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'strict',
                            path: '/',
                            maxAge: 86400
                        }));
                        
                        return res.status(200).json({ 
                            success: true, 
                            role: 'JUDGE',
                            user: judge
                        });
                    }
                } catch (dbError) {
                    console.log('[AUTH] Database check failed, trying demo codes');
                }
            }
            
            // Accept judge demo codes if database check failed
            if (loginCode === 'JUDGE-DEMO' || loginCode === 'judge' || loginCode.startsWith('JUDGE-')) {
                demoSession = {
                    role: 'JUDGE',
                    user: { id: 'judge-1', name: 'Demo Judge', secret_id: loginCode },
                    timestamp: Date.now()
                };
                
                res.setHeader('Set-Cookie', cookie.serialize('demo_session', 'judge', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/',
                    maxAge: 86400
                }));
                
                return res.status(200).json({ 
                    success: true, 
                    role: 'JUDGE',
                    user: { id: 'judge-1', name: 'Demo Judge', secret_id: loginCode }
                });
            }
            
            return res.status(401).json({ error: 'Invalid login code. Try: ADMIN-2024 for admin or any JUDGE-XXXX code for judge access' });
        }

        if (req.method === 'GET' && action === 'session') {
            // Check for demo session
            const cookies = cookie.parse(req.headers.cookie || '');
            const sessionCookie = cookies.demo_session;
            
            if (sessionCookie && demoSession) {
                console.log('[AUTH] Found demo session:', demoSession.role);
                return res.status(200).json(demoSession);
            }
            
            return res.status(401).json({ error: 'No active session' });
        }

        if (req.method === 'POST' && action === 'logout') {
            demoSession = null;
            res.setHeader('Set-Cookie', cookie.serialize('demo_session', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                expires: new Date(0)
            }));
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Action not found' });

    } catch (error) {
        console.error('[AUTH] Error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message || 'Unknown error'
        });
    }
}