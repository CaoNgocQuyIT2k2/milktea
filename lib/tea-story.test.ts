import { describe, it, expect } from "vitest";
import { decide, makeRequest, newCampaign, settle, visit, type Request } from "./tea-story";
import { closeTeaDay } from "./tea-finance";
import { makeInitialGame, tickGame, counterService, spawnCustomer } from "./tea-game";
const request: Request = { id: "one", name: "Vy", amount: 40_000, kind: "loan", day: 1, risk: 30 };
describe("story economy", () => {
  it("repays a loan once and does not treat principal as sales revenue", () => {
    const c = decide(visit(newCampaign(), "Vy"), request, true, () => .9);
    expect(settle(c,3).cash).toBe(0);
    const result = settle(c,4);
    expect(result.cash).toBe(40_000); expect(result.revenue).toBe(0);
    expect(settle(result.campaign,5).cash).toBe(0);
  });
  it("records defaults without deducting the already advanced money again", () => {
    const c = decide(newCampaign(), request, true, () => .1);
    const result = settle(c,4);
    expect(result.cash).toBe(0); expect(result.campaign.debts[0].status).toBe("lost");
  });
  it("refusing may reduce affinity and stop repeat visits for three days", () => {
    const c = decide(newCampaign(), request, false, () => .1);
    expect(c.debts).toHaveLength(0); expect(c.friends.Vy.affinity).toBe(35); expect(c.friends.Vy.blockedUntil).toBe(4);
  });
  it("does not collect a credit offer for a cup that was never delivered", () => {
    const c = decide(newCampaign(), { ...request, kind: "credit" }, true, () => .9);
    expect(c.debts[0].status).toBe("approved"); expect(settle(c,4).cash).toBe(0);
  });
  it("cannot offer a second loan while the first remains outstanding", () => {
    const c = decide(newCampaign(), request, true, () => .9);
    expect(makeRequest(c,"Vy",2,32000,() => 0)).toBeNull();
  });
  it("charges monthly tax and rent only at the month boundary", () => {
    const report = closeTeaDay(30,1_000_000,100_000,3,0,{ monthRevenue:2_000_000 });
    expect(report.rent).toBe(300_000); expect(report.tax).toBe(100_000); expect(report.closingCash).toBe(537_000);
    expect(closeTeaDay(31,1_000_000,100_000).rent).toBe(0);
  });
  it("charges ingredients on a credit sale even though cash was not collected", () => {
    const r = closeTeaDay(1,150000,0,1,0,{ grossSales:40000 });
    expect(r.ingredientCost).toBe(15200); expect(r.closingCash).toBe(109800);
  });
  it("runs the shift to zero instead of ending when the sales target is met", () => {
    let state = { ...makeInitialGame(), shiftRemaining:600, served:50 };
    expect(tickGame(state,1).dayComplete).toBe(false);
    expect(tickGame(state,600).shiftRemaining).toBe(0); expect(tickGame(state,600).dayComplete).toBe(true);
    state = { ...tickGame(spawnCustomer(state,()=>0),20), orderPrepared:true, preparedOrderId:null };
    const received = counterService({ ...state, orderPrepared:false });
    expect(counterService({ ...received, orderPrepared:true }).dayComplete).toBe(false);
  });
});
