import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.DATABASE_URL) {
        console.error('FATAL: DATABASE_URL environment variable is not set.');
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Server is not configured correctly. DATABASE_URL is missing.'
        });
    }

    const client = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('[INIT-DB] Starting database initialization...');
        
        // Initialize all tables
        await client.query(`
            -- Enable UUID generation
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            -- Table for Teams
            CREATE TABLE IF NOT EXISTS teams (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- Table for Judges
            CREATE TABLE IF NOT EXISTS judges (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                secret_id VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- Table for Scoring Criteria
            CREATE TABLE IF NOT EXISTS criteria (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                weight INTEGER NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- Table for Ratings
            CREATE TABLE IF NOT EXISTS ratings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
                team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                scores JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(judge_id, team_id)
            );

            -- Table for general application state
            CREATE TABLE IF NOT EXISTS app_state (
                id INT PRIMARY KEY DEFAULT 1,
                is_setup_locked BOOLEAN NOT NULL DEFAULT FALSE,
                active_team_ids UUID[] DEFAULT ARRAY[]::UUID[],
                scoring_system INTEGER NOT NULL DEFAULT 10,
                CONSTRAINT single_row CHECK (id = 1),
                CONSTRAINT valid_scoring_system CHECK (scoring_system IN (10, 100))
            );
        `);

        // Insert initial app_state row
        await client.query(`
            INSERT INTO app_state (id, is_setup_locked, active_team_ids, scoring_system)
            VALUES (1, FALSE, ARRAY[]::UUID[], 10)
            ON CONFLICT (id) DO NOTHING;
        `);

        console.log('[INIT-DB] Database initialization completed successfully');
        
        // Return status of all tables
        const tablesCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('teams', 'judges', 'criteria', 'ratings', 'app_state')
            ORDER BY table_name
        `);

        return res.status(200).json({ 
            success: true, 
            message: 'Database initialized successfully',
            tables: tablesCheck.rows.map(row => row.table_name)
        });

    } catch (error) {
        console.error('Database initialization error:', error);
        return res.status(500).json({ 
            error: 'Database initialization failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        try {
            await client.end();
        } catch (closeError) {
            console.error('Error closing database connection:', closeError);
        }
    }
}