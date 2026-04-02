import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'jest';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';

describe('ErrorDisplay Component', () => {
  it('renders error message', () => {
    render(<ErrorDisplay message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorDisplay title="Error" message="Test error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<ErrorDisplay message="Error" onRetry={onRetry} />);
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorDisplay message="Error" onRetry={onRetry} />);
    screen.getByText('重试').click();
    expect(onRetry).toHaveBeenCalled();
  });
});
