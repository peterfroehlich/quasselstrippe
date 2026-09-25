import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Target,
  Flame,
  BookOpen,
  TrendingUp,
  BarChart2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';

import type { UserProfile, Language, LearnerStats, ReviewHistoryPoint } from '../../types/vocabulary';
import { getLearnerStats, resetReviewProgress } from '../../services/storage';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile?: UserProfile;
  currentLanguage: Language;
  onProgressReset?: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  currentLanguage,
  onProgressReset,
}) => {
  const [stats, setStats] = useState<LearnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>(currentLanguage);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '14d'>('14d');
  const [graphMode, setGraphMode] = useState<'mastery' | 'activity'>('mastery');
  const [hoveredPoint, setHoveredPoint] = useState<ReviewHistoryPoint | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync language selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(currentLanguage);
      loadStats(currentLanguage);
    }
  }, [isOpen, currentLanguage, activeProfile?.id]);

  const loadStats = async (lang: Language | 'all') => {
    setLoading(true);
    try {
      const data = await getLearnerStats(
        activeProfile?.id,
        lang === 'all' ? undefined : lang
      );
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageFilterChange = (lang: Language | 'all') => {
    setSelectedLanguage(lang);
    loadStats(lang);
  };

  const handleReset = async () => {
    try {
      await resetReviewProgress(activeProfile?.id);
      setShowResetConfirm(false);
      await loadStats(selectedLanguage);
      if (onProgressReset) {
        onProgressReset();
      }
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  };

  if (!isOpen) return null;

  // Filter history points based on timeframe
  const rawHistory = stats?.history || [];
  const displayHistory = selectedTimeframe === '7d' ? rawHistory.slice(-7) : rawHistory;

  // SVG dimensions for chart
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxMastered = Math.max(stats?.totalWords || 10, ...displayHistory.map((h) => h.masteredCumulative), 1);
  const maxReviews = Math.max(5, ...displayHistory.map((h) => h.reviewsCount));

  // Generate SVG path for mastery improvement line
  const masteryPoints = displayHistory.map((h, i) => {
    const x = padding.left + (chartWidth / Math.max(1, displayHistory.length - 1)) * i;
    const y = padding.top + chartHeight - (h.masteredCumulative / maxMastered) * chartHeight;
    return { x, y, data: h };
  });

  const masteryPathD = masteryPoints.length > 0
    ? masteryPoints.reduce((acc, curr, idx) => {
        if (idx === 0) return `M ${curr.x} ${curr.y}`;
        const prev = masteryPoints[idx - 1];
        const cpX = (prev.x + curr.x) / 2;
        return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
      }, '')
    : '';

  const masteryAreaD = masteryPoints.length > 0
    ? `${masteryPathD} L ${masteryPoints[masteryPoints.length - 1].x} ${padding.top + chartHeight} L ${masteryPoints[0].x} ${padding.top + chartHeight} Z`
    : '';

  // Box colors and labels
  const BOX_CONFIG = [
    { box: 1, label: 'Kasten 1: Neu', desc: 'Täglich üben', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    { box: 2, label: 'Kasten 2: Vertiefen', desc: 'Alle 2-3 Tage', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { box: 3, label: 'Kasten 3: Festigen', desc: 'Wöchentlich', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    { box: 4, label: 'Kasten 4: Sicher', desc: 'Alle 2 Wochen', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
    { box: 5, label: 'Kasten 5: Gemeistert', desc: 'Monatlich / Perfekt', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.35rem', margin: 0 }}>Lernstatistik & Fortschritt</h3>
                {activeProfile && (
                  <span
                    className="badge"
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: `1px solid ${activeProfile.color || 'var(--primary)'}`,
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.55rem',
                    }}
                  >
                    <span>{activeProfile.avatar}</span>
                    <span>{activeProfile.name}</span>
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                Detaillierte Analyse und Lernkurve des Leitner-Systems
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
            }}
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Bar: Language Filter */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
              Sprache:
            </span>
            <button
              type="button"
              onClick={() => handleLanguageFilterChange('all')}
              className="btn btn-sm"
              style={{
                minHeight: '36px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-full)',
                background: selectedLanguage === 'all' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: selectedLanguage === 'all' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-medium)',
              }}
            >
              🌐 Alle Sprachen
            </button>
            <button
              type="button"
              onClick={() => handleLanguageFilterChange('en')}
              className="btn btn-sm"
              style={{
                minHeight: '36px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-full)',
                background: selectedLanguage === 'en' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: selectedLanguage === 'en' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-medium)',
              }}
            >
              🇬🇧 Englisch
            </button>
            <button
              type="button"
              onClick={() => handleLanguageFilterChange('la')}
              className="btn btn-sm"
              style={{
                minHeight: '36px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-full)',
                background: selectedLanguage === 'la' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: selectedLanguage === 'la' ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-medium)',
              }}
            >
              🏛️ Latein
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Sparkles className="animate-spin" size={32} style={{ marginBottom: '0.75rem' }} />
            <p>Statistiken werden berechnet...</p>
          </div>
        ) : stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 4 Metric Hero Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {/* Card 1: Mastered Words */}
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Gemeistert
                  </span>
                  <Trophy size={18} color="var(--success)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)' }}>
                    {stats.masteredWords}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    / {stats.totalWords}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats.totalWords > 0 ? Math.round((stats.masteredWords / stats.totalWords) * 100) : 0}% in Kasten 4 & 5
                </span>
              </div>

              {/* Card 2: Accuracy */}
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Erfolgsquote
                  </span>
                  <Target size={18} color="var(--primary-light)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                    {stats.accuracyRate}%
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats.correctReviews} von {stats.totalReviews} richtig
                </span>
              </div>

              {/* Card 3: Learning Streak */}
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Lern-Serie
                  </span>
                  <Flame size={18} color="var(--warning)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--warning)' }}>
                    {stats.streakDays}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tage</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats.streakDays > 0 ? 'Toller Rhythmus! Weiter so' : 'Heute noch nicht geübt'}
                </span>
              </div>

              {/* Card 4: Total Reviews */}
              <div
                className="glass-panel"
                style={{
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Übungsdurchläufe
                  </span>
                  <BookOpen size={18} color="var(--info)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stats.totalReviews}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Abfragen</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stats.learningWords} Wörter im aktiven Training
                </span>
              </div>
            </div>

            {/* Leitner Box Visualizer */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={18} color="var(--primary-light)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Leitner-Kästchen System</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {stats.totalWords} Vokabeln verteilt
                </span>
              </div>

              {/* Stacked Proportional Bar */}
              <div
                style={{
                  height: '14px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                }}
              >
                {BOX_CONFIG.map(({ box, color }) => {
                  const count = stats.boxDistribution[box as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = stats.totalWords > 0 ? (count / stats.totalWords) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={box}
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: color,
                        transition: 'width 0.3s ease',
                      }}
                      title={`Kasten ${box}: ${count} Wörter (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>

              {/* Box Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '0.6rem',
                }}
              >
                {BOX_CONFIG.map(({ box, label, desc, color, bg }) => {
                  const count = stats.boxDistribution[box as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = stats.totalWords > 0 ? Math.round((count / stats.totalWords) * 100) : 0;
                  return (
                    <div
                      key={box}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: bg,
                        border: `1px solid ${color}40`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color, marginBottom: '2px' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                        {count}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {pct}% • {desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Improvement Graph (Lernkurve & Fortschritt) */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--success)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {graphMode === 'mastery' ? 'Lernkurve: Gemeisterte Vokabeln' : 'Tägliche Übungen & Trefferquote'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Mode switcher: Mastery Line vs Activity Bars */}
                  <div
                    style={{
                      display: 'flex',
                      background: 'var(--bg-primary)',
                      padding: '2px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setGraphMode('mastery')}
                      className="btn btn-sm"
                      style={{
                        minHeight: '32px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: graphMode === 'mastery' ? 'var(--primary)' : 'transparent',
                        color: graphMode === 'mastery' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <TrendingUp size={13} style={{ marginRight: '4px' }} />
                      Lernkurve
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphMode('activity')}
                      className="btn btn-sm"
                      style={{
                        minHeight: '32px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: graphMode === 'activity' ? 'var(--primary)' : 'transparent',
                        color: graphMode === 'activity' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      <BarChart2 size={13} style={{ marginRight: '4px' }} />
                      Aktivität
                    </button>
                  </div>

                  {/* Timeframe toggle */}
                  <div
                    style={{
                      display: 'flex',
                      background: 'var(--bg-primary)',
                      padding: '2px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('7d')}
                      className="btn btn-sm"
                      style={{
                        minHeight: '32px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: selectedTimeframe === '7d' ? 'var(--bg-surface-elevated)' : 'transparent',
                        color: selectedTimeframe === '7d' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      7 Tage
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('14d')}
                      className="btn btn-sm"
                      style={{
                        minHeight: '32px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: selectedTimeframe === '14d' ? 'var(--bg-surface-elevated)' : 'transparent',
                        color: selectedTimeframe === '14d' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      14 Tage
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Chart */}
              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  border: '1px solid var(--border-subtle)',
                  position: 'relative',
                }}
              >
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="masteryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = padding.top + chartHeight * (1 - pct);
                    const val = graphMode === 'mastery'
                      ? Math.round(maxMastered * pct)
                      : Math.round(maxReviews * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + chartWidth}
                          y2={y}
                          stroke="rgba(255, 255, 255, 0.08)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          fill="var(--text-muted)"
                          fontSize="10"
                          textAnchor="end"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Mode A: Mastery Line & Area Chart */}
                  {graphMode === 'mastery' && (
                    <>
                      {/* Filled area below curve */}
                      {masteryAreaD && (
                        <path d={masteryAreaD} fill="url(#masteryGradient)" />
                      )}

                      {/* Smooth trend curve */}
                      {masteryPathD && (
                        <path
                          d={masteryPathD}
                          fill="none"
                          stroke="var(--success)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data dots with touch/hover */}
                      {masteryPoints.map((pt, i) => (
                        <g
                          key={i}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPoint(pt.data)}
                          onTouchStart={() => setHoveredPoint(pt.data)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPoint?.date === pt.data.date ? 6.5 : 4}
                            fill="#10b981"
                            stroke="#0d1117"
                            strokeWidth="2.5"
                          />
                        </g>
                      ))}
                    </>
                  )}

                  {/* Mode B: Daily Reviews Stacked Bar Chart */}
                  {graphMode === 'activity' && (
                    <>
                      {displayHistory.map((h, i) => {
                        const barWidth = Math.max(12, (chartWidth / displayHistory.length) * 0.55);
                        const x = padding.left + (chartWidth / Math.max(1, displayHistory.length - 1)) * i - barWidth / 2;
                        const totalHeight = (h.reviewsCount / maxReviews) * chartHeight;
                        const correctHeight = h.reviewsCount > 0 ? (h.correctCount / h.reviewsCount) * totalHeight : 0;
                        const incorrectHeight = totalHeight - correctHeight;
                        const baseY = padding.top + chartHeight;

                        return (
                          <g
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredPoint(h)}
                            onTouchStart={() => setHoveredPoint(h)}
                          >
                            {/* Incorrect reviews (orange) */}
                            {incorrectHeight > 0 && (
                              <rect
                                x={x}
                                y={baseY - totalHeight}
                                width={barWidth}
                                height={incorrectHeight}
                                rx="3"
                                fill="#f59e0b"
                              />
                            )}
                            {/* Correct reviews (green) */}
                            {correctHeight > 0 && (
                              <rect
                                x={x}
                                y={baseY - correctHeight}
                                width={barWidth}
                                height={correctHeight}
                                rx="3"
                                fill="#10b981"
                              />
                            )}
                            {/* Hitbox for touch */}
                            <rect
                              x={x - 6}
                              y={padding.top}
                              width={barWidth + 12}
                              height={chartHeight}
                              fill="transparent"
                            />
                          </g>
                        );
                      })}
                    </>
                  )}

                  {/* X-axis date labels */}
                  {displayHistory.map((h, i) => {
                    // Show label on alternate points if 14d, or all if 7d
                    if (selectedTimeframe === '14d' && i % 2 !== 0 && i !== displayHistory.length - 1) {
                      return null;
                    }
                    const x = padding.left + (chartWidth / Math.max(1, displayHistory.length - 1)) * i;
                    return (
                      <text
                        key={i}
                        x={x}
                        y={padding.top + chartHeight + 18}
                        fill="var(--text-muted)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {h.dayLabel}
                      </text>
                    );
                  })}
                </svg>

                {/* Hover / Touch Tooltip display */}
                {hoveredPoint ? (
                  <div
                    style={{
                      marginTop: '0.6rem',
                      padding: '0.5rem 0.85rem',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} color="var(--primary-light)" />
                      <span style={{ fontWeight: 600 }}>{hoveredPoint.date} ({hoveredPoint.dayLabel})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span>
                        🏆 Gemeistert: <strong style={{ color: 'var(--success)' }}>{hoveredPoint.masteredCumulative}</strong>
                      </span>
                      <span>
                        🎯 Übungen: <strong>{hoveredPoint.reviewsCount}</strong> (
                        <span style={{ color: 'var(--success)' }}>{hoveredPoint.correctCount} ✓</span> /{' '}
                        <span style={{ color: 'var(--warning)' }}>{hoveredPoint.incorrectCount} ✗</span>)
                      </span>
                      <span>
                        Quote: <strong>{hoveredPoint.accuracy}%</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '0.6rem',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    Tippe oder bewege den Zeiger über die Datenpunkte, um Details anzuzeigen.
                  </div>
                )}
              </div>
            </div>

            {/* Difficult Words (Fokus-Vokabeln) */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="var(--warning)" />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Fokus-Wörter (Häufige Fehler)</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Benötigen zusätzliche Wiederholungen
                </span>
              </div>

              {stats.difficultWords && stats.difficultWords.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                  {stats.difficultWords.map((word) => (
                    <div
                      key={word.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                          {word.word}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {word.translation}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                          }}
                        >
                          {word.incorrectCount} Fehlversuche
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Kasten {word.box}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    background: 'rgba(16, 185, 129, 0.06)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <Sparkles size={20} color="var(--success)" style={{ marginBottom: '0.35rem' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Hervorragend! Keine Problemwörter aktuell.
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Alle Vokabeln wurden fehlerfrei oder mit hoher Trefferquote beantwortet.
                  </p>
                </div>
              )}
            </div>

            {/* Reset Confirmation or Reset Trigger */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              {showResetConfirm ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#f87171' }}>
                    Lernstand für Profil "{activeProfile?.name || 'Standard'}" wirklich auf Kasten 1 zurücksetzen?
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="btn btn-danger btn-sm"
                      style={{ minHeight: '36px', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      Ja, zurücksetzen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="btn btn-secondary btn-sm"
                      style={{ minHeight: '36px', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    minHeight: '44px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Lernfortschritt dieses Schülers zurücksetzen...</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  minHeight: '44px',
                  padding: '0.5rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                Weiterlernen
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <p>Keine Statistiken für dieses Profil gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
};
