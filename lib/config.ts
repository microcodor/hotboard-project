/**
 * 应用配置管理
 * 支持 PostgreSQL 本地模式 和 Supabase 云模式
 */

import { z } from 'zod';

// 判断是否使用 Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const USE_SUPABASE = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

// 配置 Schema 验证（宽松模式，支持占位符）
const configSchema = z.object({
  supabase: z.object({
    url: z.string().default(''),
    anonKey: z.string().default(''),
    serviceRoleKey: z.string().optional(),
  }),

  // PostgreSQL 配置
  postgres: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    database: z.string().default('hotboard'),
    user: z.string().default('hotboard'),
    password: z.string().default('hotboard123'),
  }),

  // TopHub API 配置
  tophub: z.object({
    apiKey: z.string().default(''),
    baseUrl: z.string().default('https://api.tophubdata.com'),
    timeout: z.number().positive().default(30000),
    retries: z.number().int().min(0).max(5).default(3),
  }),

  // 应用配置
  app: z.object({
    url: z.string().default('http://localhost:3000'),
    name: z.string().default('HotBoard'),
    env: z.enum(['development', 'production', 'test']).default('development'),
  }),

  // 缓存配置
  cache: z.object({
    ttl: z.number().positive().default(600),
    maxSize: z.number().positive().default(1000),
  }),

  // 速率限制配置
  rateLimit: z.object({
    maxRequests: z.number().positive().default(100),
    windowMs: z.number().positive().default(60000),
  }),
});

export type Config = z.infer<typeof configSchema>;

function getConfig(): Config {
  const isServer = typeof window === 'undefined';

  return configSchema.parse({
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined,
    },
    postgres: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      database: process.env.PG_DATABASE || 'hotboard',
      user: process.env.PG_USER || 'hotboard',
      password: process.env.PG_PASSWORD || 'hotboard123',
    },
    tophub: {
      apiKey: process.env.TOPHUB_API_KEY || '',
      baseUrl: process.env.TOPHUB_API_BASE_URL || 'https://api.tophubdata.com',
      timeout: parseInt(process.env.TOPHUB_API_TIMEOUT || '30000', 10),
      retries: parseInt(process.env.TOPHUB_API_RETRIES || '3', 10),
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      name: process.env.NEXT_PUBLIC_APP_NAME || 'HotBoard',
      env: (process.env.NODE_ENV as any) || 'development',
    },
    cache: {
      ttl: parseInt(process.env.CACHE_TTL || '600', 10),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    },
    rateLimit: {
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    },
  });
}

let config: Config | null = null;

export function getConfigInstance(): Config {
  if (!config) {
    config = getConfig();
  }
  return config;
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!USE_SUPABASE) {
    // PostgreSQL 模式：检查 PG 配置
    if (!process.env.PG_HOST && !process.env.DATABASE_URL) {
      // 使用默认值，不报错
    }
  } else {
    // Supabase 模式：检查 Supabase 配置
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }
  }

  return { valid: errors.length === 0, errors };
}

export const appConfig = {
  get supabase() { return getConfigInstance().supabase; },
  get postgres() { return getConfigInstance().postgres; },
  get tophub() { return getConfigInstance().tophub; },
  get app() { return getConfigInstance().app; },
  get cache() { return getConfigInstance().cache; },
  get rateLimit() { return getConfigInstance().rateLimit; },
};
