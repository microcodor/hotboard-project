/**
 * 管理员 API 接口文档管理
 * GET    /api/admin/api-docs          - 列表
 * POST   /api/admin/api-docs          - 创建
 * PATCH  /api/admin/api-docs?id=x     - 修改
 * DELETE /api/admin/api-docs?id=x     - 删除
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import pool from '@/lib/db-pg'

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)

    const result = await pool.query(
      `SELECT id, method, path, description, params, auth, response, group_name, created_at, updated_at
       FROM api_docs
       ORDER BY group_name, method, path`
    )

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const body = await request.json()
    const { method, path, description, params, auth, response, group_name } = body

    // 验证必填字段
    if (!method || !path || !description || !group_name) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：method, path, description, group_name' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO api_docs (method, path, description, params, auth, response, group_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [method, path, description, params || [], auth || '', response || '', group_name]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '接口文档已创建',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 })
    }

    const body = await request.json()
    const { method, path, description, params, auth, response, group_name } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (method !== undefined) { updates.push(`method = $${paramIndex++}`); values.push(method) }
    if (path !== undefined) { updates.push(`path = $${paramIndex++}`); values.push(path) }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description) }
    if (params !== undefined) { updates.push(`params = $${paramIndex++}`); values.push(params) }
    if (auth !== undefined) { updates.push(`auth = $${paramIndex++}`); values.push(auth) }
    if (response !== undefined) { updates.push(`response = $${paramIndex++}`); values.push(response) }
    if (group_name !== undefined) { updates.push(`group_name = $${paramIndex++}`); values.push(group_name) }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await pool.query(
      `UPDATE api_docs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '接口文档不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: '接口文档已更新',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminToken(request)
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 })
    }

    const result = await pool.query('DELETE FROM api_docs WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '接口文档不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: '接口文档已删除',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 401 })
  }
}
