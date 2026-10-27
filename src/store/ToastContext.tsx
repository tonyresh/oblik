import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTheme } from './ThemeContext';
import { X, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Sound URLs
const SUCCESS_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
const ERROR_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { toastsEnabled, soundsEnabled, toastDuration } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (type: ToastType) => {
    if (!soundsEnabled) return;
    try {
      const soundUrl = type === 'error' ? ERROR_SOUND : SUCCESS_SOUND;
      const audio = new Audio(soundUrl);
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Audio play blocked or failed', e));
    } catch (e) {
      console.error('Audio error', e);
    }
  };

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    playSound(type);
    
    if (!toastsEnabled) return;

    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, toastDuration * 1000); // Dynamic duration in milliseconds
  }, [toastsEnabled, soundsEnabled, toastDuration]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border min-w-[300px] max-w-md
                ${toast.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 
                  toast.type === 'error' ? 'bg-red-500 border-red-400 text-white' : 
                  'bg-blue-500 border-blue-400 text-white'}
              `}
            >
              <div className="shrink-0">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'info' && <Bell className="w-5 h-5" />}
              </div>
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
              <button 
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
