"use client";

import { useEffect, useState } from "react";
import { PRODUCTS, TOPPINGS, formatVnd, getUnitPrice, type CartItem, type TeaOptions } from "@/lib/tea-shop";
import TeaGame from "@/components/tea/TeaGame";

const categories = ["Tất cả", "Trà sữa", "Trà trái cây", "Đặc biệt"] as const;
const initialOptions: TeaOptions = { size: "M", sweetness: "50%", ice: "Bình thường", toppings: [] };
const STORAGE_KEY = "may-tra-shop-v1";

type Checkout = { name: string; phone: string; address: string; note: string };
type ShopOrder = { id: string; customer: Checkout; items: CartItem[]; total: number; status: "Đã nhận" | "Đang pha chế" | "Đang giao" | "Hoàn tất" | "Đã hủy"; createdAt: string };
type ShopData = { cart: CartItem[]; orders: ShopOrder[]; cash: number; day: number; rescueLoanUsed: boolean; products: typeof PRODUCTS; deliveryFee: number; freeDeliveryThreshold: number; promoCode: string; discountPercent: number };
const initialData: ShopData = { cart: [], orders: [], cash: 150_000, day: 1, rescueLoanUsed: false, products: PRODUCTS, deliveryFee: 8_000, freeDeliveryThreshold: 100_000, promoCode: "", discountPercent: 0 };

function readShopData(): ShopData {
  if (typeof window === "undefined") return initialData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData;
    const data = JSON.parse(raw) as Partial<ShopData>;
    return {
      cart: Array.isArray(data.cart) ? data.cart : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
      cash: typeof data.cash === "number" ? data.cash : initialData.cash,
      day: typeof data.day === "number" ? data.day : initialData.day,
      rescueLoanUsed: Boolean(data.rescueLoanUsed),
      products: Array.isArray(data.products) ? data.products : PRODUCTS,
      deliveryFee: typeof data.deliveryFee === "number" ? data.deliveryFee : initialData.deliveryFee,
      freeDeliveryThreshold: typeof data.freeDeliveryThreshold === "number" ? data.freeDeliveryThreshold : initialData.freeDeliveryThreshold,
      promoCode: typeof data.promoCode === "string" ? data.promoCode : "",
      discountPercent: typeof data.discountPercent === "number" ? data.discountPercent : 0,
    };
  } catch {
    return initialData;
  }
}

