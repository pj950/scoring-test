export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const envStatus = {
            hasDbUrl: !!process.env.DATABASE_URL,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasAdminCode: !!process.env.VITE_ADMIN_LOGIN_CODE,
            nodeEnv: process.env.NODE_ENV || 'not set',
            vercelEnv: process.env.VERCEL_ENV || 'not set',
            timestamp: new Date().toISOString()
        };

        return res.status(200).json({
            status: 'API is working',
            environment: envStatus,
            message: 'This endpoint works without database'
        });
    } catch (error) {
        return res.status(200).json({
            status: 'API has basic functionality',
            error: error.message,
            message: 'Even with errors, this endpoint returns 200'
        });
    }
}