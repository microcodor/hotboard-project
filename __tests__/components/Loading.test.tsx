import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'jest';
import { Loading, CardSkeleton } from '@/components/common/Loading';

describe('Loading Component', () => {
  it('renders loading spinner', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with text', () => {
    render(<Loading text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { container } = render(<Loading size="sm" />);
    expect(container.querySelector('svg')).toHaveClass('h-4', 'w-4');
  });
});

describe('CardSkeleton Component', () => {
  it('renders skeleton placeholder', () => {
    render(<CardSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
