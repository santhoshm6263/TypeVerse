import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { BarChart2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Stats {
  highestWpm: number;
  averageWpm: number;
  bestAccuracy: number;
  totalTests: number;
  totalCharacters: number;
  totalTimeSeconds: number;
}

interface HistoryItem {
  id: string;
  mode: string;
  difficulty: string;
  durationSeconds: number;
  wpm: number;
  accuracy: number;
  mistakes: number;
  backspaces: number;
  createdAt: string;
}

export const Statistics: React.FC = () => {
  const { accessToken } = useAuthStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modeFilter, setModeFilter] = useState('all');
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch stats summary
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/stats/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [accessToken]);

  // Fetch paginated history list
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/history/me?page=${page}&limit=7&mode=${modeFilter}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (res.ok) {
          setHistory(data.history);
          setTotalPages(data.pagination.totalPages || 1);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [page, modeFilter, accessToken]);

  // Render a custom SVG neon line chart from history data
  const renderSvgChart = () => {
    if (history.length === 0) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          [ INSUFFICIENT DATA POINTS FOR CHART RENDERING ]
        </div>
      );
    }

    // Chart dimensions
    const chartWidth = 560;
    const chartHeight = 160;
    const padding = 20;

    // Extract historical data (chronological order)
    const points = [...history].reverse().map(h => h.wpm);
    const maxVal = Math.max(...points, 80); // Cap min scale top at 80
    const minVal = Math.min(...points, 0);

    const range = maxVal - minVal || 1;

    // Map data values to SVG coordinates
    const coordinates = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1 || 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((val - minVal) / range) * (chartHeight - padding * 2);
      return { x, y, val };
    });

    // Construct SVG path string
    let pathD = '';
    if (coordinates.length > 0) {
      pathD = `M ${coordinates[0].x} ${coordinates[0].y}`;
      for (let i = 1; i < coordinates.length; i++) {
        pathD += ` L ${coordinates[i].x} ${coordinates[i].y}`;
      }
    }

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%' }}>
        <defs>
          <filter id="chart-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3" />
        <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-color)" strokeWidth="0.5" />

        {/* Connecting line */}
        {coordinates.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary-neon)"
            strokeWidth="3"
            filter="url(#chart-glow)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {coordinates.map((pt, idx) => (
          <g key={idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill="var(--bg-color)"
              stroke="var(--primary-neon)"
              strokeWidth="2"
            />
            {/* Speed Value Tooltip */}
            <text
              x={pt.x}
              y={pt.y - 8}
              fill="var(--primary-neon)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {Math.round(pt.val)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--primary-neon)' }}>
          [ INDIVIDUAL TELEMETRY MAINBOARD ]
        </h2>
      </div>

      {loadingStats ? (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '20px', color: 'var(--primary-neon)' }}>
          LOADING DIAGNOSTICS...
        </div>
      ) : (
        stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}
          >
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
              <div className="scan-laser" />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MAX SPEED</div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', marginTop: '6px' }}>
                {stats.highestWpm} <span style={{ fontSize: '12px' }}>WPM</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
              <div className="scan-laser" />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AVG SPEED</div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', marginTop: '6px' }}>
                {stats.averageWpm} <span style={{ fontSize: '12px' }}>WPM</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
              <div className="scan-laser" />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>BEST ACCURACY</div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', marginTop: '6px' }}>
                {stats.bestAccuracy}%
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
              <div className="scan-laser" />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>COMPLETED</div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', marginTop: '6px' }}>
                {stats.totalTests} <span style={{ fontSize: '12px' }}>RUNS</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
              <div className="scan-laser" />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TIME TYPED</div>
              <div style={{ fontSize: '24px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', marginTop: '6px' }}>
                {Math.ceil(stats.totalTimeSeconds / 60)} <span style={{ fontSize: '12px' }}>MINS</span>
              </div>
            </div>
          </div>
        )
      )}

      {/* Grid of chart and list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* SVG Chart panel */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div className="scan-laser" />
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--primary-neon)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} /> SPEED IMPULSE TREND (WPM)
          </h3>
          <div style={{ height: '180px', width: '100%' }}>{renderSvgChart()}</div>
        </div>

        {/* Paginated History List */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div className="scan-laser" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--primary-neon)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} /> RECENT DIAGNOSTIC LOGS
            </h3>
            
            {/* Filter selection */}
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'var(--primary-neon)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            >
              <option value="all">All</option>
              <option value="paragraph">Paragraph</option>
              <option value="words">Words</option>
              <option value="sentences">Sentences</option>
            </select>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '20px', color: 'var(--text-muted)' }}>
              READING RUN HISTORY...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '20px', color: 'var(--text-muted)' }}>
              [ LOG FILE EMPTY ]
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--primary-neon)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {item.mode} ({item.difficulty})
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()} · {item.durationSeconds}s
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ fontSize: '16px', color: 'var(--primary-neon)', fontWeight: 'bold' }}>
                        {Math.round(item.wpm)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>WPM</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round(item.accuracy)}% ACC</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="cyber-button"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="cyber-button"
                    style={{ padding: '4px 8px' }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
