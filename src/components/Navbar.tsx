import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  Search,
  User,
  LogOut,
  Heart,
  ClipboardList,
  Settings,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, type UserRole } from "@/store/authStore";
import { useState } from "react";

interface NavLink {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const navLinks: NavLink[] = [
  { to: "/", label: "首页", icon: Leaf },
  { to: "/search", label: "搜索", icon: Search },
  { to: "/favorites", label: "我的收藏", icon: Heart, roles: ["user", "admin"] },
  { to: "/diet-plan", label: "饮食计划", icon: ClipboardList, roles: ["user", "admin"] },
  { to: "/admin", label: "管理后台", icon: Settings, roles: ["admin"] },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const filteredLinks = navLinks.filter((link) => {
    if (!link.roles) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-health flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-zinc-900">零食健康查</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {filteredLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 hover:text-health hover:bg-health-50 transition-colors"
                )}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-zinc-200 hover:border-health hover:bg-health-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-health-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-health-600" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700">
                    {user.username}
                  </span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-zinc-100 shadow-lg py-1 z-50">
                      <div className="px-3 py-2 border-b border-zinc-100">
                        <p className="text-sm font-medium text-zinc-900">
                          {user.username}
                        </p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                      <Link
                        to="/favorites"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <Heart className="w-4 h-4" />
                        我的收藏
                      </Link>
                      <Link
                        to="/diet-plan"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <ClipboardList className="w-4 h-4" />
                        饮食计划
                      </Link>
                      <div className="border-t border-zinc-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-danger w-full hover:bg-danger-50"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  登录
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {filteredLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-health hover:bg-health-50 transition-colors shrink-0"
            >
              <link.icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
