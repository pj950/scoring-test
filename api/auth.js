import cookie from 'cookie';

// 简单的内存会话存储
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
            url: req.url,
            body: req.body
        });

        if (req.method === 'POST' && action === 'login') {
            // Try to get loginCode from different sources
            let loginCode;
            
            if (req.body && typeof req.body === 'object') {
                loginCode = req.body.loginCode;
            } else if (req.body && typeof req.body === 'string') {
                try {
                    const parsed = JSON.parse(req.body);
                    loginCode = parsed.loginCode;
                } catch (e) {
                    loginCode = req.body;
                }
            }
            
            console.log('[AUTH] Login code extracted:', loginCode);
            
            // Very permissive admin check
            if (loginCode && (
                loginCode.toLowerCase() === 'admin' ||
                loginCode === 'ADMIN' ||
                loginCode === 'ADMIN-2024' ||
                loginCode === 'admin-2024'
            )) {
                console.log('[AUTH] Admin login successful');
                demoSession = { 
                    role: 'ADMIN',
                    user: { id: 'admin', name: 'Admin User' },
                    timestamp: Date.now()
                };
                
                res.setHeader('Set-Cookie', cookie.serialize('demo_session', 'admin', {
                    httpOnly: true,
                    secure: false, // Set to false for debugging
                    sameSite: 'lax', // More permissive
                    path: '/',
                    maxAge: 86400
                }));
                
                return res.status(200).json({ 
                    success: true, 
                    role: 'ADMIN'
                });
            }
            
            // Judge login
            if (loginCode && (
                loginCode === 'JUDGE-DEMO' ||
                loginCode.toLowerCase() === 'judge' ||
                loginCode.startsWith('JUDGE-')
            )) {
                console.log('[AUTH] Judge login successful');
                demoSession = {
                    role: 'JUDGE',
                    user: { id: 'judge-1', name: 'Demo Judge', secret_id: loginCode },
                    timestamp: Date.now()
                };
                
                res.setHeader('Set-Cookie', cookie.serialize('demo_session', 'judge', {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 86400
                }));
                
                return res.status(200).json({ 
                    success: true, 
                    role: 'JUDGE',
                    user: { id: 'judge-1', name: 'Demo Judge', secret_id: loginCode }
                });
            }
            
            console.log('[AUTH] Login failed for code:', loginCode);
            return res.status(401).json({ 
                error: 'Invalid login code. Access denied.',
                debug: {
                    receivedCode: loginCode,
                    codeType: typeof loginCode,
                    bodyReceived: req.body,
                    acceptedCodes: ['admin', 'ADMIN', 'ADMIN-2024', 'JUDGE-DEMO', 'judge']
                }
            });
        }

        if (req.method === 'GET' && action === 'session') {
            // Check for demo session
            const cookies = cookie.parse(req.headers.cookie || '');
            const sessionCookie = cookies.demo_session;
            
            console.log('[AUTH] Session check:', { hasSession: !!demoSession, sessionCookie });
            
            if (sessionCookie && demoSession) {
                console.log('[AUTH] Found valid session:', demoSession.role);
                return res.status(200).json(demoSession);
            }
            
            return res.status(401).json({ error: 'No active session' });
        }

        if (req.method === 'POST' && action === 'logout') {
            demoSession = null;
            res.setHeader('Set-Cookie', cookie.serialize('demo_session', '', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
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