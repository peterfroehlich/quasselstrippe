import type { HandwritingInputCounts } from './services/handwritingInput';
import { APP_VERSION } from './version';

declare global {
  interface Window { __QUASSELSTRIPPE_RUM__?: boolean }
}

// No SDK import, listeners, storage, or requests unless deployment explicitly opts in.
let send: typeof import('@dash0/sdk-web').sendEvent | undefined;
export async function initializeTelemetry() {
  if (window.__QUASSELSTRIPPE_RUM__ !== true) return;
  try {
    const sdk = await import('@dash0/sdk-web');
    sdk.init({
      serviceName: 'quasselstrippe-web',
      serviceVersion: APP_VERSION,
      endpoint: { url: `${location.origin}/telemetry`, authToken: '' },
      // Console/error messages can include provider responses and pupil data.
      // Report only fixed error categories below. No replay or DOM capture.
      enabledInstrumentations: ['@dash0/navigation', '@dash0/web-vitals', '@dash0/fetch', '@dash0/xhr'],
      ignoreUrls: [/generativelanguage\.googleapis\.com/, /\/telemetry\//],
      headersToCapture: [],
      pageViewInstrumentation: { generateMetadata: () => ({ title: 'Quasselstrippe' }) },
      urlAttributeScrubber: () => ({ 'url.full': `${location.origin}/`, 'url.path': '/' }),
    });
    send = sdk.sendEvent;
    window.addEventListener('error', () => recordError('runtime'));
    window.addEventListener('unhandledrejection', () => recordError('unhandled-rejection'));
  } catch {
    // Optional monitoring must never prevent learning when loading fails.
  }
}

function emit(name: string, attributes: Record<string, string | number> = {}) {
  try { send?.(name, { attributes }); } catch { /* Monitoring cannot break interaction. */ }
}
export function recordError(kind: 'runtime' | 'unhandled-rejection') {
  emit('app.error', { 'error.category': kind });
}
export function recordCorrection(durationMs: number, outcome: 'success' | 'error') {
  emit('handwriting.correction', { 'correction.duration_ms': Math.round(durationMs), 'correction.outcome': outcome });
}
let lastRecovery = -Infinity;
export function recordPenRecovery() {
  // Cap at one event per second; never send coordinates, strokes or images.
  const now = performance.now();
  if (now - lastRecovery < 1000) return;
  lastRecovery = now;
  emit('handwriting.pen_recovery');
}

export function recordHandwritingInput(counts: HandwritingInputCounts) {
  emit('handwriting.input', {
    'input.pen_down': counts.penDown,
    'input.pen_up': counts.penUp,
    'input.pen_cancel': counts.penCancel,
    'input.pen_capture_lost': counts.penCaptureLost,
    'input.touch_start': counts.touchStart,
    'input.touch_end': counts.touchEnd,
    'input.touch_move_prevented': counts.touchMovePrevented,
    'input.rapid_pen_down': counts.rapidPenDown,
  });
}
