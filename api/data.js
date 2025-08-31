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

        // If no database URL, return demo data
        if (!process.env.DATABASE_URL) {
            console.log('[DATA] No DATABASE_URL - returning demo data');
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
                            { teamId: 'team-1', teamName: 'Demo Team Alpha', weightedScore: 8.5, rank: 1 },
                            { teamId: 'team-2', teamName: 'Demo Team Beta', weightedScore: 7.2, rank: 2 }
                        ]);
                    default:
                        return res.status(200).json([]);
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
                        // 修复的计分逻辑
                        const [teamsRes, criteriaRes, ratingsRes, scoringSystemRes] = await Promise.all([
                            client.query('SELECT id, name FROM teams'),
                            client.query('SELECT id, weight FROM criteria'),
                            client.query('SELECT team_id, judge_id, scores FROM ratings'),
                            client.query('SELECT scoring_system FROM app_state WHERE id = 1'),
                        ]);
                        
                        const teams = teamsRes.rows;
                        const criteria = criteriaRes.rows;
                        const ratings = ratingsRes.rows;
                        const scoringSystem = scoringSystemRes.rows[0]?.scoring_system || 10;
                        
                        console.log('[SCORING] System:', scoringSystem, 'Teams:', teams.length, 'Criteria:', criteria.length, 'Ratings:', ratings.length);

                        if (teams.length === 0 || criteria.length === 0) {
                            return res.status(200).json([]);
                        }

                        const criteriaMap = new Map(criteria.map(c => [c.id, c.weight]));
                        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
                        
                        // 按团队分组评分
                        const ratingsByTeam = ratings.reduce((acc, rating) => {
                            if (!acc[rating.team_id]) acc[rating.team_id] = [];
                            acc[rating.team_id].push(rating);
                            return acc;
                        }, {});

                        const calculatedScores = teams.map(team => {
                            const teamRatings = ratingsByTeam[team.id] || [];
                            if (teamRatings.length === 0) {
                                return {
                                    teamId: team.id,
                                    teamName: team.name,
                                    weightedScore: 0,
                                    judgeCount: 0
                                };
                            }
                            
                            // 计算每个评委的加权分数
                            const judgeFinalScores = teamRatings.map(rating => {
                                let judgeWeightedScore = 0;
                                for (const criterionId in rating.scores) {
                                    const weight = criteriaMap.get(criterionId);
                                    if (weight) {
                                        const score = Number(rating.scores[criterionId]);
                                        // 修复：直接按权重计算，不做百分比转换
                                        // 这样10分制最高就是10分，100分制最高就是100分
                                        judgeWeightedScore += (score * weight) / totalWeight;
                                    }
                                }
                                return judgeWeightedScore;
                            });
                            
                            // 多个评委取平均分
                            const averageScore = judgeFinalScores.reduce((sum, s) => sum + s, 0) / judgeFinalScores.length;
                            
                            return {
                                teamId: team.id,
                                teamName: team.name,
                                weightedScore: parseFloat(averageScore.toFixed(2)),
                                judgeCount: judgeFinalScores.length
                            };
                        });

                        const sortedScores = [...calculatedScores].sort((a, b) => b.weightedScore - a.weightedScore);
                        
                        let lastScore = -1;
                        let lastRank = 0;
                        const finalRankedScores = sortedScores.map((score, index) => {
                            const rank = score.weightedScore === lastScore ? lastRank : index + 1;
                            lastScore = score.weightedScore;
                            lastRank = rank;
                            return { ...score, rank };
                        });

                        console.log('[SCORING] Final scores:', finalRankedScores);
                        return res.status(200).json(finalRankedScores);
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
                    case 'judges': {
                        const secretId = `JUDGE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                        await client.query('INSERT INTO judges (name, secret_id) VALUES ($1, $2)', [req.body.name, secretId]);
                        return res.status(201).json({ success: true });
                    }
                    case 'criteria': {
                        await client.query('INSERT INTO criteria (name, weight) VALUES ($1, $2)', [req.body.name, req.body.weight]);
                        return res.status(201).json({ success: true });
                    }
                    case 'scores': {
                        const { teamId, judgeId, scores } = req.body;
                        await client.query(`
                            INSERT INTO ratings (team_id, judge_id, scores) 
                            VALUES ($1, $2, $3)
                            ON CONFLICT (team_id, judge_id)
                            DO UPDATE SET scores = $3
                        `, [teamId, judgeId, JSON.stringify(scores)]);
                        return res.status(201).json({ success: true });
                    }
                    case 'setScoringSystem': {
                        const { scoringSystem } = req.body;
                        if (![10, 100].includes(scoringSystem)) {
                            return res.status(400).json({ error: 'Invalid scoring system. Must be 10 or 100.' });
                        }
                        await client.query('UPDATE app_state SET scoring_system = $1 WHERE id = 1', [scoringSystem]);
                        return res.status(200).json({ success: true });
                    }
                    default:
                        return res.status(200).json({ success: true });
                }
            } catch (postError) {
                console.error('[DATA] POST error:', postError);
                return res.status(200).json({ success: false, error: 'Database operation failed' });
            }
        }

        // DELETE requests
        if (req.method === 'DELETE') {
            try {
                if (entity && id) {
                    await client.query(`DELETE FROM ${entity} WHERE id = $1`, [id]);
                    return res.status(200).json({ success: true });
                }
            } catch (deleteError) {
                console.error('[DATA] DELETE error:', deleteError);
                return res.status(200).json({ success: false, error: 'Delete operation failed' });
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[DATA] General error:', error);
        return res.status(200).json([]);
    } finally {
        // Always try to close connection if it exists
        try {
            if (typeof client !== 'undefined' && client) await client.end();
        } catch (e) {
            // Ignore close errors
        }
    }
}