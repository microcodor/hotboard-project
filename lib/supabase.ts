/**
 * 数据库客户端配置
 * 支持 PostgreSQL（本地）模式 和 Supabase 云模式
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 判断是否使用 Supabase
const useSupabase = !!(supabaseUrl && supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://'));

// 创建一个完整的模拟查询构建器（支持任意链式调用）
function createMockQueryBuilder(): any {
  const builder: any = {
    select: () => createMockQueryBuilder(),
    insert: () => createMockQueryBuilder(),
    update: () => createMockQueryBuilder(),
    delete: () => createMockQueryBuilder(),
    upsert: () => createMockQueryBuilder(),
    eq: () => createMockQueryBuilder(),
    neq: () => createMockQueryBuilder(),
    gt: () => createMockQueryBuilder(),
    gte: () => createMockQueryBuilder(),
    lt: () => createMockQueryBuilder(),
    lte: () => createMockQueryBuilder(),
    like: () => createMockQueryBuilder(),
    ilike: () => createMockQueryBuilder(),
    is: () => createMockQueryBuilder(),
    in: () => createMockQueryBuilder(),
    contains: () => createMockQueryBuilder(),
    containedBy: () => createMockQueryBuilder(),
    order: () => createMockQueryBuilder(),
    limit: () => createMockQueryBuilder(),
    range: () => createMockQueryBuilder(),
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    csv: () => Promise.resolve({ data: '', error: null }),
    // 让 builder 本身也是 thenable（可以 await）
    then: (resolve: any) => resolve({ data: [], error: null }),
    catch: (reject: any) => ({ then: (r: any) => r({ data: [], error: null }) }),
  };
  return builder;
}

// 创建模拟 auth 对象
function createMockAuth() {
  const noSession = { data: { session: null }, error: null };
  const noUser = { data: { user: null }, error: null };
  return {
    getSession: () => Promise.resolve(noSession),
    getUser: () => Promise.resolve(noUser),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Not configured' } }),
    signInWithOAuth: () => Promise.resolve({ data: { url: null, provider: null }, error: { message: 'Not configured' } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Not configured' } }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      // 立即触发一次 SIGNED_OUT 事件
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    exchangeCodeForSession: () => Promise.resolve(noSession),
  };
}

// 创建模拟 Supabase 客户端（PostgreSQL 模式）
function createMockSupabaseClient() {
  return {
    from: (_table: string) => createMockQueryBuilder(),
    auth: createMockAuth(),
    storage: {
      from: (_bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
      }),
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
    channel: (_name: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    removeAllChannels: () => {},
  };
}

// 创建 Supabase 客户端（仅在配置了真实 Supabase 时）
let _supabase: any = null;

function getSupabaseClient() {
  if (!useSupabase) return createMockSupabaseClient();
  if (_supabase) return _supabase;

  try {
    const { createClient } = require('@supabase/supabase-js');
    _supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return _supabase;
  } catch {
    return createMockSupabaseClient();
  }
}

// 导出 supabase 客户端
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return client[prop];
  }
});

// 服务器端客户端
export function createServerClient() {
  if (!useSupabase) return createMockSupabaseClient();
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch {
    return createMockSupabaseClient();
  }
}

// 管理员客户端
export function getSupabaseAdmin() {
  if (!useSupabase) return createMockSupabaseClient();
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch {
    return createMockSupabaseClient();
  }
}

// 导出模式标识
export const DB_MODE = useSupabase ? 'supabase' : 'postgresql';

if (process.env.NODE_ENV === 'development') {
  console.log(`[DB] Mode: ${DB_MODE}`);
}
