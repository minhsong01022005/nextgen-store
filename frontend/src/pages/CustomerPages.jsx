import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Heart } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg, get } from "../api";
import { useAuth } from "../context/AuthContext";
import { ACTION_LABEL, formatDate, formatVND, PAYMENT, STATUS } from "../utils/format";
import { EmptyState, PageTitle, ProductSkeletonGrid } from "../components/common";
import ProductCard from "../components/ProductCard";

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "processing", label: "Chờ lấy hàng" },
  { key: "shipping", label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
  { key: "completed", label: "Hoàn tất" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "return", label: "Trả hàng" },
];

const inTab = (o, key) =>
  !key || o.status === key || (key === "return" && (o.status === "return_requested" || o.status === "returned"));

// Khách chỉ có 3 thao tác: hủy, xác nhận đã nhận, yêu cầu trả hàng
const CUSTOMER_ACTIONS = {
  cancelled: { path: "cancel", ask: "Lý do hủy đơn (có thể bỏ trống):", required: false },
  completed: { path: "confirm-received" },
  return_requested: { path: "return", ask: "Lý do trả hàng:", required: true },
};

function Timeline({ history }) {
  if (!history?.length) return null;
  return (
    <ol className="text-xs space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
      {history.map((h, i) => (
        <li key={i}>
          <span className="font-semibold">{STATUS[h.status]?.label || h.status}</span>
          <span className="muted"> · {formatDate(h.created_at)}{h.note ? ` · ${h.note}` : ""}</span>
        </li>
      ))}
    </ol>
  );
}

function OrderCard({ o }) {
  const qc = useQueryClient();
  const act = useMutation({
    mutationFn: ({ path, reason }) => api.post(`/me/orders/${o.id}/${path}`, { reason }).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(errMsg(e, "Không thực hiện được thao tác!")),
  });

  const run = (target) => {
    const cfg = CUSTOMER_ACTIONS[target];
    let reason = "";
    if (cfg.ask) {
      const input = window.prompt(cfg.ask);
      if (input === null) return;
      reason = input.trim();
      if (cfg.required && !reason) return toast.error("Vui lòng nhập lý do!");
    }
    act.mutate({ path: cfg.path, reason });
  };

  const actions = (o.next_actions || []).filter((t) => CUSTOMER_ACTIONS[t]);

  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-extrabold">Đơn #{o.id}</p>
          <p className="text-xs muted">{formatDate(o.created_at)} · {PAYMENT[o.payment_method]}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span>
      </div>
      <ul className="text-sm space-y-1">
        {o.items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3">
            <span>{i.product_name} <span className="muted">× {i.quantity}</span></span>
            <span className="muted shrink-0">{formatVND(i.unit_price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <Timeline history={o.history} />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs muted">
          Giao tới: {o.customer_address}
          {o.coupon_code && <span className="ml-2 text-emerald-600 font-semibold">Mã {o.coupon_code}: -{formatVND(o.discount_amount)}</span>}
          {o.shipping_fee > 0 && <span className="ml-2">Phí ship: {formatVND(o.shipping_fee)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="price text-lg">{formatVND(o.total_amount)}</span>
          {actions.map((t) => (
            <button key={t} disabled={act.isPending} className={`${t === "completed" ? "btn-primary" : "btn-ghost"} !py-1.5 !text-xs`} onClick={() => run(t)}>
              {ACTION_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyOrders() {
  const [tab, setTab] = useState("");
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => get("/me/orders") });
  const rows = (q.data || []).filter((o) => inTab(o, tab));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageTitle icon={ClipboardList}>Đơn hàng của tôi</PageTitle>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const n = (q.data || []).filter((o) => inTab(o, t.key)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${tab === t.key ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 dark:border-slate-700 muted"}`}
            >
              {t.label}{t.key && n ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>
      {q.isLoading ? (
        <p className="muted text-sm">Đang tải...</p>
      ) : q.isError ? (
        <EmptyState>{errMsg(q.error)}</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>
          {tab ? "Chưa có đơn hàng nào ở mục này." : <>Bạn chưa có đơn hàng nào. <Link to="/" className="text-indigo-600 font-semibold">Mua sắm ngay</Link></>}
        </EmptyState>
      ) : (
        <div className="space-y-4">{rows.map((o) => <OrderCard key={o.id} o={o} />)}</div>
      )}
    </div>
  );
}

export function Favorites() {
  const { favIds } = useAuth();
  const q = useQuery({
    queryKey: ["favorites", favIds],
    queryFn: () => get("/products", { ids: favIds.join(","), page_size: 100 }),
    enabled: favIds.length > 0,
  });
  return (
    <div>
      <PageTitle icon={Heart}>Sản phẩm yêu thích</PageTitle>
      {favIds.length === 0 ? (
        <EmptyState>Bạn chưa lưu sản phẩm nào. Bấm biểu tượng trái tim trên sản phẩm để lưu lại.</EmptyState>
      ) : q.isLoading ? (
        <ProductSkeletonGrid n={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(q.data?.items || []).filter((p) => favIds.includes(p.id)).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
