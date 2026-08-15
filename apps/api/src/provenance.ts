import type { PoolClient } from "pg";
import { uuidv7 } from "./uuidv7";

export type ProvenanceResource = {
  resourceType: "cko" | "artifact" | "fragment" | "claim" | "relationship" | "context_package" | "response";
  resourceId: string;
  sha256?: string | null;
};

export async function appendProvenanceEvent(
  client: PoolClient,
  input: {
    nodeId: string;
    eventType: string;
    actorType: "human" | "service" | "agent" | "model" | "node";
    actorPrincipalId?: string | null;
    inputs?: ProvenanceResource[];
    outputs: ProvenanceResource[];
    source?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
  }
): Promise<string> {
  const eventId = uuidv7();

  await client.query(
    `INSERT INTO provenance_events
      (id, node_id, event_type, actor_type, actor_principal_id, source, parameters)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
    [
      eventId,
      input.nodeId,
      input.eventType,
      input.actorType,
      input.actorPrincipalId ?? null,
      JSON.stringify(input.source ?? {}),
      JSON.stringify(input.parameters ?? {})
    ]
  );

  const io = [
    ...(input.inputs ?? []).map((resource, ordinal) => ({ role: "input", resource, ordinal })),
    ...input.outputs.map((resource, ordinal) => ({ role: "output", resource, ordinal }))
  ];

  for (const item of io) {
    await client.query(
      `INSERT INTO provenance_io
        (provenance_event_id, io_role, resource_type, resource_id, sha256, ordinal)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [eventId, item.role, item.resource.resourceType, item.resource.resourceId, item.resource.sha256 ?? null, item.ordinal]
    );
  }

  return eventId;
}
