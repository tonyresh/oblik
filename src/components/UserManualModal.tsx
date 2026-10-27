import React from 'react';
import { X } from 'lucide-react';
import UserManualView from './UserManualView';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManualModal({ isOpen, onClose }: UserManualModalProps) {
  if (!isOpen) return null;

  return (
    <div className="user-manual-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="user-manual-modal-card bg-card w-full max-w-6xl h-[95vh] rounded-3xl border border-border/80 shadow-2xl flex flex-col overflow-hidden text-foreground font-sans relative">
        
        {/* Close Button at top-right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2.5 bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground rounded-2xl transition-colors cursor-pointer shadow-xs no-print"
          title="Закрити посібник (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container with UserManualView */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <UserManualView embeddedInSettings={false} />
        </div>
      </div>
    </div>
  );
}
