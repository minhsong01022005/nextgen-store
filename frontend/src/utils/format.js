export const formatVND = (num) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num || 0);

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "";

export const STATUS = {
  pending: { label: "⏳ Chờ xác nhận", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900" },
  processing: { label: "📦 Chờ lấy hàng", cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900" },
  shipping: { label: "🚚 Đang giao hàng", cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900" },
  delivered: { label: "📬 Đã giao", cls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900" },
  completed: { label: "✅ Hoàn tất", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900" },
  cancelled: { label: "❌ Đã hủy", cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900" },
  return_requested: { label: "↩️ Yêu cầu trả hàng", cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900" },
  returned: { label: "🔁 Đã trả hàng", cls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
};

// Nhãn nút hành động theo trạng thái đích
export const ACTION_LABEL = {
  processing: "Xác nhận đơn",
  shipping: "Bàn giao vận chuyển",
  delivered: "Đã giao thành công",
  cancelled: "Hủy đơn",
  completed: "Đã nhận hàng",
  return_requested: "Trả hàng",
  returned: "Chấp nhận trả hàng",
};

export const PAYMENT = { cod: "Thanh toán khi nhận hàng (COD)", bank: "Chuyển khoản ngân hàng" };
