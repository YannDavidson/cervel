import Fastify from "fastify";
import { db, withTransaction } from "./db";
import { createKnowledgeObject } from "./objects";
import { registerArtifact } from "./artifacts";
import { ingestTextArtifact } from "./ingestion";
import { parseCKURI, canonicalCKURI } from "../../../packages/ckuri/src";
import { assertPrincipalInNode } from "./access";

const app = Fastify({ logger: true, bodyLimit: 25 * 1024 * 1024 });

function requiredHeaderPrincipal(request: { headers: Record<string, unknown> }): string {
  const raw = request.headers["x-cervel-principal-id"];
  if (typeof raw !== "string" || !raw) {
    const error = new Error("X-CERVEL-PRINCIPAL-ID is required");
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }
  return raw;
}

app.get("/health", async () => ({ ok: true, service: "cervel-node-alpha" }));

app.post("/v1/objects", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const body = request.body as {
    node_id: string;
    workspace_id: string;
    type: string;
    title: string;
    summary?: string;
    languages?: string[];
    jurisdictions?: string[];
  };

  const result = await withTransaction(async (client) => {
    await assertPrincipalInNode(client, principalId, body.node_id);
    const node = await client.query(`SELECT slug FROM nodes WHERE id = $1`, [body.node_id]);
    if (node.rowCount !== 1) throw Object.assign(new Error("NODE_NOT_FOUND"), { statusCode: 404 });

    return createKnowledgeObject(client, {
      nodeId: body.node_id,
      workspaceId: body.workspace_id,
      type: body.type,
      title: body.title,
      summary: body.summary ?? null,
      languages: body.languages ?? [],
      jurisdictions: body.jurisdictions ?? [],
      createdBy: principalId,
      nodeAuthority: node.rows[0].slug
    });
  });

  return reply.code(201).send(result);
});

app.get("/v1/objects/:id", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const { id } = request.params as { id: string };

  const result = await withTransaction(async (client) => {
    const row = await client.query(
      `SELECT ko.*, n.slug AS node_authority
       FROM knowledge_objects ko JOIN nodes n ON n.id = ko.node_id
       WHERE ko.id = $1 AND ko.lifecycle_status <> 'deleted'`,
      [id]
    );
    if (row.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
    await assertPrincipalInNode(client, principalId, row.rows[0].node_id);
    return { ...row.rows[0], canonical_uri: canonicalCKURI(row.rows[0].node_authority, id) };
  });

  return reply.send(result);
});

app.post("/v1/objects/:id/artifacts", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const { id: ckoId } = request.params as { id: string };
  const body = request.body as {
    storage_location_id: string;
    filename: string;
    mime_type: string;
    content_base64: string;
    role?: "original" | "snapshot" | "extracted_text" | "thumbnail" | "translation" | "transcript" | "structured" | "derived";
  };
  const bytes = Buffer.from(body.content_base64, "base64");

  const result = await withTransaction(async (client) => {
    const cko = await client.query(`SELECT node_id FROM knowledge_objects WHERE id = $1`, [ckoId]);
    if (cko.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
    const nodeId = cko.rows[0].node_id as string;
    await assertPrincipalInNode(client, principalId, nodeId);

    const artifact = await registerArtifact(client, {
      nodeId,
      ckoId,
      storageLocationId: body.storage_location_id,
      role: body.role,
      mimeType: body.mime_type,
      filename: body.filename,
      bytes,
      actorPrincipalId: principalId
    });

    const ingestion = await ingestTextArtifact(client, {
      nodeId,
      ckoId,
      artifactId: artifact.id,
      mimeType: body.mime_type,
      bytes,
      actorPrincipalId: principalId
    });

    return { artifact, ingestion };
  });

  return reply.code(201).send(result);
});

app.get("/v1/objects/:id/fragments", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const { id } = request.params as { id: string };
  const result = await withTransaction(async (client) => {
    const cko = await client.query(`SELECT node_id FROM knowledge_objects WHERE id = $1`, [id]);
    if (cko.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
    await assertPrincipalInNode(client, principalId, cko.rows[0].node_id);
    return client.query(`SELECT * FROM fragments WHERE cko_id = $1 ORDER BY ordinal`, [id]);
  });
  return reply.send(result.rows);
});

