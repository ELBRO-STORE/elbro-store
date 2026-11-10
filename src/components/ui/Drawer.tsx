import { Fragment, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      drawerRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen || !closeOnEscape) return;
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'w-72',
    md: 'w-96',
    lg: 'max-w-xl',
    full: 'max-w-2xl',
  };

  const positions = {
    right: 'right-0',
    left: 'left-0',
  };

  const drawerContent = (
    <Fragment>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 z-50 flex">
        <div
          ref={drawerRef}
          tabIndex={-1}
          className={cn(
            'flex flex-col bg-elbro-900 border-l border-elbro-400/20 shadow-2xl',
            'transform transition-transform duration-300 ease-in-out',
            'translate-x-0',
            positions[position],
            sizes[size]
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'drawer-title' : undefined}
        >
          {(title || !children) && (
            <div className="flex items-center justify-between p-4 border-b border-elbro-400/10 flex-shrink-0">
              {title && (
                <h2 id="drawer-title" className="text-lg font-semibold text-elbro-100">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </Fragment>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(drawerContent, document.body);
}