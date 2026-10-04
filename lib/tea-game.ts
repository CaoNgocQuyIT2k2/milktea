import { PRODUCTS, type TeaProduct } from "./tea-shop";

export interface Vec { x: number; y: number }
export interface QueueCustomer {
  id: string;
  name: string;
  requestedSize?: "Nhỏ" | "Vừa" | "Lớn";
  requestedToppings?: string[];
  requestedSweetness?: "0%" | "30%" | "50%" | "70%" | "100%";
  color: string;
  productId: string;
  patience: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: "arriving" | "waiting" | "served" | "leaving" | "angry";
  phase: number;
}
export interface ShopGameState {
  player: Vec;
  customers: QueueCustomer[];
  preparedOrderId: string | null;
  orderPrepared: boolean;
  brewProgress: number;
  brewTravel?: number;
  brewCycle?: number;
  brewTarget: number;
  brewHolding: boolean;
  coins: number;
  served: number;
  missed: number;
  dailyTarget: number;
  dayComplete: boolean;
  shiftRemaining?: number;
  gameDay?: number;
  notice: string;
}

const spawnPoints = [{ x: 772, y: 438 }, { x: 820, y: 466 }, { x: 766, y: 490 }];
const queuePoints = [{ x: 640, y: 310 }, { x: 705, y: 310 }, { x: 770, y: 310 }];
const guestNames = ["Linh", "Minh", "An", "Vy", "Khoa", "Hà", "Bảo", "My", "Nam", "Thảo", "Cô Lan", "Chị Mai", "Anh Phúc", "Bé Na", "Ông Khánh"];
const guestColors = ["#e88a65", "#75a9be", "#aa83bd", "#dfb550", "#6d9b70", "#df7994"];

export const makeInitialGame = (coins = 150_000, random = Math.random): ShopGameState => ({
  player: { x: 410, y: 390 }, customers: [], preparedOrderId: null, orderPrepared: false, brewProgress: 0, brewTravel: 0, brewCycle: 0, brewTarget: 68, brewHolding: false, coins, served: 0, missed: 0, dailyTarget: 10 + Math.floor(random() * 11), dayComplete: false,
  notice: "Ca làm bắt đầu! Khách sẽ lần lượt ghé tiệm — pha nhanh trước khi họ mất kiên nhẫn.",
});

export function gameProduct(id: string): TeaProduct {
  return PRODUCTS.find((product) => product.id === id) ?? PRODUCTS[0];
}

export function nearestCustomer(state: ShopGameState): QueueCustomer | null {
  return state.customers.filter((c) => c.state === "waiting" || c.state === "served")
    .sort((a, b) => distance(state.player, a) - distance(state.player, b))[0] ?? null;
}

export function distance(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y); }

/** Walk to the customer, collect once, then return to deliver only a finished cup. */
export function autoService(state: ShopGameState, dt: number): ShopGameState {
  if (state.dayComplete) return state;
  const customer = state.customers.find((c) => c.id === state.preparedOrderId && c.state === "waiting")
    ?? state.customers.find((c) => c.state === "waiting");
  const target = state.preparedOrderId && !state.orderPrepared ? { x: 470, y: 306 }
    : customer ?? { x: 640, y: 310 };
  let next = distance(state.player, target) > 8 ? movePlayer(state, target.x - state.player.x, target.y - state.player.y, dt) : state;
  if (customer && distance(next.player, customer) <= 12) {
    if (!next.preparedOrderId) next = collectOrder(next, customer.id);
    else if (next.orderPrepared && next.preparedOrderId === customer.id) next = serveOrder(next, customer.id);
  }
  return next;
}

/** Customers order and receive cups directly across the first-person counter. */
export function counterService(state: ShopGameState): ShopGameState {
  if (state.dayComplete) return state;
  const customer = state.customers.find(c => c.id === state.preparedOrderId && c.state === "waiting")
    ?? state.customers.find(c => c.state === "waiting");
  if (!customer) return state;
  if (!state.preparedOrderId) return collectOrder(state, customer.id);
  if (state.orderPrepared) return serveOrder(state, customer.id);
  return state;
}

export function teaBaseForProduct(id: string): string {
  const bases: Record<string,string> = { matcha: "Matcha", peach: "Trà đào cam sả", lemon: "Trà chanh mật ong", taro: "Khoai môn", "brown-sugar": "Sữa tươi đường đen", strawberry: "Dâu sữa", cocoa: "Cacao" };
  return bases[id] ?? "Trà đen";
}

