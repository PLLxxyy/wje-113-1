import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  Milk,
  Cookie,
  Cake,
  Popcorn,
  Candy,
  Apple,
  Beef,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import SnackCard, { type SnackCardData } from "@/components/SnackCard";
import type { Snack } from "../../shared/types";

interface CategoryItem {
  name: string;
  icon: React.ElementType;
  gradient: string;
}

const categories: CategoryItem[] = [
  { name: "乳制品", icon: Milk, gradient: "from-blue-100 to-blue-200" },
  { name: "坚果", icon: Cookie, gradient: "from-amber-100 to-amber-200" },
  { name: "烘焙", icon: Cake, gradient: "from-orange-100 to-orange-200" },
  { name: "膨化", icon: Popcorn, gradient: "from-yellow-100 to-yellow-200" },
  { name: "巧克力", icon: Candy, gradient: "from-rose-100 to-rose-200" },
  { name: "果干", icon: Apple, gradient: "from-red-100 to-red-200" },
  { name: "肉干", icon: Beef, gradient: "from-pink-100 to-pink-200" },
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

export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSnacks, setPopularSnacks] = useState<SnackCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPopular() {
      try {
        setIsLoading(true);
        const res = await api.get<{ success: boolean; data: Snack[] }>(
          "/snacks/popular"
        );
        setPopularSnacks(res.data.map(mapSnackToCard));
      } catch {
        setPopularSnacks([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPopular();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/search?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="space-y-12">
      <section className="relative -mx-4 -mt-6 px-4 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-health-50 via-white to-amber-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-health-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
            吃得健康，{" "}
            <span className="bg-gradient-to-r from-health-600 to-health-400 bg-clip-text text-transparent">
              零食也可以
            </span>
          </h1>
          <p className="text-lg text-zinc-600 mb-8">
            智能分析零食营养成分，帮你做出更健康的选择
          </p>

          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入零食名或品牌，例如：薯片、乐事..."
                className="w-full pl-14 pr-32 py-4 rounded-2xl bg-white border border-zinc-200 shadow-lg shadow-zinc-200/50 text-base placeholder:text-zinc-400 focus:border-health focus:outline-none focus:ring-4 focus:ring-health/10 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6 py-2.5"
              >
                搜索
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <span className="text-sm text-zinc-500">热门搜索：</span>
            {["薯片", "巧克力", "酸奶", "坚果", "牛肉干"].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setSearchQuery(tag);
                  navigate(`/search?q=${encodeURIComponent(tag)}`);
                }}
                className="text-sm px-3 py-1 rounded-full bg-white/80 border border-zinc-200 text-zinc-600 hover:border-health hover:text-health transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">热门零食</h2>
            <p className="text-zinc-500 mt-1">根据评分和评价精选</p>
          </div>
          <Link
            to="/search"
            className="flex items-center gap-1 text-sm font-medium text-health hover:text-health-600 transition-colors"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-health animate-spin" />
          </div>
        ) : popularSnacks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {popularSnacks.map((snack) => (
              <SnackCard key={snack.id} snack={snack} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-500">
            暂无热门零食
          </div>
        )}
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">分类浏览</h2>
          <p className="text-zinc-500 mt-1">按分类探索不同类型的零食</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-zinc-100 hover:border-health/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
              >
                <cat.icon className="w-7 h-7 text-zinc-700" />
              </div>
              <span className="text-sm font-medium text-zinc-700 group-hover:text-health transition-colors">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
