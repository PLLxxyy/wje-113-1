export type NutritionLevel = "green" | "yellow" | "red";

export type NutritionType = "calories" | "protein" | "fat" | "sugar" | "sodium";

interface NutritionThreshold {
  green: number;
  yellow: number;
  unit: string;
  higherIsBetter?: boolean;
}

const NUTRITION_THRESHOLDS: Record<NutritionType, NutritionThreshold> = {
  calories: { green: 150, yellow: 300, unit: "千卡" },
  protein: { green: 5, yellow: 10, unit: "g", higherIsBetter: true },
  fat: { green: 5, yellow: 15, unit: "g" },
  sugar: { green: 5, yellow: 15, unit: "g" },
  sodium: { green: 120, yellow: 400, unit: "mg" },
};

export function getNutritionLevel(
  type: NutritionType,
  value: number
): NutritionLevel {
  const threshold = NUTRITION_THRESHOLDS[type];
  if (threshold.higherIsBetter) {
    if (value >= threshold.yellow) return "green";
    if (value >= threshold.green) return "yellow";
    return "red";
  } else {
    if (value <= threshold.green) return "green";
    if (value <= threshold.yellow) return "yellow";
    return "red";
  }
}

export function getNutritionUnit(type: NutritionType): string {
  return NUTRITION_THRESHOLDS[type].unit;
}

export function getNutritionLabel(type: NutritionType): string {
  const labels: Record<NutritionType, string> = {
    calories: "热量",
    protein: "蛋白质",
    fat: "脂肪",
    sugar: "糖分",
    sodium: "钠",
  };
  return labels[type];
}

export function getLevelLabel(level: NutritionLevel): string {
  const labels: Record<NutritionLevel, string> = {
    green: "健康",
    yellow: "偏高",
    red: "过高",
  };
  return labels[level];
}

export interface SnackNutrition {
  calories: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
}

export function calculateHealthScore(nutrition: SnackNutrition): number {
  let score = 100;

  const caloriesScore =
    nutrition.calories <= 150 ? 0 : nutrition.calories <= 300 ? 10 : 20;
  const fatScore = nutrition.fat <= 5 ? 0 : nutrition.fat <= 15 ? 10 : 20;
  const sugarScore = nutrition.sugar <= 5 ? 0 : nutrition.sugar <= 15 ? 10 : 20;
  const sodiumScore =
    nutrition.sodium <= 120 ? 0 : nutrition.sodium <= 400 ? 10 : 20;
  const proteinBonus =
    nutrition.protein >= 10 ? 5 : nutrition.protein >= 5 ? 2 : 0;

  score =
    score - caloriesScore - fatScore - sugarScore - sodiumScore + proteinBonus;

  return Math.max(0, Math.min(100, score));
}

export function getHealthScoreLevel(score: number): NutritionLevel {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

export function formatNumber(value: number, decimals = 1): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(decimals);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString).getTime();
  const now = Date.now();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} 天前`;

  return formatDate(dateString);
}
