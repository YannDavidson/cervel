import { isUuidV7, uuidv7 } from "../../apps/api/src/uuidv7";

test("uuidv7 generates contract-compatible ids", () => {
  const id = uuidv7();
  expect(isUuidV7(id)).toBe(true);
  expect(id[14]).toBe("7");
});

test("uuidv7 preserves timestamp ordering at coarse granularity", () => {
  const earlier = uuidv7(1_700_000_000_000);
  const later = uuidv7(1_700_000_001_000);
  expect(earlier < later).toBe(true);
});
