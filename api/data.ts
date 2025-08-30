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

    const { entity } = req.query;

    try {
        console.log(`[DATA-SIMPLE] Request for entity: ${entity}`);

        // Return mock data for all entities to prevent frontend crashes
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

        // Handle POST requests with basic responses
        if (req.method === 'POST') {
            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[DATA-SIMPLE] Error:', error);
        // Always return valid data structure even on error
        if (entity === 'scoringSystem') {
            return res.status(200).json(10);
        }
        return res.status(200).json([]);
    }
}