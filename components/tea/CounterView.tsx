"use client";

import { useEffect, useRef } from "react";
import { gameProduct, recipeMatches, type QueueCustomer, type ShopGameState } from "@/lib/tea-game";
import { formatVnd } from "@/lib/tea-shop";
import { TOPPING_NAMES, TEA_INGREDIENTS } from "@/lib/tea-art";
import { DrinkIcon, ToppingIcon } from "./PixelArt";
import BrewingCup from "./BrewingCup";
import CounterGuests from "./CounterGuests";

const sizes = ["Nhỏ", "Vừa", "Lớn"];
const teas = TEA_INGREDIENTS.map(item => item.name);
const sugars = ["0%", "30%", "50%", "70%", "100%"];
type Props = {
  snapshot: ShopGameState; selectedOrder?: QueueCustomer; day: number; cash: number; orderCount: number;
  canBrew: boolean; cupSize: string; teaBase: string; sweetness: string; toppings: string[]; brewStep: number;
  notice: string; stock: Record<string, number>; stockOpen: boolean;
  onStockOpen: (open: boolean) => void; onRestock: (item: string) => void; onCup: (size: string) => void;
  onAdd: (kind: "tea" | "sugar" | "topping", value: string) => void;
  ingredientEffect: { kind: string; value: string; sequence: number };
  onLid: () => void; onReset: () => void;
  onStory: () => void; onOrders: () => void; onManage: () => void; onEndDay: () => void;
};

