import { useEffect, useCallback, useState } from 'react';

interface KeyboardNavOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onSecondarySelect?: (index: number) => void;
  onDelete?: (index: number) => void;
  onSearch?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardNav({
  itemCount,
  onSelect,
  onSecondarySelect,
  onDelete,
  onSearch,
  onEscape,
  enabled = true,
}: KeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || itemCount === 0) return;

    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          onSecondarySelect?.(focusedIndex);
        } else {
          onSelect(focusedIndex);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (onDelete) {
          e.preventDefault();
          onDelete(focusedIndex);
        }
        break;
      case '/':
        if (onSearch) {
          e.preventDefault();
          onSearch();
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }
  }, [enabled, itemCount, focusedIndex, onSelect, onSecondarySelect, onDelete, onSearch, onEscape]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (focusedIndex >= itemCount && itemCount > 0) {
      setFocusedIndex(Math.max(0, itemCount - 1));
    }
  }, [itemCount, focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
  };
}
