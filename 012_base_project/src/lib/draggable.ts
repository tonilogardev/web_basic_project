export interface DraggableOptions {
  handle?: string;
  ignore?: string;
  initialX?: number;
  initialY?: number;
  disabled?: boolean;
}

let highestZIndex = 50;

export function bringToFront(node: HTMLElement) {
  highestZIndex += 1;
  node.style.zIndex = String(highestZIndex);
}

export function draggable(node: HTMLElement, options: DraggableOptions = {}) {
  let {
    handle = '.panel-header',
    ignore = 'button, input, select, label, a',
    initialX = 24,
    initialY = 72,
    disabled = false,
  } = options;

  let x = initialX;
  let y = initialY;
  let startPointerX = 0;
  let startPointerY = 0;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let activePointerId: number | null = null;

  function clampPosition(newX: number, newY: number) {
    const rect = node.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : (node.offsetWidth || 340);
    const height = rect.height > 0 ? rect.height : (node.offsetHeight || 60);

    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(10, window.innerHeight - height - 10);

    return {
      x: Math.max(10, Math.min(newX, maxX)),
      y: Math.max(10, Math.min(newY, maxY)),
    };
  }

  function setPosition(newX: number, newY: number) {
    const clamped = clampPosition(newX, newY);
    x = clamped.x;
    y = clamped.y;
    node.style.left = `${Math.round(x)}px`;
    node.style.top = `${Math.round(y)}px`;
  }

  node.style.position = 'fixed';
  node.style.margin = '0';
  bringToFront(node);
  setPosition(x, y);

  function onPointerDown(e: PointerEvent) {
    if (disabled || e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (ignore && target.closest(ignore)) return;

    if (handle) {
      const handleEl = node.querySelector(handle);
      if (!handleEl || !handleEl.contains(target)) return;
    }

    bringToFront(node);
    isDragging = true;
    activePointerId = e.pointerId;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startX = x;
    startY = y;

    node.setPointerCapture(e.pointerId);
    node.classList.add('is-dragging');
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    setPosition(startX + dx, startY + dy);
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;

    try {
      node.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if already released
    }

    node.classList.remove('is-dragging');
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  const onResize = () => setPosition(x, y);
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onResize);
    },
  };
}
