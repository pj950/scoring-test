export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const entity = req.query.entity;

    console.log('[DATA] Request for entity:', entity);

    // Return mock data for all entities
    if (req.method === 'GET') {
        switch (entity) {
            case 'teams':
                return res.status(200).json([]);
                
            case 'judges':
                return res.status(200).json([]);
                
            case 'criteria':
                return res.status(200).json([]);
                
            case 'scores':
                return res.status(200).json([]);
                
            case 'activeTeamIds':
                return res.status(200).json([]);
                
            case 'scoringSystem':
                return res.status(200).json(10);
                
            case 'finalScores':
                return res.status(200).json([]);
                
            default:
                return res.status(200).json([]);
        }
    }

    // Handle POST requests
    if (req.method === 'POST') {
        return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: true });
}