import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { errMsg, get } from "../api";
import ProductCard from "../components/ProductCard";
import { EmptyState, Pagination, ProductSkeletonGrid } from "../components/common";

const SORTS = [
  ["newest", "Mới nhất"],
  ["price_asc", "Giá tăng dần"],
  ["price_desc", "Giá giảm dần"],
  ["rating", "Đánh giá cao"],
  ["name", "Tên A → Z"],
];

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const param = (k, d = "") => sp.get(k) ?? d;
  const page = Number(param("page", 1));

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v === "" || v === null || v === false ? next.delete(k) : next.set(k, v)));
    if (!("page" in patch)) next.delete("page");
    setSp(next);
  };

  // Ô giá: chỉ cập nhật URL khi người dùng dừng gõ
  const [price, setPrice] = useState({ min: param("min_price"), max: param("max_price") });
  useEffect(() => {
    const t = setTimeout(() => {
      if (price.min !== param("min_price") || price.max !== param("max_price"))
        update({ min_price: price.min, max_price: price.max });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  const params = {
    category_id: param("category") || undefined,
    search: param("search") || undefined,
    min_price: param("min_price") || undefined,
    max_price: param("max_price") || undefined,
    in_stock: param("in_stock") === "1" || undefined,
    sort: param("sort", "newest"),
    page,
    page_size: 12,
  };

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => get("/categories") });
  const prods = useQuery({
    queryKey: ["products", params],
    queryFn: () => get("/products", params),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (prods.isError) toast.error(`Không tải được sản phẩm: ${errMsg(prods.error)}`, { id: "prod-err" });
  }, [prods.isError, prods.error]);

  const data = prods.data;
  const activeCat = param("category");

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button className={activeCat === "" ? "chip-active" : "chip"} onClick={() => update({ category: "" })}>Tất cả sản phẩm</button>
          {(cats.data || []).map((c) => (
            <button key={c.id} className={activeCat === String(c.id) ? "chip-active" : "chip"} onClick={() => update({ category: c.id })}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <SlidersHorizontal size={15} className="muted" />
          <select className="input !w-auto !py-1.5 !text-xs" value={params.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sắp xếp">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" min="0" placeholder="Giá từ" className="input !w-28 !py-1.5 !text-xs" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} />
          <input type="number" min="0" placeholder="Giá đến" className="input !w-28 !py-1.5 !text-xs" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={param("in_stock") === "1"} onChange={(e) => update({ in_stock: e.target.checked ? "1" : "" })} /> Chỉ còn hàng
          </label>
          {(param("search") || activeCat || price.min || price.max || param("in_stock")) && (
            <button className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer" onClick={() => { setPrice({ min: "", max: "" }); setSp({}); }}>
              Xóa bộ lọc
            </button>
          )}
          {data && <span className="muted ml-auto">{data.total} sản phẩm{param("search") && ` cho "${param("search")}"`}</span>}
        </div>
      </div>

      {prods.isLoading ? (
        <ProductSkeletonGrid />
      ) : prods.isError && !data ? (
        <EmptyState>Không tải được danh sách sản phẩm. <button className="text-indigo-600 font-semibold cursor-pointer" onClick={() => prods.refetch()}>Thử lại</button></EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState>Không tìm thấy sản phẩm phù hợp.</EmptyState>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity ${prods.isFetching ? "opacity-60" : ""}`}>
          {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => { update({ page: n }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    </div>
  );
}
