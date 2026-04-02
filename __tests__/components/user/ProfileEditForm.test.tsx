import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileEditForm from '@/components/user/ProfileEditForm'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/hooks/useAuth'

jest.mock('@/hooks/useUserProfile')
jest.mock('@/hooks/useAuth')

describe('ProfileEditForm', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  }

  const mockProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    display_name: 'Test User',
    bio: 'Test bio',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser
    })
    ;(useUserProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      updateProfile: jest.fn(),
      error: null
    })
  })

  it('should render form with profile data', () => {
    render(<ProfileEditForm />)
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument()
  })

  it('should show email as disabled', () => {
    render(<ProfileEditForm />)
    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toBeDisabled()
  })

  it('should call updateProfile on save', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(undefined)
    ;(useUserProfile as jest.Mock).mockReturnValue({
      profile: mockProfile,
      updateProfile: mockUpdateProfile,
      error: null
    })

    render(<ProfileEditForm />)

    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

    const saveButton = screen.getByText('保存修改')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Updated Name'
        })
      )
    })
  })

  it('should show character count', () => {
    render(<ProfileEditForm />)
    expect(screen.getByText('Test User.length/50')).toBeInTheDocument()
  })
})
