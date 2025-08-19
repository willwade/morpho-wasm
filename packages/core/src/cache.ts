// Minimal browser-side cache with integrity check (sha256) for packs
// - Uses Cache Storage (HTTP cache) by default; falls back to direct fetch
// - Optionally verifies checksum if provided

export async function fetchWithIntegrity(url: string, expectedSha256?: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (expectedSha256) {
    const algo = 'SHA-256';
    const digest = await crypto.subtle.digest(algo, buf);
    const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== expectedSha256.toLowerCase()) {
      throw new Error(`Integrity mismatch: expected ${expectedSha256}, got ${hex}`);
    }
  }
  return buf;
}

