import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Snack, Ingredient } from "@shared/types";

interface SnackFormData {
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
  ingredients: string;
}

const emptyForm: SnackFormData = {
  name: "",
  brand: "",
  category: "",
  description: "",
  image: "",
  calories: 0,
  sugar: 0,
  fat: 0,
  sodium: 0,
  protein: 0,
  carbohydrates: 0,
  fiber: 0,
  servingSize: "",
  ingredients: "",
};

interface SnackWithIngredients extends Snack {
  ingredients?: Ingredient[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminSnacks() {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingSnack, setEditingSnack] = useState<SnackWithIngredients | null>(
    null
  );
  const [formData, setFormData] = useState<SnackFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchSnacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (search) params.append("search", search);
      const res = await api.get<{
        success: boolean;
        data: { snacks: Snack[]; pagination: Pagination };
      }>(`/admin/snacks?${params.toString()}`);
      setSnacks(res.data.snacks);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error("获取零食列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnacks();
  }, [pagination.page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const openCreateModal = () => {
    setEditingSnack(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = async (snack: Snack) => {
    try {
      const res = await api.get<{ success: boolean; data: SnackWithIngredients }>(
        `/snacks/${snack.id}`
      );
      const data = res.data;
      setEditingSnack(data);
      setFormData({
        name: data.name,
        brand: data.brand,
        category: data.category,
        description: data.description || "",
        image: data.image || "",
        calories: data.calories,
        sugar: data.sugar,
        fat: data.fat,
        sodium: data.sodium,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fiber: data.fiber,
        servingSize: data.servingSize || "",
        ingredients: data.ingredients?.map((i) => i.name).join(", ") || "",
      });
      setShowModal(true);
    } catch (error) {
      console.error("获取零食详情失败", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个零食吗？")) return;
    try {
      await api.delete(`/snacks/${id}`);
      fetchSnacks();
    } catch (error) {
      console.error("删除失败", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brand || !formData.category) {
      alert("名称、品牌和分类不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const ingredientsList = formData.ingredients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, isHarmful: false }));

      const payload = {
        ...formData,
        calories: Number(formData.calories),
        sugar: Number(formData.sugar),
        fat: Number(formData.fat),
        sodium: Number(formData.sodium),
        protein: Number(formData.protein),
        carbohydrates: Number(formData.carbohydrates),
        fiber: Number(formData.fiber),
        ingredients: ingredientsList,
      };

      if (editingSnack) {
        await api.put(`/snacks/${editingSnack.id}`, payload);
      } else {
        await api.post("/snacks", payload);
      }
      setShowModal(false);
      fetchSnacks();
    } catch (error) {
      console.error("提交失败", error);
      alert("提交失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">零食管理</h1>
          <p className="text-zinc-500 mt-1">管理所有零食信息</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          新增零食
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 max-w-md"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索零食名称或品牌..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium"
        >
          搜索
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  品牌
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  健康评分
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  审核状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    加载中...
                  </td>
                </tr>
              ) : snacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                snacks.map((snack) => (
                  <tr key={snack.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      #{snack.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {snack.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {snack.brand}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {snack.category}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                        {snack.healthScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {snack.isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          已审核
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          <XCircle className="h-3 w-3" />
                          待审核
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(snack)}
                          className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(snack.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submitting && setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingSnack ? "编辑零食" : "新增零食"}
              </h2>
              <button
                onClick={() => !submitting && setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>品牌 *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>分类 *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>每份规格</label>
                  <input
                    type="text"
                    value={formData.servingSize}
                    onChange={(e) =>
                      setFormData({ ...formData, servingSize: e.target.value })
                    }
                    className={inputClass}
                    placeholder="如：100g"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>图片URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.value })
                    }
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>热量 (kcal)</label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        calories: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>糖分 (g)</label>
                  <input
                    type="number"
                    value={formData.sugar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sugar: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>脂肪 (g)</label>
                  <input
                    type="number"
                    value={formData.fat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fat: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>钠 (mg)</label>
                  <input
                    type="number"
                    value={formData.sodium}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sodium: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>蛋白质 (g)</label>
                  <input
                    type="number"
                    value={formData.protein}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        protein: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>碳水 (g)</label>
                  <input
                    type="number"
                    value={formData.carbohydrates}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carbohydrates: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>纤维 (g)</label>
                  <input
                    type="number"
                    value={formData.fiber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fiber: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>配料（逗号分隔）</label>
                  <textarea
                    value={formData.ingredients}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ingredients: e.target.value,
                      })
                    }
                    rows={3}
                    className={inputClass}
                    placeholder="例如：小麦粉, 白砂糖, 植物油, 食盐"
                  />
                </div>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
