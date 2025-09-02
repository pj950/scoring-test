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
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[DATA API] Request:', {
        method: req.method,
        url: req.url,
        query: req.query,
        hasDbUrl: !!process.env.DATABASE_URL
    });

    if (!process.env.DATABASE_URL) {
        console.error('FATAL: DATABASE_URL environment variable is not set.');
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Server is not configured correctly. DATABASE_URL is missing.'
        });
    }

    const client = new Pool({ connectionString: process.env.DATABASE_URL });
    const { entity, id, judgeId, teamId } = req.query;

    // Test database connection first
    try {
        await client.query('SELECT 1');
        console.log('[DATA API] Database connection successful');
    } catch (connError) {
        console.error('[DATA API] Database connection failed:', connError);
        return res.status(500).json({
            error: 'Database Connection Failed',
            message: connError instanceof Error ? connError.message : 'Unknown connection error'
        });
    }

    try {
        // --- GET Requests ---
        if (req.method === 'GET') {
            if (entity === 'init') {
                try {
                    // Initialize database tables step by step
                    console.log('[INIT] Creating UUID extension...');
                    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
                    
                    console.log('[INIT] Creating teams table...');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS teams (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            name VARCHAR(255) NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                    `);
                    
                    console.log('[INIT] Creating judges table...');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS judges (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            name VARCHAR(255) NOT NULL,
                            secret_id VARCHAR(255) NOT NULL UNIQUE,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                    `);
                    
                    console.log('[INIT] Creating criteria table...');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS criteria (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            name VARCHAR(255) NOT NULL,
                            weight INTEGER NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                    `);
                    
                    console.log('[INIT] Creating app_state table...');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS app_state (
                            id INT PRIMARY KEY DEFAULT 1,
                            is_setup_locked BOOLEAN NOT NULL DEFAULT FALSE,
                            active_team_ids UUID[] DEFAULT ARRAY[]::UUID[],
                            scoring_system INTEGER NOT NULL DEFAULT 10,
                            CONSTRAINT single_row CHECK (id = 1),
                            CONSTRAINT valid_scoring_system CHECK (scoring_system IN (10, 100))
                        )
                    `);
                    
                    console.log('[INIT] Creating ratings table...');
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS ratings (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
                            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                            scores JSONB NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            UNIQUE(judge_id, team_id)
                        )
                    `);
                    
                    console.log('[INIT] Inserting initial app_state...');
                    await client.query(`
                        INSERT INTO app_state (id, is_setup_locked, active_team_ids, scoring_system)
                        VALUES (1, FALSE, ARRAY[]::UUID[], 10)
                        ON CONFLICT (id) DO NOTHING
                    `);
                    
                    console.log('[INIT] Database initialization completed successfully');
                    return res.status(200).json({ success: true, message: 'Database initialized successfully' });
                } catch (initError) {
                    console.error('[INIT] Database initialization failed:', initError);
                    return res.status(500).json({
                        error: 'Database initialization failed',
                        message: initError instanceof Error ? initError.message : 'Unknown error'
                    });
                }
            }
            
            if (entity === 'teams') {
                try {
                    const { rows } = await client.query('SELECT * FROM teams ORDER BY created_at ASC');
                    return res.status(200).json(rows);
                } catch (tableError) {
                    console.error('Teams table error:', tableError);
                    return res.status(200).json([]);
                }
            }
            if (entity === 'judges') {
                try {
                    const { rows } = await client.query('SELECT * FROM judges ORDER BY created_at ASC');
                    return res.status(200).json(rows);
                } catch (tableError) {
                    console.error('Judges table error:', tableError);
                    return res.status(200).json([]);
                }
            }
            if (entity === 'criteria') {
                try {
                    const { rows } = await client.query('SELECT * FROM criteria ORDER BY created_at ASC');
                    return res.status(200).json(rows);
                } catch (tableError) {
                    console.error('Criteria table error:', tableError);
                    return res.status(200).json([]);
                }
            }
            if (entity === 'scores') {
                try {
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
                } catch (scoresError) {
                    console.error('Scores query error:', scoresError);
                    return res.status(200).json([]);
                }
            }
            if (entity === 'activeTeamIds') {
                try {
                    const { rows } = await client.query('SELECT active_team_ids FROM app_state WHERE id = 1');
                    return res.status(200).json(rows.length > 0 ? rows[0].active_team_ids : []);
                } catch (error) {
                    console.error('[activeTeamIds] Error:', error);
                    return res.status(200).json([]);
                }
            }
            if (entity === 'scoringSystem') {
                try {
                    const { rows } = await client.query('SELECT scoring_system FROM app_state WHERE id = 1');
                    return res.status(200).json(rows.length > 0 ? rows[0].scoring_system : 10);
                } catch (error) {
                    console.error('[scoringSystem] Error:', error);
                    return res.status(200).json(10);
                }
            }
            if (entity === 'finalScores') {
                try {
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
                                // 修复：正确的计分逻辑
                                // 将分数标准化为0-1范围，然后乘以权重，最后乘以分制
                                const normalizedScore = score / scoringSystem; // 0-1范围
                                const weightedScore = normalizedScore * (weight / 100); // 按权重计算
                                judgeWeightedScore += weightedScore * scoringSystem; // 恢复到选择的分制
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
                } catch (finalScoresError) {
                    console.error('[finalScores] Error:', finalScoresError);
                    return res.status(200).json([]);
                }
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
            if (entity === 'clearAllScores') {
                // 清空所有评分数据
                await client.query('DELETE FROM ratings');
                return res.status(200).json({ success: true, message: 'All scores cleared successfully' });
            }
            if (entity === 'clearJudgeScores') {
                const { judgeId } = req.body;
                if (!judgeId) return res.status(400).json({ error: 'judgeId is required' });
                
                // 清空指定评委的所有评分
                await client.query('DELETE FROM ratings WHERE judge_id = $1', [judgeId]);
                return res.status(200).json({ success: true, message: 'Judge scores cleared successfully' });
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
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            query: req.query,
            method: req.method,
            url: req.url
        });
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            entity: entity,
            action: req.method
        });
    } finally {
        try {
            await client.end();
        } catch (closeError) {
            console.error('Error closing database connection:', closeError);
        }
    }
}