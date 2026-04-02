import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * PostgreSQL 连接池配置
 */
const poolConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'hotboard',
  user: process.env.PG_USER || 'hotboard',
  password: process.env.PG_PASSWORD || 'hotboard123',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时 30秒
  connectionTimeoutMillis: 2000, // 连接超时 2秒
};

// 创建连接池
const pool = new Pool(poolConfig);

// 监听错误
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * 执行查询
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
  }

  return result;
}

/**
 * 获取客户端（用于事务）
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * 事务执行器
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * 测试连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export default pool;
