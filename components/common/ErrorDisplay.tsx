import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = '出错了',
  message,
  onRetry,
  className,
}: ErrorDisplayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center',
        className
      )}
    >
      <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
      <h3 className="mb-2 text-lg font-semibold text-red-900">{title}</h3>
      <p className="mb-4 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      )}
    </div>
  );
}

// 内联错误提示
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-red-500">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
