import {
  CAPTURE_PROTOCOL,
  EMBODIMENT_PROTOCOL,
  EmbodimentRegistry,
  createCaptureEnvelope,
  createDeviceId,
  createEmbodimentId,
  createOfflineEnvelope,
  createPairingChallenge,
  isAllowed,
  validateAdvertisement,
  validateCapture,
  validateEmbodiment
} from "../../packages/embodiment/src/public";

describe("CERVEL embodiment foundation",()=>{
  test("validates embodiment identity and defaults to deny",()=>{
    const embodiment=validateEmbodiment({
      protocol:EMBODIMENT_PROTOCOL,
      embodiment_id:createEmbodimentId("browser-a"),
      device_id:createDeviceId("device-a"),
      kind:"browser_extension",
      display_name:"Chrome on Mac",
      capabilities:["capture.page","vault.write"],
      permissions:[{capability:"vault.write",effect:"allow",scope:{vault_id:"vault-personal"}}],
      enrolled_at:"2026-08-28T20:00:00.000Z"
    });
    expect(isAllowed(embodiment,"vault.write","vault-personal")).toBe("allow");
    expect(isAllowed(embodiment,"vault.read","vault-personal")).toBe("deny");
  });

  test("revoked embodiment is denied",()=>{
    const embodiment=validateEmbodiment({
      protocol:EMBODIMENT_PROTOCOL,
      embodiment_id:createEmbodimentId("mobile-a"),device_id:createDeviceId("phone-a"),kind:"mobile",display_name:"Phone",
      capabilities:["vault.write"],permissions:[{capability:"vault.write",effect:"allow",scope:{vault_id:"v1"}}],enrolled_at:"2026-08-28T20:00:00Z",revoked_at:"2026-08-28T21:00:00Z"
    });
    expect(isAllowed(embodiment,"vault.write","v1")).toBe("deny");
  });

  test("capture envelopes are sync ready and safe for untrusted browser content",()=>{
    const embodiment_id=createEmbodimentId("browser-b"), device_id=createDeviceId("browser-device");
    const capture=createCaptureEnvelope({
      embodiment_id,device_id,vault_id:"vault-a",
      artifact:{kind:"page",source_url:"https://example.com/a",title:"Example",text:"Page content",captured_at:"2026-08-28T20:00:00Z"},
      provenance:{acquired_by:"browser_extension"}
    });
    expect(capture.protocol).toBe(CAPTURE_PROTOCOL);
    expect(capture.sync_id.startsWith("sync_")).toBe(true);
    expect(validateCapture(capture).provenance.instruction_policy).toBe("never_execute");
    expect(capture.provenance.trust).toBe("untrusted_external_content");
    const queued=createOfflineEnvelope(capture,1,new Date("2026-08-28T20:01:00Z"));
    expect(queued.queue_id.startsWith("queue_")).toBe(true);
    expect(queued.retry_count).toBe(0);
  });

  test("validates local-node advertisements and creates expiring pairing challenge",()=>{
    const ad=validateAdvertisement({
      protocol:EMBODIMENT_PROTOCOL,node_id:"node-local",node_name:"CERVEL Desktop",endpoint:"http://127.0.0.1:47821",transport:"loopback",vault_ids:["vault-a"],capabilities:["vault.read","vault.write","device.pair"],pairing_required:true,advertised_at:"2026-08-28T20:00:00Z",expires_at:"2026-08-28T20:05:00Z"
    },new Date("2026-08-28T20:01:00Z").getTime());
    expect(ad.node_id).toBe("node-local");
    const challenge=createPairingChallenge(ad.node_id,createEmbodimentId("extension"),120000,new Date("2026-08-28T20:01:00Z"));
    expect(challenge.pairing_id.startsWith("pair_")).toBe(true);
    expect(new Date(challenge.expires_at).getTime()).toBeGreaterThan(new Date(challenge.issued_at).getTime());
  });

  test("registry rejects permission escalation during enrollment",()=>{
    const registry=new EmbodimentRegistry();
    const embodiment_id=createEmbodimentId("desktop-a"),device_id=createDeviceId("desktop-device");
    const request={protocol:EMBODIMENT_PROTOCOL,request_id:"req-enroll-1",embodiment:{protocol:EMBODIMENT_PROTOCOL,embodiment_id,device_id,kind:"desktop" as const,display_name:"Desktop",capabilities:["vault.read","vault.write"] as const,signing_public_key:"sig",encryption_public_key:"enc"},requested_permissions:[{capability:"vault.read" as const,effect:"allow" as const,scope:{vault_id:"vault-a"}}],pairing_nonce:"nonce",issued_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+60000).toISOString()};
    expect(()=>registry.enroll(request,{protocol:EMBODIMENT_PROTOCOL,request_id:"req-enroll-1",embodiment_id,device_id,approved:true,permissions:[{capability:"vault.write",effect:"allow",scope:{vault_id:"vault-a"}}],decided_at:new Date().toISOString(),authorizer_id:"owner"})).toThrow("ENROLLMENT_PERMISSION_ESCALATION");
  });
});
