import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, errMsg, get } from "../../api";
import { ACTION_LABEL, formatDate, formatVND, STATUS } from "../../utils/format";
import { EmptyState, PageTitle } from "../../components/common";

export default function AdminOrders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const q = useQuery({ queryKey: ["admin-orders", status], queryFn: () => get("/orders", { status: status || undefined }) });

  const change = useMutation({
    mutationFn: ({ id, status, note }) => api.put(`/orders/${id}/status`, null, { params: { status, note: note || undefined } }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái đơn hàng!");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(errMsg(e, "Lỗi cập nhật đơn hàng!")),
  });

  const term = search.trim().toLowerCase();
  const orders = (q.data || []).filter(
    (o) => !term || String(o.id) === term || o.customer_name.toLowerCase().includes(term) || o.customer_phone.includes(term)
  );

  return (
    <div>
      <PageTitle>Quản lý đơn hàng</PageTitle>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input !w-64 !text-xs" placeholder="Tìm theo mã đơn, tên, số điện thoại..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input !w-auto !text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {q.isLoading ? (
        <p className="muted text-sm">Đang tải...</p>
      ) : q.isError ? (
        <EmptyState>{errMsg(q.error)}</EmptyState>
      ) : orders.length === 0 ? (
        <EmptyState>Không có đơn hàng nào.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[860px]">
            <thead>
              <tr><th>Mã đơn & Khách hàng</th><th>Sản phẩm đã mua</th><th>Mã giảm giá</th><th>Thanh toán</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <p className="font-bold">#{o.id} - {o.customer_name}</p>
                    <p className="text-xs muted">{formatDate(o.created_at)}</p>
                    <p className="text-xs muted">SĐT: {o.customer_phone} | Đ/c: {o.customer_address}</p>
                  </td>
                  <td>
                    <ul className="text-xs space-y-1">
                      {o.items.map((i, idx) => <li key={idx}>• {i.product_name} (x{i.quantity}) - {formatVND(i.unit_price)}</li>)}
                    </ul>
                  </td>
                  <td>
                    {o.coupon_code ? (
                      <>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 text-xs font-bold px-2 py-0.5 rounded-md">{o.coupon_code}</span>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">-{formatVND(o.discount_amount)}</p>
                      </>
                    ) : <span className="text-xs muted">Không dùng</span>}
                  </td>
                  <td>
                    <p className="price">{formatVND(o.total_amount)}</p>
                    <p className="text-[11px] muted">{o.payment_method === "bank" ? "Chuyển khoản" : "COD"}</p>
                  </td>
                  <td>
                    <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold border ${STATUS[o.status]?.cls}`}>{STATUS[o.status]?.label}</span>
                    {o.cancel_reason && <p className="text-[11px] muted mt-1">Lý do: {o.cancel_reason}</p>}
                    {o.status === "return_requested" && o.history.at(-1)?.note && <p className="text-[11px] muted mt-1">Lý do trả: {o.history.at(-1).note}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {o.next_actions.map((t) => (
                        <button
                          key={t}
                          disabled={change.isPending}
                          className={`${t === "cancelled" ? "btn-danger" : "btn-ghost"} !px-2.5 !py-1 !text-[11px]`}
                          onClick={() => {
                            if (t === "cancelled" && !window.confirm("Hủy đơn sẽ hoàn lại tồn kho và lượt mã giảm giá. Tiếp tục?")) return;
                            change.mutate({ id: o.id, status: t });
                          }}
                        >
                          {t === "delivered" && o.status === "return_requested" ? "Từ chối trả hàng" : ACTION_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
