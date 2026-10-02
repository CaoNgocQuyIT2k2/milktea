"use client";

import { useEffect, useRef, useState } from "react";
import { collectOrder, distance, gameProduct, makeInitialGame, movePlayer, nearestCustomer, releaseBrew, serveOrder, spawnCustomer, startBrew, tickGame, type ShopGameState } from "@/lib/tea-game";
import { formatVnd, PRODUCTS } from "@/lib/tea-shop";

const W = 920;
const H = 560;
const STORAGE = "may-tra-game-v1";
type Props = { onMoney: (delta: number) => void; onBankrupt: () => void; day: number; cash: number; orderCount: number; onEndDay: () => void; onOrders: () => void; onManage: () => void };

function readGame(): ShopGameState {
  if (typeof window === "undefined") return makeInitialGame();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<ShopGameState> | null;
    return saved && saved.player && Array.isArray(saved.customers) ? { ...makeInitialGame(), ...saved, customers: saved.customers.filter((c) => c.state !== "arriving" && c.state !== "leaving") } as ShopGameState : makeInitialGame();
  } catch { return makeInitialGame(); }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string, phase: number, player = false) {
  const bob = Math.sin(phase) * 2;
  ctx.fillStyle = "rgba(49,36,28,.18)"; ctx.beginPath(); ctx.ellipse(x, y + 8, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; roundRect(ctx, x - 12, y - 19 + bob, 24, 25, 8); ctx.fill();
  ctx.fillStyle = "#f4c9a8"; ctx.beginPath(); ctx.arc(x, y - 25 + bob, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = player ? "#51362e" : "#432f28"; ctx.fillRect(x - 8, y - 36 + bob, 16, 5);
  ctx.fillStyle = "#34231d"; ctx.beginPath(); ctx.arc(x - 3, y - 26 + bob, 1, 0, Math.PI * 2); ctx.arc(x + 3, y - 26 + bob, 1, 0, Math.PI * 2); ctx.fill();
  ctx.font = "600 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#49382f"; ctx.fillText(player ? "Bạn" : name, x, y + 24);
}

function drawScene(ctx: CanvasRenderingContext2D, state: ShopGameState, near: ReturnType<typeof nearestCustomer>, prepared: boolean, clock: number) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#e9d8bc"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#b8c994"; ctx.fillRect(0, 0, W, 165);
  ctx.fillStyle = "#dae4bd"; ctx.beginPath(); ctx.arc(800, 74, 35, 0, Math.PI * 2); ctx.fill();
  // terrace edge, front path and floor tiles
  ctx.fillStyle = "#9ba876"; ctx.fillRect(0, 157, W, 14);
  ctx.fillStyle = "#c9ae89"; ctx.fillRect(0, 171, W, H - 171);
  ctx.strokeStyle = "rgba(115,83,55,.12)"; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 171); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 171; y <= H; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // shop sign and facade
  ctx.fillStyle = "#714537"; roundRect(ctx, 282, 34, 350, 65, 14); ctx.fill();
  ctx.fillStyle = "#f4deb3"; ctx.font = "bold 22px Georgia"; ctx.textAlign = "center"; ctx.fillText("MÂY TRÀ SỮA", 457, 62);
  ctx.font = "12px system-ui"; ctx.fillText("pha vui · uống là mê", 457, 82);
  // windows and counter
  ctx.fillStyle = "#fff0d2"; roundRect(ctx, 230, 115, 450, 105, 12); ctx.fill();
  ctx.fillStyle = "#9e6042"; ctx.fillRect(230, 207, 450, 21);
  ctx.fillStyle = "#714537"; roundRect(ctx, 295, 250, 350, 56, 9); ctx.fill();
  ctx.fillStyle = "#d29664"; ctx.fillRect(295, 250, 350, 9);
  ctx.fillStyle = "#fff1d8"; ctx.font = "bold 13px system-ui"; ctx.fillText("QUẦY PHA CHẾ", 470, 282);
  // tea equipment
  [[346,"#d69b52"],[406,"#7ba47f"],[526,"#c37a63"],[586,"#e9c36d"]].forEach(([x, color]) => {
    ctx.fillStyle = color as string; roundRect(ctx, (x as number) - 12, 222, 24, 25, 5); ctx.fill();
    ctx.fillStyle = "#fff4dd"; ctx.fillRect((x as number) - 8, 219, 16, 4);
  });
  // queue line
  ctx.strokeStyle = "#f7eddb"; ctx.lineWidth = 4; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(665, 332); ctx.lineTo(828, 332); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#714537"; ctx.font = "11px system-ui"; ctx.fillText("XẾP HÀNG", 747, 351);
  state.customers.forEach((customer) => {
    if (customer.state === "angry" || customer.state === "leaving") return;
    drawCharacter(ctx, customer.x, customer.y, customer.color, customer.name, customer.phase);
    if (customer.state === "waiting") {
      const product = gameProduct(customer.productId);
      ctx.fillStyle = "#fffaf0"; roundRect(ctx, customer.x - 60, customer.y - 72, 120, 28, 8); ctx.fill();
      ctx.fillStyle = "#48342b"; ctx.font = "11px system-ui"; ctx.fillText(`🧋 ${product.name}`, customer.x, customer.y - 54);
      ctx.fillStyle = "#fff"; roundRect(ctx, customer.x - 16, customer.y + 31, 32, 4, 2); ctx.fill();
      ctx.fillStyle = customer.patience < 30 ? "#df6b50" : "#81a86d"; roundRect(ctx, customer.x - 16, customer.y + 31, 32 * customer.patience / 100, 4, 2); ctx.fill();
    }
  });
  drawCharacter(ctx, state.player.x, state.player.y + Math.sin(clock * 7) * .8, "#cf7756", "Bạn", clock * 8, true);
  // player apron
  ctx.fillStyle = "#7a4a3d"; roundRect(ctx, state.player.x - 7, state.player.y - 8, 14, 14, 3); ctx.fill();
  // display interaction ring
  if (near && distance(state.player, near) < 94) {
    ctx.strokeStyle = "rgba(182,93,61,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(near.x, near.y - 5, 28 + Math.sin(clock * 5) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  // counter action prompt
  const counterNear = Math.abs(state.player.x - 470) < 110 && Math.abs(state.player.y - 306) < 85;
  if (counterNear && state.preparedOrderId) {
    ctx.fillStyle = "#714537"; roundRect(ctx, 342, 315, 260, 32, 10); ctx.fill();
    ctx.fillStyle = "#fff5df"; ctx.font = "bold 12px system-ui"; ctx.fillText(prepared ? "Đã pha xong · đang giao cho khách" : "Tự đến quầy · giữ nút để rót", 472, 335);
  }
  // planters / outside tables
  [[60,315],[840,240]].forEach(([x,y])=>{ctx.fillStyle="#66835c";ctx.beginPath();ctx.arc(x,y,19,0,Math.PI*2);ctx.fill();ctx.fillStyle="#d9bd88";ctx.fillRect(x-13,y+13,26,10);});
  ctx.fillStyle = "rgba(255,249,240,.85)"; roundRect(ctx, 15, 15, 180, 34, 10); ctx.fill();
  ctx.fillStyle = "#49382f"; ctx.font = "12px system-ui"; ctx.textAlign = "left"; ctx.fillText("Nhân viên tự động phục vụ khách", 27, 37);
}

export default function TeaGame({ onMoney, onBankrupt, day, cash, orderCount, onEndDay, onOrders, onManage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShopGameState>(readGame());
  const [snapshot, setSnapshot] = useState<ShopGameState>(() => makeInitialGame());
  const [toppings, setToppings] = useState<string[]>([]);
  const [brewStep, setBrewStep] = useState(0);
  const [sweetness, setSweetness] = useState("50%");
  const [teaBase, setTeaBase] = useState("Trà đen");
  const [motionSeed, setMotionSeed] = useState(0);
  const near = nearestCustomer(snapshot);
  const [dailyTarget, setDailyTarget] = useState(10);
  const [dayNotice, setDayNotice] = useState("");
  const autoAction = useRef("");
  const dayCompleteNotified = useRef(false);
  const currentDayRef = useRef(day);
  const actionableCustomer = near && distance(snapshot.player, near) < 90 ? near : null;
  const selectedOrder = snapshot.customers.find((customer) => customer.id === snapshot.preparedOrderId);
  const currentOrderReady = Boolean(selectedOrder);
  const currentPrepared = snapshot.orderPrepared;

  useEffect(() => {
    let raf = 0; let last = performance.now(); let clock = 0; let spawnElapsed = 3; let publishElapsed = 0;
    const savedState = readGame();
    stateRef.current = savedState;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, .05); last = now; clock += dt;
      let state = tickGame(stateRef.current, dt);
      const activeCustomer = state.customers.find((customer) => customer.id === state.preparedOrderId && customer.state === "waiting")
        ?? state.customers.find((customer) => customer.state === "waiting");
      const target = state.dayComplete ? null : activeCustomer
        ? state.preparedOrderId ? { x: 470, y: 306 } : { x: activeCustomer.x, y: activeCustomer.y }
        : { x: 640, y: 310 };
      if (currentDayRef.current !== day) {
        currentDayRef.current = day;
        state = makeInitialGame(state.coins);
        stateRef.current = state;
        setDailyTarget(state.dailyTarget);
        dayCompleteNotified.current = false;
        spawnElapsed = 0;
      }
      if (state.dayComplete && !dayCompleteNotified.current) {
        dayCompleteNotified.current = true;
        setDayNotice(`Ngày ${day} hoàn tất! Đã phục vụ ${state.served}/${state.dailyTarget} đơn, ${state.missed} khách đã rời đi.`);
        onEndDay();
        window.setTimeout(() => {
          const nextDayState = makeInitialGame(stateRef.current.coins);
          stateRef.current = nextDayState;
          setSnapshot(nextDayState);
          setDailyTarget(nextDayState.dailyTarget);
          setDayNotice("");
          autoAction.current = "";
          dayCompleteNotified.current = false;
          currentDayRef.current = day + 1;
          spawnElapsed = 0;
        }, 1200);
      }
      if (target) {
        const dx = target.x - state.player.x;
        const dy = target.y - state.player.y;
        if (Math.hypot(dx, dy) > 8) state = movePlayer(state, dx, dy, dt);
      } else if (Math.abs(state.player.x - 640) > 10 || Math.abs(state.player.y - 310) > 10) {
        state = movePlayer(state, 640 - state.player.x, 310 - state.player.y, dt);
      }
      const stateCustomer = state.customers.find((customer) => customer.id === state.preparedOrderId && customer.state === "waiting")
        ?? state.customers.find((customer) => customer.state === "waiting");
      if (!state.preparedOrderId && autoAction.current === "served") {
        autoAction.current = "";
      }
      spawnElapsed += dt;
      if (!state.dayComplete && state.served < state.dailyTarget && spawnElapsed > 2.8 && state.customers.filter((c) => c.state === "waiting" || c.state === "arriving").length < 3) { state = spawnCustomer(state); spawnElapsed = 0; }
      stateRef.current = state;
      const context = canvasRef.current?.getContext("2d");
      if (context) {
        const canvas = canvasRef.current!;
        context.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
        const n = nearestCustomer(state);
        const ready = Boolean(state.preparedOrderId);
        drawScene(context, state, n, ready, clock);
      }
      publishElapsed += dt;
      if (publishElapsed > .15) {
        setSnapshot({ ...state, player: { ...state.player }, customers: [...state.customers] });
        try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* local save unavailable */ }
        publishElapsed = 0;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onMoney, onBankrupt]);

  return (
    <section className="mx-auto max-w-[620px] overflow-hidden border-x border-[#56303a] bg-[#251b19] text-[#f8e9d7] shadow-[0_25px_80px_rgba(20,8,12,.5)]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#3e1c29] px-4 py-2.5"><div className="flex items-center gap-3"><button aria-label="Kết thúc ngày" onClick={onEndDay} disabled={cash <= 0} className="h-9 w-9 rounded-full bg-[#522634] text-xl">Ⅱ</button><div><b className="block text-sm">Ngày {day}</b><span className="text-[10px] text-[#d3bdb2]">12:31 · ca đang mở</span></div></div><div className="text-center"><small className="block text-[9px] font-bold tracking-widest">KẾT</small><b className="text-xl leading-none text-[#ffdf52]">{formatVnd(cash)}</b><small className="block text-[9px]">Đơn {snapshot.served}/{dailyTarget}</small></div><div className="text-right"><div className="text-sm text-[#ffd84b]">★★★★☆</div><small>4,0 · 1 đánh giá</small></div></header>
      <div className="relative"><canvas ref={canvasRef} width={W} height={H} aria-label="Quán trà sữa: nhân vật tự phục vụ khách" className="block h-auto w-full" /><div className="absolute inset-x-2 bottom-1 grid grid-cols-3 gap-1 rounded-t-2xl border border-white/5 bg-[#412431]/85 p-2 sm:inset-x-4 sm:bottom-2">{["Bạn", ...(snapshot.customers.filter((c) => c.state === "waiting").slice(0, 2).map((c) => c.name))].map((name, index) => <div key={`${name}-${index}`} className="text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full border-[3px] border-[#63bc75] bg-[#714537] text-xl shadow-[0_0_0_3px_#39232c]">{["👩🏻", "👨🏻", "👩🏼"][index]}</div><b className="text-[10px]">{name}</b></div>)}</div>
      </div>
      <div className="border-y border-white/10 bg-[#2c2022] px-3 py-3"><div className="flex items-center gap-3"><span className="text-3xl">🧋</span><div className="min-w-0 flex-1"><p className="text-sm leading-snug">{dayNotice || (selectedOrder ? `${selectedOrder.name} gọi ${gameProduct(selectedOrder.productId).name} · đường ${(selectedOrder.requestedSweetness ?? "50%")} · topping: ${(selectedOrder.requestedToppings ?? []).length ? (selectedOrder.requestedToppings ?? []).join(", ") : "không thêm"}. Bước ${brewStep + 1}: ${["Chọn trà nền", `Chọn đúng mức đường ${(selectedOrder.requestedSweetness ?? "50%")}`, `Thêm topping theo yêu cầu`][brewStep] ?? "Canh lượng rót"}.` : snapshot.notice)}</p><div className="mt-2 h-1 overflow-hidden rounded bg-white/10"><div className="h-full rounded bg-[#55bc68] transition-[width]" style={{ width: `${actionableCustomer?.patience ?? 100}%` }} /></div></div></div></div>
      <div className="relative overflow-hidden border border-[#795342]/45 bg-[#211b17] p-3 sm:p-5"><div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(rgba(136,91,53,.13) 1px, transparent 1px), linear-gradient(90deg, rgba(136,91,53,.13) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="relative z-10"><div className="grid grid-cols-5 gap-1.5">{["Trà sữa", "Trà trái cây", "Đặc biệt", "Trà xanh", "Món mới"].map((name, index) => <button key={name} onClick={() => { setTeaBase(["Trà đen", "Trà ô long", "Matcha", "Trà xanh", "Trà nhài"][index]); setBrewStep((step) => Math.max(step, 1)); }} className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-xl border px-1 py-1 text-[10px] font-bold ${index === 0 ? "border-[#ed4949] bg-[#34201e]" : "border-[#715c4e] bg-[#2a211d]"}`}><span className="text-2xl">{["🧋", "🍑", "🍵", "🫖", "🥛"][index]}</span>{name}{index === 0 && <b className="absolute right-1 top-0.5">{gameProduct(selectedOrder?.productId ?? PRODUCTS[0].id).stock ?? 0}</b>}</button>)}</div>
      <div className="my-5 grid grid-cols-[58px_1fr_48px] items-stretch gap-2"><div className="flex flex-col items-center justify-center rounded-xl border border-[#745e4c] bg-[#2b211d] p-1 text-center text-[10px]"><span className="text-2xl">🫖</span><p>Trà nền</p></div><div className="relative flex min-h-[110px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#d6a16e] bg-gradient-to-b from-[#594732] to-[#cf9d68] p-3 text-center text-sm font-bold text-[#f5e1c6] shadow-inner"><div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-2/3 items-end justify-center gap-1">{toppings.map((item, index) => { const toppingIndex = ["Trân châu đen", "Trân châu trắng", "Thạch trái cây", "Pudding", "Kem cheese", "Thạch dừa", "Đậu đỏ", "Hạt thủy tinh"].indexOf(item); return <span key={`${item}-${motionSeed}`} className="animate-bounce text-xl" style={{ animationDelay: `${index * 120}ms` }}>{["⚫", "⚪", "🍓", "🍮", "🧀", "🥥", "🫘", "🫧"][toppingIndex] ?? "🧋"}</span>; })}</div><div className="relative z-10 animate-pulse text-4xl">{selectedOrder ? "🧋" : "🥤"}</div><p className="relative z-10">{selectedOrder ? gameProduct(selectedOrder.productId).name : "Chưa có đơn trà"}</p><p className="relative z-10 text-[10px]">{teaBase} · đường {sweetness}</p>{selectedOrder && <p className="relative z-10 text-[10px] font-medium">{toppings.length ? toppings.join(" · ") : "Chọn topping bên dưới"}</p>}</div><div className="flex flex-col items-center justify-center rounded-xl border border-[#745e4c] bg-[#2a211d] text-[10px]"><span className="text-3xl">🍯</span>Đường</div></div>
      <div className="mb-4 rounded-xl border border-[#684f3c] bg-[#2c211d] p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold"><span>{snapshot.brewHolding ? "Đang rót nguyên liệu" : "Canh lượng trà sữa"}</span><span>{Math.round(snapshot.brewProgress)}% / mục tiêu {snapshot.brewTarget}%</span></div><div className="relative h-5 overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-red-500 via-amber-300 via-55% to-emerald-500"><div className="absolute inset-y-0 rounded bg-white/45 ring-2 ring-white" style={{ left: `${Math.max(0, snapshot.brewTarget - 7)}%`, width: "14%" }} /><div className="absolute -top-1 h-7 w-1 rounded bg-[#251b19] shadow-[0_0_0_2px_white] transition-[left]" style={{ left: `${snapshot.brewProgress}%` }} /></div><div className="mt-1 flex justify-between text-[9px] text-[#d9c6b2]"><span>Thiếu</span><span>Vừa chuẩn</span><span>Quá tay</span></div></div>
      <div className="mb-2 flex items-center justify-between rounded-xl bg-[#34261f] p-2 text-xs"><b>{brewStep >= 4 ? "Đã pha xong" : `Bước ${brewStep + 1}/4`}</b><span>{["Chọn trà nền", "Chọn lượng đường", "Chọn topping theo đơn", "Canh lượng rót"][brewStep] ?? "Sẵn sàng giao món"}</span></div>
      {brewStep === 0 && <div className="mb-3 grid grid-cols-3 gap-2">{["Trà đen", "Trà ô long", "Matcha"].map((tea, index) => <button key={tea} onClick={() => { setTeaBase(tea); setBrewStep(1); }} className="rounded-lg border border-[#755b47] bg-[#332720] p-2 text-xs">{["🫖", "🍃", "🍵"][index]}<br/>{tea}</button>)}</div>}
      {brewStep === 1 && <div className="mb-3 flex flex-wrap gap-2">{["0%", "30%", "50%", "70%", "100%"].map((level) => <button key={level} onClick={() => { setSweetness(level); setBrewStep(2); }} className={`rounded-lg border px-3 py-2 text-xs ${sweetness === level ? "border-[#e9bb67] bg-[#5a3c29]" : "border-[#755b47] bg-[#332720]"}`}>{level}{selectedOrder?.requestedSweetness === level ? " · đúng yêu cầu" : ""}</button>)}</div>}
      {(brewStep === 2 || !selectedOrder) && <div className="grid grid-cols-[1fr_56px] gap-2"><div className="grid grid-cols-4 gap-1">{["Trân châu đen", "Trân châu trắng", "Thạch trái cây", "Pudding", "Kem cheese", "Thạch dừa", "Đậu đỏ", "Hạt thủy tinh"].map((item, index) => <button key={item} onClick={() => { if (brewStep !== 2) return; setToppings((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]); setMotionSeed((seed) => seed + 1); }} aria-pressed={toppings.includes(item)} className={`flex min-h-12 flex-col items-center justify-center rounded-lg border text-[9px] font-bold ${(selectedOrder?.requestedToppings ?? []).includes(item) ? "border-[#53bd72] bg-[#29442f]" : toppings.includes(item) ? "border-[#ed4949] bg-[#522a2c]" : "border-[#655044] bg-[#2c231f]"}`}><span className="text-lg">{["⚫", "⚪", "🍓", "🍮", "🧀", "🥥", "🫘", "🫧"][index]}</span>{item}{(selectedOrder?.requestedToppings ?? []).includes(item) && <small>Khách gọi</small>}</button>)}</div><button className="rounded-xl bg-[#4b5758] text-xs font-bold" onClick={() => setToppings([])}>▤<br/>Bỏ topping</button></div>}
      {brewStep === 2 && selectedOrder && <button onClick={() => { setToppings((selectedOrder.requestedToppings ?? [])); setSweetness((selectedOrder.requestedSweetness ?? "50%")); setBrewStep(3); }} className="mt-2 w-full rounded-lg bg-[#8a6742] py-2 text-xs font-bold">Lấy đúng topping và đường theo đơn · tiếp tục</button>}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><div className="flex items-center justify-between rounded-xl bg-[#2c211d] px-3 py-2 text-xs"><span>{selectedOrder ? `${selectedOrder.name} · ${toppings.length} topping` : "Chờ khách gọi món"}</span><div className="flex gap-1"><button onClick={onOrders} className="rounded bg-[#372a24] px-2 py-1">Đơn {orderCount}</button><button onClick={onManage} className="rounded bg-[#372a24] px-2 py-1">Quản lý</button></div></div><button onClick={onEndDay} className="rounded-xl bg-[#704238] px-3 text-xs font-bold">Kết thúc ngày</button></div></div></div>
      <div className="mt-2 grid grid-cols-2 gap-2">{!currentOrderReady && actionableCustomer && <button onClick={() => { const current = stateRef.current; const next = collectOrder(current, actionableCustomer.id); if (next === current) return; stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); setToppings([]); setBrewStep(0); setSweetness("50%"); setTeaBase("Trà đen"); autoAction.current = "to-counter"; }} className="col-span-2 rounded-xl bg-[#d18b45] px-3 py-3 text-sm font-black text-[#241a16]">Nhận đơn của {actionableCustomer.name}</button>}{currentOrderReady && !currentPrepared && brewStep === 3 && Math.abs(snapshot.player.x - 470) < 110 && Math.abs(snapshot.player.y - 306) < 85 && <button onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const current = stateRef.current; const next = startBrew(current, true); stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); }} onPointerUp={() => { const latest = stateRef.current; const next = latest.orderPrepared ? latest : releaseBrew(latest); stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); if (next.orderPrepared) setBrewStep(4); }} onPointerCancel={() => { const latest = stateRef.current; const next = latest.orderPrepared ? latest : releaseBrew(latest); stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); if (next.orderPrepared) setBrewStep(4); }} onLostPointerCapture={() => { if (stateRef.current.brewHolding || stateRef.current.orderPrepared) { const latest = stateRef.current; const next = latest.orderPrepared ? latest : releaseBrew(latest); stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); if (next.orderPrepared) setBrewStep(4); } }} className="col-span-2 touch-none select-none rounded-xl bg-[#35934d] px-3 py-3 text-sm font-black text-white">{snapshot.orderPrepared ? "Pha xong · giao món cho khách" : "Giữ để rót · nhả trong vùng xanh"}</button>}{currentOrderReady && !currentPrepared && brewStep < 3 && <div className="col-span-2 rounded-xl bg-[#59402d] px-3 py-3 text-center text-xs">Hoàn tất bước {brewStep + 1}–3 phía trên để mở thao tác rót</div>}{currentOrderReady && currentPrepared && <button onClick={() => { const current = stateRef.current; const customerId = current.preparedOrderId; if (!customerId) return; const before = current.coins; const next = serveOrder(current, customerId); if (next === current) return; stateRef.current = next; try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* local save unavailable */ } setSnapshot(next); const reward = next.coins - before; if (reward > 0) onMoney(reward); if (next.coins <= 0) onBankrupt(); setToppings([]); setBrewStep(0); setDayNotice(next.notice); window.setTimeout(() => setDayNotice(""), 2200); autoAction.current = "served"; }} className="col-span-2 rounded-xl bg-[#35934d] px-3 py-3 text-sm font-black text-white">Giao món cho {selectedOrder!.name}</button>}</div>
    </section>
  );
}
