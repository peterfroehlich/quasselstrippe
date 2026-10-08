import { useEffect, useRef } from 'react';

export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    (focusable()[0] || dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0], last = elements.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
      // Study shortcuts must not run behind an open dialog.
      event.stopPropagation();
    };
    dialog.addEventListener('keydown', handleKey);
    return () => { dialog.removeEventListener('keydown', handleKey); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, [open]);
  return ref;
}
