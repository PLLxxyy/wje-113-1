import { useState, useEffect } from "react";
import { Heart, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import SnackCard, { type SnackCardData } from "@/components/SnackCard";
import type { Snack } from "../../shared/types";

function snackToCardData(snack: Snack & { viewCount?: number }): SnackCardData {
  return {
    id: snack.id,
    name: snack.name,
    brand: snack.brand,
    image: snack.image,
    calories: snack.calories,
    protein: snack.protein,
    fat: snack.fat,
    sugar: snack.sugar,
    sodium: snack.sodium,
    healthScore: snack.healthScore,
    viewCount: snack.viewCount ?? 0,
  };
}

export default function Favorites() {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Snack[] }>(
        "/favorites"
      );
      setSnacks(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(id: number) {
    try {
      setRemovingId(id);
      await api.delete(`/favorites/${id}`);
      setSnacks((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-health" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-zinc-600 mb-4">{error}</p>
        <button onClick={fetchFavorites} className="btn-primary">
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Heart className="h-6 w-6 text-danger fill-danger" />
          我的收藏
          <span className="text-sm font-normal text-zinc-500 ml-1">
            ({snacks.length})
          </span>
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">收藏喜欢的零食，随时查看</p>
      </div>

      {snacks.length === 0 ? (
        <div className="card py-20">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <Search className="h-10 w-10 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">
              还没有收藏任何零食
            </h3>
            <p className="text-zinc-500 text-sm mb-6">
              去逛逛，发现你喜欢的健康零食吧
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {snacks.map((snack) => (
            <div key={snack.id} className="relative">
              <SnackCard
                snack={snackToCardData(snack)}
                isFavorite={true}
                onToggleFavorite={
                  removingId === snack.id ? undefined : handleToggleFavorite
                }
              />
              {removingId === snack.id && (
                <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-health" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
