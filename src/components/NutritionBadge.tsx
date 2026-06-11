import { cn } from "@/lib/utils";
import {
  type NutritionLevel,
  type NutritionType,
  getNutritionLabel,
  getNutritionLevel,
  getNutritionUnit,
  getLevelLabel,
  formatNumber,
} from "@/utils/health";

interface NutritionBadgeProps {
  type: NutritionType;
  value: number;
  showLabel?: boolean;
  showLevel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const levelStyles: Record<
  NutritionLevel,
  { bg: string; text: string; border: string; dot: string }
> = {
  green: {
    bg: "bg-[var(--nutrition-green-bg)]",
    text: "text-[var(--nutrition-green-text)]",
    border: "border-health-200",
    dot: "bg-[var(--nutrition-green)]",
  },
  yellow: {
    bg: "bg-[var(--nutrition-yellow-bg)]",
    text: "text-[var(--nutrition-yellow-text)]",
    border: "border-amber-200",
    dot: "bg-[var(--nutrition-yellow)]",
  },
  red: {
    bg: "bg-[var(--nutrition-red-bg)]",
    text: "text-[var(--nutrition-red-text)]",
    border: "border-danger-200",
    dot: "bg-[var(--nutrition-red)]",
  },
};

export default function NutritionBadge({
  type,
  value,
  showLabel = true,
  showLevel = true,
  size = "md",
  className,
}: NutritionBadgeProps) {
  const level = getNutritionLevel(type, value);
  const styles = levelStyles[level];
  const label = getNutritionLabel(type);
  const unit = getNutritionUnit(type);
  const levelLabel = getLevelLabel(level);

  const sizeClasses =
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border",
        styles.bg,
        styles.border,
        sizeClasses,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", styles.dot)} />
      <span className={cn("font-medium", styles.text)}>
        {showLabel && `${label} `}
        {formatNumber(value)}
        {unit}
      </span>
      {showLevel && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-xs font-medium",
            styles.bg,
            styles.text
          )}
        >
          {levelLabel}
        </span>
      )}
    </div>
  );
}
