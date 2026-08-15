import { rankCandidate } from "../../apps/api/src/retrieval";

test("hybrid ranking weights semantic above lexical", () => {
  expect(rankCandidate(0, 1)).toBeCloseTo(0.6);
  expect(rankCandidate(1, 0)).toBeCloseTo(0.4);
});

test("hybrid ranking clamps to unit interval", () => {
  expect(rankCandidate(5, 5)).toBe(1);
  expect(rankCandidate(-1, -1)).toBe(0);
});
