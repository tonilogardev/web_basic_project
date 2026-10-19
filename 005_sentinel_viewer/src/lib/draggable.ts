export interface DraggableOptions {
  handle?: string;
  ignore?: string;
  initialX?: number;
  initialY?: number;
  disabled?: boolean;
  onPositionChange?: (pos: { x: number; y: number }) => void;
  onFocus?: () => void;
}

let highestZIndex = 50;

export function bringToFront(node: HTMLElement) {
  highestZIndex += 1;
  node.style.zIndex = String(highestZIndex);
}

export function draggable(node: HTMLElement, options: DraggableOptions = {}) {
  let {
    handle = '.panel-header',
    ignore = 'button, input, select, label, a, .check-all',
    initialX = 20,
    initialY = 20,
    disabled = false,
    onPositionChange,
    onFocus,
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
    const width = rect.width > 0 ? rect.width : (node.offsetWidth || 320);
    const height = rect.height > 0 ? rect.height : (node.offsetHeight || 48);

    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(10, window.innerHeight - height - 10);

    const clampedX = Math.max(10, Math.min(newX, maxX));
    const clampedY = Math.max(10, Math.min(newY, maxY));

    return { x: clampedX, y: clampedY };
  }

  function setPosition(newX: number, newY: number) {
    const clamped = clampPosition(newX, newY);
    x = clamped.x;
    y = clamped.y;

    node.style.left = `${Math.round(x)}px`;
    node.style.top = `${Math.round(y)}px`;
  }

  // Setup initial styles
  node.style.position = 'fixed';
  node.style.margin = '0';
  bringToFront(node);
  setPosition(x, y);

  function onPointerDown(e: PointerEvent) {
    bringToFront(node);
    if (onFocus) onFocus();

    if (disabled || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (!target) return;

    // Ignore interactive elements
    if (ignore && target.closest(ignore)) {
      return;
    }

    // Must be inside the handle
    const handleEl = handle ? target.closest(handle) : node;
    if (!handleEl) return;

    // Prevent map dragging / text selection
    e.stopPropagation();

    isDragging = true;
    activePointerId = e.pointerId;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startX = x;
    startY = y;

    node.classList.add('is-dragging');
    document.body.style.userSelect = 'none';

    try {
      node.setPointerCapture(e.pointerId);
    } catch {}

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    setPosition(startX + dx, startY + dy);
    if (onPositionChange) {
      onPositionChange({ x, y });
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;

    node.classList.remove('is-dragging');
    document.body.style.userSelect = '';

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    if (onPositionChange) {
      onPositionChange({ x, y });
    }

    if (activePointerId !== null) {
      try {
        if (node.hasPointerCapture(activePointerId)) {
          node.releasePointerCapture(activePointerId);
        }
      } catch {}
      activePointerId = null;
    }
  }

  function onWindowResize() {
    setPosition(x, y);
  }

  // Handle panel resizing (like collapsing or expanding)
  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (!isDragging) {
        setPosition(x, y);
      }
    });
    resizeObserver.observe(node);
  }

  node.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onWindowResize);

  return {
    update(newOptions: DraggableOptions) {
      options = newOptions;
      disabled = options.disabled ?? false;
      if (options.initialX !== undefined && Math.abs(options.initialX - x) > 1) {
        x = options.initialX;
      }
      if (options.initialY !== undefined && Math.abs(options.initialY - y) > 1) {
        y = options.initialY;
      }
      setPosition(x, y);
    },
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', onWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    }
  };
}
