import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  User,
  Clock,
  Plus,
  Minus,
  X,
  Loader2,
  Star,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import NutritionBadge from "@/components/NutritionBadge";
import {
  getHealthScoreLevel,
  formatRelativeTime,
  formatNumber,
} from "@/utils/health";
import { cn } from "@/lib/utils";
import type { Snack, Comment } from "../../shared/types";

const scoreColorClasses: Record<string, { stroke: string; text: string; bg: string }> = {
  green: { stroke: "stroke-health", text: "text-health", bg: "bg-health-50" },
  yellow: { stroke: "stroke-warning", text: "text-warning", bg: "bg-warning-50" },
  red: { stroke: "stroke-danger", text: "text-danger", bg: "bg-danger-50" },
};

function CircularProgress({
  value,
  size = 120,
}: {
  value: number;
  size?: number;
}) {
  const level = getHealthScoreLevel(value);
  const colors = scoreColorClasses[level];
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center",
        colors.bg
      )}
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute top-0 left-0 -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", colors.stroke)}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={cn("text-3xl font-bold", colors.text)}>{value}</span>
        <span className="text-xs text-zinc-500 mt-0.5">健康评分</span>
      </div>
    </div>
  );
}

export default function SnackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [snack, setSnack] = useState<Snack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showDietDialog, setShowDietDialog] = useState(false);
  const [dietQuantity, setDietQuantity] = useState(1);
  const [dietSubmitting, setDietSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    carbohydrates: 0,
    fiber: 0,
    ingredients: "",
  });

  useEffect(() => {
    if (!id) return;
    fetchSnack();
    if (user) {
      checkFavorite();
    }
  }, [id, user]);

  async function fetchSnack() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Snack }>(
        `/snacks/${id}`
      );
      setSnack(res.data);
      setLocalComments(res.data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function checkFavorite() {
    try {
      const res = await api.get<{ success: boolean; data: { isFavorited: boolean } }>(
        `/favorites/check/${id}`
      );
      setIsFavorited(res.data.isFavorited);
    } catch {
    }
  }

  async function toggleFavorite() {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setFavoriteLoading(true);
      if (isFavorited) {
        await api.delete(`/favorites/${id}`);
        setIsFavorited(false);
      } else {
        await api.post(`/favorites/${id}`);
        setIsFavorited(true);
      }
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function handleAddToDiet() {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setDietSubmitting(true);
      await api.post("/diet", {
        snackId: snack?.id,
        quantity: dietQuantity,
      });
      setShowDietDialog(false);
      setDietQuantity(1);
    } finally {
      setDietSubmitting(false);
    }
  }

  async function handleSubmitComment() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!commentText.trim()) return;
    try {
      setCommentSubmitting(true);
      const res = await api.post<{ success: boolean; data: Comment }>(
        `/snacks/${id}/comments`,
        {
          content: commentText.trim(),
          rating: commentRating,
        }
      );
      setLocalComments((prev) => [res.data, ...prev]);
      setCommentText("");
      setCommentRating(5);
    } finally {
      setCommentSubmitting(false);
    }
  }

  function openCorrectionDialog() {
    if (!snack) return;
    setCorrectionForm({
      calories: snack.calories,
      protein: snack.protein,
      fat: snack.fat,
      sugar: snack.sugar,
      sodium: snack.sodium,
      carbohydrates: snack.carbohydrates || 0,
      fiber: snack.fiber || 0,
      ingredients: (snack.ingredients || [])
        .map((i) => i.name + (i.isHarmful ? "*" : ""))
        .join(", "),
    });
    setShowCorrectionDialog(true);
  }

  async function handleSubmitCorrection() {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setCorrectionSubmitting(true);
      const ingredientsList = correctionForm.ingredients
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const isHarmful = s.endsWith("*");
          return { name: isHarmful ? s.slice(0, -1) : s, isHarmful };
        });

      await api.post(`/snacks/${id}/correction`, {
        calories: Number(correctionForm.calories),
        protein: Number(correctionForm.protein),
        fat: Number(correctionForm.fat),
        sugar: Number(correctionForm.sugar),
        sodium: Number(correctionForm.sodium),
        carbohydrates: Number(correctionForm.carbohydrates),
        fiber: Number(correctionForm.fiber),
        ingredients: ingredientsList,
      });
      setShowCorrectionDialog(false);
      alert("修正已提交，等待管理员审核");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "提交失败";
      alert(msg);
    } finally {
      setCorrectionSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-health" />
      </div>
    );
  }

  if (error || !snack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-danger mb-3" />
        <p className="text-zinc-600 mb-4">{error || "零食不存在"}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          返回
        </button>
      </div>
    );
  }

  const harmfulCount = snack.ingredients?.filter((i) => i.isHarmful).length || 0;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/5">
            <div className="aspect-square bg-zinc-100 rounded-2xl overflow-hidden">
              {snack.image ? (
                <img
                  src={snack.image}
                  alt={snack.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
                  <span className="text-6xl text-zinc-300">🍿</span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-3/5 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <span className="text-sm text-zinc-500">{snack.brand}</span>
                <h1 className="text-2xl font-bold text-zinc-900 mt-1">
                  {snack.name}
                </h1>
                {snack.avgRating !== undefined && snack.avgRating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-medium text-zinc-700">
                      {snack.avgRating}
                    </span>
                    <span className="text-sm text-zinc-500">
                      ({snack.reviewCount || 0} 条评价)
                    </span>
                  </div>
                )}
              </div>

              <CircularProgress value={snack.healthScore} />
            </div>

            <p className="text-zinc-600 mt-2 mb-4">{snack.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              <NutritionBadge type="calories" value={snack.calories} />
              <NutritionBadge type="protein" value={snack.protein} />
              <NutritionBadge type="fat" value={snack.fat} />
              <NutritionBadge type="sugar" value={snack.sugar} />
              <NutritionBadge type="sodium" value={snack.sodium} />
            </div>

            <div className="text-sm text-zinc-500 mb-6">
              每份：{snack.servingSize}
            </div>

            <div className="flex flex-wrap gap-3 mt-auto">
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={cn(
                  "btn-secondary gap-2",
                  isFavorited && "!bg-danger-50 !border-danger-200 !text-danger"
                )}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorited && "fill-current"
                  )}
                />
                {isFavorited ? "已收藏" : "收藏"}
              </button>
              <button
                onClick={() => setShowDietDialog(true)}
                className="btn-primary gap-2"
              >
                <Plus className="h-4 w-4" />
                添加到饮食计划
              </button>
              {user && (
                <button
                  onClick={openCorrectionDialog}
                  className="btn-secondary gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  修正成分
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <span>配料表</span>
          {harmfulCount > 0 && (
            <span className="text-xs bg-danger-50 text-danger px-2 py-0.5 rounded-full">
              含 {harmfulCount} 种需注意成分
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          {snack.ingredients?.map((ing) => (
            <span
              key={ing.id}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm",
                ing.isHarmful
                  ? "bg-danger-50 text-danger border border-danger-200 font-medium"
                  : "bg-zinc-100 text-zinc-700"
              )}
            >
              {ing.name}
            </span>
          ))}
          {(!snack.ingredients || snack.ingredients.length === 0) && (
            <p className="text-zinc-500 text-sm">暂无配料信息</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-zinc-500" />
          评价 ({localComments.length})
        </h2>

        {user && (
          <div className="mb-6 pb-6 border-b border-zinc-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-zinc-600">评分：</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setCommentRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5 transition-colors",
                        star <= commentRating
                          ? "fill-warning text-warning"
                          : "text-zinc-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="发表你的评价..."
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmitComment();
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || commentSubmitting}
                className="btn-primary"
              >
                {commentSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "发布"
                )}
              </button>
            </div>
          </div>
        )}

        {!user && (
          <div className="mb-6 pb-6 border-b border-zinc-100 text-center">
            <p className="text-zinc-500 mb-3">登录后可发表评价</p>
            <button
              onClick={() => navigate("/login")}
              className="btn-secondary"
            >
              去登录
            </button>
          </div>
        )}

        <div className="space-y-4">
          {localComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-zinc-900 text-sm">
                    {comment.username || "匿名用户"}
                  </span>
                  <div className="flex">
                    {Array.from({ length: comment.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-warning text-warning"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-zinc-700 text-sm mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
          {localComments.length === 0 && (
            <p className="text-center text-zinc-500 py-8">暂无评价，快来抢沙发吧~</p>
          )}
        </div>
      </div>

      {showDietDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">添加到饮食计划</h3>
              <button
                onClick={() => setShowDietDialog(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-zinc-600 mb-4 text-sm">
              {snack.name} · 每份约 {formatNumber(snack.calories)} 千卡
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setDietQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-3xl font-bold w-16 text-center">
                {dietQuantity}
              </span>
              <button
                onClick={() => setDietQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDietDialog(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddToDiet}
                disabled={dietSubmitting}
                className="btn-primary flex-1"
              >
                {dietSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "确认添加"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">修正成分信息</h3>
              <button
                onClick={() => setShowCorrectionDialog(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              修改你发现不正确的营养成分，提交后需管理员审核通过才会更新。名称后加 <span className="font-mono bg-zinc-100 px-1"> *</span> 标记有害配料。
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">热量 (kcal)</label>
                <input
                  type="number"
                  value={correctionForm.calories}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, calories: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">蛋白质 (g)</label>
                <input
                  type="number"
                  value={correctionForm.protein}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, protein: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">脂肪 (g)</label>
                <input
                  type="number"
                  value={correctionForm.fat}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, fat: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">糖分 (g)</label>
                <input
                  type="number"
                  value={correctionForm.sugar}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, sugar: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">钠 (mg)</label>
                <input
                  type="number"
                  value={correctionForm.sodium}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, sodium: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">碳水化合物 (g)</label>
                <input
                  type="number"
                  value={correctionForm.carbohydrates}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, carbohydrates: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">纤维 (g)</label>
                <input
                  type="number"
                  value={correctionForm.fiber}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, fiber: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1">配料表（逗号分隔，有害成分加 * 后缀）</label>
              <textarea
                value={correctionForm.ingredients}
                onChange={(e) => setCorrectionForm({ ...correctionForm, ingredients: e.target.value })}
                rows={3}
                className="input-field resize-none"
                placeholder="例如：可可液块*, 白砂糖, 可可脂, 大豆磷脂"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCorrectionDialog(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={correctionSubmitting}
                className="btn-primary flex-1"
              >
                {correctionSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "提交修正"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
