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

        console.log('[AUTH] Action:', action, 'Method:', req.method);

        if (req.method === 'POST' && action === 'login') {
            // Accept any login code and return admin access
            return res.status(200).json({ 
                success: true, 
                role: 'ADMIN',
                message: 'Demo mode - logged in as admin'
            });
        }

        if (req.method === 'GET' && action === 'session') {
            // Return no active session for demo
            return res.status(401).json({ error: 'No active session' });
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