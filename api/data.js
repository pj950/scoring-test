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

        const entity = req.query.entity || 'unknown';

        // Log for debugging
        console.log('[DATA] Entity:', entity, 'Method:', req.method);

        // Return static mock data - NO DATABASE REQUIRED
        if (req.method === 'GET') {
            switch (entity) {
                case 'teams':
                    return res.status(200).json([
                        { id: '1', name: 'Demo Team 1', created_at: '2024-01-01T00:00:00Z' },
                        { id: '2', name: 'Demo Team 2', created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'judges':
                    return res.status(200).json([
                        { id: '1', name: 'Demo Judge', secret_id: 'JUDGE-DEMO', created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'criteria':
                    return res.status(200).json([
                        { id: '1', name: 'Innovation', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: '2', name: 'Technical Quality', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: '3', name: 'Presentation', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: '4', name: 'Impact', weight: 25, created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'scores':
                    return res.status(200).json([]);
                    
                case 'activeTeamIds':
                    return res.status(200).json(['1', '2']);
                    
                case 'scoringSystem':
                    return res.status(200).json(10);
                    
                case 'finalScores':
                    return res.status(200).json([
                        { teamId: '1', teamName: 'Demo Team 1', weightedScore: 85.5, rank: 1 },
                        { teamId: '2', teamName: 'Demo Team 2', weightedScore: 78.2, rank: 2 }
                    ]);
                    
                default:
                    return res.status(200).json([]);
            }
        }

        // Handle POST requests
        if (req.method === 'POST') {
            return res.status(200).json({ success: true, message: 'Demo mode - changes not saved' });
        }

        // Handle DELETE requests
        if (req.method === 'DELETE') {
            return res.status(200).json({ success: true, message: 'Demo mode - nothing deleted' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[DATA] Error:', error);
        return res.status(200).json([]);
    }
}