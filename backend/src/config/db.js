const mysql = require('mysql2/promise');
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'perpusku_db',
  dateStrings: true,
  decimalNumbers: true,
  timezone: '+00:00',
};
const pool = mysql.createPool({ ...config, connectionLimit: 10 });
async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const value = await fn(conn);
    await conn.commit();
    return value;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
module.exports = { pool, config, transaction };
