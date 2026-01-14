import { Pool, PoolConfig } from 'pg';
import { config } from './config';

/**
 * PostgreSQL connection pool configuration
 */
const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  // Maximum number of clients in the pool
  max: 20,
  // Number of milliseconds to wait before timing out when connecting a new client
  connectionTimeoutMillis: 5000,
  // Number of milliseconds a client must sit idle before being removed
  idleTimeoutMillis: 30000,
};

/**
 * PostgreSQL connection pool
 * Use this pool for all database queries throughout the application
 */
export const pool = new Pool(poolConfig);

/**
 * Test database connection
 * Should be called on application startup
 */
export async function testDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✓ Database connected successfully at:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Gracefully close all database connections
 * Should be called on application shutdown
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
}

/**
 * Handle pool errors
 */
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});
