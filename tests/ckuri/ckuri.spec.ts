import { canonicalCKURI, parseCKURI } from "../../packages/ckuri/src";

const ID = "0198c3c3-5c31-7a11-8d1f-6e0d7f482222";

test("canonical CKO URI round-trips", () => {
  const uri = canonicalCKURI("csix", ID);
  const parsed = parseCKURI(uri);
  expect(parsed.authority).toBe("csix");
  expect(parsed.canonicalId).toBe(ID);
});

test("title/alias is not canonical identity", () => {
  const parsed = parseCKURI("cervel://csix/research/local-ai");
  expect(parsed.aliasPath).toBe("research/local-ai");
  expect(parsed.canonicalId).toBeUndefined();
});
