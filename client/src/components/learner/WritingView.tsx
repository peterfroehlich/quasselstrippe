import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Volume2, 
  RotateCcw, 
  Award, 
  ArrowRight, 
  Eraser, 
  Pencil, 
  Trash2, 
  Undo2, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  BookOpen,
  Loader2,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { WordItem, Language, HandwritingGradeResponse } from '../../types/vocabulary';
import { speechService } from '../../services/speech';
import { gradeHandwriting } from '../../services/gemini';
import { AudioButton } from '../common/AudioButton';

interface WritingViewProps {
  words: WordItem[];
  allWords: WordItem[];
  language: Language;
  onRecordReview: (wordId: string, wasCorrect: boolean) => void;
  onRestart: () => void;
  apiKey?: string;
  selectedLesson?: string;
  availableLessons?: string[];
  onSelectLesson?: (lesson: string) => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  words,
  language,
  onRecordReview,
  onRestart,
  apiKey,
  selectedLesson = 'all',
  availableLessons = [],
  onSelectLesson,
}) => {
  const [sessionWords, setSessionWords] = useState<WordItem[]>(() => [...words]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // UI tool: 'pen' | 'eraser'
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [isReverseTipDetected, setIsReverseTipDetected] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  // Grading & result state
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<HandwritingGradeResponse | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);

  // Overall session metrics
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const activeToolRef = useRef<'pen' | 'eraser'>('pen');
  activeToolRef.current = activeTool;

  // Palm rejection & pointer isolation state
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  const hasDetectedPenRef = useRef<boolean>(false);
  const lastPenTimeRef = useRef<number>(0);
  const [isStylusPreferred, setIsStylusPreferred] = useState<boolean>(() => {
    // If device is touch-capable or iPad, activate palm protection by default
    return typeof navigator !== 'undefined' && (
      navigator.maxTouchPoints > 0 || /iPad|Macintosh/i.test(navigator.userAgent)
    );
  });
  const isStylusPreferredRef = useRef(isStylusPreferred);
  isStylusPreferredRef.current = isStylusPreferred;

  const currentWord = sessionWords[currentIndex];

  // Sync words on external change
  const wordsIdFingerprint = useMemo(() => {
    return words.map(w => w.id).sort().join(',');
  }, [words]);

  useEffect(() => {
    setSessionWords([...words]);
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    resetCardState();
  }, [wordsIdFingerprint]);

  // Setup canvas resolution (Retina display support)
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    // Save existing drawing strokes if already drawn and dimensions change
    let existingContent: ImageData | null = null;
    const ctx = canvas.getContext('2d');
    if (ctx && canvas.width > 0 && canvas.height > 0 && (canvas.width !== targetWidth || canvas.height !== targetHeight)) {
      try {
        existingContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {}
    }

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    if (ctx) {
      // Reset transform matrix first to avoid cumulative scaling (e.g. 2x -> 4x -> 8x on resize/re-init)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (existingContent) {
        try {
          ctx.putImageData(existingContent, 0, 0);
        } catch {}
      }
    }
  }, []);

  const resetCardState = useCallback(() => {
    setIsSubmitted(false);
    setGradeResult(null);
    setGradingError(null);
    setHasDrawn(false);
    setActiveTool('pen');
    setIsReverseTipDetected(false);
    historyRef.current = [];
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    isDrawingRef.current = false;
    lastPointRef.current = null;

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    requestAnimationFrame(() => {
      initCanvas();
    });
  }, [initCanvas]);

  // Speak word when current word loads (and keep it hidden!)
  const playWordAudio = useCallback((wordToSpeak?: string) => {
    const text = wordToSpeak || currentWord?.word;
    if (!text) return;
    speechService.speak(text, language);
  }, [currentWord?.word, language]);

  useEffect(() => {
    if (currentWord && !isFinished && !isSubmitted) {
      resetCardState();
      playWordAudio(currentWord.word);
    }
  }, [currentIndex, currentWord?.id, isFinished, isSubmitted, playWordAudio, resetCardState]);

  useEffect(() => {
    if (!isSubmitted) {
      // Allow DOM to settle and initialize canvas dimensions immediately after mount
      requestAnimationFrame(() => {
        initCanvas();
      });
    }

    const canvas = canvasRef.current;
    let ro: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        initCanvas();
      });
      ro.observe(canvas);
    }

    const handleResize = () => {
      initCanvas();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (ro) ro.disconnect();
    };
  }, [initCanvas, isSubmitted]);

  // Check if pointer is likely a resting palm/hand rather than deliberate drawing
  const isLikelyPalmTouch = (e: React.PointerEvent<HTMLCanvasElement>): boolean => {
    // Stylus and mouse inputs are always intentional
    if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
      return false;
    }

    // In stylus-preferred mode, all touch inputs are treated as palm sitting on display
    if (isStylusPreferredRef.current) {
      return true;
    }

    // If an Apple Pencil was used recently (within 20 seconds), treat touch as resting hand
    const now = Date.now();
    if (hasDetectedPenRef.current && now - lastPenTimeRef.current < 20000) {
      return true;
    }

    // Reject secondary touches in multi-touch contacts
    if (!e.isPrimary) {
      return true;
    }

    // Palm contact geometry detection: broad contact patch on display
    const width = e.width || 0;
    const height = e.height || 0;
    if (width > 32 || height > 32 || (width > 0 && height > 0 && width * height > 800)) {
      return true;
    }

    const native = e.nativeEvent as any;
    if (native && (native.radiusX > 20 || native.radiusY > 20)) {
      return true;
    }

    return false;
  };

  // Helper to determine if pointer is currently eraser (reverse tip or UI tool)
  const checkIsEraser = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Reverse tip on Apple Pencil / stylus or eraser button
    const isHardwareEraser = 
      (e.buttons & 32) === 32 || 
      e.button === 5 || 
      (e.nativeEvent as any).pointerType === 'eraser';

    if (isHardwareEraser !== isReverseTipDetected) {
      setIsReverseTipDetected(isHardwareEraser);
    }

    return activeToolRef.current === 'eraser' || isHardwareEraser;
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Save state for Undo
  const saveUndoSnapshot = (): ImageData | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(snap);
      if (historyRef.current.length > 20) {
        historyRef.current.shift();
      }
      return snap;
    } catch {
      return null;
    }
  };

  // Revert last stroke (used when a palm touch is cancelled or preempted by pen)
  const revertLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (historyRef.current.length > 0) {
      const lastSnap = historyRef.current.pop();
      if (lastSnap) {
        ctx.putImageData(lastSnap, 0, 0);
      }
      if (historyRef.current.length === 0) {
        setHasDrawn(false);
      }
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (historyRef.current.length > 0) {
      const lastSnap = historyRef.current.pop();
      if (lastSnap) {
        ctx.putImageData(lastSnap, 0, 0);
      }
      if (historyRef.current.length === 0) {
        setHasDrawn(false);
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveUndoSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Global pointerup/pointercancel listeners on window to ensure pen lift is never missed
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current === e.pointerId || e.pointerType === 'pen') {
        isDrawingRef.current = false;
        activePointerIdRef.current = null;
        activePointerTypeRef.current = null;
        lastPointRef.current = null;
        setIsReverseTipDetected(false);
      }
    };

    const handleGlobalPointerCancel = (e: PointerEvent) => {
      if (activePointerIdRef.current === e.pointerId || e.pointerType === 'pen') {
        if (activePointerTypeRef.current === 'touch') {
          revertLastStroke();
        }
        isDrawingRef.current = false;
        activePointerIdRef.current = null;
        activePointerTypeRef.current = null;
        lastPointRef.current = null;
        setIsReverseTipDetected(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerCancel);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, []);

  // Pointer event handlers with palm rejection & stylus preemption
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSubmitted || isGrading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Failsafe calibration: ensure canvas buffer matches physical display geometry
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      initCanvas();
    }

    const isPen = e.pointerType === 'pen';

    if (isPen) {
      hasDetectedPenRef.current = true;
      lastPenTimeRef.current = Date.now();
      if (!isStylusPreferredRef.current) {
        setIsStylusPreferred(true);
      }

      // Stylus has absolute preemption: if any previous stroke was active
      // (whether a resting palm touch or a previous pen stroke whose pointerup was missed/delayed),
      // cleanly reset so the new pen stroke is NEVER dropped or blocked!
      if (activePointerIdRef.current !== null) {
        if (activePointerTypeRef.current === 'touch') {
          revertLastStroke();
        }
        activePointerIdRef.current = null;
        activePointerTypeRef.current = null;
        isDrawingRef.current = false;
        lastPointRef.current = null;
      }
    }

    // Palm rejection check for touch events
    if (isLikelyPalmTouch(e)) {
      return;
    }

    // Only allow one drawing pointer at a time (for touch/mouse)
    if (!isPen && activePointerIdRef.current !== null) {
      return;
    }

    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    saveUndoSnapshot();

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isErasing = checkIsEraser(e);
    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 32;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#0f172a'; // Deep crisp ink
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
      ctx.lineWidth = Math.max(2, 2.5 + pressure * 3.5);
    }

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If pen is in hover mode or lifted (buttons === 0), release drawing state
    if (e.pointerType === 'pen' && e.buttons === 0) {
      if (isDrawingRef.current || activePointerIdRef.current !== null) {
        isDrawingRef.current = false;
        activePointerIdRef.current = null;
        activePointerTypeRef.current = null;
        lastPointRef.current = null;
      }
      return;
    }

    // Only accept movements for the currently drawing pointer
    if (!isDrawingRef.current || activePointerIdRef.current !== e.pointerId || !lastPointRef.current) {
      return;
    }

    if (e.pointerType === 'pen') {
      lastPenTimeRef.current = Date.now();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isErasing = checkIsEraser(e);
    if (isErasing) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 32;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#0f172a';
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
      ctx.lineWidth = Math.max(2, 2.5 + pressure * 3.5);
    }

    const currentCoords = getCanvasCoords(e);
    const midPoint = {
      x: (lastPointRef.current.x + currentCoords.x) / 2,
      y: (lastPointRef.current.y + currentCoords.y) / 2,
    };

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPoint.x, midPoint.y);
    ctx.stroke();

    lastPointRef.current = currentCoords;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId || e.pointerType === 'pen') {
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      activePointerTypeRef.current = null;
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsReverseTipDetected(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId || e.pointerType === 'pen') {
      // Only revert stray touch marks (from resting hand), never actual pen writing!
      if (activePointerTypeRef.current === 'touch') {
        revertLastStroke();
      }

      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      activePointerTypeRef.current = null;
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsReverseTipDetected(false);
    }
  };

  const handleLostPointerCapture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId || e.pointerType === 'pen') {
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      activePointerTypeRef.current = null;
      lastPointRef.current = null;
      setIsReverseTipDetected(false);
    }
  };

  // Convert canvas to white-background JPEG base64 cropped to handwriting bounding box
  // Cropping eliminates whitespace, reducing multimodal token tiles and network latency
  const exportCanvasBase64 = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const origCtx = canvas.getContext('2d');
    if (!origCtx) return '';

    const origWidth = canvas.width;
    const origHeight = canvas.height;

    // Fast bounding box detection on drawn pixels (canvas is transparent where unpainted)
    let minX = origWidth;
    let minY = origHeight;
    let maxX = 0;
    let maxY = 0;
    let hasInk = false;

    try {
      const imgData = origCtx.getImageData(0, 0, origWidth, origHeight);
      const data = imgData.data;
      // Step by 2 pixels for high performance on retina displays
      for (let y = 0; y < origHeight; y += 2) {
        for (let x = 0; x < origWidth; x += 2) {
          const alpha = data[(y * origWidth + x) * 4 + 3];
          if (alpha > 20) {
            hasInk = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    } catch {
      hasInk = false;
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceW = origWidth;
    let sourceH = origHeight;

    if (hasInk && maxX >= minX && maxY >= minY) {
      const padding = 28;
      sourceX = Math.max(0, minX - padding);
      sourceY = Math.max(0, minY - padding);
      sourceW = Math.min(origWidth - sourceX, (maxX - minX) + padding * 2);
      sourceH = Math.min(origHeight - sourceY, (maxY - minY) + padding * 2);
    }

    // Limit maximum dimension to 500px for optimal single-tile OCR processing
    const maxDim = 500;
    let destW = sourceW;
    let destH = sourceH;
    if (destW > maxDim || destH > maxDim) {
      if (destW > destH) {
        destH = Math.round((destH * maxDim) / destW);
        destW = maxDim;
      } else {
        destW = Math.round((destW * maxDim) / destH);
        destH = maxDim;
      }
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = destW;
    exportCanvas.height = destH;
    const ctx = exportCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, destW, destH);
      ctx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, destW, destH);
    }
    return exportCanvas.toDataURL('image/jpeg', 0.80);
  };

  // Student acknowledges and submits writing for grading
  const handleAcknowledgeAndGrade = async () => {
    if (!currentWord || isGrading || isSubmitted) return;

    if (!hasDrawn) {
      alert('Bitte schreibe zuerst das Wort mit deinem Apple Pencil in das Schreibfeld!');
      return;
    }

    setIsGrading(true);
    setGradingError(null);

    const base64Data = exportCanvasBase64();

    try {
      const result = await gradeHandwriting({
        base64Data,
        expectedWord: currentWord.word,
        language,
        apiKey,
      });

      // Extra client-side validation for wrong initial capitalization
      const expLetter = currentWord.word.trim().match(/^\p{L}/u)?.[0];
      const recLetter = (result.recognizedWord || '').trim().match(/^\p{L}/u)?.[0];
      if (expLetter && recLetter) {
        const isExpUpper = expLetter === expLetter.toUpperCase() && expLetter !== expLetter.toLowerCase();
        const isRecUpper = recLetter === recLetter.toUpperCase() && recLetter !== recLetter.toLowerCase();
        if (isExpUpper !== isRecUpper) {
          result.capitalizationError = true;
          result.isCorrect = false;
          result.score = Math.min(result.score, 70);
          if (result.schoolGrade.startsWith('1') || result.schoolGrade.startsWith('2')) {
            result.schoolGrade = '3 (Befriedigend)';
          }
          const notice = isExpUpper
            ? `Achte auf den Wortanfang: "${currentWord.word}" beginnt mit einem Großbuchstaben ("${expLetter}").`
            : `Achte auf den Wortanfang: "${currentWord.word}" beginnt mit einem Kleinbuchstaben ("${expLetter}").`;
          if (!result.feedback.toLowerCase().includes('groß') && !result.feedback.toLowerCase().includes('klein')) {
            result.feedback = `${result.feedback} ${notice}`.trim();
          }
        }
      }

      setGradeResult(result);
      setIsSubmitted(true);

      if (result.isCorrect) {
        setScore(prev => prev + 1);
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      }

      // Record Leitner review
      onRecordReview(currentWord.id, result.isCorrect);
    } catch (err: any) {
      console.error('Grading error', err);
      setGradingError(err?.message || 'Fehler beim Korrigieren durch Gemini.');
    } finally {
      setIsGrading(false);
    }
  };

  // Fallback self-grading if Gemini is offline/unconfigured
  const handleManualGrading = (isCorrect: boolean) => {
    if (!currentWord) return;
    const fallbackResult: HandwritingGradeResponse = {
      recognizedWord: isCorrect ? currentWord.word : '(manuell gewertet)',
      isCorrect,
      score: isCorrect ? 100 : 50,
      schoolGrade: isCorrect ? '1 (Sehr gut)' : '4 (Ausreichend)',
      feedback: isCorrect 
        ? 'Manuell als richtig bestätigt!' 
        : `Das Wort heißt: "${currentWord.word}". Präge es dir gut ein!`,
    };
    setGradeResult(fallbackResult);
    setIsSubmitted(true);
    setGradingError(null);

    if (isCorrect) {
      setScore(prev => prev + 1);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }
    onRecordReview(currentWord.id, isCorrect);
  };

  // Next word
  const handleNextWord = () => {
    if (currentIndex + 1 < sessionWords.length) {
      setCurrentIndex(prev => prev + 1);
      resetCardState();
      requestAnimationFrame(() => {
        initCanvas();
      });
    } else {
      setIsFinished(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } });
    }
  };

  // Keyboard shortcut: Press Enter to proceed when result is displayed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isSubmitted && !isGrading) {
        e.preventDefault();
        handleNextWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitted, isGrading, currentIndex, sessionWords.length]);

  if (!sessionWords || sessionWords.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Keine Vokabeln für den Schreibmodus gefunden.
        </p>
        <button type="button" onClick={onRestart} className="btn btn-secondary">
          Neu starten
        </button>
      </div>
    );
  }

  // End of session / lesson completion screen
  if (isFinished) {
    const percentage = Math.round((score / sessionWords.length) * 100);
    const nextLessonIndex = availableLessons.findIndex(l => l === selectedLesson) + 1;
    const hasNextLesson = nextLessonIndex > 0 && nextLessonIndex < availableLessons.length;
    const nextLesson = hasNextLesson ? availableLessons[nextLessonIndex] : null;

    return (
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <div 
          style={{ 
            width: '84px', 
            height: '84px', 
            borderRadius: '50%', 
            background: 'var(--primary-gradient)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}
        >
          <Award size={44} color="#ffffff" />
        </div>

        <h2 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Schreibtraining abgeschlossen!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2rem' }}>
          {selectedLesson !== 'all' ? `Lektion: ${selectedLesson}` : 'Alle Lektionen geübt'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
              {score} / {sessionWords.length}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Richtig geschrieben
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: percentage >= 75 ? 'var(--success)' : 'var(--warning)' }}>
              {percentage}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Erfolgsquote
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {hasNextLesson && nextLesson && onSelectLesson && (
            <button
              type="button"
              onClick={() => onSelectLesson(nextLesson)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
            >
              <span>Nächste Lektion starten: {nextLesson}</span>
              <ChevronRight size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setScore(0);
              setIsFinished(false);
              resetCardState();
            }}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            <RotateCcw size={16} />
            <span>Diese Lektion wiederholen</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '820px', margin: '0 auto' }}>
      {/* Top Header & Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span 
            style={{ 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              padding: '0.3rem 0.75rem', 
              borderRadius: 'var(--radius-full)', 
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <BookOpen size={13} />
            {currentWord?.lesson || 'Lektion'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Wort {currentIndex + 1} von {sessionWords.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Richtig: <strong style={{ color: 'var(--success)' }}>{score}</strong>
          </span>
          <button
            type="button"
            onClick={onRestart}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            title="Neu starten"
          >
            <RotateCcw size={13} />
            <span>Neu</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '5px', background: 'var(--bg-surface-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${((currentIndex + (isSubmitted ? 1 : 0)) / sessionWords.length) * 100}%`,
            background: 'var(--primary-gradient)',
            transition: 'width 0.3s ease'
          }} 
        />
      </div>

      {/* APPLE PENCIL WRITING CANVAS AREA (Stays in place!) */}
      <div 
        className="glass-panel"
        style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.85rem',
          position: 'relative'
        }}
      >
        {/* Canvas Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              disabled={isSubmitted}
              className={`btn btn-sm ${activeTool === 'pen' && !isReverseTipDetected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', opacity: isSubmitted ? 0.6 : 1 }}
              title="Stift aktivieren"
            >
              <Pencil size={15} />
              <span>Stift</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              disabled={isSubmitted}
              className={`btn btn-sm ${activeTool === 'eraser' || isReverseTipDetected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', opacity: isSubmitted ? 0.6 : 1 }}
              title="Radiergummi (funktioniert auch automatisch über die Stiftrückseite!)"
            >
              <Eraser size={15} />
              <span>Radierer</span>
            </button>

            {/* Palm Rejection / Stylus Protection Toggle */}
            <button
              type="button"
              onClick={() => setIsStylusPreferred(prev => !prev)}
              disabled={isSubmitted}
              className={`btn btn-sm ${isStylusPreferred ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                padding: '0.45rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem',
                opacity: isSubmitted ? 0.6 : 1,
                ...(isStylusPreferred ? { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' } : {})
              }}
              title={isStylusPreferred 
                ? "Handballenschutz aktiv: Nur der Apple Pencil zeichnet. Die Hand kann auf dem Bildschirm abgelegt werden." 
                : "Handballenschutz aus: Auch Finger zeichnen. Klicken, um Handablage-Schutz zu aktivieren."}
            >
              {isStylusPreferred ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              <span>{isStylusPreferred ? 'Handballenschutz' : 'Finger erlaubt'}</span>
            </button>

            {isReverseTipDetected && (
              <span 
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: 'var(--radius-full)', 
                  background: 'rgba(239, 68, 68, 0.2)', 
                  color: '#f87171',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Eraser size={12} />
                Stiftrückseite aktiv
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={isSubmitted}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.45rem 0.75rem', opacity: isSubmitted ? 0.6 : 1 }}
              title="Letzten Strich rückgängig machen"
            >
              <Undo2 size={15} />
              <span>Rückgängig</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitted}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)', opacity: isSubmitted ? 0.6 : 1 }}
              title="Schreibfeld komplett leeren"
            >
              <Trash2 size={15} />
              <span>Leeren</span>
            </button>

            {currentWord && (
              <AudioButton
                text={currentWord.word}
                language={language}
                size="md"
                iconSize={22}
                title="Wort anhören 🔊"
              />
            )}
          </div>
        </div>

        {/* Canvas Wrapper with Ruled Notebook Paper Background */}
        <div 
          style={{ 
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            // High contrast school notebook lines: White paper with light blue lines & red margin
            backgroundColor: '#ffffff',
            backgroundImage: `
              linear-gradient(to right, transparent 54px, #fca5a5 55px, transparent 56px),
              repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 49px, #bfdbfe 50px)
            `,
            backgroundSize: '100% 100%, 100% 50px',
            height: '280px',
            touchAction: 'none',
            cursor: isSubmitted ? 'default' : (activeTool === 'eraser' || isReverseTipDetected ? 'crosshair' : 'default')
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none',
              pointerEvents: isSubmitted ? 'none' : 'auto',
            }}
          />

          {!hasDrawn && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '60px',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#94a3b8',
                fontSize: '1.1rem',
                fontStyle: 'italic',
                userSelect: 'none',
              }}
            >
              Hier mit dem Apple Pencil schreiben... ✏️
              {currentWord && (
                <span style={{ fontSize: '0.9rem', marginLeft: '0.6rem', color: '#64748b', fontStyle: 'normal' }}>
                  ({currentWord.word.replace(/\s+/g, '').length} Buchstaben)
                </span>
              )}
              {isStylusPreferred && (
                <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', opacity: 0.85, color: '#059669', fontStyle: 'normal' }}>
                  (Handballenschutz aktiv 🛡️)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action / Submit Button (only before submission) */}
        {!isSubmitted && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleAcknowledgeAndGrade}
              disabled={isGrading}
              className="btn btn-primary"
              style={{
                minWidth: '220px',
                padding: '0.85rem 1.5rem',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              {isGrading ? (
                <>
                  <Loader2 size={18} className="spin-anim" />
                  <span>Gemini korrigiert...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Fertig & Prüfen ➔</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Grading Error / Fallback UI */}
        {gradingError && !isSubmitted && (
          <div 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid var(--danger)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1rem', 
              marginTop: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}
          >
            <div style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 600 }}>
              ⚠️ {gradingError}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Gemini konnte nicht erreicht werden. Möchtest du deine Handschrift selbst werten?
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => handleManualGrading(true)}
                className="btn btn-success btn-sm"
                style={{ padding: '0.4rem 0.85rem' }}
              >
                <CheckCircle2 size={15} />
                <span>Ich habe es richtig geschrieben</span>
              </button>
              <button
                type="button"
                onClick={() => handleManualGrading(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.4rem 0.85rem' }}
              >
                <XCircle size={15} />
                <span>Ich hatte einen Fehler</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. RECOGNIZED TEXT & GRADE STATUS DIRECTLY BELOW WRITTEN PANEL */}
      {isSubmitted && gradeResult && (
        <div 
          className="glass-panel"
          style={{ 
            padding: '1rem 1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '1rem',
            border: gradeResult.isCorrect ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px solid rgba(245, 158, 11, 0.4)',
            background: gradeResult.isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            {gradeResult.isCorrect ? (
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--success)',
                  flexShrink: 0
                }}
              >
                <CheckCircle2 size={24} />
              </div>
            ) : (
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  background: 'rgba(245, 158, 11, 0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'var(--warning)',
                  flexShrink: 0
                }}
              >
                <XCircle size={24} />
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Aus deiner Handschrift erkannt:
                </span>
                <strong style={{ fontSize: '1.35rem', color: '#ffffff', letterSpacing: '0.02em' }}>
                  "{gradeResult.recognizedWord}"
                </strong>
                {gradeResult.capitalizationError && (
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ Falscher Anfangsbuchstabe
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: gradeResult.isCorrect ? 'var(--success)' : 'var(--warning)', fontWeight: 600, marginTop: '0.15rem' }}>
                {gradeResult.isCorrect ? 'Richtig geschrieben!' : 'Noch einmal üben'}
                {gradeResult.capitalizationError && (
                  <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>
                    (Wortanfang beachten: "{currentWord?.word}")
                  </span>
                )}
              </div>
            </div>
          </div>

          <div 
            style={{ 
              padding: '0.4rem 0.9rem', 
              borderRadius: 'var(--radius-full)', 
              background: gradeResult.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: gradeResult.isCorrect ? 'var(--success)' : 'var(--warning)',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            Note: {gradeResult.schoolGrade}
          </div>
        </div>
      )}

      {/* 2. TEACHER FEEDBACK PANEL (image 1) WITH "NÄCHSTES WORT" BUTTON */}
      {isSubmitted && gradeResult && (
        <div 
          className="glass-panel"
          style={{ 
            background: 'rgba(99, 102, 241, 0.08)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.35rem', 
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-light)', fontWeight: 700, fontSize: '0.95rem' }}>
            <Sparkles size={16} />
            <span>Gemini Lehrer-Feedback{gradeResult.model ? ` (${gradeResult.model})` : ''}:</span>
          </div>

          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.55 }}>
            {gradeResult.feedback}
          </p>

          {/* NEXT WORD BUTTON (lives inside this panel) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
            <button
              type="button"
              onClick={handleNextWord}
              className="btn btn-primary"
              style={{
                minWidth: '200px',
                padding: '0.85rem 1.75rem',
                fontSize: '1.05rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
              }}
            >
              <span>Nächstes Wort</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 3. WORD PANEL (image 2) */}
      {isSubmitted && gradeResult && (
        <div 
          className="glass-panel"
          style={{ 
            background: 'var(--bg-surface-elevated)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.5rem', 
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              Vokabel ({language === 'en' ? 'Englisch' : 'Latein'})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {currentWord?.word}
              </span>
              <button
                type="button"
                onClick={() => playWordAudio()}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.45rem 0.75rem', borderRadius: '50px' }}
                title="Aussprache anhören"
              >
                <Volume2 size={16} />
                <span>Aussprache</span>
              </button>
              {currentWord?.phonetic && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                  [{currentWord.phonetic}]
                </span>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
              Deutsche Übersetzung
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--primary-light)' }}>
              {currentWord?.translation}
            </div>
          </div>

          {currentWord?.exampleSentence && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', fontSize: '0.9rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                "{currentWord.exampleSentence}"
              </div>
              {currentWord.exampleTranslation && (
                <div style={{ color: 'var(--text-muted)' }}>
                  "{currentWord.exampleTranslation}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
