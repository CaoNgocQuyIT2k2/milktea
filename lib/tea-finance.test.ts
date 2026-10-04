import { describe, expect, it } from "vitest";
import { closeTeaDay } from "./tea-finance";

describe("daily accounting", () => {
  it("deducts costs from cash without crediting already collected revenue again", () => {
    const report = closeTeaDay(1, 250_000, 100_000, 3, 1);
    expect(report.profit).toBe(37_000);
    expect(report.closingCash).toBe(187_000);
    expect(report.openingCash).toBe(150_000);
  });
  it("records a loss on a day without sales", () => {
    const report = closeTeaDay(2, 150_000, 0);
    expect(report.profit).toBe(-25_000);
    expect(report.closingCash).toBe(125_000);
  });
});
