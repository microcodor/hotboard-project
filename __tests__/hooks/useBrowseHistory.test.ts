import { renderHook, act, waitFor } from '@testing-library/react'
import { useBrowseHistory } from '@/hooks/useBrowseHistory'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

jest.mock('@/hooks/useAuth')
jest.mock('@/lib/supabase')

describe('useBrowseHistory', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false
    })
  })

  it('should fetch browse history', async () => {
    const mockHistory = [
      {
        id: '1',
        user_id: 'test-user-id',
        node_hashid: 'node-1',
        node_name: 'Node 1',
        viewed_at: new Date().toISOString()
      }
    ]

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: mockHistory, error: null })
        })
      })
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect
    })

    const { result } = renderHook(() => useBrowseHistory())

    await waitFor(() => {
      expect(result.current.history).toEqual(mockHistory)
    })
  })

  it('should add to history', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })

    ;(supabase.from as jest.Mock).mockReturnValue({
      insert: mockInsert,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    })

    const { result } = renderHook(() => useBrowseHistory())

    await act(async () => {
      await result.current.addToHistory('node-1', 'Node 1')
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test-user-id',
        node_hashid: 'node-1',
        node_name: 'Node 1'
      })
    )
  })

  it('should clear history', async () => {
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      delete: mockDelete,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      })
    })

    const { result } = renderHook(() => useBrowseHistory())

    await act(async () => {
      await result.current.clearHistory()
    })

    expect(mockDelete).toHaveBeenCalled()
  })
})
