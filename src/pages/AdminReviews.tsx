import { useEffect, useState } from "react";
import {
  Eye,
  Check,
  X,
  X as XIcon,
  Clock,
  CheckCircle,
  XCircle,
  Cookie,
  User,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";

type ReviewStatus = "pending" | "approved" | "rejected";

interface ReviewItem {
  id: number;
  snackId: number;
  snackName: string;
  snackBrand: string;
  snackImage: string;
  submittedBy: number;
  submitterName: string;
  status: ReviewStatus;
  reviewNote?: string;
  reviewerId?: number;
  submittedAt: string;
  reviewedAt?: string;
}

interface ReviewDetail {
  id: number;
  snack: {
    id: number;
    name: string;
    brand: string;
    category: string;
    description: string;
    image: string;
    calories: number;
    sugar: number;
    fat: number;
    sodium: number;
    protein: number;
    carbohydrates: number;
    fiber: number;
    servingSize: string;
    healthScore: number;
    ingredients?: { id: number; name: string; isHarmful: boolean }[];
  };
  submittedBy: number;
  submitterName: string;
  submitterEmail: string;
  status: ReviewStatus;
  reviewNote?: string;
  reviewerId?: number;
  submittedAt: string;
  reviewedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const tabs: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已驳回" },
];

export default function AdminReviews() {
  const [activeTab, setActiveTab] = useState<ReviewStatus>("pending");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [detailReview, setDetailReview] = useState<ReviewDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      const res = await api.get<{
        success: boolean;
        data: { reviews: ReviewItem[]; pagination: Pagination };
      }>(`/admin/reviews?${params.toString()}`);
      setReviews(res.data.reviews);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("获取审核列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeTab, pagination.page]);

  const viewDetail = async (id: number) => {
    try {
      const res = await api.get<{ success: boolean; data: ReviewDetail }>(
        `/admin/reviews/${id}`
      );
      setDetailReview(res.data);
      setShowDetail(true);
    } catch (error) {
      console.error("获取审核详情失败", error);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("确定通过此审核？")) return;
    setProcessing(true);
    try {
      await api.post(`/admin/reviews/${id}/approve`);
      fetchReviews();
      if (detailReview?.id === id) setShowDetail(false);
    } catch (error) {
      console.error("审核通过失败", error);
      alert("操作失败，请重试");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectNote("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setProcessing(true);
    try {
      await api.post(`/admin/reviews/${rejectingId}/reject`, {
        reviewNote: rejectNote || "审核未通过",
      });
      setShowRejectModal(false);
      setRejectingId(null);
      fetchReviews();
      if (detailReview?.id === rejectingId) setShowDetail(false);
    } catch (error) {
      console.error("审核驳回失败", error);
      alert("操作失败，请重试");
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: ReviewStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <Clock className="h-3 w-3" />
            待审核
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3" />
            已通过
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
            <XCircle className="h-3 w-3" />
            已驳回
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">审核中心</h1>
        <p className="text-zinc-500 mt-1">审核用户提交的零食信息</p>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 text-center text-zinc-500">加载中...</div>
        ) : reviews.length === 0 ? (
          <div className="px-4 py-12 text-center text-zinc-500">暂无数据</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="px-6 py-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                      {review.snackImage ? (
                        <img
                          src={review.snackImage}
                          alt={review.snackName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Cookie className="h-6 w-6 text-zinc-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 truncate">
                          {review.snackName}
                        </h3>
                        {statusBadge(review.status)}
                      </div>
                      <p className="text-sm text-zinc-500 mb-2">
                        {review.snackBrand}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          提交人：{review.submitterName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(review.submittedAt)}
                        </span>
                        {review.reviewNote && (
                          <span className="text-zinc-400">
                            备注：{review.reviewNote}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => viewDetail(review.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      查看详情
                    </button>
                    {review.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(review.id)}
                          disabled={processing}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          通过
                        </button>
                        <button
                          onClick={() => openRejectModal(review.id)}
                          disabled={processing}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          驳回
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200">
            <p className="text-sm text-zinc-500">
              共 {pagination.total} 条记录
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-zinc-600">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="px-3 py-1.5 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDetail(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                审核详情 #{detailReview.id}
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                  {detailReview.snack.image ? (
                    <img
                      src={detailReview.snack.image}
                      alt={detailReview.snack.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Cookie className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold text-zinc-900">
                      {detailReview.snack.name}
                    </h3>
                    {statusBadge(detailReview.status)}
                  </div>
                  <p className="text-zinc-500 mb-2">{detailReview.snack.brand}</p>
                  <p className="text-sm text-zinc-600">
                    {detailReview.snack.description || "暂无描述"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">分类</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {detailReview.snack.category || "-"}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">每份规格</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {detailReview.snack.servingSize || "-"}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">健康评分</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {detailReview.snack.healthScore}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500 mb-1">热量</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {detailReview.snack.calories} kcal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">糖分</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.sugar} g
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">脂肪</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.fat} g
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">钠</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.sodium} mg
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">蛋白质</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.protein} g
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">碳水化合物</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.carbohydrates} g
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100">
                  <span className="text-zinc-500">纤维</span>
                  <span className="text-zinc-900 font-medium">
                    {detailReview.snack.fiber} g
                  </span>
                </div>
              </div>

              {detailReview.snack.ingredients &&
                detailReview.snack.ingredients.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-2">
                      配料
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detailReview.snack.ingredients.map((ing) => (
                        <span
                          key={ing.id}
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs ${
                            ing.isHarmful
                              ? "bg-red-50 text-red-700"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div className="bg-zinc-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 text-zinc-600">
                  <User className="h-4 w-4" />
                  <span>
                    提交人：{detailReview.submitterName} (
                    {detailReview.submitterEmail})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600">
                  <Calendar className="h-4 w-4" />
                  <span>提交时间：{formatDate(detailReview.submittedAt)}</span>
                </div>
                {detailReview.reviewNote && (
                  <div className="text-zinc-600">
                    审核备注：{detailReview.reviewNote}
                  </div>
                )}
              </div>
            </div>
            {detailReview.status === "pending" && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    handleApprove(detailReview.id);
                  }}
                  disabled={processing}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  通过
                </button>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    openRejectModal(detailReview.id);
                  }}
                  disabled={processing}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  驳回
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !processing && setShowRejectModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">驳回审核</h2>
              <button
                onClick={() => !processing && setShowRejectModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                驳回原因
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={4}
                placeholder="请填写驳回原因..."
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {processing ? "提交中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
