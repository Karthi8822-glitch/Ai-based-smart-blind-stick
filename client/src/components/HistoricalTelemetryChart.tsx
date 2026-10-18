import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, RefreshCw, BarChart2, ShieldCheck, AlertCircle } from 'lucide-react';
import { SensorHistoryRow } from '../services/supabase';

interface HistoricalTelemetryChartProps {
  history: SensorHistoryRow[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const HistoricalTelemetryChart: React.FC<HistoricalTelemetryChartProps> = ({
  history,
  isLoading = false,
  onRefresh,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<'all' | 'front' | 'left' | 'right'>('all');

  // Chart dimensions
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Max distance scale in centimetres (sonar max range is 400 cm)
  const maxDistanceCm = 400;

  // Valid chronological data points
  const points = history.map((row, index) => {
    const front = row.front_distance_cm !== null && row.front_distance_cm !== undefined ? Number(row.front_distance_cm) : null;
    const left = row.left_distance_cm !== null && row.left_distance_cm !== undefined ? Number(row.left_distance_cm) : null;
    const right = row.right_distance_cm !== null && row.right_distance_cm !== undefined ? Number(row.right_distance_cm) : null;
    const time = new Date(row.timestamp);
    const timeStr = !isNaN(time.getTime()) 
      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      : `T-${index}`;

    return {
      index,
      timeStr,
      timestamp: row.timestamp,
      front,
      left,
      right,
      obstacleLevel: row.obstacle_level || 'clear',
    };
  });

  const numPoints = points.length;

  const getX = (index: number) => {
    if (numPoints <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (numPoints - 1)) * graphWidth;
  };

  const getY = (valCm: number | null) => {
    if (valCm === null || isNaN(valCm)) return padding.top + graphHeight;
    const clamped = Math.max(0, Math.min(maxDistanceCm, valCm));
    return padding.top + graphHeight - (clamped / maxDistanceCm) * graphHeight;
  };

  // Helper to build SVG path
  const makePath = (accessor: (p: typeof points[0]) => number | null) => {
    const valid = points
      .map((p, i) => ({ x: getX(i), y: getY(accessor(p)), val: accessor(p) }))
      .filter((p) => p.val !== null);

    if (valid.length === 0) return '';
    return valid.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  const frontPath = makePath((p) => p.front);
  const leftPath = makePath((p) => p.left);
  const rightPath = makePath((p) => p.right);

  // Area path for Front Sonar
  const frontAreaPath = frontPath
    ? `${frontPath} L ${getX(numPoints - 1)} ${padding.top + graphHeight} L ${getX(0)} ${padding.top + graphHeight} Z`
    : '';

  const hoveredPoint = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length ? points[hoveredIndex] : null;

  return (
    <div className={`p-6 bg-zinc-950/70 border border-white/10 flex flex-col justify-between relative overflow-hidden ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              HISTORICAL TELEMETRY MATRIX
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              CHRONOLOGICAL ORDER (ASC)
            </span>
          </div>
          <h3 className="text-white font-display font-medium text-base mt-1">
            Tri-Directional Sonar Trend (cm)
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sensor visibility filter */}
          <div className="flex items-center border border-white/10 bg-black/60 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setSelectedSensor('all')}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === 'all' ? 'bg-white/20 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setSelectedSensor('front')}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === 'front' ? 'bg-emerald-500/30 text-emerald-300 font-bold' : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              FRONT
            </button>
            <button
              onClick={() => setSelectedSensor('left')}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === 'left' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-zinc-400 hover:text-cyan-300'
              }`}
            >
              LEFT
            </button>
            <button
              onClick={() => setSelectedSensor('right')}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === 'right' ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              RIGHT
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 border border-white/10 bg-black/60 hover:bg-white/10 text-zinc-400 hover:text-white rounded transition-colors disabled:opacity-50"
              title="Refresh Historical Data"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main SVG Area Chart */}
      {points.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-white/10 bg-black/40 text-center p-6">
          <Clock className="w-8 h-8 text-zinc-600 mb-2" />
          <span className="font-mono text-xs uppercase text-zinc-400">
            NO HISTORICAL RECORDS FOUND
          </span>
          <span className="font-sans text-[11px] text-zinc-600 mt-1">
            Awaiting device &apos;nexus-01&apos; to dispatch readings to Supabase sensor_history.
          </span>
        </div>
      ) : (
        <div className="relative w-full aspect-[16/7] min-h-[200px] select-none bg-black/40 border border-white/5 rounded overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="frontGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels in cm */}
            {[0, 100, 200, 300, 400].map((distCm) => {
              const y = getY(distCm);
              return (
                <g key={distCm}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray={distCm === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.4)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {distCm} cm
                  </text>
                </g>
              );
            })}

            {/* Critical Hazard Zone (< 80 cm) Fill */}
            <rect
              x={padding.left}
              y={getY(80)}
              width={graphWidth}
              height={getY(0) - getY(80)}
              fill="rgba(239, 68, 68, 0.05)"
            />

            {/* Area fill for Front Sensor */}
            {(selectedSensor === 'all' || selectedSensor === 'front') && frontAreaPath && (
              <path d={frontAreaPath} fill="url(#frontGradient)" />
            )}

            {/* Left Sonar Line (Cyan) */}
            {(selectedSensor === 'all' || selectedSensor === 'left') && leftPath && (
              <path
                d={leftPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.8"
              />
            )}

            {/* Right Sonar Line (Amber) */}
            {(selectedSensor === 'all' || selectedSensor === 'right') && rightPath && (
              <path
                d={rightPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                opacity="0.8"
              />
            )}

            {/* Front Sonar Line (Emerald, bold) */}
            {(selectedSensor === 'all' || selectedSensor === 'front') && frontPath && (
              <path
                d={frontPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
              />
            )}

            {/* Data point dots & Interactive hit areas */}
            {points.map((p, i) => {
              const x = getX(i);
              const isHovered = hoveredIndex === i;

              return (
                <g key={i}>
                  {/* Vertical cursor guide when hovered */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + graphHeight}
                      stroke="rgba(255, 255, 255, 0.35)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Front point */}
                  {(selectedSensor === 'all' || selectedSensor === 'front') && p.front !== null && (
                    <circle
                      cx={x}
                      cy={getY(p.front)}
                      r={isHovered ? 4.5 : 2.5}
                      fill="#10b981"
                      stroke="#000"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Left point */}
                  {(selectedSensor === 'all' || selectedSensor === 'left') && p.left !== null && (
                    <circle
                      cx={x}
                      cy={getY(p.left)}
                      r={isHovered ? 4 : 2}
                      fill="#06b6d4"
                      stroke="#000"
                      strokeWidth="1"
                    />
                  )}

                  {/* Right point */}
                  {(selectedSensor === 'all' || selectedSensor === 'right') && p.right !== null && (
                    <circle
                      cx={x}
                      cy={getY(p.right)}
                      r={isHovered ? 4 : 2}
                      fill="#f59e0b"
                      stroke="#000"
                      strokeWidth="1"
                    />
                  )}

                  {/* Full-column transparent mouse hover trigger */}
                  <rect
                    x={x - graphWidth / (numPoints * 2 || 1)}
                    y={padding.top}
                    width={graphWidth / (numPoints || 1)}
                    height={graphHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer"
                  />
                </g>
              );
            })}

            {/* X-Axis Timeline Labels (First, Middle, Last) */}
            {points.length > 0 && (
              <>
                <text
                  x={getX(0)}
                  y={height - 10}
                  textAnchor="start"
                  fill="rgba(255, 255, 255, 0.45)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {points[0].timeStr} (Earliest)
                </text>
                {points.length > 2 && (
                  <text
                    x={getX(Math.floor(points.length / 2))}
                    y={height - 10}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.35)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {points[Math.floor(points.length / 2)].timeStr}
                  </text>
                )}
                <text
                  x={getX(points.length - 1)}
                  y={height - 10}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.6)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {points[points.length - 1].timeStr} (Latest)
                </text>
              </>
            )}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-2 right-2 bg-black/95 border border-white/20 p-2.5 rounded shadow-xl font-mono text-[11px] pointer-events-none z-20 backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1.5 text-zinc-400">
                <span>TIME: {hoveredPoint.timeStr}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-white">
                  {hoveredPoint.obstacleLevel}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-emerald-300">
                  <span>FRONT SONAR:</span>
                  <span className="font-bold">{hoveredPoint.front !== null ? `${Math.round(hoveredPoint.front)} cm` : '--'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-cyan-300">
                  <span>LEFT SONAR:</span>
                  <span>{hoveredPoint.left !== null ? `${Math.round(hoveredPoint.left)} cm` : '--'}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-amber-300">
                  <span>RIGHT SONAR:</span>
                  <span>{hoveredPoint.right !== null ? `${Math.round(hoveredPoint.right)} cm` : '--'}</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Legend & Summary Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-zinc-300">FRONT (HC-SR04-F)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-zinc-300">LEFT (HC-SR04-L)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
            <span className="text-zinc-300">RIGHT (HC-SR04-R)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500">TOTAL SAMPLES:</span>
          <span className="text-white font-bold">{points.length}</span>
        </div>
      </div>
    </div>
  );
};
