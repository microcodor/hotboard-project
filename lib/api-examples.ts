/**
 * API 使用示例和快速开始指南
 */

// ============================================
// 1. 搜索 API 使用示例
// ============================================

/**
 * 基础搜索
 */
async function basicSearch() {
  const response = await fetch('/api/search?q=热点&page=1&pageSize=20');
  const data = await response.json();
  
  if (data.success) {
    console.log('搜索结果:', data.data.items);
    console.log('总数:', data.data.total);
    console.log('是否有更多:', data.data.hasMore);
  }
}

/**
 * 带排序的搜索
 */
async function searchWithSort() {
  const response = await fetch(
    '/api/search?q=热点&page=1&pageSize=20&sortBy=hot'
  );
  const data = await response.json();
  return data.data.items; // 按热度排序
}

/**
 * 已登录用户搜索 (显示收藏状态)
 */
async function searchAsLoggedInUser(token: string) {
  const response = await fetch('/api/search?q=热点', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();
  
  // 每个结果都包含 is_favorited 字段
  data.data.items.forEach((item: any) => {
    console.log(`${item.title} - 已收藏: ${item.is_favorited}`);
  });
}

/**
 * 分页搜索
 */
async function paginatedSearch(query: string, page: number) {
  const pageSize = 20;
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
  );
  const data = await response.json();
  
  return {
    items: data.data.items,
    currentPage: data.data.page,
    totalPages: Math.ceil(data.data.total / pageSize),
    hasMore: data.data.hasMore,
  };
}

// ============================================
// 2. 用户资料 API 使用示例
// ============================================

/**
 * 获取用户资料
 */
async function getUserProfile(token: string) {
  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('获取用户资料失败');
  }
  
  const data = await response.json();
  return data.data; // UserProfile
}

/**
 * 更新用户资料
 */
async function updateUserProfile(
  token: string,
  updates: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  }
) {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const data = await response.json();
  return data.data; // 更新后的 UserProfile
}

/**
 * 更新用户名
 */
async function updateDisplayName(token: string, newName: string) {
  return updateUserProfile(token, { display_name: newName });
}

/**
 * 更新用户头像
 */
async function updateAvatar(token: string, avatarUrl: string) {
  return updateUserProfile(token, { avatar_url: avatarUrl });
}

/**
 * 更新用户简介
 */
async function updateBio(token: string, bio: string) {
  return updateUserProfile(token, { bio });
}

// ============================================
// 3. 收藏 API 使用示例
// ============================================

/**
 * 获取收藏列表
 */
async function getFavorites(token: string, page: number = 1) {
  const response = await fetch(
    `/api/favorites?page=${page}&pageSize=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return {
    items: data.data.items, // Node[]
    total: data.data.total,
    hasMore: data.data.hasMore,
  };
}

/**
 * 添加收藏
 */
async function addFavorite(token: string, nodeHashid: string) {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodeHashid }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

/**
 * 删除收藏
 */
async function removeFavorite(token: string, nodeHashid: string) {
  const response = await fetch(
    `/api/favorites?nodeHashid=${nodeHashid}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return await response.json();
}

/**
 * 切换收藏状态
 */
async function toggleFavorite(
  token: string,
  nodeHashid: string,
  isFavorited: boolean
) {
  if (isFavorited) {
    return removeFavorite(token, nodeHashid);
  } else {
    return addFavorite(token, nodeHashid);
  }
}

/**
 * 批量添加收藏
 */
async function addMultipleFavorites(
  token: string,
  nodeHashids: string[]
) {
  const results = await Promise.allSettled(
    nodeHashids.map(hashid => addFavorite(token, hashid))
  );
  
  return {
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
  };
}

// ============================================
// 4. 完整的使用流程示例
// ============================================

/**
 * 用户登录后的初始化流程
 */
async function initializeUserSession(token: string) {
  try {
    // 1. 获取用户资料
    const profile = await getUserProfile(token);
    console.log('用户资料:', profile);
    
    // 2. 获取用户收藏
    const favorites = await getFavorites(token);
    console.log('收藏数量:', favorites.total);
    
    // 3. 返回初始化数据
    return {
      profile,
      favorites: favorites.items,
      favoriteCount: favorites.total,
    };
  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  }
}

/**
 * 搜索并收藏流程
 */
async function searchAndFavorite(
  token: string,
  query: string,
  nodeHashidToFavorite: string
) {
  try {
    // 1. 搜索
    const searchResponse = await fetch(
      `/api/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    const searchData = await searchResponse.json();
    
    // 2. 找到要收藏的项
    const itemToFavorite = searchData.data.items.find(
      (item: any) => item.node_hashid === nodeHashidToFavorite
    );
    
    if (!itemToFavorite) {
      throw new Error('未找到要收藏的项');
    }
    
    // 3. 如果还没收藏，则添加收藏
    if (!itemToFavorite.is_favorited) {
      await addFavorite(token, nodeHashidToFavorite);
      console.log('收藏成功');
    } else {
      console.log('已经收藏过了');
    }
    
    return itemToFavorite;
  } catch (error) {
    console.error('搜索和收藏失败:', error);
    throw error;
  }
}

/**
 * 更新用户资料并验证
 */
async function updateAndVerifyProfile(
  token: string,
  updates: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  }
) {
  try {
    // 1. 更新资料
    const updated = await updateUserProfile(token, updates);
    console.log('资料已更新');
    
    // 2. 验证更新
    const verified = await getUserProfile(token);
    
    // 3. 检查是否匹配
    const isMatched = Object.entries(updates).every(
      ([key, value]) => verified[key as keyof typeof verified] === value
    );
    
    if (isMatched) {
      console.log('验证成功');
    } else {
      console.warn('验证失败，数据不匹配');
    }
    
    return verified;
  } catch (error) {
    console.error('更新和验证失败:', error);
    throw error;
  }
}

// ============================================
// 5. React Hook 示例
// ============================================

/**
 * useSearch Hook
 */
function useSearch(token?: string) {
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  
  const search = React.useCallback(
    async (query: string, sortBy: string = 'relevance') => {
      setLoading(true);
      setError(null);
      
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&page=${page}&sortBy=${sortBy}`,
          { headers }
        );
        
        const data = await response.json();
        
        if (data.success) {
          setResults(data.data.items);
          setHasMore(data.data.hasMore);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜索失败');
      } finally {
        setLoading(false);
      }
    },
    [token, page]
  );
  
  return { results, loading, error, page, setPage, hasMore, search };
}

