import { createCipheriv, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getR2Client, R2_BUCKET } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { MODEL_SEAL_HEADER } from "@/lib/modelSeal";

export const runtime = "nodejs";

/**
 * Models are sent sealed: AES-256-CTR with a fresh key per response, which the
 * Studio's loaders (components/studio/sealedLoaders.ts) use to open them in
 * memory. Saving the response from the Network tab gives unusable bytes, so
 * the only way to a printable file is the gated 3MF / STL export.
 */
function seal(body: ReadableStream<Uint8Array>) {
  const key = randomBytes(32);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-ctr", key, iv);
  const sealed = body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctrl) {
        ctrl.enqueue(new Uint8Array(cipher.update(chunk)));
      },
      flush(ctrl) {
        const rest = cipher.final();
        if (rest.length) ctrl.enqueue(new Uint8Array(rest));
      },
    })
  );
  return { sealed, token: Buffer.concat([key, iv]).toString("base64") };
}

// Only the model buckets are served here — never let the URL pick an
// arbitrary bucket the R2 token happens to have access to.
const ALLOWED_BUCKETS = new Set<string>([R2_BUCKET.cityModels, R2_BUCKET.buildings]);
const MODEL_EXTENSIONS = /\.(glb|stl)$/i;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ bucket: string; key: string[] }> }
) {
  const { bucket, key } = await context.params;
  const objectKey = Array.isArray(key) ? key.join("/") : (key as string);

  if (!bucket || !objectKey || !ALLOWED_BUCKETS.has(bucket) || !MODEL_EXTENSIONS.test(objectKey)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // All model requests require an authenticated session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Any signed-in user may stream a model to view it in the Studio. Downloading
  // (3MF / STL export) is gated by Frame Building access in the configurator
  // and recordDownload, not here.

  try {
    const client = getR2Client();
    const cmd = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    const res = await client.send(cmd);

    if (!res.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers = new Headers();
    // Opaque bytes, not a model type, so nothing treats the response as a file to open.
    headers.set("Content-Type", "application/octet-stream");
    // CTR keeps the length the same
    if (res.ContentLength) {
      headers.set("Content-Length", res.ContentLength.toString());
    }
    // Every response has its own key, so it must never be reused as-is.
    headers.set("Cache-Control", "private, no-store");
    headers.set("Vary", "Cookie");

    // Convert AWS SDK v3 stream to Web ReadableStream
    const body = res.Body as any;
    const stream: ReadableStream<Uint8Array> = typeof body.transformToWebStream === "function"
      ? body.transformToWebStream()
      : (body as ReadableStream<Uint8Array>);

    const { sealed, token } = seal(stream);
    headers.set(MODEL_SEAL_HEADER, token);
    return new NextResponse(sealed, { headers });
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : "";
    console.error(`[API /api/r2] Failed to fetch "${bucket}/${objectKey}":`, err);
    if (name === "NoSuchKey" || name === "NotFound") {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse("Failed to load model", { status: 502 });
  }
}
