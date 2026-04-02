const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  user: 'hotboard',
  password: 'hotboard123',
  host: 'localhost',
  port: 5432,
  database: 'hotboard',
})

const backupDir = path.join(__dirname, '..', 'sql', 'backups')
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

// 表列表（按依赖顺序）
const TABLES = [
  'nodes',
  'items', 
  'users',
  'api_keys',
  'favorites',
  'browse_history',
  'sync_logs',
  'card_keys',
  'admins',
  'api_docs',
]

async function getTableSchema(tableName) {
  const columns = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName])
  
  if (columns.rows.length === 0) return null
  
  const colDefs = columns.rows.map(col => {
    let def = `  "${col.column_name}" ${col.data_type}`
    if (col.is_nullable === 'NO') def += ' NOT NULL'
    if (col.column_default) def += ` DEFAULT ${col.column_default}`
    return def
  }).join(',\n')
  
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs}\n);`
}

async function backup() {
  try {
    console.log('开始备份数据库...')
    
    let fullBackup = `-- HotBoard Database Backup\n-- Generated: ${new Date().toISOString()}\n-- Database: hotboard\n\n`
    fullBackup += `-- Disable foreign key checks during restore\nSET session_replication_role = replica;\n\n`
    
    let dataOnlyBackup = `-- HotBoard Data Only Backup\n-- Generated: ${new Date().toISOString()}\n\n`
    dataOnlyBackup += `BEGIN;\n\n`
    
    for (const tableName of TABLES) {
      try {
        // 检查表是否存在
        const exists = await pool.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName])
        
        if (exists.rows.length === 0) {
          console.log(`跳过不存在的表: ${tableName}`)
          continue
        }
        
        console.log(`备份表: ${tableName}`)
        
        // 表结构
        const schema = await getTableSchema(tableName)
        if (schema) {
          fullBackup += `-- Table: ${tableName}\n${schema}\n\n`
        }
        
        // 表数据
        const data = await pool.query(`SELECT * FROM "${tableName}"`)
        if (data.rows.length > 0) {
          const columns = Object.keys(data.rows[0]).map(c => `"${c}"`).join(', ')
          fullBackup += `-- Data for ${tableName} (${data.rows.length} rows)\n`
          dataOnlyBackup += `-- ${tableName} (${data.rows.length} rows)\n`
          
          for (const row of data.rows) {
            const values = Object.values(row).map(v => {
              if (v === null) return 'NULL'
              if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
              if (v instanceof Date) return `'${v.toISOString()}'`
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
              return v
            }).join(', ')
            
            const insert = `INSERT INTO "${tableName}" (${columns}) VALUES (${values});`
            fullBackup += insert + '\n'
            dataOnlyBackup += insert + '\n'
          }
          fullBackup += '\n'
          dataOnlyBackup += '\n'
        }
      } catch (e) {
        console.log(`跳过表 ${tableName}: ${e.message}`)
      }
    }
    
    dataOnlyBackup += `COMMIT;\n`
    fullBackup += `SET session_replication_role = DEFAULT;\n`
    
    // 保存文件
    const fullFile = path.join(backupDir, `full_backup_${timestamp}.sql`)
    const dataFile = path.join(backupDir, `data_only_${timestamp}.sql`)
    
    fs.writeFileSync(fullFile, fullBackup)
    fs.writeFileSync(dataFile, dataOnlyBackup)
    
    console.log(`✅ 完整备份: ${fullFile}`)
    console.log(`✅ 数据备份: ${dataFile}`)
    
    // 更新快捷方式
    fs.writeFileSync(path.join(backupDir, 'latest_full.sql'), fullBackup)
    fs.writeFileSync(path.join(backupDir, 'latest_data.sql'), dataOnlyBackup)
    console.log('✅ 快捷方式已更新')
    
    // 列出所有备份
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'))
    console.log(`\n📁 备份目录 (${files.length} 个文件):`)
    files.forEach(f => {
      const stats = fs.statSync(path.join(backupDir, f))
      console.log(`  ${f} (${(stats.size / 1024).toFixed(1)} KB)`)
    })
    
  } catch (error) {
    console.error('备份失败:', error)
  } finally {
    pool.end()
  }
}

backup()
