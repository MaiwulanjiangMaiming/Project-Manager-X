let tooltipEl: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function getTooltipEl(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'pm-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function initTooltip(): () => void {
  const onMouseOver = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-tip]') as HTMLElement | null;
    if (!target) return;

    const tip = target.getAttribute('data-tip');
    if (!tip) return;

    clearHideTimer();

    const el = getTooltipEl();
    el.textContent = tip;
    el.classList.add('visible');

    const pos = target.getAttribute('data-tip-pos') || 'top';
    const rect = target.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();

    let top: number;
    let left: number;

    if (pos === 'bottom') {
      top = rect.bottom + 6;
      left = rect.left + rect.width / 2 - tipRect.width / 2;
    } else if (pos === 'left') {
      top = rect.top + rect.height / 2 - tipRect.height / 2;
      left = rect.left - tipRect.width - 6;
    } else {
      top = rect.top - tipRect.height - 6;
      left = rect.left + rect.width / 2 - tipRect.width / 2;
    }

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    if (left < 4) left = 4;
    if (left + tipRect.width > viewW - 4) left = viewW - tipRect.width - 4;
    if (top < 4) top = rect.bottom + 6;
    if (top + tipRect.height > viewH - 4) top = viewH - tipRect.height - 4;

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  };

  const onMouseOut = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-tip]') as HTMLElement | null;
    if (!target) return;

    const related = e.relatedTarget as HTMLElement;
    if (related && target.contains(related)) return;

    clearHideTimer();
    hideTimer = setTimeout(() => {
      const el = getTooltipEl();
      el.classList.remove('visible');
    }, 80);
  };

  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);

  return () => {
    document.removeEventListener('mouseover', onMouseOver);
    document.removeEventListener('mouseout', onMouseOut);
    clearHideTimer();
  };
}
