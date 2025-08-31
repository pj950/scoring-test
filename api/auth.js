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
            envVars: Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('JWT') || key.includes('ADMIN'))
        });

        // DEMO MODE - no database dependency
        if (req.method === 'POST' && action === 'login') {
            const { loginCode } = req.body || {};
            console.log('[AUTH] Login attempt with code:', loginCode);
            
            // Accept common admin codes
            if (loginCode === 'ADMIN-2024' || loginCode === 'admin' || loginCode === 'ADMIN') {
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN',
                    message: 'Demo mode - logged in as admin'
                });
            }
            
            // Accept judge demo codes
            if (loginCode === 'JUDGE-DEMO' || loginCode === 'judge') {
                return res.status(200).json({ 
                    success: true, 
                    role: 'JUDGE',
                    user: { id: 'judge-1', name: 'Demo Judge', secret_id: loginCode }
                });
            }
            
            return res.status(401).json({ error: 'Invalid login code. Try: ADMIN-2024 or JUDGE-DEMO' });
        }

        if (req.method === 'GET' && action === 'session') {
            // No session in demo mode
            return res.status(401).json({ error: 'No active session (demo mode)' });
        }

        if (req.method === 'POST' && action === 'logout') {
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