import { useState, useEffect } from "react";
import {
  Flame,
  Candy,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  X,
  Loader2,
  Search,
  Minus,
  ChevronDown,
  Utensils,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatNumber } from "@/utils/health";
import { cn } from "@/lib/utils";
import type { DietItem, Snack } from "../../shared/types";

interface DietSummary {
  totalCalories: number;
  totalProtein: number;
  totalSugar: number;
  totalFat: number;
  items: (DietItem & {
    snack_image?: string;
    calories_per?: number;
    sugar_per?: number;
  })[];
}

interface DietSettings {
  dailyCalories: number;
  dailySugar: number;
}

const SETTINGS_KEY = "diet-settings";
const DEFAULT_SETTINGS: DietSettings = {
  dailyCalories: 2000,
  dailySugar: 50,
};

function loadSettings(): DietSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: DietSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function ProgressBar({
  label,
  current,
  max,
  icon: Icon,
  iconColorClass,
  unit,
}: {
  label: string;
  current: number;
  max: number;
  icon: React.ElementType;
  iconColorClass: string;
  unit: string;
}) {
  const percent = Math.min(100, (current / max) * 100);
  const isOver = current > max;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isOver ? "bg-danger-50" : "bg-health-50"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isOver ? "text-danger" : iconColorClass
              )}
            />
          </div>
          <div>
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="text-xl font-bold text-zinc-900">
              {formatNumber(current)}
              <span className="text-sm font-normal text-zinc-500 ml-1">
                / {max} {unit}
              </span>
            </p>
          </div>
        </div>
        {isOver && (
          <div className="flex items-center gap-1 text-danger text-sm bg-danger-50 px-2.5 py-1 rounded-full">
            <AlertTriangle className="h-4 w-4" />
            <span>已超标</span>
          </div>
        )}
      </div>
      <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isOver ? "bg-danger" : "bg-gradient-to-r from-health-400 to-health"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 mt-2">
        已摄入 {percent.toFixed(0)}%
        {!isOver && `，还可摄入 ${formatNumber(Math.max(0, max - current))} ${unit}`}
      </p>
    </div>
  );
}

