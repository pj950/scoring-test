export default async function handler(req, res) {
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
        const { id, judgeId, teamId } = req.query;

        console.log('[DATA] Request:', { 
            entity, 
            method: req.method,
            envVars: Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('JWT') || key.includes('ADMIN'))
        });

        // ALWAYS return valid data - no database dependency for now
        if (req.method === 'GET') {
            switch (entity) {
                case 'teams':
                    return res.status(200).json([
                        { id: 'team-1', name: 'Demo Team Alpha', created_at: '2024-01-01T00:00:00Z' },
                        { id: 'team-2', name: 'Demo Team Beta', created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'judges':
                    return res.status(200).json([
                        { id: 'judge-1', name: 'Demo Judge', secret_id: 'JUDGE-DEMO', created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'criteria':
                    return res.status(200).json([
                        { id: 'crit-1', name: 'Innovation', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: 'crit-2', name: 'Technical Quality', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: 'crit-3', name: 'Presentation', weight: 25, created_at: '2024-01-01T00:00:00Z' },
                        { id: 'crit-4', name: 'Impact', weight: 25, created_at: '2024-01-01T00:00:00Z' }
                    ]);
                    
                case 'scores':
                    if (judgeId && teamId) {
                        return res.status(200).json({ teamId, judgeId, scores: {} });
                    }
                    return res.status(200).json([]);
                    
                case 'activeTeamIds':
                    return res.status(200).json(['team-1', 'team-2']);
                    
                case 'scoringSystem':
                    return res.status(200).json(10);
                    
                case 'finalScores':
                    return res.status(200).json([
                        { teamId: 'team-1', teamName: 'Demo Team Alpha', weightedScore: 0, rank: 1 },
                        { teamId: 'team-2', teamName: 'Demo Team Beta', weightedScore: 0, rank: 2 }
                    ]);
                    
                default:
                    return res.status(200).json([]);
            }
        }

        // Handle POST requests
        if (req.method === 'POST') {
            console.log('[DATA] POST request for entity:', entity);
            return res.status(200).json({ 
                success: true, 
                message: 'Demo mode - changes not saved to database' 
            });
        }

        // Handle DELETE requests
        if (req.method === 'DELETE') {
            return res.status(200).json({ 
                success: true, 
                message: 'Demo mode - nothing deleted' 
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[DATA] Error:', error);
        // Always return valid structure
        const entity = req.query.entity;
        if (entity === 'scoringSystem') {
            return res.status(200).json(10);
        }
        return res.status(200).json([]);
    }
}