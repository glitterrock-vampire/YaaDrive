import 'dotenv/config';
import pg from 'pg';

// DATE columns stay as 'YYYY-MM-DD' strings (no timezone shifting); NUMERIC and BIGINT become numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://driveshare:driveshare@localhost:5432/driveshare',
});

export const query = (text, params) => pool.query(text, params);

/** Run `fn(client)` inside a transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
