import { useState, useRef, useCallback, useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";

const GRID_SIZE = 3;
const DOT_RADIUS = 12;
const ACTIVE_DOT_RADIUS = 16;
const GRID_GAP = 80;
const PADDING = 40;

const LANG_COLORS: Record<Lang, { line: string; dot: string; activeDot: string }> = {
  tj: { line: "#228B22", dot: "#228B22", activeDot: "#CC0000" },
  ru: { line: "#0039A6", dot: "#0039A6", activeDot: "#D52B1E" },
  en: { line: "#3C3B6E", dot: "#3C3B6E", activeDot: "#B22234" },
};

interface PatternLockProps {
  onPatternComplete: (pattern: number[]) => void;
  error?: boolean;
}

export default function PatternLock({ onPatternComplete, error }: PatternLockProps) {
  const { lang } = useI18n();
  const colors = LANG_COLORS[lang];
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [shake, setShake] = useState(false);

  const totalSize = PADDING * 2 + GRID_GAP * (GRID_SIZE - 1);

  const getDotPosition = (index: number) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return { x: PADDING + col * GRID_GAP, y: PADDING + row * GRID_GAP };
  };

  const getEventPoint = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    const scaleX = totalSize / rect.width;
    const scaleY = totalSize / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, [totalSize]);

  const findDotAtPoint = useCallback((point: { x: number; y: number }) => {
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const pos = getDotPosition(i);
      const dist = Math.sqrt((point.x - pos.x) ** 2 + (point.y - pos.y) ** 2);
      if (dist < 30) return i;
    }
    return -1;
  }, []);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getEventPoint(e);
    if (!point) return;
    const dot = findDotAtPoint(point);
    if (dot >= 0) {
      setIsDrawing(true);
      setSelectedDots([dot]);
      setCurrentPoint(point);
    }
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const point = getEventPoint(e);
    if (!point) return;
    setCurrentPoint(point);
    const dot = findDotAtPoint(point);
    if (dot >= 0 && !selectedDots.includes(dot)) {
      setSelectedDots(prev => [...prev, dot]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPoint(null);
    if (selectedDots.length >= 3) {
      onPatternComplete(selectedDots);
    }
    setTimeout(() => setSelectedDots([]), 300);
  };

  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }, [error]);

  const linePath = selectedDots.map((dot, i) => {
    const pos = getDotPosition(dot);
    return `${i === 0 ? "M" : "L"} ${pos.x} ${pos.y}`;
  }).join(" ");

  const lastDot = selectedDots.length > 0 ? getDotPosition(selectedDots[selectedDots.length - 1]) : null;
  const trailingLine = lastDot && currentPoint && isDrawing
    ? `M ${lastDot.x} ${lastDot.y} L ${currentPoint.x} ${currentPoint.y}`
    : "";

  return (
    <div className={`flex justify-center ${shake ? "animate-shake" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        className="w-64 h-64 touch-none select-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* Lines */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={error ? "#ef4444" : colors.line}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}
        {trailingLine && (
          <path
            d={trailingLine}
            fill="none"
            stroke={colors.line}
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.5}
          />
        )}

        {/* Dots */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const pos = getDotPosition(i);
          const isSelected = selectedDots.includes(i);
          return (
            <g key={i}>
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={ACTIVE_DOT_RADIUS + 6}
                  fill={colors.activeDot}
                  opacity={0.15}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? ACTIVE_DOT_RADIUS : DOT_RADIUS}
                fill={isSelected ? colors.activeDot : colors.dot}
                opacity={isSelected ? 1 : 0.5}
                className="transition-all duration-150"
              />
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={5}
                  fill="white"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
