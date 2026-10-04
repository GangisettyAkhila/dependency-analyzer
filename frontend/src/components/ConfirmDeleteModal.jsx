import React, { useEffect, useRef } from 'react';

export default function ConfirmDeleteModal({ isOpen, scanFilename, onConfirm, onCancel, isDeleting }) {
  const cancelButtonRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll('button:not([disabled])');
        if (focusables.length === 0) return;
        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60 flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#30363D] max-w-sm w-full p-6 space-y-4 shadow-lg text-slate-900 dark:text-[#C9D1D9] my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <h2 id="delete-modal-title" className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3]">
            Delete scan record?
          </h2>
          <p id="delete-modal-description" className="text-sm font-normal text-slate-500 dark:text-[#8B949E] leading-relaxed">
            This action will permanently remove {scanFilename ? <span className="font-mono font-medium text-slate-700 dark:text-[#C9D1D9]">{scanFilename}</span> : 'this scan'} from the local SQLite history.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-9 px-4 rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#30363D] text-slate-700 dark:text-[#C9D1D9] text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
