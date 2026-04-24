// lib/db.js
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Keep connections alive so the pool doesn't use stale connections
  // that the MySQL server silently dropped after its wait_timeout
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});