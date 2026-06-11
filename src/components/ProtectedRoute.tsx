import { Navigate, useLocation } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { useAuthStore, type UserRole } from "@/store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  roles,
}: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-health animate-spin" />
          <span className="text-sm text-zinc-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            权限不足
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            您没有权限访问此页面，请联系管理员或使用其他账号登录。
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
