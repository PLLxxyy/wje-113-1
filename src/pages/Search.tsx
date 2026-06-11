import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  SearchX,
} from "lucide-react";
import { api } from "@/lib/api";
import SnackCard, { type SnackCardData } from "@/components/SnackCard";
import type { Snack } from "@shared/types";

type SortOption = {
  label: string;
  value: string;
  order: string;
};

const sortOptions: SortOption[] = [
  { label: "最新发布", value: "created_at", order: "desc" },
  { label: "健康评分最高", value: "health_score", order: "desc" },
  { label: "热量从低到高", value: "calories", order: "asc" },
  { label: "热量从高到低", value: "calories", order: "desc" },
  { label: "糖分从低到高", value: "sugar", order: "asc" },
  { label: "蛋白质从高到低", value: "protein", order: "desc" },
  { label: "名称 A-Z", value: "name", order: "asc" },
];

function mapSnackToCard(snack: Snack): SnackCardData {
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
    viewCount: snack.reviewCount ?? 0,
  };
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";

  const [inputValue, setInputValue] = useState(q);
  const [snacks, setSnacks] = useState<SnackCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sortValue, setSortValue] = useState("created_at_desc");
  const [sortOpen, setSortOpen] = useState(false);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sortField, sortOrder] = sortValue.split("_");
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (category) params.set("category", category);
      params.set("sort", sortField);
      params.set("order", sortOrder);
      params.set("limit", "24");

      const res = await api.get<{
        success: boolean;
        data: { snacks: Snack[]; pagination: { total: number } };
      }>(`/snacks?${params.toString()}`);

      setSnacks(res.data.snacks.map(mapSnackToCard));
      setTotal(res.data.pagination.total);
    } catch {
      setSnacks([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [q, category, sortValue]);

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputValue.trim();
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set("q", value);
    } else {
      newParams.delete("q");
    }
    setSearchParams(newParams);
  };

  const handleSortChange = (value: string) => {
    setSortValue(value);
    setSortOpen(false);
  };

  const currentSortLabel =
    sortOptions.find((o) => `${o.value}_${o.order}` === sortValue)?.label ||
    "最新发布";

  const searchTitle = q ? `"${q}" 的搜索结果` : category ? `${category}分类` : "全部零食";

  return (
    <div className="space-y-6">
      <div className="card p-4 md:p-6">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="搜索零食名或品牌..."
            className="w-full pl-12 pr-28 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm placeholder:text-zinc-400 focus:border-health focus:bg-white focus:outline-none focus:ring-2 focus:ring-health/20 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-5 py-2 text-sm"
          >
            搜索
          </button>
        </form>

        {category && !q && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-zinc-500">当前分类：</span>
            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-health-50 text-health border border-health-200">
              {category}
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("category");
                  setSearchParams(newParams);
                }}
                className="hover:text-health-600 ml-1"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{searchTitle}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isLoading ? "搜索中..." : `共找到 ${total} 个结果`}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm font-medium text-zinc-700 hover:border-health hover:text-health transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{currentSortLabel}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>

          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSortOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-zinc-100 shadow-lg py-1 z-50">
                {sortOptions.map((option) => {
                  const value = `${option.value}_${option.order}`;
                  const isActive = sortValue === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSortChange(value)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "text-health bg-health-50 font-medium"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-health animate-spin" />
        </div>
      ) : snacks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {snacks.map((snack) => (
            <SnackCard key={snack.id} snack={snack} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <SearchX className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            没有找到相关零食
          </h3>
          <p className="text-zinc-500 mb-6 max-w-md">
            试试其他关键词，或者浏览我们的分类看看有没有喜欢的零食
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-primary"
          >
            返回首页
          </button>
        </div>
      )}
    </div>
  );
}
