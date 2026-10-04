import { describe, expect, it } from "vitest";
import { autoService, counterService, collectOrder, makeInitialGame, movePlayer, prepareOrder, recipeMatches, serveOrder, spawnCustomer, tickGame } from "./tea-game";

describe("tea shop game loop", () => {
  it("requires the taro ingredient for a taro milk tea order", () => {
    const customer = { ...tickGame(spawnCustomer(makeInitialGame(), () => 0), 20).customers[0], productId: "taro", requestedToppings: ["Trân châu trắng"] };
    expect(recipeMatches(customer, "Khoai môn", customer.requestedSweetness!, ["Trân châu trắng"])).toBe(true);
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, ["Trân châu trắng"])).toBe(false);
  });
  it("receives at the counter and credits a sealed cup exactly once", () => {
    const waiting = tickGame(spawnCustomer(makeInitialGame(), () => 0), 20);
    const received = counterService(waiting);
    expect(received.preparedOrderId).toBe(waiting.customers[0].id);
    expect(counterService(received).served).toBe(0);
    const served = counterService({ ...received, orderPrepared: true });
    expect(served.served).toBe(1);
    expect(counterService(served).coins).toBe(served.coins);
  });

  it("rejects the wrong cup size and accepts the requested size", () => {
    const customer = tickGame(spawnCustomer(makeInitialGame(), () => 0), 20).customers[0];
    expect(customer.requestedSize).toBe("Nhỏ");
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, ["Trân châu đen"], "Lớn")).toBe(false);
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, ["Trân châu đen"], "Nhỏ")).toBe(true);
  });
  it("collects only on arrival and delivers a finished cup exactly once", () => {
    const waiting = tickGame(spawnCustomer(makeInitialGame(), () => .2), 20);
    const customer = waiting.customers[0];
    expect(autoService(waiting, 0).preparedOrderId).toBeNull();
    const received = autoService({ ...waiting, player: { x: customer.x, y: customer.y } }, 0);
    expect(received.preparedOrderId).toBe(customer.id);
    expect(autoService(received, 0).served).toBe(0);
    const prepared = { ...received, orderPrepared: true, player: { x: 470, y: 306 } };
    expect(autoService(prepared, .05).player.x).toBeGreaterThan(470);
    expect(autoService(prepared, 0).served).toBe(0);
    const served = autoService({ ...prepared, player: { x: customer.x, y: customer.y } }, 0);
    expect(served.served).toBe(1);
    expect(autoService(served, 0).coins).toBe(served.coins);
  });

  it("validates the actual selected recipe including missing and extra toppings", () => {
    const customer = tickGame(spawnCustomer(makeInitialGame(), () => 0), 20).customers[0];
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, ["Trân châu đen"])).toBe(true);
    expect(recipeMatches(customer, "Matcha", customer.requestedSweetness!, ["Trân châu đen"])).toBe(false);
    expect(recipeMatches(customer, "Trà đen", "100%", ["Trân châu đen"])).toBe(false);
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, [])).toBe(false);
    expect(recipeMatches(customer, "Trà đen", customer.requestedSweetness!, ["Trân châu đen", "Kem cheese"])).toBe(false);
  });

  it("spawns customers and advances them into the queue", () => {
    const spawned = spawnCustomer(makeInitialGame(), () => 0.2);
    expect(spawned.customers).toHaveLength(1);
    expect(spawned.customers[0].state).toBe("arriving");
    const arrived = tickGame(spawned, 20);
    expect(arrived.customers[0].state).toBe("waiting");
  });

  it("requires the correct serve sequence and rewards the player", () => {
    const initial = makeInitialGame();
    const spawned = spawnCustomer(initial, () => 0.2);
    const arrived = tickGame(spawned, 20);
    const customer = arrived.customers[0];
    const byCustomer = { ...arrived, player: { x: customer.x, y: customer.y } };
    const received = collectOrder(byCustomer, customer.id);
    expect(received.preparedOrderId).toBe(customer.id);
    expect(serveOrder(received, customer.id)).toBe(received);
    const atCounter = { ...received, player: { x: 470, y: 306 } };
    const prepared = prepareOrder({ ...atCounter, brewProgress: atCounter.brewTarget }, true);
    expect(prepared.orderPrepared).toBe(true);
    const nearGuest = { ...prepared, player: { x: customer.x, y: customer.y } };
    const served = serveOrder(nearGuest, customer.id);
    expect(served.served).toBe(1);
    expect(served.coins).toBeGreaterThan(initial.coins);
    expect(served.preparedOrderId).toBeNull();
  });

  it("sets a daily order target between 10 and 20", () => {
    expect(makeInitialGame(150_000, () => 0).dailyTarget).toBe(10);
    expect(makeInitialGame(150_000, () => 0.999).dailyTarget).toBe(20);
  });

  it("ends the day when the daily quota has been reached", () => {
    const game = { ...makeInitialGame(150_000, () => 0), served: 10 };
    const next = tickGame(game, 0.1);
    expect(next.dayComplete).toBe(true);
    expect(next.notice).toContain("ngày làm việc kết thúc");
  });

  it("marks customers as leaving when patience runs out", () => {
    const state = { ...makeInitialGame(), customers: [{ id: "waiter", name: "Vy", color: "#fff", productId: "classic", patience: 0.1, x: 640, y: 310, targetX: 640, targetY: 310, state: "waiting" as const, phase: 0 }] };
    const next = tickGame(state, 0.1);
    expect(next.customers[0].state).toBe("angry");
    expect(next.missed).toBe(1);
  });

  it("moves player within shop bounds", () => {
    const moved = movePlayer(makeInitialGame(), 1, 0, 1);
    expect(moved.player.x).toBeGreaterThan(410);
    expect(moved.player.y).toBe(390);
  });
});
