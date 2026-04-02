/**
 * 卡密生成与验证工具
 * 格式: HBPRO-XXXX-XXXX-XXXX-XXXX
 */
import crypto from 'crypto'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆字符 0/O/1/I

export function generateCardCode(prefix = 'HB'): string {
  const seg = () => Array.from({ length: 4 }, () => CHARS[crypto.randomInt(CHARS.length)]).join('')
  return `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`
}

export function generateBatch(count: number, prefix = 'HB'): string[] {
  const codes = new Set<string>()
  while (codes.size < count) codes.add(generateCardCode(prefix))
  return [...codes]
}

/** 根据套餐 slug 生成对应前缀 */
export function prefixForPlan(slug: string): string {
  const map: Record<string, string> = {
    basic: 'HBB',
    pro: 'HBP',
    enterprise: 'HBE',
    credits: 'HBC',
  }
  return map[slug] || 'HB'
}
