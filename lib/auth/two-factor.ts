/**
 * 两步验证（2FA/TOTP）服务
 */

import { createServerClient } from '../supabase';
import { authAudit } from './audit-logger';
import * as crypto from 'crypto';

// TOTP 配置
const TOTP_CONFIG = {
  digits: 6,
  period: 30, // 30 秒有效期
  algorithm: 'sha1',
  issuer: 'HotBoard',
};

/**
 * 生成 Base32 编码的密钥
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * 生成 TOTP 密钥
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * 生成 TOTP URI（用于二维码）
 */
export function generateTOTPUri(
  secret: string,
  email: string
): string {
  const issuer = encodeURIComponent(TOTP_CONFIG.issuer);
  const accountName = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_CONFIG.algorithm}&digits=${TOTP_CONFIG.digits}&period=${TOTP_CONFIG.period}`;
}

/**
 * 计算 TOTP 代码
 */
function calculateTOTP(secret: string, time: number): string {
  // Base32 解码
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');

  let bits = '';
  for (const char of cleanSecret) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const buffer = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  }

  // 计算时间步长
  const counter = Math.floor(time / TOTP_CONFIG.period);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // HMAC
  const hmac = crypto.createHmac(TOTP_CONFIG.algorithm, buffer);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  // 动态截断
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  ) % Math.pow(10, TOTP_CONFIG.digits);

  return code.toString().padStart(TOTP_CONFIG.digits, '0');
}

/**
 * 验证 TOTP 代码
 */
export function verifyTOTP(
  secret: string,
  code: string,
  window: number = 1
): boolean {
  const currentTime = Math.floor(Date.now() / 1000);

  // 检查当前时间和前后时间窗口
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i * TOTP_CONFIG.period;
    const expectedCode = calculateTOTP(secret, time);
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * 生成备用码
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * 2FA 设置状态
 */
export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  backupCodesRemaining: number;
  lastUsedAt?: string;
}

/**
 * 启用 2FA
 */
export async function enableTwoFactor(
  userId: string
): Promise<{ success: boolean; secret?: string; uri?: string; backupCodes?: string[]; error?: string }> {
  const serverClient = createServerClient();

  try {
    // 生成密钥
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes();

    // 获取用户邮箱
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    // 生成 URI
    const uri = generateTOTPUri(secret, user.email!);

    // 存储（未验证状态）
    await serverClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        two_factor: {
          secret,
          backupCodes,
          enabled: false,
          verified: false,
          setupAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      secret,
      uri,
      backupCodes,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '启用两步验证失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证并激活 2FA
 */
export async function verifyAndEnableTwoFactor(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const serverClient = createServerClient();

  try {
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    const twoFactor = user.user_metadata?.two_factor;
    if (!twoFactor?.secret) {
      return { success: false, error: '请先设置两步验证' };
    }

    // 验证 TOTP 代码
    if (!verifyTOTP(twoFactor.secret, code)) {
      await authAudit.logSecurityEvent(userId, 'two_factor_verify_failed', {});
      return { success: false, error: '验证码错误' };
    }

    // 激活 2FA
    await serverClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        two_factor: {
          ...twoFactor,
          enabled: true,
          verified: true,
          enabledAt: new Date().toISOString(),
        },
      },
    });

    await authAudit.logSecurityEvent(userId, 'two_factor_enabled', {});

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '验证两步验证失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 验证 2FA 代码（登录时）
 */
export async function verifyTwoFactorCode(
  userId: string,
  code: string
): Promise<{ success: boolean; isBackupCode?: boolean; error?: string }> {
  const serverClient = createServerClient();

  try {
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    const twoFactor = user.user_metadata?.two_factor;
    if (!twoFactor?.enabled) {
      return { success: false, error: '未启用两步验证' };
    }

    // 尝试验证 TOTP
    if (verifyTOTP(twoFactor.secret, code)) {
      await authAudit.logSecurityEvent(userId, 'two_factor_verified', {});
      return { success: true };
    }

    // 尝试备用码
    const backupCodes: string[] = twoFactor.backupCodes || [];
    const backupCodeIndex = backupCodes.indexOf(code);
    if (backupCodeIndex !== -1) {
      // 移除已使用的备用码
      backupCodes.splice(backupCodeIndex, 1);
      
      await serverClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          two_factor: {
            ...twoFactor,
            backupCodes,
            lastBackupCodeAt: new Date().toISOString(),
          },
        },
      });

      await authAudit.logSecurityEvent(userId, 'two_factor_backup_code_used', {
        codesRemaining: backupCodes.length,
      });

      return { success: true, isBackupCode: true };
    }

    await authAudit.logSecurityEvent(userId, 'two_factor_verify_failed', {});

    return { success: false, error: '验证码错误' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '验证失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 禁用 2FA
 */
export async function disableTwoFactor(
  userId: string,
  code?: string
): Promise<{ success: boolean; error?: string }> {
  const serverClient = createServerClient();

  try {
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    const twoFactor = user.user_metadata?.two_factor;
    if (!twoFactor?.enabled) {
      return { success: false, error: '未启用两步验证' };
    }

    // 如果提供了验证码，需要验证
    if (code) {
      if (!verifyTOTP(twoFactor.secret, code)) {
        return { success: false, error: '验证码错误' };
      }
    }

    // 禁用 2FA
    await serverClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        two_factor: {
          enabled: false,
          disabledAt: new Date().toISOString(),
        },
      },
    });

    await authAudit.logSecurityEvent(userId, 'two_factor_disabled', {});

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '禁用两步验证失败';
    return { success: false, error: errorMessage };
  }
}

/**
 * 获取 2FA 状态
 */
export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const serverClient = createServerClient();

  try {
    const { data: { user } } = await serverClient.auth.admin.getUserById(userId);
    
    if (!user?.user_metadata?.two_factor) {
      return { enabled: false, verified: false, backupCodesRemaining: 0 };
    }

    const tf = user.user_metadata.two_factor;
    return {
      enabled: tf.enabled || false,
      verified: tf.verified || false,
      backupCodesRemaining: tf.backupCodes?.length || 0,
      lastUsedAt: tf.lastUsedAt,
    };
  } catch {
    return { enabled: false, verified: false, backupCodesRemaining: 0 };
  }
}

/**
 * 重新生成备用码
 */
export async function regenerateBackupCodes(
  userId: string,
  code: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const serverClient = createServerClient();

  try {
    const { data: { user }, error: userError } = await serverClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: '用户不存在' };
    }

    const twoFactor = user.user_metadata?.two_factor;
    if (!twoFactor?.enabled) {
      return { success: false, error: '未启用两步验证' };
    }

    // 验证 TOTP
    if (!verifyTOTP(twoFactor.secret, code)) {
      return { success: false, error: '验证码错误' };
    }

    // 生成新备用码
    const newBackupCodes = generateBackupCodes();

    await serverClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...user.user_metadata,
        two_factor: {
          ...twoFactor,
          backupCodes: newBackupCodes,
          backupCodesGeneratedAt: new Date().toISOString(),
        },
      },
    });

    await authAudit.logSecurityEvent(userId, 'backup_codes_regenerated', {});

    return { success: true, backupCodes: newBackupCodes };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '重新生成备用码失败';
    return { success: false, error: errorMessage };
  }
}
