import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'jest';
import { Header } from '@/components/layout/Header';

describe('Header Component', () => {
  it('renders logo', () => {
    render(<Header />);
    expect(screen.getByText('HotBoard')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(<Header />);
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('榜单')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Header />);
    expect(screen.getByPlaceholderText('搜索榜单...')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: '切换主题' })).toBeInTheDocument();
  });
});
