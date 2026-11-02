import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg, get, imgUrl } from "../api";
import { formatDate, formatVND } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { EmptyState, Skeleton, Stars } from "../components/common";
import ProductCard from "../components/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const { user, favIds, toggleFav } = useAuth();
  const { add } = useCart();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const prod = useQuery({ queryKey: ["product", id], queryFn: () => get(`/products/${id}`), retry: false });
  const reviews = useQuery({ queryKey: ["reviews", id], queryFn: () => get(`/products/${id}/reviews`) });
  const p = prod.data;
  const related = useQuery({
    queryKey: ["related", p?.category_id],
    queryFn: () => get("/products", { category_id: p.category_id, page_size: 5 }),
    enabled: !!p,
  });

  const submitReview = useMutation({
    mutationFn: () => api.post(`/products/${id}/reviews`, { rating, comment }),
    onSuccess: () => {
      toast.success("Cảm ơn bạn đã đánh giá!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", id] });
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (prod.isLoading)
    return (
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="h-96" />
        <div className="space-y-4"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-6 w-1/3" /><Skeleton className="h-24" /></div>
      </div>
    );
  if (prod.isError) return <EmptyState>{prod.error.response?.status === 404 ? "Không tìm thấy sản phẩm này." : errMsg(prod.error)}</EmptyState>;

  const isAdmin = user?.role === "admin";
  const faved = favIds.includes(p.id);
  const onFav = async () => {
    if (!user) return toast("Hãy đăng nhập để lưu sản phẩm yêu thích");
    try { await toggleFav(p.id); } catch (e) { toast.error(errMsg(e)); }
  };
  const others = (related.data?.items || []).filter((x) => x.id !== p.id).slice(0, 4);

  return (
    <div className="space-y-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold muted hover:text-indigo-600"><ArrowLeft size={14} /> Quay lại cửa hàng</Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card overflow-hidden"><img src={imgUrl(p.image_url)} alt={p.name} className="w-full h-full max-h-[480px] object-cover" /></div>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{p.category_name}{p.brand && ` · ${p.brand}`}</p>
          <h1 className="text-2xl font-extrabold leading-tight">{p.name}</h1>
          <div className="flex items-center gap-2">
            <Stars value={p.avg_rating} size={16} />
            <span className="text-xs muted">{p.review_count > 0 ? `${p.avg_rating}/5 · ${p.review_count} đánh giá` : "Chưa có đánh giá"}</span>
          </div>
          <p className="text-3xl price">{formatVND(p.price)}</p>
          <p className={`text-sm font-semibold ${p.stock > 5 ? "text-emerald-600" : p.stock > 0 ? "text-amber-600" : "text-rose-600"}`}>
            {p.stock > 0 ? `Còn ${p.stock} sản phẩm trong kho` : "Tạm hết hàng"}
          </p>
          {p.description && <p className="text-sm leading-relaxed muted">{p.description}</p>}

          {!isAdmin && <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-3 card !rounded-xl px-3 py-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm" className="cursor-pointer"><Minus size={15} /></button>
              <span className="w-6 text-center font-bold text-sm">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stock || 1, q + 1))} aria-label="Tăng" className="cursor-pointer"><Plus size={15} /></button>
            </div>
            <button onClick={() => add(p, qty)} disabled={p.stock <= 0} className="btn-primary flex-1 min-w-40 !py-3">
              <ShoppingCart size={17} /> Thêm vào giỏ
            </button>
            <button onClick={onFav} aria-label="Yêu thích" className="btn-ghost !px-3.5 !py-3">
              <Heart size={18} className={faved ? "fill-rose-500 text-rose-500" : ""} />
            </button>
          </div>}
        </div>
      </div>

      <section className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-extrabold">Đánh giá từ khách hàng</h2>
          {reviews.data?.length ? (
            reviews.data.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">{r.user_name}</p>
                  <span className="text-xs muted">{formatDate(r.created_at)}</span>
                </div>
                <Stars value={r.rating} size={13} />
                {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
              </div>
            ))
          ) : (
            <EmptyState>Chưa có đánh giá nào. Hãy là người đầu tiên!</EmptyState>
          )}
        </div>

        <div className="card p-5 h-fit space-y-3">
          <h3 className="font-bold">Viết đánh giá</h3>
          {isAdmin ? (
            <p className="text-sm muted">Tài khoản quản trị không viết đánh giá.</p>
          ) : user ? (
            <>
              <Stars value={rating} size={22} onChange={setRating} />
              <textarea className="input" rows={4} placeholder="Chia sẻ trải nghiệm của bạn..." value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
              <button className="btn-primary w-full" disabled={submitReview.isPending} onClick={() => submitReview.mutate()}>Gửi đánh giá</button>
            </>
          ) : (
            <p className="text-sm muted"><Link to="/login" state={{ from: `/product/${id}` }} className="text-indigo-600 font-semibold">Đăng nhập</Link> để đánh giá sản phẩm.</p>
          )}
        </div>
      </section>

      {others.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-extrabold">Sản phẩm cùng danh mục</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{others.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </div>
  );
}
