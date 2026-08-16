import { renderWorkspaceAlpha } from "../apps/web/src/workspace-ui";
import { readFileSync } from "node:fs";

const migration = readFileSync("db/migrations/011_identity_capture_library.sql", "utf8");

describe("CERVEL Identity Capture & Library Experience", () => {
  it("renders OIDC passkey capture library and editor surfaces", () => {
    const html = renderWorkspaceAlpha();
    for (const phrase of ["organization SSO", "passkey", "Capture knowledge", "Libraries", "Upload & process", "Create native knowledge", "Save changes"]) {
      expect(html).toContain(phrase);
    }
  });

  it("uses same-origin HttpOnly session flow rather than browser token persistence", () => {
    const html = renderWorkspaceAlpha();
    expect(html).toContain("credentials:'same-origin'");
    expect(html).not.toContain("localStorage.setItem('cervel_session'");
    expect(html).not.toContain("x-cervel-principal-id");
  });

  it("persists identity, passkeys, capture lifecycle, and object notes", () => {
    for (const table of ["identity_accounts", "auth_challenges", "passkey_credentials", "capture_jobs", "object_notes"]) {
      expect(migration).toContain(`CREATE TABLE ${table}`);
    }
    expect(migration).toContain("queued','processing','ready','failed");
  });
});
