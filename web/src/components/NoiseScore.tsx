"use client";

interface NoiseScoreProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function NoiseScore({
  score,
  size = "md",
  label = "Noise Score",
}: NoiseScoreProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const dimensions = {
    sm: { width: 80, strokeWidth: 6, fontSize: "text-lg", labelSize: "text-[10px]" },
    md: { width: 120, strokeWidth: 8, fontSize: "text-2xl", labelSize: "text-xs" },
    lg: { width: 160, strokeWidth: 10, fontSize: "text-3xl", labelSize: "text-sm" },
  };

  const { width, strokeWidth, fontSize, labelSize } = dimensions[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  const getColor = (value: number) => {
    if (value < 30) return { stroke: "#a78bfa", text: "text-violet-400" }; // subtle
    if (value < 70) return { stroke: "#8b5cf6", text: "text-violet-500" }; // moderate
    return { stroke: "#7c3aed", text: "text-violet-600" }; // heavy
  };

  const color = getColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width, height: width }}>
        <svg
          width={width}
          height={width}
          className="-rotate-90 transform"
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color.stroke}40)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${fontSize} text-slate-100`}>
            {clampedScore}
          </span>
          <span className={`${labelSize} text-slate-400`}>%</span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}
