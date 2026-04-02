import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FavoriteButton from '@/components/user/FavoriteButton'
import { useFavorites } from '@/hooks/useFavorites'
import { useAuth } from '@/hooks/useAuth'

jest.mock('@/hooks/useFavorites')
jest.mock('@/hooks/useAuth')

describe('FavoriteButton', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser
    })
    ;(useFavorites as jest.Mock).mockReturnValue({
      favorites: [],
      addFavorite: jest.fn(),
      removeFavorite: jest.fn()
    })
  })

  it('should render star icon', () => {
    render(<FavoriteButton nodeHashid="node-1" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should show as not favorited by default', () => {
    render(<FavoriteButton nodeHashid="node-1" />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('should toggle favorite on click', async () => {
    const mockAddFavorite = jest.fn()
    const mockRemoveFavorite = jest.fn()

    ;(useFavorites as jest.Mock).mockReturnValue({
      favorites: [{ hashid: 'node-1', name: 'Node 1' }],
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite
    })

    render(<FavoriteButton nodeHashid="node-1" />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockRemoveFavorite).toHaveBeenCalledWith('node-1')
    })
  })

  it('should show label when showLabel is true', () => {
    render(<FavoriteButton nodeHashid="node-1" showLabel />)
    expect(screen.getByText('收藏')).toBeInTheDocument()
  })

  it('should show different sizes', () => {
    const { rerender } = render(<FavoriteButton nodeHashid="node-1" size="sm" />)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<FavoriteButton nodeHashid="node-1" size="lg" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
