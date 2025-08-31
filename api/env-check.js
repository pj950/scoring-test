export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Check all environment variables
        const envStatus = {
            DATABASE_URL: {
                exists: !!process.env.DATABASE_URL,
                value: process.env.DATABASE_URL ? 
                    process.env.DATABASE_URL.substring(0, 30) + '...' : 
                    'NOT SET'
            },
            JWT_SECRET: {
                exists: !!process.env.JWT_SECRET,
                length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
            },
            VITE_ADMIN_LOGIN_CODE: {
                exists: !!process.env.VITE_ADMIN_LOGIN_CODE,
                value: process.env.VITE_ADMIN_LOGIN_CODE || 'NOT SET'
            },
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
            VERCEL_URL: process.env.VERCEL_URL || 'NOT SET'
        };

        const allEnvKeys = Object.keys(process.env).sort();
        const relevantKeys = allEnvKeys.filter(key => 
            key.includes('DATABASE') || 
            key.includes('JWT') || 
            key.includes('ADMIN') ||
            key.includes('VERCEL') ||
            key.includes('NODE')
        );

        return res.status(200).json({
            status: 'Environment check completed',
            timestamp: new Date().toISOString(),
            envStatus,
            relevantEnvKeys,
            totalEnvVars: allEnvKeys.length
        });

    } catch (error) {
        return res.status(200).json({
            status: 'Environment check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}