import { Readable } from "node:stream";

export class SourceTooLargeError extends Error {
  statusCode = 413;
  constructor(public readonly limitBytes: number) {
    super("SOURCE_TOO_LARGE");
  }
}

export async function boundedResponseBuffer(response: Response, limitBytes: number): Promise<Buffer> {
  if (!response.ok) throw Object.assign(new Error("SOURCE_DOWNLOAD_FAILED"), { statusCode: response.status });

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > limitBytes) throw new SourceTooLargeError(limitBytes);
  if (!response.body) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let total = 0;
  const stream = Readable.fromWeb(response.body as any);
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > limitBytes) {
        stream.destroy();
        throw new SourceTooLargeError(limitBytes);
      }
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, total);
  } finally {
    if (!stream.destroyed) stream.destroy();
  }
}

export async function boundedFetchBuffer(url: string, init: RequestInit, limitBytes: number) {
  const response = await fetch(url, init);
  const bytes = await boundedResponseBuffer(response, limitBytes);
  return { response, bytes };
}
