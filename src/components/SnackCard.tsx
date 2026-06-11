import { Link } from "react-router-dom";
import { Heart, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getHealthScoreLevel,
  formatNumber,
} from "@/utils/health";
import NutritionBadge from "./NutritionBadge";

export interface SnackCardData {
  id: number;
  name: string;
  brand: string;
  image?: string;
  calories: number;
  protein: number;
  fat: number;
  sugar: number;
  sodium: number;
  healthScore: number;
  viewCount: number;
}

interface SnackCardProps {
  snack: SnackCardData;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  className?: string;
}

const scoreBgStyles: Record<string, string> = {
  green: "bg-health text-white",
  yellow: "bg-warning text-white",
  red: "bg-danger text-white",
};

export default function SnackCard({
  snack,
  isFavorite = false,
  onToggleFavorite,
  className,
}: SnackCardProps) {
  const scoreLevel = getHealthScoreLevel(snack.healthScore);

  return (
    <div
      className={cn(
        "card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1",
        className
      )}
    >
      <Link to={`/snack/${snack.id}`} className="block">
        <div className="relative aspect-square bg-zinc-100 overflow-hidden">
          {snack.image ? (
            <img
              src={snack.image}
              alt={snack.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <span className="text-4xl text-zinc-300">🍿</span>
            </div>
          )}

          <div
            className={cn(
              "absolute top-3 left-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm",
              scoreBgStyles[scoreLevel]
            )}
          >
            <Star className="h-3 w-3 fill-current" />
            <span>{snack.healthScore}</span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-1 text-xs text-white">
            <Eye className="h-3 w-3" />
            <span>{snack.viewCount}</span>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-1">
            <span className="text-xs text-zinc-500">{snack.brand}</span>
          </div>
          <h3 className="font-semibold text-zinc-900 mb-3 line-clamp-1">
            {snack.name}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            <NutritionBadge
              type="calories"
              value={snack.calories}
              showLevel={false}
              size="sm"
            />
            <NutritionBadge
              type="sugar"
              value={snack.sugar}
              showLevel={false}
              size="sm"
            />
            <NutritionBadge
              type="fat"
              value={snack.fat}
              showLevel={false}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>每份 {formatNumber(snack.calories)} 千卡</span>
          </div>
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite(snack.id);
          }}
          className={cn(
            "absolute bottom-4 right-4 p-2 rounded-full transition-all",
            isFavorite
              ? "bg-danger text-white shadow-md"
              : "bg-white/90 text-zinc-400 hover:text-danger hover:bg-white shadow-sm"
          )}
        >
          <Heart
            className={cn("h-4 w-4", isFavorite ? "fill-current" : "")}
          />
        </button>
      )}
    </div>
  );
}
