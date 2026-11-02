import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Pencil, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, errMsg, get, imgUrl } from "../../api";
import { formatVND } from "../../utils/format";
import { EmptyState, Pagination } from "../../components/common";

const EMPTY = { name: "", brand: "", description: "", price: "", stock: 15, image_url: "", category_id: "" };

export default function AdminProducts() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const cats = useQuery({ queryKey: ["categories"], queryFn: () => get("/categories") });
  const list = useQuery({
    queryKey: ["admin-products", page, search],
    queryFn: () => get("/products", { page, page_size: 10, search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm({ ...EMPTY, category_id: cats.data?.[0]?.id || "" }); setEditId(null); };
  const catId = form.category_id || cats.data?.[0]?.id || "";

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock), category_id: Number(catId) };
      return editId ? api.put(`/products/${editId}`, body) : api.post("/products", body);
    },
    onSuccess: () => {
      toast.success(editId ? "Đã cập nhật sản phẩm!" : "Đã thêm sản phẩm mới lên kệ!");
      reset();
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(errMsg(e, "Lỗi khi lưu sản phẩm!")),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { toast.success("Đã xóa sản phẩm khỏi kho!"); qc.invalidateQueries(); },
    onError: (e) => toast.error(errMsg(e, "Không thể xóa sản phẩm!")),
  });

  const startEdit = (p) => {
    setEditId(p.id);
    setForm({ name: p.name, brand: p.brand || "", description: p.description || "", price: p.price, stock: p.stock, image_url: p.image_url || "", category_id: p.category_id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post("/upload", fd);
      setForm((f) => ({ ...f, image_url: data.url }));
      toast.success("Đã tải ảnh lên!");
    } catch (e) {
      toast.error(errMsg(e, "Tải ảnh thất bại!"));
    } finally {
      setUploading(false);
    }
  };

  const data = list.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-4 card p-6 lg:sticky lg:top-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{editId ? `Sửa sản phẩm #${editId}` : "Nhập Sản phẩm mới vào Kho"}</h3>
          {editId && <button onClick={reset} className="muted hover:text-rose-600 cursor-pointer" aria-label="Hủy sửa"><X size={18} /></button>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3.5">
          <div><label className="label">Tên sản phẩm</label><input className="input mt-1" placeholder="VD: Bàn phím cơ Keychron K8..." value={form.name} onChange={set("name")} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Danh mục</label>
              <select className="input mt-1" value={catId} onChange={set("category_id")}>
                {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Thương hiệu</label><input className="input mt-1" value={form.brand} onChange={set("brand")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Giá bán (VNĐ)</label><input type="number" min="1" className="input mt-1" value={form.price} onChange={set("price")} required /></div>
            <div><label className="label">Số lượng kho</label><input type="number" min="0" className="input mt-1" value={form.stock} onChange={set("stock")} required /></div>
          </div>
          <div><label className="label">Mô tả</label><textarea rows={3} className="input mt-1" value={form.description} onChange={set("description")} /></div>
          <div>
            <label className="label">Ảnh sản phẩm</label>
            <div className="flex gap-2 mt-1">
              <input className="input" placeholder="Dán link ảnh hoặc tải lên..." value={form.image_url} onChange={set("image_url")} />
              <label className="btn-ghost !px-3 cursor-pointer" title="Tải ảnh từ máy">
                <Upload size={16} />
                <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} />
              </label>
            </div>
            {form.image_url && <img src={imgUrl(form.image_url)} alt="" className="mt-2 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />}
          </div>
          <button className="btn-primary w-full" disabled={save.isPending || uploading}>{editId ? "Lưu thay đổi" : "+ Thêm Sản Phẩm Lên Kệ"}</button>
        </form>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <input className="input !text-xs" placeholder="Tìm sản phẩm trong kho..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {list.isError && !data ? (
          <EmptyState>{errMsg(list.error)}</EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="tbl min-w-[620px]">
              <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th className="text-center">Thao tác</th></tr></thead>
              <tbody>
                {(data?.items || []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={imgUrl(p.image_url)} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                        <span className="font-bold text-xs">{p.name}<br /><span className="font-normal muted">{p.brand}</span></span>
                      </div>
                    </td>
                    <td className="text-xs muted">{p.category_name}</td>
                    <td className="price text-xs">{formatVND(p.price)}</td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.stock <= 5 ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{p.stock} chiếc</span>
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <button onClick={() => startEdit(p)} className="muted hover:text-indigo-600 p-1 cursor-pointer" aria-label="Sửa"><Pencil size={16} /></button>
                      <button onClick={() => window.confirm(`Xóa "${p.name}"?`) && del.mutate(p.id)} className="muted hover:text-rose-600 p-1 cursor-pointer" aria-label="Xóa"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 && <tr><td colSpan={5} className="text-center muted py-8">Không có sản phẩm.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
    </div>
  );
}
