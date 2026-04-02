const { Pool } = require('pg')
const pool = new Pool({
  user: 'hotboard',
  password: 'hotboard123',
  host: 'localhost',
  port: 5432,
  database: 'hotboard',
})

// 先看表结构
pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'sync_logs'
  ORDER BY ordinal_position
`, (err, res) => {
  if (err) { console.error(err.message); pool.end(); return }
  console.log('=== sync_logs 表结构 ===')
  res.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`))
  
  // 查询数据
  pool.query(`
    SELECT *
    FROM sync_logs
    ORDER BY created_at DESC
    LIMIT 30
  `, (e2, r2) => {
    if (e2) { console.error(e2.message); pool.end(); return }
    
    console.log('\n=== 最近 30 条记录 ===\n')
    r2.rows.forEach((row, i) => {
      const time = new Date(row.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      const status = row.status === 'success' ? '✅' : row.status === 'partial' ? '⚠️ partial' : '❌ ' + row.status
      console.log(`${status}  ${String(row.status).padEnd(10)} ${row.items_count}条  ${time}`)
      if (row.error_message) {
        console.log(`         错误: ${row.error_message.substring(0, 120)}`)
      }
    })
    
    // 统计
    const stats = {}
    r2.rows.forEach(r => {
      stats[r.status] = (stats[r.status] || 0) + 1
    })
    console.log('\n状态分布:', stats)
    
    pool.end()
  })
})
