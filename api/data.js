import { Pool } from '@neondatabase/serverless';

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

        console.log('[DATA] Request:', { entity, method: req.method, hasDbUrl: !!process.env.DATABASE_URL });

        // If no database URL, return mock data
        if (!process.env.DATABASE_URL) {
            console.log('[DATA] No DATABASE_URL - returning mock data');
            if (req.method === 'GET') {
                switch (entity) {
                    case 'teams': return res.status(200).json([]);
                    case 'judges': return res.status(200).json([]);
                    case 'criteria': return res.status(200).json([]);
                    case 'scores': return res.status(200).json([]);
                    case 'activeTeamIds': return res.status(200).json([]);
                    case 'scoringSystem': return res.status(200).json(10);
                    case 'finalScores': return res.status(200).json([]);
                    default: return res.status(200).json([]);
                }
            }
            return res.status(200).json({ success: true });
        }

        // Database operations
        const client = new Pool({ connectionString: process.env.DATABASE_URL });

        try {
            // Test connection
            await client.query('SELECT 1');
            console.log('[DATA] Database connection successful');
        } catch (connError) {
            console.log('[DATA] Database connection failed, returning empty data');
            if (req.method === 'GET') {
                switch (entity) {
                    case 'teams': return res.status(200).json([]);
                    case 'judges': return res.status(200).json([]);
                    case 'criteria': return res.status(200).json([]);
                    case 'scores': return res.status(200).json([]);
                    case 'activeTeamIds': return res.status(200).json([]);
                    case 'scoringSystem': return res.status(200).json(10);
                    case 'finalScores': return res.status(200).json([]);
                    default: return res.status(200).json([]);
                }
            }
            return res.status(200).json({ success: true });
        }

        // GET requests with database
        if (req.method === 'GET') {
            try {
                switch (entity) {
                    case 'teams': {
                        const { rows } = await client.query('SELECT * FROM teams ORDER BY created_at ASC');
                        return res.status(200).json(rows || []);
                    }
                    case 'judges': {
                        const { rows } = await client.query('SELECT * FROM judges ORDER BY created_at ASC');
                        return res.status(200).json(rows || []);
                    }
                    case 'criteria': {
                        const { rows } = await client.query('SELECT * FROM criteria ORDER BY created_at ASC');
                        return res.status(200).json(rows || []);
                    }
                    case 'scores': {
                        if (judgeId && teamId) {
                            const { rows } = await client.query('SELECT scores FROM ratings WHERE judge_id = $1 AND team_id = $2', [judgeId, teamId]);
                            return res.status(200).json(rows.length > 0 ? { teamId, judgeId, scores: rows[0].scores } : null);
                        }
                        const { rows } = await client.query('SELECT team_id, judge_id, scores FROM ratings');
                        return res.status(200).json(rows.map(row => ({
                            teamId: row.team_id,
                            judgeId: row.judge_id,
                            scores: row.scores
                        })) || []);
                    }
                    case 'activeTeamIds': {
                        const { rows } = await client.query('SELECT active_team_ids FROM app_state WHERE id = 1');
                        return res.status(200).json(rows.length > 0 ? rows[0].active_team_ids : []);
                    }
                    case 'scoringSystem': {
                        const { rows } = await client.query('SELECT scoring_system FROM app_state WHERE id = 1');
                        return res.status(200).json(rows.length > 0 ? rows[0].scoring_system : 10);
                    }
                    case 'finalScores': {
                        // Return empty array if no data
                        const { rows: teams } = await client.query('SELECT id, name FROM teams');
                        if (teams.length === 0) {
                            return res.status(200).json([]);
                        }
                        // Add more complex calculation here if needed
                        return res.status(200).json([]);
                    }
                    default:
                        return res.status(200).json([]);
                }
            } catch (queryError) {
                console.error('[DATA] Query error:', queryError);
                // Return empty data instead of error
                switch (entity) {
                    case 'scoringSystem': return res.status(200).json(10);
                    default: return res.status(200).json([]);
                }
            }
        }

        // POST requests
        if (req.method === 'POST') {
            try {
                switch (entity) {
                    case 'teams': {
                        await client.query('INSERT INTO teams (name) VALUES ($1)', [req.body.name]);
                        return res.status(201).json({ success: true });
                    }
                    default:
                        return res.status(200).json({ success: true });
                }
            } catch (postError) {
                console.error('[DATA] POST error:', postError);
                return res.status(200).json({ success: false, error: 'Database operation failed' });
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[DATA] General error:', error);
        return res.status(200).json([]);
    } finally {
        // Always try to close connection if it exists
        try {
            if (client) await client.end();
        } catch (e) {
            // Ignore close errors
        }
    }
}