import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, LayoutDashboard, Package, TicketPercent } from "lucide-react";

const tabs = [
  ["/admin", "Tổng quan", LayoutDashboard, true],
  ["/admin/orders", "Đơn hàng", ClipboardList],
  ["/admin/products", "Kho hàng", Package],
  ["/admin/coupons", "Mã giảm giá", TicketPercent],
];

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 overflow-x-auto card !rounded-xl p-1.5 w-fit max-w-full">
        {tabs.map(([to, label, Icon, end]) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive ? "bg-indigo-600 text-white shadow" : "muted hover:text-indigo-600"
              }`
            }
          >
            <Icon size={14} /> {label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
