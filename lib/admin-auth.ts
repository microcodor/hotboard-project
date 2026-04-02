/**
 * 管理员鉴权工具
 */
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'hotboard-admin-secret-2026'

export interface AdminPayload {
  adminId: number
  email: string
  role: string
}

export function verifyAdminToken(request: NextRequest): AdminPayload {
  const token = request.cookies.get('admin_token')?.value
  if (!token) throw new Error('未登录')
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminPayload
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: '8h' })
}
