/**
 * 注册功能单元测试
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RegisterForm', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isInitialized: true,
      isAuthenticated: false,
      error: null,
      initialize: jest.fn(),
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      fetchProfile: jest.fn(),
      clearError: jest.fn(),
      signUpAndRedirect: jest.fn().mockResolvedValue({ success: true }),
      signInAndRedirect: jest.fn(),
      signOutAndRedirect: jest.fn(),
      requireAuth: jest.fn(),
      requireGuest: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染测试', () => {
    it('应该渲染注册表单的所有字段', () => {
      render(<RegisterForm />);

      // 检查所有输入字段
      expect(screen.getByLabelText(/用户名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/邮箱/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^密码/)).toBeInTheDocument();
      expect(screen.getByLabelText(/确认密码/)).toBeInTheDocument();
      
      // 检查提交按钮
      expect(screen.getByRole('button', { name: /注册账号/ })).toBeInTheDocument();
      
      // 检查登录链接
      expect(screen.getByText(/立即登录/)).toBeInTheDocument();
    });

    it('应该正确显示占位符文本', () => {
      render(<RegisterForm />);

      expect(screen.getByPlaceholderText('输入用户名')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/至少 8 位/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('再次输入密码')).toBeInTheDocument();
    });
  });

  describe('表单验证', () => {
    it('当邮箱格式不正确时应显示错误信息', async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/邮箱/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      // 输入无效邮箱
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/请输入有效的邮箱地址/)).toBeInTheDocument();
      });
    });

    it('当密码少于8位时应显示错误信息', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      await userEvent.type(passwordInput, 'short');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/密码至少需要 8 个字符/)).toBeInTheDocument();
      });
    });

    it('当密码不包含字母时应显示错误信息', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      await userEvent.type(passwordInput, '12345678');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/密码必须包含至少一个字母/)).toBeInTheDocument();
      });
    });

    it('当密码不包含数字时应显示错误信息', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      await userEvent.type(passwordInput, 'password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/密码必须包含至少一个数字/)).toBeInTheDocument();
      });
    });

    it('当两次密码不一致时应显示错误信息', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      const confirmPasswordInput = screen.getByLabelText(/确认密码/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      await userEvent.type(passwordInput, 'Password123');
      await userEvent.type(confirmPasswordInput, 'Password456');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/两次输入的密码不一致/)).toBeInTheDocument();
      });
    });

    it('当用户名包含特殊字符时应显示错误信息', async () => {
      render(<RegisterForm />);

      const usernameInput = screen.getByLabelText(/用户名/);
      const submitButton = screen.getByRole('button', { name: /注册账号/ });

      await userEvent.type(usernameInput, 'user@name!');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/用户名只能包含字母、数字、下划线和中文/)).toBeInTheDocument();
      });
    });
  });

  describe('密码强度指示器', () => {
    it('应该显示弱密码强度', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      await userEvent.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText('弱')).toBeInTheDocument();
      });
    });

    it('应该显示中等密码强度', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      await userEvent.type(passwordInput, 'Password');

      await waitFor(() => {
        expect(screen.getByText('中等')).toBeInTheDocument();
      });
    });

    it('应该显示强密码强度', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/);
      await userEvent.type(passwordInput, 'Password123');

      await waitFor(() => {
        expect(screen.getByText('强')).toBeInTheDocument();
      });
    });
  });

  describe('表单提交', () => {
    it('成功注册时应调用 signUpAndRedirect', async () => {
      const mockSignUpAndRedirect = jest.fn().mockResolvedValue({ success: true });
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        signUpAndRedirect: mockSignUpAndRedirect,
      });

      render(<RegisterForm />);

      // 填写表单
      await userEvent.type(screen.getByLabelText(/用户名/), 'testuser');
      await userEvent.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^密码/), 'Password123');
      await userEvent.type(screen.getByLabelText(/确认密码/), 'Password123');

      // 提交表单
      await userEvent.click(screen.getByRole('button', { name: /注册账号/ }));

      await waitFor(() => {
        expect(mockSignUpAndRedirect).toHaveBeenCalledWith(
          'test@example.com',
          'Password123',
          'testuser',
          undefined
        );
      });
    });

    it('注册失败时应显示错误信息', async () => {
      const mockSignUpAndRedirect = jest.fn().mockResolvedValue({
        success: false,
        error: '该邮箱已被注册',
      });
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        signUpAndRedirect: mockSignUpAndRedirect,
      });

      render(<RegisterForm />);

      // 填写表单
      await userEvent.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^密码/), 'Password123');
      await userEvent.type(screen.getByLabelText(/确认密码/), 'Password123');

      // 提交表单
      await userEvent.click(screen.getByRole('button', { name: /注册账号/ }));

      await waitFor(() => {
        expect(screen.getByText('该邮箱已被注册')).toBeInTheDocument();
      });
    });

    it('提交中应禁用按钮并显示加载状态', async () => {
      const mockSignUpAndRedirect = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoading: true,
        signUpAndRedirect: mockSignUpAndRedirect,
      });

      render(<RegisterForm />);

      const submitButton = screen.getByRole('button', { name: /注册中/ });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('注册中...')).toBeInTheDocument();
    });
  });

  describe('密码显示切换', () => {
    it('点击眼睛图标应切换密码显示状态', async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByLabelText(/^密码/) as HTMLInputElement;
      const toggleButton = passwordInput.parentElement?.querySelector('button');

      // 初始状态为 password
      expect(passwordInput.type).toBe('password');

      // 点击切换按钮
      if (toggleButton) {
        await userEvent.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        await userEvent.click(toggleButton);
        expect(passwordInput.type).toBe('password');
      }
    });
  });

  describe('自定义属性', () => {
    it('应接受并应用自定义类名', () => {
      const { container } = render(<RegisterForm className="custom-class" />);

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('应传递重定向 URL', async () => {
      const mockSignUpAndRedirect = jest.fn().mockResolvedValue({ success: true });
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        signUpAndRedirect: mockSignUpAndRedirect,
      });

      render(<RegisterForm redirectUrl="/dashboard" />);

      // 填写表单
      await userEvent.type(screen.getByLabelText(/邮箱/), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/^密码/), 'Password123');
      await userEvent.type(screen.getByLabelText(/确认密码/), 'Password123');

      await userEvent.click(screen.getByRole('button', { name: /注册账号/ }));

      await waitFor(() => {
        expect(mockSignUpAndRedirect).toHaveBeenCalledWith(
          'test@example.com',
          'Password123',
          undefined,
          '/dashboard'
        );
      });
    });
  });
});
