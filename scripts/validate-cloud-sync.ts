import { randomBytes } from "node:crypto";
import { CloudSyncEngine } from "../packages/cloud-sync/src/engine";
import { createEnrollmentBundle, generateDeviceIdentity, openEnrollmentBundle } from "../packages/cloud-sync/src/crypto";
import { HttpSyncRelay } from "../packages/cloud-sync/src/http";

async function main() {
  const relay = new HttpSyncRelay(process.env.CERVEL_SYNC_RELAY_URL ?? "http://127.0.0.1:8788");
  const setup = CloudSyncEngine.newVault(relay);
  const first = new CloudSyncEngine(setup.vaultId, setup.rootKey, setup.device, relay);
  await first.register();

  const secondIdentity = generateDeviceIdentity("Convergence peer");
  const bundle = createEnrollmentBundle(setup.rootKey, setup.vaultId, secondIdentity.registration);
  const secondKey = openEnrollmentBundle(bundle, secondIdentity.encryption_private_key);
  await first.enrollDevice(secondIdentity.registration);
  const second = new CloudSyncEngine(setup.vaultId, secondKey, secondIdentity, relay);

  first.put("cko:integration", "cko", { title: "first offline edit", secret: "never visible to relay" });
  second.put("cko:integration", "cko", { title: "second offline edit", secret: "also encrypted" });
  const artifact = Buffer.concat([randomBytes(900_000), Buffer.from("cervel-resumable-tail")]);
  first.attachArtifact("artifact:integration", artifact);

  await first.sync();
  await second.sync();
  await first.sync();
  if (JSON.stringify(first.state()) !== JSON.stringify(second.state())) throw new Error("SYNC_CONVERGENCE_FAILED");
  if (!(await second.restoreArtifact("artifact:integration")).equals(artifact)) throw new Error("SYNC_ARTIFACT_RESTORE_FAILED");

  const restarted = new CloudSyncEngine(setup.vaultId, setup.rootKey, setup.device, relay, first.persistence());
  if (JSON.stringify(restarted.state()) !== JSON.stringify(first.state())) throw new Error("SYNC_RESTART_PERSISTENCE_FAILED");

  await first.revokeDevice(secondIdentity.registration.device_id);
  await second.sync().then(() => { throw new Error("SYNC_REVOKED_DEVICE_ACCEPTED"); }, error => {
    if (!String(error).includes("SYNC_DEVICE_REVOKED")) throw error;
  });
  await first.deleteRemote();
  console.log(JSON.stringify({ ok: true, convergence: true, artifact_restore: true, restart: true, revocation: true, deletion: true }));
}

main().catch(error => { console.error(error); process.exit(1); });
