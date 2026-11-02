import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import { EmptyState } from "./components/common";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import { Favorites, MyOrders } from "./pages/CustomerPages";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminLayout from "./pages/admin/AdminLayout";
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));

export default function App() {
  return (
    <Suspense fallback={<p className="muted text-sm py-10 text-center">Đang tải...</p>}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Shop />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="login" element={<Auth mode="login" />} />
        <Route path="register" element={<Auth mode="register" />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<RequireAuth customer><Checkout /></RequireAuth>} />
        <Route path="favorites" element={<RequireAuth customer><Favorites /></RequireAuth>} />
        <Route path="my-orders" element={<RequireAuth customer><MyOrders /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="coupons" element={<AdminCoupons />} />
        </Route>
        <Route path="*" element={<EmptyState>Không tìm thấy trang này.</EmptyState>} />
      </Route>
    </Routes>
    </Suspense>
  );
}
