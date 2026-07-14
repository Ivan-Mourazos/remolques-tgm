import { describe, expect, it } from "vitest";
import { excelRound, roundUpToMm } from "@/lib/calc/redondeo";

describe("excelRound", () => {
  it("redondea como ROUND de Excel", () => {
    expect(excelRound(2.5, 0)).toBe(3);
    expect(excelRound(35.15, 1)).toBe(35.2);
    expect(excelRound(35.14, 1)).toBe(35.1);
    expect(excelRound(246 / 7, 1)).toBe(35.1);
    expect(excelRound(-2.5, 0)).toBe(-3);
  });
});

describe("roundUpToMm", () => {
  it("redondea hacia arriba al milímetro (1 decimal en cm)", () => {
    expect(roundUpToMm(270.01)).toBe(270.1);
    expect(roundUpToMm(270.1)).toBe(270.1);
    expect(roundUpToMm(269.91)).toBe(270);
  });
});
