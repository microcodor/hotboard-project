import { renderHook, act, waitFor } from '@testing-library/react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// Mock useAuth
jest.mock('@/hooks/useAuth')
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn()
    }
  }
}))

describe('useUserProfile', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false
    })
  })

  it('should fetch user profile on mount', async () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      })
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect
    })

    const { result } = renderHook(() => useUserProfile())

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile)
    })
  })

  it('should update profile', async () => {
    const mockProfile = {
      id: 'test-user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        })
      })
    })

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        })
      }),
      update: mockUpdate
    })

    const { result } = renderHook(() => useUserProfile())

    await act(async () => {
      await result.current.updateProfile({ display_name: 'Updated Name' })
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Updated Name'
      })
    )
  })

  it('should handle profile fetch error', async () => {
    const mockError = new Error('Fetch failed')

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: mockError })
        })
      })
    })

    const { result } = renderHook(() => useUserProfile())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
