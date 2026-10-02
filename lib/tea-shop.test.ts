import { describe, expect, it } from "vitest";
import { formatVnd, getUnitPrice, PRODUCTS, type TeaOptions } from "./tea-shop";

describe("tea shop pricing", () => {
  const options: TeaOptions = { size: "M", sweetness: "50%", ice: "Ít đá", toppings: [] };

  it("prices size L and selected toppings", () => {
    expect(getUnitPrice(PRODUCTS[0], { ...options, size: "L", toppings: ["Trân châu đen", "Kem cheese"] })).toBe(55_000);
  });

  it("formats Vietnamese đồng", () => {
    expect(formatVnd(32_000)).toContain("32.000");
  });
});
