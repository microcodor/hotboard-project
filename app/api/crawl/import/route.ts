/**
 * HotBoard 数据导入 API
 * POST /api/crawl/import
 *
 * 核心逻辑：
 *   1. 增量去重：以 (title, url) 组合为依据，同平台已有相同标题或 URL 的跳过
 *   2. 重新排序：全部插入后，按 hot_value DESC 重新生成 rank（1=N年）
 *   3. 软更新：已存在的条目只更新热度值，不重复创建
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db-pg'

export async function POST(request: NextRequest) {
  try {
    const { platform, items, source, apiKey } = await request.json()

    if (!platform || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: '缺少 platform 或 items' }, { status: 400 })
    }

    // API Key 验证
    const validKey = process.env.HOTBOARD_API_KEY
    if (validKey && apiKey !== validKey) {
      return NextResponse.json({ success: false, error: 'API Key 无效' }, { status: 401 })
    }

    // 平台存在性检查
    const nodeRow = await pool.query('SELECT id, name FROM nodes WHERE hashid = $1', [platform])
    if (nodeRow.rows.length === 0) {
      return NextResponse.json({ success: false, error: `平台不存在: ${platform}` }, { status: 404 })
    }
    const nodeName = nodeRow.rows[0].name

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // ─────────────────────────────────────────
      // Step 1: 找出该平台已有的 (title, url) 组合
      // ─────────────────────────────────────────
      const existing = await client.query(
        `SELECT title, url FROM items WHERE node_hashid = $1 AND (title != '' OR url != '')`,
        [platform]
      )
      const seenKeys = new Set<string>()
      for (const row of existing.rows) {
        const t = (row.title || '').trim().toLowerCase()
        const u = (row.url || '').trim().toLowerCase()
        if (t) seenKeys.add(`title:${t}`)
        if (u) seenKeys.add(`url:${u}`)
      }

      // ─────────────────────────────────────────
      // Step 2: 增量写入 — 跳过已存在的，新条目写入
      // ─────────────────────────────────────────
      let insertedCount = 0
      let skippedCount  = 0
      const upsertIds: number[] = []

      for (const item of items) {
        const title = (item.title || '').trim()
        const url   = (item.url   || '').trim()
        if (!title && !url) { skippedCount++; continue }

        const titleKey = `title:${title.toLowerCase()}`
        const urlKey   = url ? `url:${url.toLowerCase()}` : null
        const isDupe = seenKeys.has(titleKey) || (urlKey && seenKeys.has(urlKey))

        if (isDupe) {
          // 已存在：只更新热度值和描述，保持 id 不变
          if (url) {
            await client.query(
              `UPDATE items SET hot_value = $2, description = COALESCE(NULLIF($3, ''), description), created_at = NOW()
               WHERE node_hashid = $1 AND (LOWER(TRIM(title)) = LOWER($4) OR (url != '' AND LOWER(TRIM(url)) = LOWER($5)))`,
              [platform, item.hot || 0, item.description || '', title, url]
            )
          } else {
            await client.query(
              `UPDATE items SET hot_value = $2, description = COALESCE(NULLIF($3, ''), description), created_at = NOW()
               WHERE node_hashid = $1 AND LOWER(TRIM(title)) = LOWER($4)`,
              [platform, item.hot || 0, item.description || '', title]
            )
          }
          skippedCount++
        } else {
          // 新条目：插入
          const r = await client.query(
            `INSERT INTO items (node_hashid, title, url, hot_value, rank, thumbnail, description, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
             RETURNING id`,
            [
              platform,
              title,
              url,
              item.hot   || 0,
              0,         // rank 暂设为 0，后面统一重排
              item.thumbnail || '',
              item.description || '',
            ]
          )
          upsertIds.push(r.rows[0].id)
          // 更新 seenKeys，防止同批次重复
          if (title) seenKeys.add(titleKey)
          if (urlKey) seenKeys.add(urlKey)
          insertedCount++
        }
      }

      // ─────────────────────────────────────────
      // Step 3: 重新排序 — 按热度值降序重排 rank
      // ─────────────────────────────────────────
      await client.query(`
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY hot_value DESC NULLS LAST, created_at ASC) as new_rank
          FROM items
          WHERE node_hashid = $1
        )
        UPDATE items i SET rank = r.new_rank
        FROM ranked r
        WHERE i.id = r.id
      `, [platform])

      // ─────────────────────────────────────────
      // Step 4: 更新节点统计时间
      // ─────────────────────────────────────────
      await client.query(
        `UPDATE nodes SET updated_at = NOW() WHERE hashid = $1`,
        [platform]
      )

      // ─────────────────────────────────────────
      // Step 5: 写入同步日志
      // ─────────────────────────────────────────
      const total = insertedCount + skippedCount
      // 状态：success=有新插入且有更新，updated=无新插入但有更新，no_change=完全没变化
      const syncStatus = total > 0
        ? (insertedCount > 0 ? 'success' : 'updated')
        : 'no_change'
      await client.query(
        `INSERT INTO sync_logs (node_hashid, status, items_count, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [platform, syncStatus, total]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: {
          platform,
          platformName: nodeName,
          total: items.length,
          inserted: insertedCount,
          updated: skippedCount,
          status: syncStatus,
          source: source || 'external',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (e: any) {
    console.error('[API] /api/crawl/import error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT hashid, name, category_name, display_name FROM nodes ORDER BY category_name, name'
    )
    return NextResponse.json({
      success: true,
      data: {
        platforms: result.rows,
        totalCount: result.rows.length,
        usage: {
          method: 'POST',
          endpoint: '/api/crawl/import',
          body: {
            platform: '平台hashid（如 weibo-hot）',
            items: [{ title: '标题', url: '链接', hot: 10000, rank: 1, thumbnail: '可选', description: '可选' }],
            source: '可选来源标识',
            apiKey: '环境变量 HOTBOARD_API_KEY（如果配置了）',
          },
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
