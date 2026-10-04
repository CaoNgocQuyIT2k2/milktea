export type TeaSize = "M" | "L";
export type Sweetness = "0%" | "30%" | "50%" | "70%" | "100%";
export type Ice = "Không đá" | "Ít đá" | "Bình thường";

export interface TeaProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Trà sữa" | "Trà trái cây" | "Đặc biệt";
  emoji: string;
  popular?: boolean;
  active?: boolean;
  stock?: number;
}

export interface TeaOptions {
  size: TeaSize;
  sweetness: Sweetness;
  ice: Ice;
  toppings: string[];
}

export interface CartItem {
  key: string;
  product: TeaProduct;
  options: TeaOptions;
  quantity: number;
  unitPrice: number;
}

export const PRODUCTS: TeaProduct[] = [
  { id: "classic", name: "Trà sữa trân châu", description: "Hồng trà thơm, sữa béo và trân châu đen dẻo mềm.", price: 32000, category: "Trà sữa", emoji: "🧋", popular: true, active: true, stock: 24 },
  { id: "matcha", name: "Matcha kem sữa", description: "Matcha Nhật đậm vị phủ lớp kem sữa mịn.", price: 42000, category: "Đặc biệt", emoji: "🍵", popular: true, active: true, stock: 18 },
  { id: "peach", name: "Trà đào cam sả", description: "Trà ô long thanh mát, đào vàng, cam và sả.", price: 38000, category: "Trà trái cây", emoji: "🍑", active: true, stock: 20 },
  { id: "brown-sugar", name: "Sữa tươi đường đen", description: "Sữa tươi lạnh, đường đen nấu thủ công và trân châu.", price: 45000, category: "Đặc biệt", emoji: "🥛", popular: true, active: true, stock: 16 },
  { id: "taro", name: "Trà sữa khoai môn", description: "Khoai môn thơm bùi hòa cùng nền trà sữa dịu nhẹ.", price: 36000, category: "Trà sữa", emoji: "🟣", active: true, stock: 14 },
  { id: "lemon", name: "Trà chanh mật ong", description: "Trà xanh, chanh tươi và mật ong nguyên chất.", price: 29000, category: "Trà trái cây", emoji: "🍋", active: true, stock: 22 },
  { id: "strawberry", name: "Trà sữa dâu", description: "Dâu thơm ngọt hòa cùng sữa mịn.", price: 38000, category: "Trà sữa", emoji: "🍓", active: true, stock: 20 },
  { id: "cocoa", name: "Trà sữa cacao", description: "Cacao thơm đậm và sữa béo dịu.", price: 39000, category: "Trà sữa", emoji: "🍫", active: true, stock: 20 },
];

export const TOPPINGS = [
  { name: "Trân châu đen", price: 7000 },
  { name: "Thạch trái cây", price: 7000 },
  { name: "Trân châu trắng", price: 8000 },
  { name: "Kem cheese", price: 10000 },
];

export const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export function getUnitPrice(product: TeaProduct, options: TeaOptions) {
  return product.price + (options.size === "L" ? 6000 : 0) +
    options.toppings.reduce((sum, topping) => sum + (TOPPINGS.find((t) => t.name === topping)?.price ?? 0), 0);
}
