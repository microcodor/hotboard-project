/**
 * 首页单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePage from '@/app/page'

// Mock fetch
global.fetch = jest.fn()

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该渲染首页标题', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 1, name: '科技', sort_order: 1 },
          { id: 2, name: '娱乐', sort_order: 2 },
        ],
      }),
    })

    render(<HomePage />)

    expect(screen.getByText('HotBoard')).toBeInTheDocument()
    expect(screen.getByText('全网热榜聚合平台 - 一站式热点追踪服务')).toBeInTheDocument()
  })

  it('应该加载分类列表', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 1, name: '科技', sort_order: 1 },
          { id: 2, name: '娱乐', sort_order: 2 },
        ],
      }),
    })

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('科技')).toBeInTheDocument()
      expect(screen.getByText('娱乐')).toBeInTheDocument()
    })
  })

  it('应该处理分类切换', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, name: '科技', sort_order: 1 },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
        }),
      })

    render(<HomePage />)

    await waitFor(() => {
      const techButton = screen.getByText('科技')
      fireEvent.click(techButton)
    })

    expect(global.fetch).toHaveBeenCalled()
  })

  it('应该显示加载状态', () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // 永不resolve
    )

    render(<HomePage />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该处理加载错误', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('加载分类失败')
    )

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByText('加载分类失败')).toBeInTheDocument()
    })
  })
})