export default function TeaShop() {
  const [data, setData] = useState<ShopData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("Tất cả");
  const [selectedId, setSelectedId] = useState(PRODUCTS[0].id);
  const [options, setOptions] = useState<TeaOptions>(initialOptions);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderView, setOrderView] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [bankruptcyOpen, setBankruptcyOpen] = useState(data.cash <= 0);
  const [checkout, setCheckout] = useState<Checkout>({ name: "", phone: "", address: "", note: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      const saved = readShopData();
      setData(saved);
      setBankruptcyOpen(saved.cash <= 0);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);
  const [gameMode, setGameMode] = useState(true);
  const activeProducts = data.products.filter((product) => product.active !== false && (product.stock ?? 0) > 0);
  const products = category === "Tất cả" ? activeProducts : activeProducts.filter((p) => p.category === category);
  const selected = data.products.find((product) => product.id === selectedId) ?? data.products[0];
  const subtotal = data.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountAmount = data.discountPercent ? Math.round(subtotal * data.discountPercent / 100) : 0;
  const deliveryFee = subtotal >= data.freeDeliveryThreshold ? 0 : data.deliveryFee;
  const total = subtotal - discountAmount + (data.cart.length ? deliveryFee : 0);
  const count = data.cart.reduce((sum, item) => sum + item.quantity, 0);
  const updateData = (update: (current: ShopData) => ShopData) => setData((current) => {
    const next = update(current);
    if (hydrated) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setNotice("Không lưu được dữ liệu: bộ nhớ trình duyệt có thể đã đầy."); }
    }
    return next;
  });

  function addToCart() {
    const snapshot = { ...options, toppings: [...options.toppings] };
    const key = `${selected.id}-${snapshot.size}-${snapshot.sweetness}-${snapshot.ice}-${snapshot.toppings.slice().sort().join(",")}`;
    const unitPrice = getUnitPrice(selected, snapshot);
    updateData((current) => {
      const existing = current.cart.find((item) => item.key === key);
      const alreadyInCart = existing?.quantity ?? 0;
      if (alreadyInCart >= (selected.stock ?? 0)) {
        setNotice("Không đủ tồn kho cho số lượng này.");
        return current;
      }
      const cart = existing
        ? current.cart.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current.cart, { key, product: selected, options: snapshot, quantity: 1, unitPrice }];
      return { ...current, cart };
    });
    setNotice(`${selected.name} đã được thêm vào giỏ.`);
  }

  function changeQuantity(key: string, delta: number) {
    updateData((current) => ({ ...current, cart: current.cart.map((item) => item.key === key ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0) }));
  }

  function setOrderStatus(orderId: string, status: ShopOrder["status"]) {
    updateData((current) => {
      const target = current.orders.find((order) => order.id === orderId);
      if (!target) return current;
      const before = target.status === "Hoàn tất" ? target.total : 0;
      const after = status === "Hoàn tất" ? target.total : 0;
      return {
        ...current,
        cash: current.cash + after - before,
        orders: current.orders.map((order) => order.id === orderId ? { ...order, status } : order),
      };
    });
  }

  function updateProduct(productId: string, update: (product: (typeof PRODUCTS)[number]) => (typeof PRODUCTS)[number]) {
    updateData((current) => ({ ...current, products: current.products.map((product) => product.id === productId ? update(product) : product) }));
  }

  function addProduct() {
    const id = `custom-${Date.now()}`;
    updateData((current) => ({ ...current, products: [...current.products, { id, name: "Trà mới", description: "Món mới của tiệm", price: 30000, category: "Trà sữa", emoji: "🧋", active: true, stock: 10 }] }));
  }

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    const valid: Record<string, number> = { MAYTRA10: 10, KHAITRUONG15: 15 };
    const percent = valid[code];
    if (!percent) {
      setNotice("Mã giảm giá không hợp lệ. Thử MAYTRA10 hoặc KHAITRUONG15.");
      return;
    }
    updateData((current) => ({ ...current, promoCode: code, discountPercent: percent }));
    setNotice(`Đã áp dụng mã ${code}: giảm ${percent}%.`);
  }

  function finishBusinessDay() {
    if (data.cash <= 0) return;
    const revenue = Math.round(data.orders.filter((order) => order.status === "Hoàn tất").reduce((sum, order) => sum + order.total, 0));
    const ingredientCost = Math.round(revenue * 0.38);
    const fixedCost = 25_000;
    const profit = revenue - ingredientCost - fixedCost;
    const nextCash = data.cash + profit;
    updateData((current) => ({ ...current, cash: nextCash, day: current.day + 1 }));
    setNotice(`Ngày ${data.day} đã kết thúc: ${revenue}đ doanh thu, ${profit >= 0 ? "lãi" : "lỗ"} ${formatVnd(Math.abs(profit))}.`);
    if (nextCash <= 0) setBankruptcyOpen(true);
  }

  function rescueShop() {
    if (data.rescueLoanUsed) return;
    updateData((current) => ({ ...current, cash: current.cash + 100_000, rescueLoanUsed: true }));
    setBankruptcyOpen(false);
    setNotice("Khoản vay cứu tiệm 100.000đ đã được ghi nhận (chỉ dùng một lần).");
  }

  function restartShop() {
    updateData((current) => ({ ...initialData, orders: current.orders }));
    setBankruptcyOpen(false);
    setNotice("Tiệm đã mở lại với vốn ban đầu 150.000đ.");
  }

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.cart.length) return;
    const phoneDigits = checkout.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      setNotice("Số điện thoại cần có từ 9 đến 11 chữ số.");
      return;
    }
    const now = new Date();
    const order: ShopOrder = { id: `MT${now.getTime().toString().slice(-8)}`, customer: checkout, items: data.cart, total, status: "Đã nhận", createdAt: now.toISOString() };
    const quantities = new Map<string, number>();
    for (const item of data.cart) quantities.set(item.product.id, (quantities.get(item.product.id) ?? 0) + item.quantity);
    const insufficient = data.products.find((product) => (quantities.get(product.id) ?? 0) > (product.stock ?? 0));
    if (insufficient) {
      setNotice(`${insufficient.name} không đủ tồn kho. Giảm số lượng hoặc chọn món khác.`);
      return;
    }
    updateData((current) => {
      const products = current.products.map((product) => ({ ...product, stock: (product.stock ?? 0) - (quantities.get(product.id) ?? 0) }));
      return { ...current, orders: [order, ...current.orders], cart: [], products };
    });
    setCheckoutOpen(false);
    setCheckout({ name: "", phone: "", address: "", note: "" });
    setNotice(`Đặt hàng thành công! Mã đơn ${order.id}. Đơn được lưu trên thiết bị này.`);
  }

  return (
    <main className="min-h-screen bg-[#fff9f0] text-[#3d2922]">
      {gameMode ? <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6"><TeaGame onMoney={(delta) => updateData((current) => ({ ...current, cash: current.cash + delta }))} onBankrupt={() => setBankruptcyOpen(true)} day={data.day} cash={data.cash} orderCount={data.orders.length} onEndDay={finishBusinessDay} onOrders={() => setOrderView(true)} onManage={() => setAdminOpen(true)} /></div> : <>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-12 pt-8 md:grid-cols-[1.1fr_.9fr]"><div className="flex flex-col justify-center"><p className="mb-3 font-semibold text-[#b65d3d]">Trà ngon, vui mỗi ngày</p><h2 className="max-w-xl text-5xl font-bold leading-tight">Một ly ngọt ngào cho riêng bạn.</h2><p className="mt-5 max-w-lg text-lg text-[#765d52]">Chọn vị trà, điều chỉnh đường đá, thêm topping yêu thích và đặt giao tận tay.</p></div><div className="rounded-[2rem] bg-[#f7d9bd] p-12 text-center text-9xl shadow-sm">🧋</div></section>
      <section className="mx-auto max-w-6xl px-6 pb-6"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"><div><b>Bảng điều hành · Ngày {data.day}</b><p className="text-sm text-[#765d52]">Chi phí cố định 25.000đ/ngày · Nguyên liệu 38% doanh thu đơn hoàn tất trong ngày</p></div><button onClick={rescueShop} disabled={data.rescueLoanUsed || data.cash <= 0} className="rounded-xl border border-[#b65d3d] px-4 py-2 text-[#b65d3d] disabled:opacity-40">{data.rescueLoanUsed ? "Đã dùng khoản vay" : "Vay cứu tiệm +100.000đ"}</button></div></section>
      {adminOpen && <section className="mx-auto max-w-6xl px-6 pb-8"><div className="rounded-3xl bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Quản lý cửa hàng trên máy này</h2><p className="mt-1 text-sm text-[#765d52]">Sản phẩm, giá và tồn kho được lưu cục bộ trên trình duyệt.</p></div><button onClick={addProduct} className="rounded-xl bg-[#b65d3d] px-4 py-2 font-bold text-white">+ Thêm món</button></div><div className="mt-5 space-y-3">{data.products.map((product) => <article key={product.id} className="grid gap-3 rounded-2xl bg-[#fff9f0] p-4 md:grid-cols-[1.5fr_1fr_1fr_auto]"><label className="text-sm">Tên món<input value={product.name} onChange={(e) => updateProduct(product.id, (item) => ({ ...item, name: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-sm">Giá<input type="number" min="0" step="500" value={product.price} onChange={(e) => updateProduct(product.id, (item) => ({ ...item, price: Math.max(0, Number(e.target.value)) }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-sm">Tồn kho<input type="number" min="0" step="1" value={product.stock ?? 0} onChange={(e) => updateProduct(product.id, (item) => ({ ...item, stock: Math.max(0, Number(e.target.value)) }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><button onClick={() => updateProduct(product.id, (item) => ({ ...item, active: item.active === false }))} className="self-end rounded-lg bg-white px-3 py-2">{product.active === false ? "Ẩn" : "Đang bán"}</button></article>)}</div><div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm">Phí giao hàng<input type="number" min="0" value={data.deliveryFee} onChange={(e) => updateData((current) => ({ ...current, deliveryFee: Math.max(0, Number(e.target.value)) }))} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-sm">Miễn phí giao từ<input type="number" min="0" value={data.freeDeliveryThreshold} onChange={(e) => updateData((current) => ({ ...current, freeDeliveryThreshold: Math.max(0, Number(e.target.value)) }))} className="mt-1 w-full rounded-lg border p-2" /></label><div className="rounded-xl bg-[#fff0df] p-3 text-sm">Đang bán {activeProducts.length} món · {data.orders.length} đơn · vốn {formatVnd(data.cash)}</div></div></div></section>}
      {orderView && <section className="mx-auto max-w-6xl px-6 pb-8"><div className="rounded-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Lịch sử đơn trên thiết bị này</h2><button onClick={() => setOrderView(false)} aria-label="Đóng lịch sử">✕</button></div>{data.orders.length === 0 ? <p className="mt-4 text-[#765d52]">Chưa có đơn nào trên trình duyệt này.</p> : <div className="mt-4 space-y-4">{data.orders.map((order) => <article key={order.id} className="rounded-2xl bg-[#fff9f0] p-4"><div className="flex flex-wrap justify-between gap-2"><b>Mã {order.id} · {order.customer.name}</b><b>{formatVnd(order.total)}</b></div><p className="mt-1 text-sm">{new Date(order.createdAt).toLocaleString("vi-VN")} · {order.customer.phone} · {order.customer.address}</p><p className="mt-1 text-sm font-semibold text-[#b65d3d]">Trạng thái: {order.status}</p><div className="mt-3 flex flex-wrap gap-2">{(["Đã nhận", "Đang pha chế", "Đang giao", "Hoàn tất", "Đã hủy"] as const).map((status) => <button key={status} onClick={() => setOrderStatus(order.id, status)} className={`rounded-lg px-3 py-2 text-xs ${order.status === status ? "bg-[#3d2922] text-white" : "bg-white"}`}>{status}</button>)}</div></article>)}</div>}</div></section>}
      <section className="mx-auto max-w-6xl px-6 pb-8"><div className="mb-6 flex flex-wrap gap-3">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-5 py-2 ${category === item ? "bg-[#b65d3d] text-white" : "bg-white"}`}>{item}</button>)}</div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <button key={product.id} onClick={() => setSelectedId(product.id)} className={`rounded-3xl border bg-white p-5 text-left shadow-sm ${selectedId === product.id ? "border-[#b65d3d] ring-2 ring-[#b65d3d]/20" : "border-transparent"}`}><div className="flex h-32 items-center justify-center rounded-2xl bg-[#fff0df] text-7xl">{product.emoji}</div><h3 className="mt-4 text-xl font-bold">{product.name}</h3><p className="mt-2 min-h-10 text-sm text-[#765d52]">{product.description}</p><strong className="mt-4 block text-[#b65d3d]">{formatVnd(product.price)}</strong></button>)}</div></section>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1fr_380px]"><div className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm font-bold uppercase tracking-widest text-[#b65d3d]">Tùy chỉnh</p><h2 className="mt-1 text-2xl font-bold">{selected.emoji} {selected.name}</h2><label className="mt-5 block font-semibold">Kích cỡ</label><div className="mt-2 flex gap-2">{(["M", "L"] as const).map((size) => <button key={size} onClick={() => setOptions({ ...options, size })} className={`flex-1 rounded-xl border p-3 ${options.size === size ? "border-[#b65d3d] bg-[#fff0df]" : ""}`}>Size {size}{size === "L" ? " · +6.000đ" : ""}</button>)}</div><label className="mt-4 block font-semibold">Mức đường</label><select value={options.sweetness} onChange={(e) => setOptions({ ...options, sweetness: e.target.value as TeaOptions["sweetness"] })} className="mt-2 w-full rounded-xl border p-3">{["0%", "30%", "50%", "70%", "100%"].map((value) => <option key={value}>{value}</option>)}</select><label className="mt-4 block font-semibold">Lượng đá</label><select value={options.ice} onChange={(e) => setOptions({ ...options, ice: e.target.value as TeaOptions["ice"] })} className="mt-2 w-full rounded-xl border p-3">{["Không đá", "Ít đá", "Bình thường"].map((value) => <option key={value}>{value}</option>)}</select><p className="mt-4 font-semibold">Topping</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{TOPPINGS.map((topping) => <label key={topping.name} className="flex items-center justify-between rounded-xl bg-[#fff9f0] p-3 text-sm"><span><input type="checkbox" checked={options.toppings.includes(topping.name)} onChange={(e) => setOptions({ ...options, toppings: e.target.checked ? [...options.toppings, topping.name] : options.toppings.filter((name) => name !== topping.name) })} className="mr-2 accent-[#b65d3d]" />{topping.name}</span><span>+{formatVnd(topping.price)}</span></label>)}</div><button onClick={addToCart} className="mt-5 w-full rounded-xl bg-[#b65d3d] py-3 font-bold text-white">Thêm vào giỏ · {formatVnd(getUnitPrice(selected, options))}</button></div>
        <aside id="cart-panel" className="h-fit rounded-3xl bg-[#fff0df] p-6"><h2 className="text-2xl font-bold">Giỏ hàng</h2>{data.cart.length === 0 ? <p className="mt-5 text-[#765d52]">Chưa có món nào. Chọn trà sữa bạn yêu thích nhé.</p> : <>{data.cart.map((item) => <div key={item.key} className="border-b border-[#3d2922]/10 py-4"><div className="flex justify-between gap-2"><b>{item.product.name}</b><b>{formatVnd(item.unitPrice * item.quantity)}</b></div><p className="mt-1 text-xs text-[#765d52]">Size {item.options.size} · {item.options.sweetness} đường · {item.options.ice}{item.options.toppings.length ? ` · ${item.options.toppings.join(", ")}` : ""}</p><div className="mt-2 flex items-center gap-3"><button aria-label="Giảm số lượng" onClick={() => changeQuantity(item.key, -1)} className="h-8 w-8 rounded-full bg-white">−</button><span>{item.quantity}</span><button aria-label="Tăng số lượng" onClick={() => changeQuantity(item.key, 1)} className="h-8 w-8 rounded-full bg-white">+</button></div></div>)}<div className="mt-4 flex gap-2"><input aria-label="Mã giảm giá" placeholder="Mã ưu đãi" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} className="min-w-0 flex-1 rounded-xl border p-2"/><button onClick={applyPromo} className="rounded-xl bg-white px-3 font-semibold">Áp dụng</button></div>{data.promoCode && <p className="mt-2 text-sm text-green-800">Mã {data.promoCode} giảm {data.discountPercent}%</p>}<div className="mt-4 space-y-1 border-t border-[#3d2922]/10 pt-3 text-sm"><div className="flex justify-between"><span>Tạm tính</span><span>{formatVnd(subtotal)}</span></div>{discountAmount > 0 && <div className="flex justify-between text-green-800"><span>Ưu đãi</span><span>−{formatVnd(discountAmount)}</span></div>}<div className="flex justify-between"><span>Giao hàng{subtotal >= data.freeDeliveryThreshold ? " · miễn phí" : ""}</span><span>{deliveryFee ? formatVnd(deliveryFee) : "0đ"}</span></div><div className="flex justify-between pt-2 text-lg font-bold"><span>Tổng cộng</span><span>{formatVnd(total)}</span></div></div><button onClick={() => setCheckoutOpen(true)} className="mt-4 w-full rounded-xl bg-[#3d2922] py-3 font-bold text-white">Nhập thông tin giao hàng</button></>}</aside>
      </section>
      {bankruptcyOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5"><section className="max-w-md rounded-3xl bg-[#fff9f0] p-8 text-center shadow-2xl"><div className="text-6xl">💸</div><h2 className="mt-3 text-3xl font-bold text-red-800">Tiệm đã phá sản</h2><p className="mt-3">Vốn đã cạn. Bạn có thể vay cứu tiệm một lần hoặc mở lại từ đầu.</p><div className="mt-6 flex flex-wrap justify-center gap-3">{!data.rescueLoanUsed && <button onClick={rescueShop} className="rounded-xl border border-[#b65d3d] px-5 py-3 font-bold text-[#b65d3d]">Vay 100.000đ</button>}<button onClick={restartShop} className="rounded-xl bg-[#b65d3d] px-5 py-3 font-bold text-white">Mở tiệm lại</button></div></section></div>}
      {checkoutOpen && <div className="fixed inset-0 z-30 flex items-center justify-center overflow-auto bg-black/50 p-4"><form onSubmit={submitOrder} className="my-auto w-full max-w-lg rounded-3xl bg-[#fff9f0] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Thông tin đặt hàng</h2><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Đóng">✕</button></div><p className="mt-2 text-sm text-[#765d52]">Thanh toán khi nhận hàng · Tổng đơn {formatVnd(total)}</p><label className="mt-5 block font-semibold">Họ và tên<input required minLength={2} autoComplete="name" value={checkout.name} onChange={(e) => setCheckout({ ...checkout, name: e.target.value })} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><label className="mt-4 block font-semibold">Số điện thoại<input required type="tel" autoComplete="tel" pattern="[0-9+() .-]{9,16}" value={checkout.phone} onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><label className="mt-4 block font-semibold">Địa chỉ giao hàng<textarea required minLength={8} autoComplete="street-address" value={checkout.address} onChange={(e) => setCheckout({ ...checkout, address: e.target.value })} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><label className="mt-4 block font-semibold">Ghi chú<textarea maxLength={300} value={checkout.note} onChange={(e) => setCheckout({ ...checkout, note: e.target.value })} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><button type="submit" className="mt-5 w-full rounded-xl bg-[#b65d3d] py-3 font-bold text-white">Xác nhận đặt hàng · {formatVnd(total)}</button></form></div>}
      </>}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-40 max-w-[90vw] -translate-x-1/2 rounded-full bg-[#3d2922] px-5 py-3 text-center text-white shadow-lg">{notice}</div>}
    </main>
  );
}
