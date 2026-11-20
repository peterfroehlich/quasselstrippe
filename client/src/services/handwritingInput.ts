export interface HandwritingInputCounts {
  penDown: number;
  penUp: number;
  penCancel: number;
  penCaptureLost: number;
  touchStart: number;
  touchEnd: number;
  touchMovePrevented: number;
  rapidPenDown: number;
}

// Safari can intercept rapid Pencil strokes for Scribble before pointerdown.
// A native, non-passive touchmove listener tells WebKit this canvas owns input.
// Do not cancel touchstart or touch events elsewhere (page scrolling must work).
export function guardHandwritingInput(canvas: HTMLCanvasElement, report: (counts: HandwritingInputCounts) => void) {
  const empty = (): HandwritingInputCounts => ({ penDown: 0, penUp: 0, penCancel: 0, penCaptureLost: 0,
    touchStart: 0, touchEnd: 0, touchMovePrevented: 0, rapidPenDown: 0 });
  let counts = empty();
  let lastUp = -Infinity;
  const pointer = (event: PointerEvent) => {
    if (event.pointerType !== 'pen') return;
    switch (event.type) {
      case 'pointerdown':
        counts.penDown++;
        if (event.timeStamp >= lastUp && event.timeStamp - lastUp < 250) counts.rapidPenDown++;
        break;
      case 'pointerup': counts.penUp++; lastUp = event.timeStamp; break;
      case 'pointercancel': counts.penCancel++; break;
      case 'lostpointercapture': counts.penCaptureLost++; break;
    }
  };
  const touch = (event: TouchEvent) => {
    if (event.type === 'touchstart') counts.touchStart++;
    else if (event.type === 'touchend') counts.touchEnd++;
    else if (event.cancelable) {
      event.preventDefault();
      if (event.defaultPrevented) counts.touchMovePrevented++;
    }
  };
  const flush = () => {
    if (Object.values(counts).some(Boolean)) report({ ...counts });
    counts = empty();
  };
  const pointerTypes = ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'] as const;
  const touchTypes = ['touchstart', 'touchend', 'touchmove'] as const;
  for (const type of pointerTypes) canvas.addEventListener(type, pointer, true);
  for (const type of touchTypes) canvas.addEventListener(type, touch, { capture: true, passive: false });
  const interval = window.setInterval(flush, 5000);
  window.addEventListener('pagehide', flush);
  return () => {
    for (const type of pointerTypes) canvas.removeEventListener(type, pointer, true);
    for (const type of touchTypes) canvas.removeEventListener(type, touch, true);
    window.clearInterval(interval);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}
