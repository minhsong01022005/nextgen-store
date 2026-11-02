import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { errMsg, get } from "../../api";
import { formatVND, STATUS } from "../../utils/format";
import { EmptyState, Skeleton } from "../../components/common";

const COLORS = ["#4f46e5", "#ec4899", "#f59e0b", "#10b981"];
const RANGES = [[7, "7 ngày"], [30, "30 ngày"], [90, "90 ngày"]];

const compact = (v) => new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(v);
const tip = { contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 } };

function Stat({ label, value, cls }) {
  return (
    <div className="card p-5">
      <p className="text-xs muted font-medium">{label}</p>
      <h3 className={`text-2xl font-extrabold mt-1 ${cls}`}>{value}</h3>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ["stats", days], queryFn: () => get("/admin/stats", { days }) });

  if (q.isLoading) return <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (q.isError) return <EmptyState>{errMsg(q.error)}</EmptyState>;
  const s = q.data;
  const periodRevenue = s.revenue_by_day.reduce((a, d) => a + d.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat label="Tổng doanh thu (trừ đơn hủy/trả)" value={formatVND(s.total_revenue)} cls="text-emerald-600" />
        <Stat label="Tổng số đơn đặt hàng" value={`${s.total_orders} đơn`} cls="text-indigo-600 dark:text-indigo-400" />
        <Stat label="Mặt hàng đang kinh doanh" value={`${s.total_products} sản phẩm`} cls="" />
        <Stat label="Khách hàng đã đăng ký" value={s.total_customers} cls="text-amber-600" />
      </div>

      {s.low_stock_count > 0 && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
          <AlertTriangle size={17} /> Có <b>{s.low_stock_count}</b> sản phẩm sắp hết hàng (tồn ≤ 5). Vào tab Kho hàng để nhập thêm.
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-bold flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" /> Doanh thu theo ngày
            <span className="text-xs muted font-medium">({formatVND(periodRevenue)} trong kỳ)</span>
          </h3>
          <div className="flex gap-1.5">
            {RANGES.map(([d, l]) => <button key={d} className={days === d ? "chip-active" : "chip"} onClick={() => setDays(d)}>{l}</button>)}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={s.revenue_by_day}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5).replace("-", "/")} minTickGap={24} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
              <Tooltip {...tip} formatter={(v, n) => (n === "revenue" ? [formatVND(v), "Doanh thu"] : [v, "Số đơn"])} labelFormatter={(d) => `Ngày ${d.split("-").reverse().join("/")}`} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold mb-4">Doanh thu theo danh mục</h3>
          {s.revenue_by_category.length === 0 ? (
            <p className="text-xs muted py-8 text-center">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.revenue_by_category}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                  <Tooltip {...tip} formatter={(v) => formatVND(v)} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {s.revenue_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-4">Top sản phẩm bán chạy</h3>
          {s.top_products.length === 0 ? (
            <p className="text-xs muted py-8 text-center">Chưa có dữ liệu bán hàng.</p>
          ) : (
            <ol className="space-y-3">
              {s.top_products.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 line-clamp-1">{t.name}</span>
                  <span className="muted text-xs">{t.qty} đã bán</span>
                  <span className="font-bold text-xs w-28 text-right">{formatVND(t.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${v.cls}`}>{v.label}: {s.status_counts[k] || 0}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
