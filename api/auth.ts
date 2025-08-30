import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        console.log(`[AUTH-SIMPLE] Request for action: ${action}, method: ${req.method}`);

        if (req.method === 'POST' && action === 'login') {
            // For now, just return success for any login attempt
            return res.status(200).json({ 
                success: true, 
                role: 'ADMIN',
                message: 'Login successful (simplified mode)'
            });
        }

        if (req.method === 'GET' && action === 'session') {
            // Return no active session for now
            return res.status(401).json({ error: 'No active session' });
        }

        if (req.method === 'POST' && action === 'logout') {
            return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Not Found' });

    } catch (error) {
        console.error('[AUTH-SIMPLE] Error:', error);
        return res.status(500).json({ 
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}