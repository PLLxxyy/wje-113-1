import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Cookie,
  Users,
  Clock,
  MessageSquare,
  ArrowRight,
  Package,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/api";

interface AdminStats {
  totalSnacks: number;
  approvedSnacks: number;
  pendingReviews: number;
  totalUsers: number;
  totalComments: number;
  totalFavorites: number;
  avgHealthScore: number;
  todayComments?: number;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-zinc-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<{ success: boolean; data: AdminStats }>(
          "/admin/stats"
        );
        setStats(res.data);
      } catch (error) {
        console.error("获取统计数据失败", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickLinks = [
    {
      title: "零食管理",
      description: "管理所有零食信息，支持增删改查",
      href: "/admin/snacks",
      icon: <Package className="h-6 w-6 text-white" />,
      bgColor: "bg-blue-500",
      hoverBg: "hover:bg-blue-600",
    },
    {
      title: "审核中心",
      description: "审核用户提交的零食信息",
      href: "/admin/reviews",
      icon: <ClipboardList className="h-6 w-6 text-white" />,
      bgColor: "bg-emerald-500",
      hoverBg: "hover:bg-emerald-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-zinc-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">管理后台</h1>
        <p className="text-zinc-500 mt-1">欢迎回来，查看站点统计数据</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="零食总数"
          value={stats?.totalSnacks ?? 0}
          icon={<Cookie className="h-6 w-6 text-white" />}
          color="bg-orange-500"
        />
        <StatsCard
          title="用户总数"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-violet-500"
        />
        <StatsCard
          title="待审核数量"
          value={stats?.pendingReviews ?? 0}
          icon={<Clock className="h-6 w-6 text-white" />}
          color="bg-amber-500"
        />
        <StatsCard
          title="评论总数"
          value={stats?.totalComments ?? 0}
          icon={<MessageSquare className="h-6 w-6 text-white" />}
          color="bg-sky-500"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">快捷入口</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group bg-white rounded-xl shadow-sm border border-zinc-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-4 rounded-xl ${link.bgColor} ${link.hoverBg} transition-colors`}
                >
                  {link.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">
                      {link.title}
                    </h3>
                    <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    {link.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
