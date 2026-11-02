import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, TicketPercent, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg, get, imgUrl } from "../api";
import { useCart } from "../context/CartContext";
import { formatVND, PAYMENT } from "../utils/format";
import { EmptyState, PageTitle } from "../components/common";

const EMPTY_ADDR = { full_name: "", phone: "", address: "", is_default: false };

function AddressBook({ value, onChange }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["addresses"], queryFn: () => get("/me/addresses") });
  const list = q.data || [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_ADDR);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Tự chọn địa chỉ mặc định khi chưa chọn hoặc địa chỉ đang chọn đã bị xóa
  useEffect(() => {
    if (list.length && !list.some((a) => a.id === value)) onChange((list.find((a) => a.is_default) || list[0]).id);
  }, [list, value, onChange]);

  const create = useMutation({
    mutationFn: () => api.post("/me/addresses", form).then((r) => r.data),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["addresses"] });
      onChange(a.id);
      setForm(EMPTY_ADDR);
      setAdding(false);
      toast.success("Đã lưu địa chỉ!");
    },
    onError: (e) => toast.error(errMsg(e, "Không lưu được địa chỉ!")),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/me/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (e) => toast.error(errMsg(e)),
  });

  const showForm = adding || (!q.isLoading && list.length === 0);

  return (
    <section className="card p-5 space-y-3">
      <h2 className="font-bold flex items-center gap-2"><MapPin size={18} className="text-indigo-600" /> Địa chỉ nhận hàng</h2>
      {list.map((a) => (
        <label key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${value === a.id ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700"}`}>
          <input type="radio" name="addr" className="mt-1" checked={value === a.id} onChange={() => onChange(a.id)} />
          <div className="flex-1 text-sm">
            <p className="font-bold">
              {a.full_name} <span className="muted font-normal">· {a.phone}</span>
              {a.is_default && <span className="ml-2 text-[10px] font-bold text-rose-600 border border-rose-300 rounded px-1.5 py-0.5">Mặc định</span>}
            </p>
            <p className="muted text-xs">{a.address}</p>
          </div>
          <button type="button" aria-label="Xóa địa chỉ" className="muted hover:text-rose-600 cursor-pointer" onClick={(e) => { e.preventDefault(); if (window.confirm("Xóa địa chỉ này?")) del.mutate(a.id); }}>
            <Trash2 size={16} />
          </button>
        </label>
      ))}

      {showForm ? (
        <form
          className="space-y-2.5 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <input className="input" placeholder="Họ và tên người nhận" value={form.full_name} onChange={set("full_name")} required />
          <input className="input" placeholder="Số điện thoại" value={form.phone} onChange={set("phone")} required minLength={6} />
          <input className="input" placeholder="Địa chỉ chi tiết (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)" value={form.address} onChange={set("address")} required />
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Đặt làm địa chỉ mặc định
          </label>
          <div className="flex gap-2">
            <button className="btn-primary !text-xs" disabled={create.isPending}>Lưu địa chỉ</button>
            {list.length > 0 && <button type="button" className="btn-ghost !text-xs" onClick={() => setAdding(false)}>Hủy</button>}
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost !text-xs" onClick={() => setAdding(true)}><Plus size={14} /> Thêm địa chỉ mới</button>
      )}
    </section>
  );
}

