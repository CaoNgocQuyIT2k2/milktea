"use client";

import { useEffect, useRef, useState } from "react";
import { counterService, makeInitialGame, recipeMatches, spawnCustomer, tickGame, gameProduct, type QueueCustomer, type ShopGameState } from "@/lib/tea-game";




import type { Campaign } from "@/lib/tea-story";
import CounterView from "./CounterView";



const STORAGE = "may-tra-game-v1";
type Props = { campaign: Campaign; onEncounter: (guest: QueueCustomer) => void; onSale: (amount: number, guest: QueueCustomer) => void; onStory: () => void; paused?: boolean; onMoney: (delta: number) => void; onBankrupt: () => void; day: number; cash: number; orderCount: number; onEndDay: (stats?: { served: number; missed: number }) => void; onOrders: () => void; onManage: () => void };

function readGame(): ShopGameState {
  if (typeof window === "undefined") return makeInitialGame();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<ShopGameState> | null;
    return saved && saved.player && Array.isArray(saved.customers) ? { ...makeInitialGame(), ...saved, customers: saved.customers.filter((c) => c.state !== "arriving" && c.state !== "leaving") } as ShopGameState : makeInitialGame();
  } catch { return makeInitialGame(); }
}

export default function TeaGame({ onMoney, onBankrupt, day, cash, orderCount, onEndDay, onOrders, onManage, campaign, onEncounter, onSale, onStory, paused = false }: Props) {

  const liveProps = useRef({ day, onEndDay, onMoney, onBankrupt, paused, campaign, onEncounter, onSale });


  const stateRef = useRef<ShopGameState>(readGame());
  const [snapshot, setSnapshot] = useState<ShopGameState>(() => makeInitialGame(150_000, () => 0));
  const [toppings, setToppings] = useState<string[]>([]);
  const [brewStep, setBrewStep] = useState(0);
  const [sweetness, setSweetness] = useState("");
  const [teaBase, setTeaBase] = useState("");
  const [cupSize, setCupSize] = useState("");
  const [stockOpen, setStockOpen] = useState(false);
  const [stock, setStock] = useState<Record<string, number>>({});
  const stockRef = useRef<Record<string, number>>({});
  useEffect(() => { try { stockRef.current = JSON.parse(localStorage.getItem("may-tea-stock") || "{}"); setStock(stockRef.current); } catch {} }, []);
  const quantity = (item: string) => stockRef.current[item] ?? 20;
  const changeStock = (item: string, delta: number) => { const next = { ...stockRef.current, [item]: quantity(item) + delta }; stockRef.current = next; setStock(next); try { localStorage.setItem("may-tea-stock", JSON.stringify(next)); } catch {} };


  const [dayNotice, setDayNotice] = useState("");
  const draftRef = useRef({ cupSize: "", teaBase: "", sweetness: "", toppings: [] as string[], step: 0 });
  const [ingredientEffect, setIngredientEffect] = useState({ kind: "", value: "", sequence: 0 });
  const dayCompleteNotified = useRef(false);
  const currentDayRef = useRef(day);

  useEffect(() => { liveProps.current = { day, onEndDay, onMoney, onBankrupt, paused: paused || stockOpen, campaign, onEncounter, onSale }; }, [day, onEndDay, onMoney, onBankrupt, paused, stockOpen, campaign, onEncounter, onSale]);
  const selectedOrder = snapshot.customers.find((customer) => customer.id === snapshot.preparedOrderId);


  useEffect(() => {
    let raf = 0; let last = performance.now(); let spawnElapsed = 3; let publishElapsed = 0; let deliveryElapsed = 0;
    const saved = readGame();
    const savedState = { ...saved, shiftRemaining: saved.shiftRemaining ?? 600, gameDay: saved.gameDay ?? liveProps.current.day, dayComplete: saved.shiftRemaining === undefined ? false : saved.dayComplete, brewHolding: false };
    currentDayRef.current = savedState.gameDay;
    stateRef.current = savedState;
    const frame = (now: number) => {
      const elapsed = Math.max(0,(now - last)/1000); const dt = Math.min(elapsed,.05); last = now;
      if (liveProps.current.paused || document.hidden) { raf = requestAnimationFrame(frame); return; }
      const day = liveProps.current.day;

      let state = tickGame(stateRef.current, dt);
      if (state.shiftRemaining !== undefined) { state.shiftRemaining = Math.max(0,state.shiftRemaining - Math.max(0,elapsed-dt)); if (state.shiftRemaining <= 0) state.dayComplete = true; }
      if (currentDayRef.current !== day) {
        currentDayRef.current = day;
        state = { ...makeInitialGame(state.coins), shiftRemaining: 600, gameDay: day, dailyTarget: 20 + Math.min(day,30) };
        stateRef.current = state;

        dayCompleteNotified.current = false;
        spawnElapsed = 0;
        draftRef.current = { cupSize: "", teaBase: "", sweetness: "", toppings: [], step: 0 };
        setDayNotice(""); setToppings([]); setBrewStep(0); setCupSize(""); setTeaBase(""); setSweetness("");
      }
      if (state.dayComplete && !dayCompleteNotified.current) {
        dayCompleteNotified.current = true;
        setDayNotice(`Ca 10 phút kết thúc! Phục vụ ${state.served} khách, ${state.missed} khách rời đi.`);
        liveProps.current.onEndDay({ served: state.served, missed: state.missed });

      }
      const beforeService = state;
      deliveryElapsed = state.orderPrepared ? deliveryElapsed + dt : 0;
      if (!state.orderPrepared || deliveryElapsed > .9) state = counterService(state);
      if (state.coins > beforeService.coins) { const servedGuest = beforeService.customers.find(c => c.id === beforeService.preparedOrderId); if (servedGuest) liveProps.current.onSale(state.coins - beforeService.coins, servedGuest); }
      if (state.coins <= 0) liveProps.current.onBankrupt();
      if (state.preparedOrderId !== beforeService.preparedOrderId) {
        const guest = state.customers.find(c => c.id === state.preparedOrderId);
        if (guest) liveProps.current.onEncounter(guest);
        draftRef.current = { cupSize: "", teaBase: "", sweetness: "", toppings: [], step: 0 };
        setToppings([]); setBrewStep(0); setCupSize(""); setTeaBase(""); setSweetness("");
        setDayNotice("");
      }
      spawnElapsed += dt;
      if (!state.dayComplete && spawnElapsed > Math.max(5,12-day*.15) && state.customers.filter((c) => c.state === "waiting" || c.state === "arriving").length < 3) { const candidate = spawnCustomer(state); const guest = candidate.customers.at(-1); const friends = Object.values(liveProps.current.campaign.friends).filter(f => f.blockedUntil <= day && !state.customers.some(c => c.name === f.name && (c.state === "waiting" || c.state === "arriving"))).flatMap(f => Array.from({length:Math.max(1,Math.ceil(f.affinity/20))},()=>f)); const regular = Math.random() < .35 && friends.length ? friends[Math.floor(Math.random()*friends.length)] : null; if (guest && regular) guest.name = regular.name; if (guest && !state.customers.some(c => c.name === guest.name && (c.state === "waiting" || c.state === "arriving")) && (liveProps.current.campaign.friends[guest.name]?.blockedUntil ?? 0) <= day) state = candidate; spawnElapsed = 0; }
      stateRef.current = state;
      publishElapsed += dt;
      if (publishElapsed > .15) {
        setSnapshot({ ...state, player: { ...state.player }, customers: [...state.customers] });
        try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* local save unavailable */ }
        publishElapsed = 0;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); };
  }, []);


  const canBrew = Boolean(selectedOrder) && !snapshot.orderPrepared;
  const addIngredient = (kind: "tea" | "sugar" | "topping", value: string) => {
    const current = stateRef.current;
    const draft = draftRef.current;
    if (!draft.cupSize || stockOpen || liveProps.current.paused || !current.preparedOrderId || current.orderPrepared || quantity(value) <= 0) return;
    if ((kind === "tea" && draft.step !== 0) || (kind === "sugar" && draft.step !== 1) || (kind === "topping" && (draft.step !== 2 || draft.toppings.includes(value)))) return;
    changeStock(value, -1);
    if (kind === "tea") { draft.teaBase = value; draft.step = 1; setTeaBase(value); setBrewStep(1); }
    if (kind === "sugar") { draft.sweetness = value; draft.step = 2; setSweetness(value); setBrewStep(2); }
    if (kind === "topping") { draft.toppings = [...draft.toppings, value]; setToppings(draft.toppings); }
    setIngredientEffect(effect => ({ kind, value, sequence: effect.sequence + 1 }));
    setDayNotice("");
  };
  const sealCup = () => {
    const current = stateRef.current;
    const draft = draftRef.current;
    if (stockOpen || liveProps.current.paused || current.orderPrepared || draft.step !== 2) return;
    const customer = current.customers.find(c => c.id === current.preparedOrderId);
    if (!customer || !recipeMatches(customer, draft.teaBase, draft.sweetness, draft.toppings, draft.cupSize)) { setDayNotice("Ly chưa đúng đơn. Hãy pha lại."); return; }
    const next = { ...current, orderPrepared: true, brewHolding: false, notice: "Đã đóng nắp · đang giao cho khách ♡" };
    stateRef.current = next; setSnapshot(next); setDayNotice("");
  };
  return <CounterView snapshot={snapshot} day={day} cash={cash} orderCount={orderCount} selectedOrder={selectedOrder} canBrew={canBrew} cupSize={cupSize} teaBase={teaBase} sweetness={sweetness} toppings={toppings} brewStep={brewStep} notice={dayNotice} stock={stock} stockOpen={stockOpen} onStockOpen={setStockOpen} onRestock={item => changeStock(item,20)} onCup={size => { if (!canBrew || liveProps.current.paused || draftRef.current.cupSize || quantity(`Ly ${size}`) < 1) return; draftRef.current.cupSize = size; setCupSize(size); changeStock(`Ly ${size}`, -1); }} onAdd={addIngredient} ingredientEffect={ingredientEffect} onLid={sealCup} onReset={() => { draftRef.current = { cupSize: "", teaBase: "", sweetness: "", toppings: [], step: 0 }; setCupSize(""); setTeaBase(""); setSweetness(""); setToppings([]); setBrewStep(0); setDayNotice(""); }} onStory={onStory} onOrders={onOrders} onManage={onManage} onEndDay={() => onEndDay({served:snapshot.served, missed:snapshot.missed})}/>;
}
