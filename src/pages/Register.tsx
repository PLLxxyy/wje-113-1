import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Loader2,
  Leaf,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, user } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!username.trim()) {
      errors.username = "请输入用户名";
    } else if (username.trim().length < 2) {
      errors.username = "用户名至少2个字符";
    } else if (username.trim().length > 20) {
      errors.username = "用户名不能超过20个字符";
    }

    if (!email.trim()) {
      errors.email = "请输入邮箱地址";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "请输入有效的邮箱地址";
    }

    if (!password) {
      errors.password = "请输入密码";
    } else if (password.length < 6) {
      errors.password = "密码长度至少为6位";
    } else if (password.length > 32) {
      errors.password = "密码不能超过32个字符";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "请确认密码";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "两次输入的密码不一致";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      navigate("/", { replace: true });
    } catch {
    }
  };

  const passwordStrength = (() => {
    if (password.length < 6) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: "弱", color: "bg-danger" };
    if (score <= 2) return { level: 2, label: "中", color: "bg-warning" };
    return { level: 3, label: "强", color: "bg-health" };
  })();

  const getFieldError = (field: keyof FormErrors) => formErrors[field];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-health flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">创建账号</h1>
          <p className="text-zinc-500">加入我们，开启健康零食之旅</p>
        </div>

        <div className="card p-6 md:p-8">
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-danger-50 border border-danger-200">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (formErrors.username) {
                      setFormErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  placeholder="你的昵称"
                  className={`input-field pl-12 ${
                    getFieldError("username")
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  autoComplete="username"
                />
              </div>
              {getFieldError("username") && (
                <p className="mt-1.5 text-xs text-danger">{formErrors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="you@example.com"
                  className={`input-field pl-12 ${
                    getFieldError("email")
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  autoComplete="email"
                />
              </div>
              {getFieldError("email") && (
                <p className="mt-1.5 text-xs text-danger">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="至少6位字符"
                  className={`input-field pl-12 ${
                    getFieldError("password")
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  autoComplete="new-password"
                />
              </div>
              {password.length > 0 && passwordStrength.level > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-8 rounded-full ${
                          i <= passwordStrength.level ? passwordStrength.color : "bg-zinc-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    密码强度：{passwordStrength.label}
                  </span>
                </div>
              )}
              {getFieldError("password") && (
                <p className="mt-1.5 text-xs text-danger">{formErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (formErrors.confirmPassword) {
                      setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  placeholder="再次输入密码"
                  className={`input-field pl-12 ${
                    getFieldError("confirmPassword")
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : ""
                  }`}
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && password === confirmPassword && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-health" />
                )}
              </div>
              {getFieldError("confirmPassword") && (
                <p className="mt-1.5 text-xs text-danger">{formErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                "创建账号"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              已有账号？{" "}
              <Link
                to="/login"
                className="font-medium text-health hover:text-health-600 transition-colors"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
