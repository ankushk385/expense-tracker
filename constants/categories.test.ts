import { isFutureDateKey, shiftDateKey, todayKey, toDateKey } from "./categories";

describe("date helpers", () => {
  it("todayKey returns YYYY-MM-DD for today", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(key).toBe(toDateKey(new Date()));
  });

  it("shiftDateKey moves days without timezone drift", () => {
    const key = "2026-10-23";
    expect(shiftDateKey(key, -1)).toBe("2026-10-22");
    expect(shiftDateKey(key, 1)).toBe("2026-10-24");
    expect(shiftDateKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("isFutureDateKey correctly identifies future dates", () => {
    const tomorrow = shiftDateKey(todayKey(), 1);
    const yesterday = shiftDateKey(todayKey(), -1);
    expect(isFutureDateKey(tomorrow)).toBe(true);
    expect(isFutureDateKey(yesterday)).toBe(false);
    expect(isFutureDateKey(todayKey())).toBe(false);
  });
});