/**
 * useFavorites Hook
 */
function useFavorites(token: string) {
  const [favorites, setFavorites] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const loadFavorites = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getFavorites(token);
      setFavorites(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载收藏失败');
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const addFav = React.useCallback(
    async (nodeHashid: string) => {
      try {
        await addFavorite(token, nodeHashid);
        await loadFavorites();
      } catch (err) {
        setError(err instanceof Error ? err.message : '添加收藏失败');
      }
    },
    [token, loadFavorites]
  );
  
  const removeFav = React.useCallback(
    async (nodeHashid: string) => {
      try {
        await removeFavorite(token, nodeHashid);
        await loadFavorites();
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除收藏失败');
      }
    },
    [token, loadFavorites]
  );
  
  React.useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);
  
  return {
    favorites,
    loading,
    error,
    addFavorite: addFav,
    removeFavorite: removeFav,
    reload: loadFavorites,
  };
}

/**
 * useUserProfile Hook
 */
function useUserProfile(token: string) {
  const [profile, setProfile] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getUserProfile(token);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载资料失败');
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  const updateProfile = React.useCallback(
    async (updates: any) => {
      setLoading(true);
      setError(null);
      
      try {
        const updated = await updateUserProfile(token, updates);
        setProfile(updated);
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新失败';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token]
  );
  
  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);
  
  return {
    profile,
    loading,
    error,
    updateProfile,
    reload: loadProfile,
  };
}

// ============================================
// 6. 错误处理示例
// ============================================

/**
 * 统一的 API 错误处理
 */
class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 安全的 API 调用包装
 */
async function safeAPICall<T>(
  fn: () => Promise<T>,
  errorMessage: string = '操作失败'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof APIError) {
      console.error(`[${error.code}] ${error.message}`);
      throw error;
    }
    
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * 使用示例
 */
async function exampleWithErrorHandling(token: string) {
  try {
    const profile = await safeAPICall(
      () => getUserProfile(token),
      '获取用户资料失败'
    );
    
    console.log('用户资料:', profile);
  } catch (error) {
    console.error('错误:', error);
  }
}

export {
  // 搜索 API
  basicSearch,
  searchWithSort,
  searchAsLoggedInUser,
  paginatedSearch,
  
  // 用户资料 API
  getUserProfile,
  updateUserProfile,
  updateDisplayName,
  updateAvatar,
  updateBio,
  
  // 收藏 API
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  addMultipleFavorites,
  
  // 完整流程
  initializeUserSession,
  searchAndFavorite,
  updateAndVerifyProfile,
  
  // React Hooks
  useSearch,
  useFavorites,
  useUserProfile,
  
  // 错误处理
  APIError,
  safeAPICall,
};
