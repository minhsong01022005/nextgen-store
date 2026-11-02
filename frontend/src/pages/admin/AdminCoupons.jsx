import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Power, TicketPercent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg, get } from "../../api";
import { formatDate, formatVND } from "../../utils/format";
import { EmptyState } from "../../components/common";

const EMPTY = { code: "", discount_type: "percent", discount_value: "", min_order_amount: 0, usage_limit: 20, expires_at: "" };

export default function AdminCoupons() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const q = useQuery({ queryKey: ["admin-coupons"], queryFn: () => get("/admin/coupons") });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const done = (msg) => () => { toast.success(msg); qc.invalidateQueries(); };
  const fail = (e) => toast.error(errMsg(e));

  const reset = () => { setForm(EMPTY); setEditId(null); };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount || 0),
        usage_limit: Number(form.usage_limit || 20),
        expires_at: form.expires_at ? `${form.expires_at}T23:59:59` : null,
      };
      return editId ? api.put(`/coupons/${editId}`, body) : api.post("/coupons", body);
    },
    onSuccess: () => { done(editId ? "Đã cập nhật mã giảm giá!" : "Đã tạo mã giảm giá mới!")(); reset(); },
    onError: fail,
  });

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
      min_order_amount: c.min_order_amount, usage_limit: c.usage_limit,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
    });
  };
  const toggle = useMutation({ mutationFn: (id) => api.put(`/coupons/${id}/toggle`), onSuccess: done("Đã cập nhật trạng thái mã!"), onError: fail });
  const del = useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
    onSuccess: (_d, id) => { if (id === editId) reset(); done("Đã xóa mã giảm giá!")(); },
    onError: fail,
  });

  const isExpired = (c) => c.expires_at && new Date(c.expires_at) < new Date();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-4 card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><TicketPercent size={18} className="text-indigo-600" /> {editId ? "Sửa Mã Giảm Giá" : "Tạo Mã Giảm Giá Mới"}</h3>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3.5">
          <div><label className="label">Mã Code (viết liền)</label><input className="input mt-1 font-bold uppercase" placeholder="VD: TET2026, FREESHIP..." value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required minLength={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Loại giảm giá</label>
              <select className="input mt-1" value={form.discount_type} onChange={set("discount_type")}>
                <option value="percent">Theo phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="label">Giá trị ({form.discount_type === "percent" ? "%" : "VNĐ"})</label>
              <input type="number" min="1" max={form.discount_type === "percent" ? 100 : undefined} className="input mt-1" value={form.discount_value} onChange={set("discount_value")} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Đơn tối thiểu (VNĐ)</label><input type="number" min="0" className="input mt-1" value={form.min_order_amount} onChange={set("min_order_amount")} /></div>
            <div><label className="label">Giới hạn lượt dùng</label><input type="number" min="1" className="input mt-1" value={form.usage_limit} onChange={set("usage_limit")} /></div>
          </div>
          <div><label className="label">Ngày hết hạn (để trống = không hết hạn)</label><input type="date" className="input mt-1" value={form.expires_at} onChange={set("expires_at")} /></div>
          <button className="btn-primary w-full" disabled={save.isPending}>{editId ? "Lưu thay đổi" : "+ Phát Hành Mã Giảm Giá"}</button>
          {editId && <button type="button" className="btn-ghost w-full" onClick={reset}>Hủy sửa</button>}
        </form>
      </div>

      <div className="lg:col-span-8">
        {q.isError ? (
          <EmptyState>{errMsg(q.error)}</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead><tr><th>Mã Code</th><th>Mức giảm</th><th>Đơn tối thiểu</th><th>Lượt dùng</th><th>Hết hạn</th><th className="text-center">Thao tác</th></tr></thead>
              <tbody>
                {(q.data || []).map((c) => (
                  <tr key={c.id} className={!c.is_active || isExpired(c) ? "opacity-60" : ""}>
                    <td><span className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900 font-extrabold text-xs px-2.5 py-1 rounded-lg">{c.code}</span></td>
                    <td className="font-bold text-emerald-600 text-xs">{c.discount_type === "percent" ? `Giảm ${c.discount_value}%` : `Giảm ${formatVND(c.discount_value)}`}</td>
                    <td className="text-xs muted">Từ {formatVND(c.min_order_amount)}</td>
                    <td className="text-xs font-semibold">{c.used_count} / {c.usage_limit}</td>
                    <td className="text-xs">{c.expires_at ? <span className={isExpired(c) ? "text-rose-600 font-semibold" : ""}>{formatDate(c.expires_at).split(",")[0]}{isExpired(c) && " (hết hạn)"}</span> : <span className="muted">Không</span>}</td>
                    <td className="text-center whitespace-nowrap">
                      <button onClick={() => startEdit(c)} title="Sửa mã" className="muted hover:text-indigo-600 p-1 cursor-pointer" aria-label="Sửa"><Pencil size={16} /></button>
                      <button onClick={() => toggle.mutate(c.id)} title={c.is_active ? "Đang bật - bấm để khóa" : "Đang khóa - bấm để bật"} className={`p-1 cursor-pointer ${c.is_active ? "text-emerald-600" : "muted"}`} aria-label="Bật/tắt"><Power size={16} /></button>
                      <button onClick={() => window.confirm(`Xóa mã ${c.code}?`) && del.mutate(c.id)} className="muted hover:text-rose-600 p-1 cursor-pointer" aria-label="Xóa"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {q.data?.length === 0 && <tr><td colSpan={6} className="text-center muted py-8">Chưa có mã giảm giá.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
