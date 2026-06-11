import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import SnackDetail from "@/pages/SnackDetail";
import Favorites from "@/pages/Favorites";
import DietPlan from "@/pages/DietPlan";
import Search from "@/pages/Search";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminHome from "@/pages/AdminHome";
import AdminSnacks from "@/pages/AdminSnacks";
import AdminReviews from "@/pages/AdminReviews";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 text-zinc-900">404</h1>
        <p className="text-zinc-500">页面不存在</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/snack/:id" element={<SnackDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diet-plan"
              element={
                <ProtectedRoute>
                  <DietPlan />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/snacks"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminSnacks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminReviews />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
