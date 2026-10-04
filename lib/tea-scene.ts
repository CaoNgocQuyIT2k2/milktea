import { drinkSprite, GUEST_FRAMES, guestVariant, PLAYER_FRAMES, scenePoint, SHOP_ART, type Sprite } from "./tea-art";
import { distance, gameProduct, nearestCustomer, type ShopGameState } from "./tea-game";

type Motion = { moving: boolean; left: boolean; brewing: boolean; reduced: boolean };
export type SceneAssets = Map<string, HTMLImageElement>;

export function loadSceneAssets(): { assets: SceneAssets; ready: Promise<void> } {
  const assets: SceneAssets = new Map();
  const ready = Promise.all([SHOP_ART, PLAYER_FRAMES[0].src, GUEST_FRAMES[0].src].map((src) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { assets.set(src, image); resolve(); };
    image.onerror = () => reject(new Error(`Không tải được hình ${src}`));
    image.src = src;
  }))).then(() => undefined);
  return { assets, ready };
}

function sprite(ctx: CanvasRenderingContext2D, assets: SceneAssets, frame: Sprite, x: number, y: number, height: number) {
  const image = assets.get(frame.src);
  if (!image) return;
  const width = height * frame.w / frame.h;
  ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, Math.round(x - width / 2), Math.round(y - height), width, height);
}

function character(ctx: CanvasRenderingContext2D, assets: SceneAssets, frame: Sprite, x: number, y: number, name: string, phase: number, moving: boolean, reduced: boolean) {
  const step = reduced ? 0 : Math.round(Math.sin(phase) * (moving ? 2 : .6));
  ctx.fillStyle = "rgba(35,28,21,.28)";
  ctx.beginPath(); ctx.ellipse(x, y, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Animate the body in discrete pixel steps rather than smooth subpixel movement.
  ctx.save();
  ctx.translate(x, y + step);
  if (moving && !reduced) ctx.rotate(Math.sin(phase) * .035);
  const image = assets.get(frame.src);
  if (image && moving && !reduced) {
    const height = 62;
    const width = height * frame.w / frame.h;
    const body = Math.floor(frame.h * .72);
    const bodyHeight = height * body / frame.h;
    const legHeight = height - bodyHeight;
    const stride = Math.round(Math.sin(phase) * 2);
    ctx.drawImage(image, frame.x, frame.y, frame.w, body, -width / 2, -height, width, bodyHeight);
    ctx.drawImage(image, frame.x, frame.y + body, frame.w / 2, frame.h - body, -width / 2, -legHeight + stride, width / 2, legHeight);
    ctx.drawImage(image, frame.x + frame.w / 2, frame.y + body, frame.w / 2, frame.h - body, 0, -legHeight - stride, width / 2, legHeight);
  } else sprite(ctx, assets, frame, 0, 0, 62);
  ctx.restore();
  ctx.textAlign = "center"; ctx.font = "600 10px system-ui";
  ctx.fillStyle = "rgba(39,27,24,.85)"; ctx.fillRect(x - 24, y + 5, 48, 15);
  ctx.fillStyle = "#fff4dc"; ctx.fillText(name, x, y + 16);
}

export function drawPixelScene(ctx: CanvasRenderingContext2D, assets: SceneAssets, state: ShopGameState, clock: number, motion: Motion) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 920, 560);
  ctx.fillStyle = "#4f3a2d"; ctx.fillRect(0, 0, 920, 560);
  const background = assets.get(SHOP_ART);
  if (background) ctx.drawImage(background, 0, 0, 920, 560);
  else { ctx.fillStyle = "#fff2d6"; ctx.textAlign = "center"; ctx.font = "16px system-ui"; ctx.fillText("Đang mở cửa tiệm pixel…", 460, 160); }

  // Background staff and seated patrons use the same transparent roster atlas.
  character(ctx, assets, GUEST_FRAMES[0], 333, 182, "Pha chế", clock * 4, false, motion.reduced);
  character(ctx, assets, GUEST_FRAMES[1], 492, 182, "Thu ngân", clock * 3, false, motion.reduced);
  character(ctx, assets, GUEST_FRAMES[4], 173, 286, "Cô Lan", clock * 2, false, motion.reduced);
  character(ctx, assets, GUEST_FRAMES[5], 804, 286, "Khách", clock * 2, false, motion.reduced);

  const playerPoint = scenePoint(state.player.x, state.player.y);
  const actors = state.customers.map((customer) => ({ customer, point: scenePoint(customer.x, customer.y) }));
  const drawPlayer = () => {
    const frame = motion.brewing ? 3 : motion.moving ? motion.left ? 1 : 2 : 0;
    character(ctx, assets, PLAYER_FRAMES[frame], playerPoint.x, playerPoint.y, "Bạn", clock * (motion.brewing ? 12 : 9), motion.moving || motion.brewing, motion.reduced);
    if (state.orderPrepared) {
      const product = state.customers.find((customer) => customer.id === state.preparedOrderId)?.productId ?? "classic";
      sprite(ctx, assets, drinkSprite(product), playerPoint.x + 19, playerPoint.y - 19, 24);
    }
    if (motion.brewing) {
      ctx.fillStyle = "#fff1c6";
      for (let i = 0; i < 3; i++) { const rise = motion.reduced ? i * 5 : (clock * 22 + i * 8) % 22; ctx.fillRect(playerPoint.x + 13 + i * 3, playerPoint.y - 38 - rise, 2, 3); }
    }
  };
  let playerDrawn = false;
  for (const { customer, point } of actors.sort((a, b) => a.point.y - b.point.y)) {
    if (!playerDrawn && playerPoint.y < point.y) { drawPlayer(); playerDrawn = true; }
    character(ctx, assets, GUEST_FRAMES[guestVariant(customer.name)], point.x, point.y, customer.name, customer.phase, customer.state !== "waiting", motion.reduced);
    if (customer.state === "served") sprite(ctx, assets, drinkSprite(customer.productId), point.x + 20, point.y - 20, 22);
  }
  if (!playerDrawn) drawPlayer();

  const near = nearestCustomer(state);
  for (const { customer, point } of actors) {
    if (customer.state !== "waiting") continue;
    const selected = customer.id === state.preparedOrderId;
    ctx.fillStyle = selected ? "#fff0be" : "#fffaf0";
    ctx.fillRect(point.x - 17, point.y - 95, 34, 30);
    sprite(ctx, assets, drinkSprite(customer.productId), point.x, point.y - 68, 24);
    ctx.fillStyle = "#513d31"; ctx.fillRect(point.x - 20, point.y + 23, 40, 4);
    ctx.fillStyle = customer.patience < 30 ? "#e56c5b" : "#70bd83"; ctx.fillRect(point.x - 20, point.y + 23, 40 * customer.patience / 100, 4);
    if (near?.id === customer.id && distance(state.player, customer) < 94) {
      ctx.strokeStyle = "#ffe5a0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(point.x, point.y, 18, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(42,30,24,.85)"; ctx.fillRect(18, 16, 186, 30);
  ctx.fillStyle = "#fff0d2"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left"; ctx.fillText("MÂY TRÀ SỮA · PIXEL", 30, 36);
  const activeOrder = state.customers.find((customer) => customer.id === state.preparedOrderId) ?? near;
  if (activeOrder) {
    ctx.fillStyle = "rgba(42,30,24,.85)"; ctx.fillRect(220, 16, 360, 30);
    ctx.fillStyle = "#fff0d2"; ctx.fillText(`${activeOrder.name} · ${gameProduct(activeOrder.productId).name}`, 232, 36, 336);
  }
}
