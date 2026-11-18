import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-[#0D3A2B] text-white hover:bg-[#146B4A] active:scale-[0.99] shadow-xs border border-transparent',
    secondary:
      'bg-[#146B4A] text-white hover:bg-[#0D3A2B] active:scale-[0.99] shadow-xs border border-transparent',
    outline:
      'bg-white text-[#202A35] border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99]',
    ghost:
      'bg-transparent text-[#202A35] hover:bg-slate-100 border border-transparent',
    danger:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:scale-[0.99] shadow-xs border border-transparent',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs rounded-[10px] gap-1.5',
    md: 'h-10 sm:h-10 min-h-[40px] px-4 text-sm rounded-[11px] gap-2',
    lg: 'h-11 min-h-[44px] px-5 text-sm rounded-[12px] gap-2',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D3A2B] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200/90 rounded-[14px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-[10px] bg-slate-200/70', className)}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14 bg-white border border-slate-200/90 rounded-[14px]">
      <div className="w-12 h-12 rounded-[12px] bg-[#0D3A2B]/8 text-[#0D3A2B] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-base font-semibold text-[#202A35] mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-[#5E6875] max-w-md leading-relaxed mb-6">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-xl',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#202A35]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'w-full bg-white border border-slate-200 shadow-xl sm:rounded-[14px] rounded-t-[16px] max-h-[92vh] flex flex-col overflow-hidden',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200/80">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="font-display text-base font-semibold text-[#202A35] truncate"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#5E6875] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-slate-500 hover:text-[#202A35] hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Hapus',
  loading = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0',
              danger
                ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-600'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm text-[#475569] leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-[14px] p-6 space-y-4">
            <div className="w-11 h-11 rounded-[10px] bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-[#202A35]">
                Terjadi Gangguan Sistem
              </h1>
              <p className="text-sm text-[#5E6875] mt-1 leading-relaxed">
                Sistem mendeteksi kesalahan tak terduga saat memuat tampilan.
                Silakan muat ulang halaman untuk melanjutkan.
              </p>
            </div>
            <div className="p-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 break-all max-h-28 overflow-auto">
              {this.state.message}
            </div>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
