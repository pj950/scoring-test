import { Pool } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log('[SETUP] Database setup request');

    if (!process.env.DATABASE_URL) {
        return res.status(500).json({
            error: 'No database configured',
            message: 'DATABASE_URL environment variable is not set'
        });
    }

    const client = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('[SETUP] Testing database connection...');
        await client.query('SELECT 1');
        
        console.log('[SETUP] Creating tables...');
        
        // Create extension
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        
        // Create teams table
        await client.query(`
            CREATE TABLE IF NOT EXISTS teams (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        
        // Create judges table
        await client.query(`
            CREATE TABLE IF NOT EXISTS judges (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                secret_id VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        
        // Create criteria table
        await client.query(`
            CREATE TABLE IF NOT EXISTS criteria (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                weight INTEGER NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        
        // Create app_state table
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
        
        // Create ratings table (after other tables for foreign key constraints)
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
        
        // Insert initial app_state
        await client.query(`
            INSERT INTO app_state (id, is_setup_locked, active_team_ids, scoring_system)
            VALUES (1, FALSE, ARRAY[]::UUID[], 10)
            ON CONFLICT (id) DO NOTHING
        `);
        
        // Add some sample data if tables are empty
        const { rows: teamCount } = await client.query('SELECT COUNT(*) as count FROM teams');
        if (parseInt(teamCount[0].count) === 0) {
            console.log('[SETUP] Adding sample data...');
            
            // Add sample teams
            await client.query("INSERT INTO teams (name) VALUES ('Demo Team Alpha'), ('Demo Team Beta')");
            
            // Add sample criteria
            await client.query(`
                INSERT INTO criteria (name, weight) VALUES 
                ('Innovation', 25),
                ('Technical Quality', 25),
                ('Presentation', 25),
                ('Impact', 25)
            `);
            
            // Add sample judge
            await client.query("INSERT INTO judges (name, secret_id) VALUES ('Demo Judge', 'JUDGE-DEMO')");
        }
        
        console.log('[SETUP] Database setup completed successfully');
        
        return res.status(200).json({
            success: true,
            message: 'Database setup completed successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[SETUP] Database setup error:', error);
        return res.status(500).json({
            error: 'Database setup failed',
            message: error.message || 'Unknown error',
            details: error.toString()
        });
    } finally {
        try {
            await client.end();
        } catch (e) {
            console.error('[SETUP] Error closing connection:', e);
        }
    }
}