export function recipeMatches(customer: QueueCustomer, teaBase: string, sweetness: string, toppings: string[], cupSize?: string): boolean {
  const requested = customer.requestedToppings ?? [];
  return (cupSize === undefined || cupSize === (customer.requestedSize ?? "Vừa")) && teaBase === teaBaseForProduct(customer.productId) && sweetness === (customer.requestedSweetness ?? "50%")
    && toppings.length === requested.length && requested.every((name) => toppings.includes(name));
}

export function spawnCustomer(state: ShopGameState, random = Math.random): ShopGameState {
  if (state.customers.filter((c) => c.state === "waiting" || c.state === "arriving").length >= 3) return state;
  const product = PRODUCTS[Math.floor(random() * PRODUCTS.length)];
  const id = `guest-${Date.now().toString(36)}-${Math.floor(random() * 1_000_000).toString(36)}`;
  const activeCount = state.customers.filter((c) => c.state === "waiting" || c.state === "arriving").length;
  const spawn = spawnPoints[Math.floor(random() * spawnPoints.length)];
  const queue = queuePoints.find(point => !state.customers.some(c =>
    (c.state === "waiting" || c.state === "arriving") && c.targetX === point.x))
    ?? queuePoints[Math.min(activeCount, queuePoints.length - 1)];
  const customer: QueueCustomer = {
    id, name: guestNames[Math.floor(random() * guestNames.length)], color: guestColors[Math.floor(random() * guestColors.length)],
    requestedToppings: product.id === "classic" || product.id === "brown-sugar" ? ["Trân châu đen"] : product.id === "matcha" ? ["Kem cheese"] : product.id === "peach" ? ["Thạch trái cây"] : product.id === "taro" ? ["Trân châu trắng"] : product.id === "cocoa" ? ["Oreo"] : product.id === "strawberry" ? ["Nha đam"] : [],
    requestedSize: (["Nhỏ", "Vừa", "Lớn"] as const)[Math.floor(random() * 3)],
    requestedSweetness: (["30%", "50%", "70%"] as const)[Math.floor(random() * 3)],
    productId: product.id, patience: 100, x: spawn.x, y: spawn.y, targetX: queue.x, targetY: queue.y,
    state: "arriving", phase: random() * Math.PI * 2,
  };
  return { ...state, customers: [...state.customers, customer] };
}

export function tickGame(state: ShopGameState, dt: number): ShopGameState {
  const dtStep = Math.max(0, dt);
  const customers = state.customers.map((customer) => {
    if (customer.state === "arriving") {
      const dx = customer.targetX - customer.x;
      const dy = customer.targetY - customer.y;
      const length = Math.hypot(dx, dy);
      if (length <= 85 * dtStep) return { ...customer, x: customer.targetX, y: customer.targetY, state: "waiting" as const };
      const speed = 85 * dtStep;
      return { ...customer, x: customer.x + dx / length * Math.min(speed, length), y: customer.y + dy / length * Math.min(speed, length), phase: customer.phase + dt * 5 };
    }
    if (customer.state === "leaving" || customer.state === "angry" || customer.state === "served") {
      const targetX = customer.state === "served" ? 825 : 875;
      const targetY = customer.state === "served" ? 435 : 495;
      const dx = targetX - customer.x; const dy = targetY - customer.y; const length = Math.hypot(dx, dy);
      if (length < 8) return { ...customer, state: "leaving" as const, x: targetX, y: targetY };
      const speed = 108 * dtStep;
      return { ...customer, x: customer.x + dx / length * Math.min(speed, length), y: customer.y + dy / length * Math.min(speed, length), phase: customer.phase + dtStep * 5 };
    }
    if (customer.state === "waiting" && customer.id === state.preparedOrderId) return { ...customer, phase: customer.phase + dtStep * 3 };
    if (customer.state === "waiting") {
      const patience = Math.max(0, customer.patience - dtStep * 3.2);
      return { ...customer, patience, state: patience <= 0 ? "angry" as const : "waiting" as const, phase: customer.phase + dtStep * 3 };
    }
    return customer;
  });
  const newlyAngry = customers.filter((customer) => customer.state === "angry" && state.customers.find((old) => old.id === customer.id)?.state !== "angry").length;
  const cleaned = customers.filter((customer) => !((customer.state === "leaving" || customer.state === "angry") && (customer.x >= 870 || customer.y >= 490)));
  const travel = state.brewTravel ?? state.brewProgress;
  const brewTravel = state.brewHolding && state.preparedOrderId && !state.orderPrepared
    ? Math.min(200, travel + dtStep * 55)
    : travel;
  const brewProgress = state.brewHolding
    ? brewTravel <= 100 ? brewTravel : 200 - brewTravel
    : state.brewProgress;
  const brewCycle = brewTravel >= 100 ? 1 : 0;
  const brewHolding = state.brewHolding;
  const orderPrepared = state.orderPrepared;
  const shiftRemaining = state.shiftRemaining === undefined ? undefined : Math.max(0, state.shiftRemaining - dtStep);
  const dayComplete = state.dayComplete || (shiftRemaining === undefined ? state.served >= state.dailyTarget : shiftRemaining <= 0);
  const notice = newlyAngry > 0 ? `${customers.find((customer) => customer.state === "angry")?.name ?? "Khách"} hết kiên nhẫn và đã rời đi.`
    : dayComplete && !state.dayComplete ? `Đã đủ ${state.dailyTarget} đơn hôm nay! Tiệm đóng cửa, ngày làm việc kết thúc.` : state.notice;
  return { ...state, shiftRemaining, customers: cleaned, missed: state.missed + newlyAngry, brewProgress, brewTravel, brewCycle, brewHolding, orderPrepared, dayComplete, notice };
}

