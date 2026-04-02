/**
 * HotBoard 启动脚本
 * 功能：
 *   1. 等待 PostgreSQL 就绪
 *   2. 执行所有 SQL 初始化脚本
 *   3. 创建管理员账号（如不存在）
 *   4. 启动开发服务器
 *
 * 用法：npx tsx scripts/start.ts
 */
import { spawn } from 'child_process'
import { createClient } from '@neondatabase/serverless'
import crypto from 'crypto'

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@hotboard.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const DATABASE_URL   = process.env.DATABASE_URL   || 'postgresql://hotboard:hotboard123@localhost:5432/hotboard'

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForPg(maxRetries = 30) {
  console.log('⏳ 等待 PostgreSQL 就绪...')
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = createClient({ connectionString: DATABASE_URL })
      await client.connect()
      await client.end()
      console.log('✅ PostgreSQL 已就绪')
      return true
    } catch {
      process.stdout.write('.')
      await sleep(1000)
    }
  }
  throw new Error('PostgreSQL 启动超时')
}

async function runSqlFile(client: any, filePath: string) {
  const fs = await import('fs')
  const sql = fs.readFileSync(filePath, 'utf8')
  const statements = sql.split(/;\s*\n/).filter(s => s.trim())
  console.log(`📄 执行 ${filePath} (${statements.length} 条语句)`)
  for (const stmt of statements) {
    if (stmt.trim()) {
      try { await client.query(stmt) } catch { /* ignore errors */ }
    }
  }
}

async function ensureAdmin(client: any) {
  const { hash } = await import('bcryptjs')
  const { rows } = await client.query(`SELECT id FROM users WHERE email = $1`, [ADMIN_EMAIL])
  if (rows.length > 0) {
    console.log(`ℹ️  管理员已存在: ${ADMIN_EMAIL}`)
    return
  }
  const bcrypt = await hash(ADMIN_PASSWORD, 10)
  const res = await client.query(
    `INSERT INTO users (email, password_hash, display_name, role, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [ADMIN_EMAIL, bcrypt, '管理员', 'super_admin']
  )
  console.log(`✅ 管理员创建成功: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

async function main() {
  console.log('🚀 HotBoard 启动脚本\n')

  // 1. 等待数据库
  await waitForPg()

  // 2. 连接数据库
  const { Client } = await import('pg')
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('')

  // 3. 执行 SQL 初始化脚本
  const path = await import('path')
  const scriptsDir = path.join(process.cwd(), 'sql')

  const initFiles = [
    'init-database.sql',
    'init-plans.sql',
    'init-rate-limit.sql',
  ]

  for (const file of initFiles) {
    const filePath = path.join(scriptsDir, file)
    try {
      await runSqlFile(client, filePath)
    } catch (e: any) {
      console.warn(`⚠️  ${file}: ${e.message}`)
    }
  }

  // 4. 创建管理员
  await ensureAdmin(client)

  await client.end()
  console.log('\n✅ 数据库初始化完成\n')

  // 5. 启动 Next.js
  console.log('🎮 启动开发服务器 (npm run dev)...')
  const child = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  })
  child.on('exit', (code) => process.exit(code || 0))
}

main().catch(e => { console.error('❌ 启动失败:', e.message); process.exit(1) })