export default function CounterView(p: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (p.stockOpen) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [p.stockOpen]);
  const quantity = (item: string) => p.stock[item] ?? 20;
  const customer = p.selectedOrder;
  const readyToSeal = Boolean(p.canBrew && customer && p.cupSize && p.brewStep === 2 && recipeMatches(customer, p.teaBase, p.sweetness, p.toppings, p.cupSize));
  return <section className="counter-game">
    <header className="counter-header"><div><b>♡ Mây · quầy trà nhỏ</b><span>Ngày {p.day} · {p.snapshot.served} khách · ⏱ {Math.floor((p.snapshot.shiftRemaining ?? 600)/60).toString().padStart(2,"0")}:{Math.floor((p.snapshot.shiftRemaining ?? 600)%60).toString().padStart(2,"0")}</span></div><b>{formatVnd(p.cash)}</b><nav aria-label="Cửa hàng"><button onClick={() => p.onStockOpen(true)}>Nhập hàng</button><button onClick={p.onOrders}>Lịch sử {p.orderCount}</button><button onClick={p.onStory}>Khách quen</button><button onClick={p.onEndDay}>Kết ngày</button></nav></header>
    <div className="customer-window">
      <div className="cafe-sign">MÂY TEA ♡ <span>một chút ngọt ngào mỗi ngày</span></div><div className="window-decor" aria-hidden="true">✿</div>
      <CounterGuests customers={p.snapshot.customers} activeId={customer?.id} paused={p.stockOpen}/>
      <div className="order-bubble" role="status">{customer ? <><b>{customer.name} ♡</b><span>Cho mình {gameProduct(customer.productId).name}, ly {customer.requestedSize ?? "Vừa"}, đường {customer.requestedSweetness ?? "50%"}{customer.requestedToppings?.length ? `, thêm ${customer.requestedToppings.join(", ")}` : ", không topping"} nhé!</span></> : <><b>Xin chào ♡</b><span>Khách đang tới quầy…</span></>}</div>
    </div>
    <div className="counter-worktop">
      <div className="counter-shelf cup-shelf"><h3>① Chọn ly</h3>{sizes.map((size,index) => <button key={size} aria-pressed={p.cupSize === size} disabled={!p.canBrew || Boolean(p.cupSize) || quantity(`Ly ${size}`) < 1} onClick={() => p.onCup(size)}><span className={`empty-cup cup-${index}`} aria-hidden="true">♡</span><span>{size}</span><small>{quantity(`Ly ${size}`)} ly</small></button>)}<button className={`lid-button ${readyToSeal ? "is-ready" : ""}`} aria-label={readyToSeal ? "Đóng nắp · ly đã đúng đơn" : "Đóng nắp"} disabled={!p.canBrew || p.brewStep !== 2 || !p.cupSize} onClick={p.onLid}>▰ Đóng nắp</button></div>
      <div className="counter-shelf tea-shelf"><h3>② Trà & vị sữa · vuốt ngang</h3><div className="ingredient-carousel" tabIndex={0} aria-label="Vuốt ngang để xem thêm">{TEA_INGREDIENTS.map(({name:tea,icon}) => <button className="counter-ingredient" key={tea} aria-label={`Thêm ${tea}`} disabled={!p.canBrew || !p.cupSize || p.brewStep !== 0 || quantity(tea)<1} onClick={() => p.onAdd("tea",tea)}><DrinkIcon id={icon} size={38}/><span>{tea}</span><small>{quantity(tea)} phần</small></button>)}</div></div>
      <div className="prep-tray"><div className="tray-label">KHAY PHA ♡</div><BrewingCup size={p.cupSize} tea={p.teaBase} sweetness={p.sweetness} toppings={p.toppings} sealed={p.snapshot.orderPrepared} effect={p.ingredientEffect}/><div className="tray-info">{p.cupSize ? `Ly ${p.cupSize} · ${p.teaBase || "chưa có trà"}` : "① Chọn ly từ kệ bên cạnh"}<span>{p.sweetness && `Đường ${p.sweetness}`}{p.toppings.length > 0 && ` · ${p.toppings.join(", ")}`}</span></div><p role="status">{p.notice || (p.snapshot.orderPrepared ? "Đã đóng nắp · đang giao cho khách ♡" : !customer ? "Chờ khách gọi món" : !p.cupSize ? "Chọn size theo lời khách nhé" : p.brewStep === 0 ? "Bấm bình trà để thêm vào ly" : p.brewStep === 1 ? "Bấm mức đường để thêm" : "Thêm topping rồi bấm đóng nắp")}</p><button disabled={!p.canBrew} onClick={p.onReset}>↻ Pha lại</button></div>
      <div className="counter-shelf sugar-shelf"><h3>③ Đường</h3><div className="ingredient-carousel" tabIndex={0} aria-label="Vuốt ngang để xem thêm">{sugars.map(level => <button className="counter-ingredient" key={level} aria-label={`Thêm đường ${level}`} disabled={!p.canBrew || p.brewStep!==1 || quantity(level)<1} onClick={() => p.onAdd("sugar",level)}>♡ {level}</button>)}</div></div>
      <div className="counter-shelf topping-shelf"><h3>④ Topping · vuốt ngang</h3><div className="ingredient-carousel" tabIndex={0} aria-label="Vuốt ngang để xem thêm">{TOPPING_NAMES.map(item => <button className="counter-ingredient" key={item} aria-label={`Thêm ${item}`} disabled={!p.canBrew || p.brewStep!==2 || p.toppings.includes(item) || quantity(item)<1} onClick={() => p.onAdd("topping",item)}><ToppingIcon name={item} size={36}/><span>{item}</span><small>{quantity(item)} phần</small></button>)}</div></div>
    </div>
    <dialog ref={dialogRef} className="stock-dialog" aria-labelledby="stock-title" onCancel={() => p.onStockOpen(false)}><header><h2 id="stock-title">Nhập ly & nguyên liệu ♡</h2><button autoFocus onClick={() => p.onStockOpen(false)} aria-label="Đóng nhập hàng">×</button></header><p>Bổ sung từng loại vào kho. Chi phí nguyên liệu được tính khi tổng kết ngày.</p><div className="stock-items">{[...sizes.map(size=>`Ly ${size}`), ...teas, ...sugars, ...TOPPING_NAMES].map(item => <div key={item}><span>{sugars.includes(item) ? `Đường ${item}` : item}<small>Còn {quantity(item)}</small></span><button onClick={() => p.onRestock(item)}>+20</button></div>)}</div><button onClick={() => p.onStockOpen(false)}>Xong · trở lại quầy</button></dialog>
  </section>;
}