export function movePlayer(state: ShopGameState, dx: number, dy: number, dt: number): ShopGameState {
  const length = Math.hypot(dx, dy) || 1;
  const speed = 190 * Math.min(dt, 0.05);
  return { ...state, player: { x: clamp(state.player.x + dx / length * speed, 50, 870), y: clamp(state.player.y + dy / length * speed, 220, 510) } };
}

export function collectOrder(state: ShopGameState, customerId: string): ShopGameState {
  const customer = state.customers.find((c) => c.id === customerId && c.state === "waiting");
  if (!customer) return state;
  const brewTarget = 42 + Math.floor(Math.random() * 49);
  return { ...state, preparedOrderId: customerId, orderPrepared: false, brewTarget, brewProgress: 0, brewTravel: 0, brewCycle: 0, notice: `${customer.name} gọi ${gameProduct(customer.productId).name}. Hãy đến quầy pha chế.` };
}

export function startBrew(state: ShopGameState, nearCounter: boolean): ShopGameState {
  if (!nearCounter || !state.preparedOrderId || state.orderPrepared) return state;
  return { ...state, brewHolding: true, brewTravel: 0, brewProgress: 0, brewCycle: 0, notice: "Đang rót trà... nhả đúng vùng xanh để pha thành công!" };
}

export function releaseBrew(state: ShopGameState): ShopGameState {
  if (!state.brewHolding) return state;
  const success = Math.abs(state.brewProgress - state.brewTarget) <= 7;
  const customer = state.customers.find((c) => c.id === state.preparedOrderId);
  if (success && customer) {
    return { ...state, brewHolding: false, orderPrepared: true, brewProgress: state.brewTarget, brewTravel: state.brewTarget, notice: `Pha chuẩn! Mang ${gameProduct(customer.productId).name} đến ${customer.name}.` };
  }
  const missed = state.brewProgress > state.brewTarget + 7;
  return { ...state, brewHolding: false, brewProgress: missed ? 0 : state.brewProgress, notice: missed ? "Lố tay rồi! Pha lại, chú ý vùng xanh nhé." : "Chưa đủ lượng trà! Tiếp tục giữ rồi thả trong vùng xanh." };
}

export function prepareOrder(state: ShopGameState, nearCounter: boolean): ShopGameState {
  if (!nearCounter || !state.preparedOrderId || state.orderPrepared) return state;
  return releaseBrew({ ...state, brewHolding: true });
}

export function serveOrder(state: ShopGameState, customerId: string): ShopGameState {
  const customer = state.customers.find((c) => c.id === customerId && c.state === "waiting");
  if (!customer || state.preparedOrderId !== customerId || !state.orderPrepared) return state;
  const reward = gameProduct(customer.productId).price;
  const served = state.served + 1;
  const dayComplete = state.shiftRemaining === undefined ? served >= state.dailyTarget : state.shiftRemaining <= 0;
  return {
    ...state, coins: state.coins + reward, served, dayComplete, preparedOrderId: null, orderPrepared: false, brewProgress: 0, brewHolding: false,
    customers: state.customers.map((c) => c.id === customerId ? { ...c, state: "served" as const } : c),
    notice: dayComplete ? `Đủ ${state.dailyTarget} đơn! Ngày làm việc kết thúc.` : `Phục vụ đúng món cho ${customer.name}! +${reward.toLocaleString("vi-VN")}đ`,
  };
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
