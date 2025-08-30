import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';
import cookie from 'cookie';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-that-is-at-least-32-chars-long');
const COOKIE_NAME = 'auth_token';

async function verifyToken(token: string | undefined) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (e) {
        return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[AUTH API] Request:', {
        method: req.method,
        url: req.url,
        query: req.query,
        hasDbUrl: !!process.env.DATABASE_URL
    });

    if (!process.env.DATABASE_URL) {
        console.error('[AUTH] DATABASE_URL not configured');
        return res.status(500).json({
            error: 'Server Configuration Error',
            message: 'Database connection not configured'
        });
    }

    const client = new Pool({ connectionString: process.env.DATABASE_URL });
    const { action } = req.query;

    try {
        console.log(`[AUTH] Received request for action: ${action}, method: ${req.method}`);

        if (req.method === 'POST' && action === 'login') {
            const { loginCode } = req.body;
            console.log(`[AUTH] Login attempt with code: "${loginCode}"`);
            const SERVER_ADMIN_CODE = process.env.VITE_ADMIN_LOGIN_CODE || 'ADMIN-2024';
            
            if (loginCode === SERVER_ADMIN_CODE) {
                 console.log('[AUTH] Admin login code matched. Creating admin token...');
                 const payload = { role: 'ADMIN', sub: 'admin_user' };
                 // CRITICAL FIX: The algorithm must be 'HS256', not 'HS26'.
                 const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1d').sign(JWT_SECRET);
                 console.log('[AUTH] Admin token created successfully.');
                 res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', sameSite: 'strict', path: '/', maxAge: 86400 }));
                 return res.status(200).json({ success: true, role: 'ADMIN' });
            }

            console.log('[AUTH] Login code is not for admin. Checking judges...');
            const { rows } = await client.query('SELECT * FROM judges WHERE secret_id = $1', [loginCode]);
            if (rows.length > 0) {
                console.log('[AUTH] Judge found. Creating judge token...');
                const judge = rows[0];
                const payload = { role: 'JUDGE', sub: judge.id, user: judge };
                const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1d').sign(JWT_SECRET);
                console.log('[AUTH] Judge token created successfully.');
                res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV !== 'development', sameSite: 'strict', path: '/', maxAge: 86400 }));
                return res.status(200).json({ success: true, role: 'JUDGE', user: judge });
            }
            
            console.log('[AUTH] No admin or judge matched the login code.');
            return res.status(401).json({ error: 'Invalid login code' });
        }

        if (req.method === 'GET' && action === 'session') {
            const cookies = cookie.parse(req.headers.cookie || '');
            const token = cookies[COOKIE_NAME];
            const payload = await verifyToken(token);
            if (payload) {
                return res.status(200).json(payload);
            }
            return res.status(401).json({ error: 'No active session' });
        }

        if (req.method === 'POST' && action === 'logout') {
            console.log('[AUTH] Logging out user.');
            res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV !== 'development', sameSite: 'strict', path: '/', expires: new Date(0) }));
            return res.status(200).json({ success: true });
        }

        res.status(404).json({ error: 'Not Found', message: `Action ${action} is not valid for this endpoint.` });

    } catch (error) {
        console.error('Auth API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.end();
    }
}
