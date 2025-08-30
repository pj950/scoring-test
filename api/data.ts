import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

// Helper to generate short, random codes for judges
const generateSecretId = () => `JUDGE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

// Interface for the raw rating data from the database
interface DbRating {
    team_id: string;
    judge_id: string;
    scores: Record<string, number>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!process.env.DATABASE_URL) {
        console.error('FATAL: DATABASE_URL environment variable is not set.');
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Server is not configured correctly. DATABASE_URL is missing.'
        });
    }

    const client = new Pool({ connectionString: process.env.DATABASE_URL });
    const { entity, id, judgeId, teamId } = req.query;

    try {
        // --- GET Requests ---
        if (req.method === 'GET') {
            if (entity === 'teams') {
                const { rows } = await client.query('SELECT * FROM teams ORDER BY created_at ASC');
                return res.status(200).json(rows);
            }
            if (entity === 'judges') {
                const { rows } = await client.query('SELECT * FROM judges ORDER BY created_at ASC');
                return res.status(200).json(rows);
            }
            if (entity === 'criteria') {
                const { rows } = await client.query('SELECT * FROM criteria ORDER BY created_at ASC');
                return res.status(200).json(rows);
            }
            if (entity === 'scores') {
                if (judgeId && teamId) {
                    const { rows } = await client.query('SELECT scores FROM ratings WHERE judge_id = $1 AND team_id = $2', [judgeId, teamId]);
                    if (rows.length > 0) {
                        return res.status(200).json({ teamId, judgeId, scores: rows[0].scores });
                    }
                    return res.status(200).json(null); // Return null if no score found
                }
                if (judgeId) {
                    const { rows } = await client.query('SELECT team_id, scores FROM ratings WHERE judge_id = $1', [judgeId]);
                    const formattedScores = rows.map(row => ({
                        teamId: row.team_id,
                        judgeId,
                        scores: row.scores
                    }));
                    return res.status(200).json(formattedScores);
                }
                const { rows } = await client.query('SELECT team_id, judge_id, scores FROM ratings');
                const allScores = rows.map(row => ({
                    teamId: row.team_id,
                    judgeId: row.judge_id,
                    scores: row.scores
                }));
                return res.status(200).json(allScores);
            }
            if (entity === 'activeTeamIds') {
                 const { rows } = await client.query('SELECT active_team_ids FROM app_state WHERE id = 1');
                 return res.status(200).json(rows.length > 0 ? rows[0].active_team_ids : []);
            }
            if (entity === 'scoringSystem') {
                const { rows } = await client.query('SELECT scoring_system FROM app_state WHERE id = 1');
                return res.status(200).json(rows.length > 0 ? rows[0].scoring_system : 10);
            }
            if (entity === 'finalScores') {
                const [teamsRes, criteriaRes, ratingsRes, scoringSystemRes] = await Promise.all([
                    client.query('SELECT id, name FROM teams'),
                    client.query('SELECT id, weight FROM criteria'),
                    client.query('SELECT team_id, judge_id, scores FROM ratings'),
                    client.query('SELECT scoring_system FROM app_state WHERE id = 1'),
                ]);
                
                const teams = teamsRes.rows;
                const criteria: {id: string, weight: number}[] = criteriaRes.rows;
                const ratings: DbRating[] = ratingsRes.rows;
                const scoringSystem = scoringSystemRes.rows[0]?.scoring_system || 10;

                const criteriaMap = new Map(criteria.map(c => [c.id, c.weight]));

                if (teams.length === 0 || criteria.length === 0) {
                    return res.status(200).json([]);
                }
                
                const ratingsByTeam = ratings.reduce((acc: Record<string, DbRating[]>, rating) => {
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
                        };
                    }
                    
                    const judgeFinalScores = teamRatings.map(rating => {
                        let judgeWeightedScore = 0;
                        for (const criterionId in rating.scores) {
                            const weight = criteriaMap.get(criterionId);
                            if (weight) {
                                const score = Number(rating.scores[criterionId]);
                                // Normalize score to percentage based on scoring system
                                judgeWeightedScore += (score / scoringSystem) * weight;
                            }
                        }
                        return judgeWeightedScore;
                    });
                    
                    const averagePercentage = judgeFinalScores.reduce((sum, s) => sum + s, 0) / judgeFinalScores.length;
                    
                    return {
                        teamId: team.id,
                        teamName: team.name,
                        weightedScore: parseFloat(averagePercentage.toFixed(2)),
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

                return res.status(200).json(finalRankedScores);
            }
        }

        // --- POST Requests ---
        if (req.method === 'POST') {
             if (entity === 'teams') {
                await client.query('INSERT INTO teams (name) VALUES ($1)', [req.body.name]);
                return res.status(201).json({ success: true });
            }
            if (entity === 'judges') {
                await client.query('INSERT INTO judges (name, secret_id) VALUES ($1, $2)', [req.body.name, generateSecretId()]);
                return res.status(201).json({ success: true });
            }
            if (entity === 'criteria') {
                const { name, weight } = req.body;
                await client.query('INSERT INTO criteria (name, weight) VALUES ($1, $2)', [name, weight]);
                return res.status(201).json({ success: true });
            }
            if (entity === 'toggleActiveTeam') {
                const { teamId } = req.body;
                if (!teamId) return res.status(400).json({ error: 'teamId is required' });

                try {
                    await client.query('BEGIN');
                    const { rows } = await client.query('SELECT active_team_ids FROM app_state WHERE id = 1 FOR UPDATE');
                    const currentActiveIds: string[] = rows[0]?.active_team_ids || [];
                    
                    const newActiveIds = currentActiveIds.includes(teamId)
                        ? currentActiveIds.filter(id => id !== teamId)
                        : [...currentActiveIds, teamId];

                    await client.query('UPDATE app_state SET active_team_ids = $1::uuid[] WHERE id = 1', [newActiveIds]);
                    await client.query('COMMIT');

                    return res.status(200).json({ success: true });
                } catch (transactionError) {
                    await client.query('ROLLBACK');
                    console.error('Transaction error in toggleActiveTeam:', transactionError);
                    throw transactionError; // Re-throw to be caught by outer catch block
                }
            }
            if (entity === 'scores') {
                const { teamId, judgeId, scores } = req.body;
                await client.query(`
                    INSERT INTO ratings (team_id, judge_id, scores)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (team_id, judge_id)
                    DO UPDATE SET scores = $3
                `, [teamId, judgeId, JSON.stringify(scores)]);
                return res.status(201).json({ success: true });
            }
            if (entity === 'setScoringSystem') {
                const { scoringSystem } = req.body;
                if (![10, 100].includes(scoringSystem)) {
                    return res.status(400).json({ error: 'Invalid scoring system. Must be 10 or 100.' });
                }
                await client.query('UPDATE app_state SET scoring_system = $1 WHERE id = 1', [scoringSystem]);
                return res.status(200).json({ success: true });
            }
        }
        
        // --- DELETE Requests ---
        if (req.method === 'DELETE') {
            if (entity && id) {
                 await client.query(`DELETE FROM ${entity} WHERE id = $1`, [id]);
                 return res.status(200).json({ success: true });
            }
        }

        res.status(404).json({ error: 'Not Found' });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.end();
    }
}