/**
 * 分类 API
 * 从 PostgreSQL 数据库获取分类列表
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db-pg';

export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT 
        category_id as id,
        category_name as name,
        COUNT(*) as nodes_count
      FROM nodes
      WHERE category_name IS NOT NULL
      GROUP BY category_id, category_name
      ORDER BY 
        CASE category_name
          WHEN '综合' THEN 1
          WHEN '视频' THEN 2
          WHEN '新闻' THEN 3
          WHEN '科技' THEN 4
          WHEN '影视' THEN 5
          ELSE 9
        END,
        category_name
    `);

    return NextResponse.json({
      success: true,
      data: result.rows.map((row, index) => ({
        id: index + 1,
        name: row.name,
        nodesCount: parseInt(row.nodes_count) || 0,
      })),
    });
  } catch (error: any) {
    console.error('[API] /api/categories error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: [],
      },
      { status: 500 }
    );
  }
}