export default function Checkout() {
  const { selectedItems, subtotal, reload } = useCart();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [addressId, setAddressId] = useState(null);
  const [payment, setPayment] = useState("cod");
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState(null);

  const { data: coupons = [] } = useQuery({ queryKey: ["coupons"], queryFn: () => get("/coupons") });
  const { data: ship } = useQuery({
    queryKey: ["shipping-fee", subtotal],
    queryFn: () => get("/shipping-fee", { subtotal }),
    enabled: subtotal > 0,
  });

  const verify = async (code, silent = false) => {
    const clean = (code || couponInput).trim().toUpperCase();
    if (!clean) return toast.error("Vui lòng nhập mã giảm giá!");
    try {
      const { data } = await api.post("/coupons/apply", { code: clean, order_total: subtotal });
      setApplied(data);
      setCouponInput(clean);
      if (!silent) toast.success(data.message);
    } catch (e) {
      setApplied(null);
      if (!silent) toast.error(errMsg(e, "Mã giảm giá không hợp lệ!"));
    }
  };

  // Tạm tính đổi -> kiểm tra lại mã đang áp
  useEffect(() => {
    if (applied) verify(applied.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const discount = applied?.discount_amount || 0;
  const shippingFee = ship?.shipping_fee ?? 0;
  const total = Math.max(subtotal - discount, 0) + shippingFee;

  const order = useMutation({
    mutationFn: () =>
      api.post("/orders", {
        address_id: addressId,
        payment_method: payment,
        coupon_code: applied?.code || null,
        items: selectedItems.map((c) => ({ product_id: c.id, quantity: c.quantity })),
      }).then((r) => r.data),
    onSuccess: async (data) => {
      toast.success(`🎉 Đặt hàng thành công! Mã đơn #${data.order_id}`);
      await reload();
      qc.invalidateQueries();
      navigate("/my-orders");
    },
    onError: (e) => toast.error(errMsg(e, "Lỗi khi đặt hàng!")),
  });

  if (selectedItems.length === 0 && !order.isSuccess) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageTitle>Thanh toán</PageTitle>
        <EmptyState>Bạn chưa chọn sản phẩm nào. <Link to="/cart" className="text-indigo-600 font-semibold">Quay lại giỏ hàng</Link></EmptyState>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageTitle>Thanh toán</PageTitle>

      <AddressBook value={addressId} onChange={setAddressId} />

      <section className="card p-5 space-y-3">
        <h2 className="font-bold">Sản phẩm</h2>
        {selectedItems.map((i) => (
          <div key={i.id} className="flex items-center gap-3 text-sm">
            <img src={imgUrl(i.image_url)} alt="" className="w-12 h-12 rounded-lg object-cover" />
            <span className="flex-1 min-w-0 line-clamp-2">{i.name}</span>
            <span className="muted">× {i.quantity}</span>
            <span className="w-28 text-right font-semibold">{formatVND(i.price * i.quantity)}</span>
          </div>
        ))}
      </section>

      <section className="card p-5 space-y-2.5">
        <h2 className="font-bold flex items-center gap-2"><TicketPercent size={18} className="text-indigo-600" /> Mã giảm giá</h2>
        <div className="flex gap-2">
          <input placeholder="Nhập mã (VD: SALE10)..." value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="input !text-xs font-bold uppercase" />
          {applied ? (
            <button type="button" className="btn-danger !px-3 !text-xs whitespace-nowrap shrink-0" onClick={() => { setApplied(null); setCouponInput(""); }}><X size={13} /> Bỏ mã</button>
          ) : (
            <button type="button" className="btn-primary !px-4 !text-xs whitespace-nowrap shrink-0" onClick={() => verify()}>Áp dụng</button>
          )}
        </div>
        {coupons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {coupons.map((cp) => (
              <button key={cp.id} type="button" onClick={() => verify(cp.code)} title={`Đơn tối thiểu: ${formatVND(cp.min_order_amount)}`}
                className="text-[11px] bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer">
                {cp.code} ({cp.discount_type === "percent" ? `-${cp.discount_value}%` : `-${formatVND(cp.discount_value)}`})
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="font-bold">Phương thức thanh toán</h2>
        {Object.entries(PAYMENT).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name="pay" checked={payment === k} onChange={() => setPayment(k)} /> {v}
          </label>
        ))}
        {payment === "bank" && (
          <div className="text-xs bg-slate-50 dark:bg-slate-800 rounded-xl p-3 muted leading-relaxed">
            Chuyển khoản tới: <b>MB Bank - 0123 456 789</b><br />
            Chủ TK: NEXTGEN STORE<br />
            Nội dung: <b>SĐT + Họ tên</b> của bạn
          </div>
        )}
      </section>

      <section className="card p-5 space-y-1.5 text-sm">
        <div className="flex justify-between muted"><span>Tiền hàng</span><span className="font-semibold">{formatVND(subtotal)}</span></div>
        {applied && <div className="flex justify-between text-emerald-600 font-semibold"><span>Giảm giá ({applied.code})</span><span>-{formatVND(discount)}</span></div>}
        <div className="flex justify-between muted">
          <span>Phí vận chuyển</span>
          <span className="font-semibold">{shippingFee === 0 ? "Miễn phí" : formatVND(shippingFee)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="font-bold">Tổng thanh toán</span>
          <span className="text-2xl font-extrabold text-rose-600">{formatVND(total)}</span>
        </div>
        <button className="btn-success w-full !py-3 mt-3" disabled={order.isPending || !addressId} onClick={() => order.mutate()}>
          {order.isPending ? "Đang xử lý..." : addressId ? "Đặt hàng" : "Vui lòng chọn địa chỉ nhận hàng"}
        </button>
      </section>
    </div>
  );
}
