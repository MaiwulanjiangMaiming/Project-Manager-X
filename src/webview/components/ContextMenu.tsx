import React, { useEffect, useRef } from 'react';

interface MenuItem {
  icon?: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 10000,
  };

  return (
    <div className="context-menu" ref={menuRef} style={style}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider ? (
            <div className="context-menu-divider" />
          ) : (
            <button
              className={`context-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {item.icon && <span className="context-menu-icon">{item.icon}</span>}
              <span className="context-menu-label">{item.label}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
