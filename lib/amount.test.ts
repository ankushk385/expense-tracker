import { parseAmount, sanitizeAmountInput } from "./amount";

describe("amount helpers", () => {
  describe("sanitizeAmountInput", () => {
    it("strips non-numeric characters", () => {
      expect(sanitizeAmountInput("$1,000")).toBe("1000");
    });

    it("allows only one decimal point", () => {
      expect(sanitizeAmountInput("1.2.3")).toBe("1.23");
    });

    it("limits to two decimal places", () => {
      expect(sanitizeAmountInput("10.999")).toBe("10.99");
    });

    it("removes leading zeros", () => {
      expect(sanitizeAmountInput("007")).toBe("7");
    });

    it("keeps a single leading zero before decimal", () => {
      expect(sanitizeAmountInput("0.50")).toBe("0.5");
    });
  });

  describe("parseAmount", () => {
    it("parses valid positive amounts", () => {
      expect(parseAmount("500")).toBe(500);
      expect(parseAmount("49.99")).toBe(49.99);
    });

    it("returns null for empty or invalid values", () => {
      expect(parseAmount("")).toBeNull();
      expect(parseAmount("abc")).toBeNull();
      expect(parseAmount("0")).toBeNull();
      expect(parseAmount("-10")).toBeNull();
    });

    it("returns null for multiple decimals", () => {
      expect(parseAmount("1.2.3")).toBeNull();
    });
  });
});
