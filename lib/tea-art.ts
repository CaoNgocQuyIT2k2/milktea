export type Sprite = { src: string; x: number; y: number; w: number; h: number };

export const SHOP_ART = "/pixel/shop.png";
const mainAtlas = "/pixel/tea-atlas.png";
const guestAtlas = "/pixel/guest-atlas.png";
const toppingAtlas = "/pixel/topping-atlas.png";

export const PLAYER_FRAMES: Sprite[] = Array.from({ length: 4 }, (_, i) => ({ src: mainAtlas, x: i * 384, y: 24, w: 384, h: 576 }));
export const GUEST_FRAMES: Sprite[] = Array.from({ length: 8 }, (_, i) => ({ src: guestAtlas, x: (i % 4) * 384, y: Math.floor(i / 4) * 512, w: 384, h: 512 }));
const drinkIds = ["classic", "matcha", "peach", "brown-sugar", "taro", "lemon"];
export const TOPPING_NAMES = ["Trân châu đen", "Trân châu trắng", "Thạch trái cây", "Pudding", "Kem cheese", "Thạch dừa", "Đậu đỏ", "Hạt thủy tinh", "Trân châu hoàng kim", "Thạch cà phê", "Nha đam", "Oreo"];

export function drinkSprite(id: string): Sprite {
  return { src: mainAtlas, x: Math.max(0, drinkIds.indexOf(id)) * 256, y: 608, w: 256, h: 384 };
}

export function toppingSprite(name: string): Sprite {
  const i = Math.max(0, TOPPING_NAMES.indexOf(name));
  return { src: toppingAtlas, x: (i % 4) * 384, y: i < 4 ? 152 : 528, w: 384, h: 368 };
}

/** Stable appearance for saved customers; does not change when their queue moves. */
export function guestVariant(name: string): number {
  return Array.from(name).reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) >>> 0, 0) % GUEST_FRAMES.length;
}

export function scenePoint(x: number, y: number) {
  return { x: 210 + (x - 50) * .6, y: 255 + (y - 220) * .21 };
}

export const TEA_INGREDIENTS = [
  { name: "Trà đen", icon: "classic", color: "#c99668" },
  { name: "Trà ô long", icon: "peach", color: "#e9b778" },
  { name: "Matcha", icon: "matcha", color: "#a7c987" },
  { name: "Trà xanh", icon: "lemon", color: "#c8d38c" },
  { name: "Trà nhài", icon: "lemon", color: "#e5c891" },
  { name: "Khoai môn", icon: "taro", color: "#b59bd6" },
  { name: "Sữa tươi đường đen", icon: "brown-sugar", color: "#d4ad84" },
  { name: "Trà đào cam sả", icon: "peach", color: "#edb270" },
  { name: "Trà chanh mật ong", icon: "lemon", color: "#e3d378" },
  { name: "Dâu sữa", icon: "taro", color: "#e9a8b7" },
  { name: "Cacao", icon: "classic", color: "#a57d68" },
];
