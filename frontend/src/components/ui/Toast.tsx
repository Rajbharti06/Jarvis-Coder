import React, { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';

const Toast: React.FC = () => {
  const { toasts = [], removeToast } = useAppStore();

  useEffect(() => {
    toasts.forEach((t) => {
      const duration = t.duration ?? 3000;
      const timer = setTimeout(() => removeToast(t.id), duration);
      return () => clearTimeout(timer);
    });
  }, [toasts, removeToast]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass-card min-w-[280px] max-w-[360px] px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 ${
            toast.type === 'success' ? 'border-green-400/40' : ''
          } ${toast.type === 'error' ? 'border-red-400/40' : ''} ${
            toast.type === 'warning' ? 'border-yellow-400/40' : ''
          }`}
        >
          <div className="flex-1">
            <div className="text-white/90 font-medium text-sm">{toast.title}</div>
            {toast.message && (
              <div className="text-white/60 text-xs mt-0.5">{toast.message}</div>
            )}
          </div>
          {toast.action && (
            <button
              className="text-primary text-xs px-2 py-1 rounded hover:bg-primary/10"
              onClick={() => toast.action?.onClick()}
            >
              {toast.action.label}
            </button>
          )}
          <button
            aria-label="Dismiss"
            className="text-white/40 hover:text-white/70 text-xs"
            onClick={() => removeToast(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;