app.get("/v1/objects/:id/provenance", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const { id } = request.params as { id: string };
  const result = await withTransaction(async (client) => {
    const cko = await client.query(`SELECT node_id FROM knowledge_objects WHERE id = $1`, [id]);
    if (cko.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });
    await assertPrincipalInNode(client, principalId, cko.rows[0].node_id);
    return client.query(
      `SELECT pe.*, pio.io_role, pio.resource_type, pio.resource_id, pio.sha256, pio.ordinal
       FROM provenance_events pe
       JOIN provenance_io pio ON pio.provenance_event_id = pe.id
       WHERE EXISTS (
         SELECT 1 FROM provenance_io x
         WHERE x.provenance_event_id = pe.id AND x.resource_type = 'cko' AND x.resource_id = $1
       )
       OR EXISTS (
         SELECT 1 FROM artifacts a
         WHERE a.cko_id = $1 AND pio.resource_type = 'artifact' AND pio.resource_id = a.id
       )
       OR EXISTS (
         SELECT 1 FROM fragments f
         WHERE f.cko_id = $1 AND pio.resource_type = 'fragment' AND pio.resource_id = f.id
       )
       ORDER BY pe.occurred_at, pio.ordinal`,
      [id]
    );
  });
  return reply.send(result.rows);
});

app.get("/v1/resolve", async (request, reply) => {
  const principalId = requiredHeaderPrincipal(request as never);
  const { uri } = request.query as { uri?: string };
  if (!uri) return reply.code(400).send({ error: "URI_REQUIRED" });

  const parsed = parseCKURI(uri);
  const result = await withTransaction(async (client) => {
    const node = await client.query(`SELECT id, slug FROM nodes WHERE lower(slug) = lower($1)`, [parsed.authority]);
    if (node.rowCount !== 1) throw Object.assign(new Error("NODE_NOT_FOUND"), { statusCode: 404 });
    await assertPrincipalInNode(client, principalId, node.rows[0].id);

    let ckoId = parsed.canonicalId;
    if (!ckoId && parsed.aliasPath) {
      const alias = await client.query(
        `SELECT cko_id FROM object_aliases WHERE node_id = $1 AND alias_path = $2 AND is_active = true`,
        [node.rows[0].id, parsed.aliasPath]
      );
      if (alias.rowCount !== 1) throw Object.assign(new Error("ALIAS_NOT_FOUND"), { statusCode: 404 });
      ckoId = alias.rows[0].cko_id;
    }

    const object = await client.query(`SELECT * FROM knowledge_objects WHERE id = $1 AND node_id = $2`, [ckoId, node.rows[0].id]);
    if (object.rowCount !== 1) throw Object.assign(new Error("CKO_NOT_FOUND"), { statusCode: 404 });

    if (parsed.fragment?.kind === "frag") {
      const fragment = await client.query(`SELECT * FROM fragments WHERE id = $1 AND cko_id = $2`, [parsed.fragment.value, ckoId]);
      if (fragment.rowCount !== 1) throw Object.assign(new Error("FRAGMENT_NOT_FOUND"), { statusCode: 404 });
      return {
        canonical_uri: `${canonicalCKURI(node.rows[0].slug, ckoId!)}#frag/${parsed.fragment.value}`,
        resource_type: "fragment",
        representation: fragment.rows[0]
      };
    }

    return {
      canonical_uri: canonicalCKURI(node.rows[0].slug, ckoId!),
      resource_type: "cko",
      representation: object.rows[0]
    };
  });

  return reply.send(result);
});

app.setErrorHandler((error, _request, reply) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const status = (normalized as Error & { statusCode?: number }).statusCode ?? 500;
  reply.code(status).send({ error: normalized.message });
});

const port = Number(process.env.PORT ?? 8787);
app.listen({ host: "0.0.0.0", port }).catch(async (error: unknown) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  app.log.error(normalized);
  await db.end();
  process.exit(1);
});