export default function DietPlan() {
  const [summary, setSummary] = useState<DietSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DietSettings>(loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [tempCalories, setTempCalories] = useState(settings.dailyCalories.toString());
  const [tempSugar, setTempSugar] = useState(settings.dailySugar.toString());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Snack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSnack, setSelectedSnack] = useState<Snack | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchDiet();
  }, []);

  async function fetchDiet() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get<{ success: boolean; data: DietSummary }>(
        `/diet?date=${today}`
      );

      const itemsWithNutrition: DietSummary["items"] = await Promise.all(
        res.data.items.map(async (item) => {
          try {
            const snackRes = await api.get<{ success: boolean; data: Snack }>(
              `/snacks/${item.snackId}`
            );
            return {
              ...item,
              snack_image: snackRes.data.image,
              calories_per: snackRes.data.calories,
              sugar_per: snackRes.data.sugar,
            };
          } catch {
            return { ...item, calories_per: 0, sugar_per: 0 };
          }
        })
      );

      setSummary({
        ...res.data,
        items: itemsWithNutrition,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem(id: number) {
    try {
      setDeletingId(id);
      await api.delete(`/diet/${id}`);
      setSummary((prev) => {
        if (!prev) return prev;
        const item = prev.items.find((i) => i.id === id);
        if (!item) return prev;
        const calPer = item.calories_per || 0;
        const sugPer = item.sugar_per || 0;
        return {
          ...prev,
          totalCalories: Math.round(prev.totalCalories - calPer * item.quantity),
          totalSugar:
            Math.round((prev.totalSugar - sugPer * item.quantity) * 10) / 10,
          items: prev.items.filter((i) => i.id !== id),
        };
      });
    } finally {
      setDeletingId(null);
    }
  }

  function handleOpenSettings() {
    setTempCalories(settings.dailyCalories.toString());
    setTempSugar(settings.dailySugar.toString());
    setShowSettings(true);
  }

  function handleSaveSettings() {
    const newSettings: DietSettings = {
      dailyCalories: parseInt(tempCalories, 10) || DEFAULT_SETTINGS.dailyCalories,
      dailySugar: parseInt(tempSugar, 10) || DEFAULT_SETTINGS.dailySugar,
    };
    setSettings(newSettings);
    saveSettings(newSettings);
    setShowSettings(false);
  }

  async function handleSearchSnacks() {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await api.get<{
        success: boolean;
        data: { snacks: Snack[] };
      }>(`/snacks?search=${encodeURIComponent(searchQuery.trim())}&limit=10`);
      setSearchResults(res.data.snacks);
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSnack(snack: Snack) {
    setSelectedSnack(snack);
    setQuantity(1);
  }

  async function handleAddSnack() {
    if (!selectedSnack) return;
    try {
      setAdding(true);
      await api.post("/diet", {
        snackId: selectedSnack.id,
        quantity,
      });
      setShowAddDialog(false);
      setSelectedSnack(null);
      setSearchQuery("");
      setSearchResults([]);
      setQuantity(1);
      fetchDiet();
    } finally {
      setAdding(false);
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
        <button onClick={fetchDiet} className="btn-primary">
          重试
        </button>
      </div>
    );
  }

  const items = summary?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-health" />
            今日饮食计划
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <button
          onClick={handleOpenSettings}
          className="btn-secondary gap-2"
        >
          <Settings className="h-4 w-4" />
          设置
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressBar
          label="今日热量摄入"
          current={summary?.totalCalories || 0}
          max={settings.dailyCalories}
          icon={Flame}
          iconColorClass="text-health"
          unit="千卡"
        />
        <ProgressBar
          label="今日糖分摄入"
          current={summary?.totalSugar || 0}
          max={settings.dailySugar}
          icon={Candy}
          iconColorClass="text-warning"
          unit="g"
        />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            今日饮食记录
            <span className="text-sm font-normal text-zinc-500 ml-2">
              ({items.length})
            </span>
          </h2>
          <button
            onClick={() => setShowAddDialog(true)}
            className="btn-primary gap-2"
          >
            <Plus className="h-4 w-4" />
            添加零食
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Utensils className="h-8 w-8 text-zinc-300" />
            </div>
            <p className="text-zinc-500 mb-4">还没有添加任何饮食记录</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="btn-secondary"
            >
              开始记录
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const itemCalories = Math.round((item.calories_per || 0) * item.quantity);
              const itemSugar = formatNumber((item.sugar_per || 0) * item.quantity);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                    {item.snack_image ? (
                      <img
                        src={item.snack_image}
                        alt={item.snackName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xl">🍿</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">
                      {item.snackName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {item.quantity} 份 · {itemCalories} 千卡 · 糖 {itemSugar}g
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 text-zinc-400 hover:text-danger hover:bg-danger-50 rounded-lg transition-colors shrink-0"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">每日目标设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  每日热量上限 (千卡)
                </label>
                <input
                  type="number"
                  value={tempCalories}
                  onChange={(e) => setTempCalories(e.target.value)}
                  className="input-field"
                  min={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  每日糖分上限 (g)
                </label>
                <input
                  type="number"
                  value={tempSugar}
                  onChange={(e) => setTempSugar(e.target.value)}
                  className="input-field"
                  min={1}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="btn-primary flex-1"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">添加零食</h3>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setSelectedSnack(null);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedSnack ? (
              <div className="flex-1 overflow-y-auto">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchSnacks();
                    }}
                    placeholder="搜索零食名称或品牌..."
                    className="input-field flex-1"
                    autoFocus
                  />
                  <button
                    onClick={handleSearchSnacks}
                    disabled={searching || !searchQuery.trim()}
                    className="btn-primary"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {searchResults.map((snack) => (
                      <button
                        key={snack.id}
                        onClick={() => handleSelectSnack(snack)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 text-left transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                          {snack.image ? (
                            <img
                              src={snack.image}
                              alt={snack.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">
                              🍿
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 truncate">
                            {snack.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {snack.brand} · {snack.calories} 千卡
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 rotate-[-90deg]" />
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() && !searching ? (
                  <p className="text-center text-zinc-500 py-8">没有找到相关零食</p>
                ) : (
                  <p className="text-center text-zinc-500 py-8">输入关键词搜索零食</p>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <button
                  onClick={() => setSelectedSnack(null)}
                  className="flex items-center gap-1 text-sm text-health mb-4 hover:underline"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  返回搜索
                </button>

                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl mb-4">
                  <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0">
                    {selectedSnack.image ? (
                      <img
                        src={selectedSnack.image}
                        alt={selectedSnack.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍿
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900">
                      {selectedSnack.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {selectedSnack.brand}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      每份 {selectedSnack.calories} 千卡 · 糖{" "}
                      {formatNumber(selectedSnack.sugar)}g
                    </p>
                  </div>
                  <Check className="h-5 w-5 text-health" />
                </div>

                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-3xl font-bold w-16 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedSnack(null)}
                    className="btn-secondary flex-1"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddSnack}
                    disabled={adding}
                    className="btn-primary flex-1"
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `确认添加 (${Math.round(selectedSnack.calories * quantity)} 千卡)`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
