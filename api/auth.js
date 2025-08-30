export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action;

    console.log('[AUTH] Request for action:', action);

    if (req.method === 'POST' && action === 'login') {
        return res.status(200).json({ 
            success: true, 
            role: 'ADMIN'
        });
    }

    if (req.method === 'GET' && action === 'session') {
        return res.status(401).json({ error: 'No active session' });
    }

    if (req.method === 'POST' && action === 'logout') {
        return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Not Found' });
}