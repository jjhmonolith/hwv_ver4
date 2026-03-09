"use client";

interface VolumeIndicatorProps {
  level: number; // 0-1
}

export function VolumeIndicator({ level }: VolumeIndicatorProps) {
  const bars = 5;
  const activeBars = Math.ceil(level * bars);

  return (
    <div className="flex items-end gap-0.5 h-5" data-testid="volume-indicator">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-colors ${
            i < activeBars ? "bg-green-500" : "bg-gray-300"
          }`}
          style={{ height: `${(i + 1) * 4}px` }}
        />
      ))}
    </div>
  );
}
