import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { MODEL_SEAL_HEADER } from "../../lib/modelSeal";

/**
 * /api/r2 sends models sealed (AES-256-CTR, fresh key per response — see the
 * route). These loaders fetch, open the bytes in memory and hand them to the
 * stock three.js parsers, so useLoader works exactly as before.
 */
async function fetchModel(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status} ${res.statusText}`);
  const data = await res.arrayBuffer();
  const token = res.headers.get(MODEL_SEAL_HEADER);
  if (!token) return data; // not sealed

  const raw = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw.slice(0, 32), { name: "AES-CTR" }, false, ["decrypt"]);
  // Node's aes-256-ctr increments the whole 128-bit block as the counter
  return crypto.subtle.decrypt({ name: "AES-CTR", counter: raw.slice(32, 48), length: 128 }, key, data);
}

export class SealedSTLLoader extends STLLoader {
  load(
    url: string,
    onLoad: (geometry: THREE.BufferGeometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void
  ) {
    fetchModel(this.manager.resolveURL(url))
      .then((buf) => onLoad(this.parse(buf)))
      .catch((err) => (onError ? onError(err) : console.error(err)));
  }
}

export class SealedGLTFLoader extends GLTFLoader {
  load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void
  ) {
    const resolved = this.manager.resolveURL(url);
    const base = THREE.LoaderUtils.extractUrlBase(resolved);
    fetchModel(resolved)
      .then((buf) => this.parse(buf, base, onLoad, (e) => (onError ? onError(e) : console.error(e))))
      .catch((err) => (onError ? onError(err) : console.error(err)));
  }
}
