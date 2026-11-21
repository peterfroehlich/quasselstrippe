// Align the transcription to the target. Missing letters get a short mark at the gap.
export function errorRanges(written: string, target: string) {
  const a = Array.from(written.trim().normalize().toLowerCase());
  const b = Array.from(target.trim().normalize().toLowerCase());
  if (!a.length || a.length > 256 || b.length > 256) return [];
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i + j));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+Number(a[i-1] !== b[j-1]));
    }
  }
  const ranges: number[][] = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && a[i-1] === b[j-1]) { i--; j--; continue; }
    let start = i, end = i;
    if (i && j && d[i][j] === d[i-1][j-1]+1) { start = --i; j--; }
    else if (i && d[i][j] === d[i-1][j]+1) { start = --i; }
    else { j--; start -= 0.18; end += 0.18; }
    ranges.push([Math.max(0,start)/a.length, Math.min(a.length,end)/a.length]);
  }
  return ranges;
}

export type InkBounds = { left: number; width: number; bottom: number };

export function CorrectionMarks({ correct, correctCount, written, target, bounds }: {
  correctCount: number; correct: boolean; written: string; target: string; bounds: InkBounds | null;
}) {
  if (correct) {
    const reward = ['star', 'smiley', 'praise'][Math.max(0, correctCount - 1) % 3];
    return (
      <svg aria-hidden="true" data-reward={reward} viewBox={reward === 'praise' ? '0 0 154 64' : '0 0 64 64'}
        width={reward === 'praise' ? 142 : 58} height="58" fill="none" stroke="#15804f"
        strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', bottom: 8, right: 14, pointerEvents: 'none', transform: 'rotate(-6deg)' }}>
        {reward === 'star' && <path d="M11 48 Q18 30 32 7 Q34 23 49 52 L7 27 Q28 29 57 20 Q34 36 11 48" />}
        {reward === 'smiley' && <>
          <path d="M34 6 C49 5 58 17 57 33 S46 57 30 57 S5 46 6 30 S17 5 34 6Z" />
          <path d="M22 23 l-1 4 M42 22 l-1 4 M17 36 Q31 57 48 35" />
        </>}
        {reward === 'praise' && <>
          <text x="4" y="43" fill="#15804f" stroke="none" fontSize="32" fontStyle="italic"
            fontFamily="'Bradley Hand', 'Segoe Print', cursive" textLength="143" lengthAdjust="spacingAndGlyphs">Good job!</text>
          <path d="M14 51 Q71 46 133 49" strokeWidth="2" />
        </>}
      </svg>
    );
  }
  if (!bounds) return null;
  return <>{errorRanges(written, target).map(([from,to], index) => (
    <svg key={index} aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none"
      style={{ position: 'absolute', pointerEvents: 'none', left: (bounds.left + bounds.width * from) + '%',
        width: Math.max(.6, bounds.width * (to-from)) + '%', height: 8, top: 'min(calc(' + bounds.bottom + '% + 1px), calc(100% - 8px))' }}>
      <path d="M1 3 Q25 5 52 3 T99 2 L98 5 Q72 4 51 6 T1 6Z" fill="#cf303e" opacity=".88" />
    </svg>
  ))}</>;
}
