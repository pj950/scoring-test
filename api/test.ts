import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const envCheck = {
            hasDbUrl: !!process.env.DATABASE_URL,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasAdminCode: !!process.env.VITE_ADMIN_LOGIN_CODE,
            nodeEnv: process.env.NODE_ENV,
            dbUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'missing'
        };

        return res.status(200).json({
            success: true,
            message: 'API is working',
            timestamp: new Date().toISOString(),
            environment: envCheck
        });
    } catch (error) {
        console.error('Test API Error:', error);
        return res.status(500).json({
            error: 'Test API Failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}