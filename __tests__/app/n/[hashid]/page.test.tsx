/**
 * 榜单详情页单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NodeDetailPage from '@/app/n/[hashid]/page'

// Mock fetch
global.fetch = jest.fn()

// Mock useNodeDetail hook
jest.mock('@/hooks/useNodes', () => ({
  useNodeDetail: jest.fn(),
}))

import { useNodeDetail } from '@/hooks/useNodes'

describe('NodeDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该显示加载状态', () => {
    ;(useNodeDetail as jest.Mock).mockReturnValue({
      node: null,
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    })

    render(
      <NodeDetailPage
        params={Promise.resolve({ hashid: 'test-node' })}
      />
    )

    expect(screen.getByText('加载榜单中...')).toBeInTheDocument()
  })

  it('应该显示榜单详情', async () => {
    ;(useNodeDetail as jest.Mock).mockReturnValue({
      node: {
        hashid: 'test-node',
        name: '测试榜单',
        display: '测试描述',
        logo: 'https://example.com/logo.png',
        items: [
          {
            title: '热点1',
            url: 'https://example.com/1',
            rank: 1,
          },
        ],
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isFavorited: false }),
    })

    render(
      <NodeDetailPage
        params={Promise.resolve({ hashid: 'test-node' })}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('测试榜单')).toBeInTheDocument()
      expect(screen.getByText('测试描述')).toBeInTheDocument()
    })
  })

  it('应该处理收藏功能', async () => {
    ;(useNodeDetail as jest.Mock).mockReturnValue({
      node: {
        hashid: 'test-node',
        name: '测试榜单',
        display: '测试描述',
        items: [],
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    })

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isFavorited: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

    render(
      <NodeDetailPage
        params={Promise.resolve({ hashid: 'test-node' })}
      />
    )

    await waitFor(() => {
      const favoriteButton = screen.getByText('收藏')
      fireEvent.click(favoriteButton)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/favorites/test-node',
      { method: 'POST' }
    )
  })

  it('应该显示错误状态', () => {
    ;(useNodeDetail as jest.Mock).mockReturnValue({
      node: null,
      isLoading: false,
      error: '榜单不存在',
      refresh: jest.fn(),
    })

    render(
      <NodeDetailPage
        params={Promise.resolve({ hashid: 'invalid-node' })}
      />
    )

    expect(screen.getByText('榜单不存在')).toBeInTheDocument()
  })
})
