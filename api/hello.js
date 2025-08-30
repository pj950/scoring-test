export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
        message: 'Hello from Vercel API!',
        timestamp: new Date().toISOString(),
        method: req.method,
        query: req.query
    });
}