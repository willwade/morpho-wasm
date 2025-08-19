// Minimal client wrapper around our Web Worker stub.
// In Node (tests) there is no Worker; we gracefully no-op.

export type WorkerRequest =
  | { type: 'init'; wasmUrl: string; packUrl?: string }
  | { type: 'load_pack'; packUrl: string }
  | { type: 'apply_up'; input: string }
  | { type: 'apply_down'; input: string };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'up'; outputs: string[] }
  | { type: 'down'; outputs: string[] }
  | { type: 'error'; message: string };

export class HFSTWorkerClient {
  private worker: any | null = null;
  private pendingResolve: ((msg: WorkerResponse) => void) | null = null;
  private initialized = false;
  // Simple in-memory queue to serialize requests to the Worker
  private queue: Array<{ msg: WorkerRequest; resolve: (msg: WorkerResponse) => void } > = [];
  private sending = false;

  async init(wasmUrl: string, packUrl?: string): Promise<void> {
    if (this.initialized) return;
    const W: any = (globalThis as any).Worker;
    if (!W) { this.initialized = true; return; }

    const rawUrl = new URL('../dist-worker/worker.js', import.meta.url);
    let workerScriptUrl: string | URL = rawUrl;
    try {
      const loc: any = (globalThis as any).location;
      if (loc && rawUrl.origin !== loc.origin) {
        // Cross-origin workers are blocked; create a same-origin module worker shim that imports the CDN worker
        const blob = new Blob([`import '${rawUrl.href}';`], { type: 'application/javascript' });
        workerScriptUrl = URL.createObjectURL(blob);
      }
    } catch {}
    this.worker = new W(workerScriptUrl, { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      if (this.pendingResolve) {
        const resolve = this.pendingResolve; this.pendingResolve = null; resolve(ev.data);
        // Mark not sending and process next queued item, if any
        this.sending = false;
        this.processQueue();
      }
    };

    // Send init and wait for ready (or ignore if errors)
    try {
      const resp = await this.request({ type: 'init', wasmUrl, packUrl });
      if (resp.type === 'ready') this.initialized = true;
    } catch {
      // Keep initialized to true to avoid loops, but remain in stub mode
      this.initialized = true;
    }
  }

  private processQueue() {
    const W: any = (globalThis as any).Worker;
    if (!this.worker || !W) return;
    if (this.sending) return;
    const next = this.queue.shift();
    if (!next) return;
    this.sending = true;
    this.pendingResolve = next.resolve;
    this.worker.postMessage(next.msg);
  }

  private request(msg: WorkerRequest): Promise<WorkerResponse> {
    const W: any = (globalThis as any).Worker;
    if (!this.worker || !W) return Promise.resolve({ type: 'error', message: 'no-worker' });
    return new Promise<WorkerResponse>((resolve) => {
      this.queue.push({ msg, resolve });
      this.processQueue();
    });
  }

  async loadPack(packUrl: string): Promise<void> {
    const W: any = (globalThis as any).Worker;
    if (!W || !this.worker) return;
    await this.request({ type: 'load_pack', packUrl });
  }

  async applyUp(input: string): Promise<string[]> {
    const W: any = (globalThis as any).Worker;
    if (!W || !this.worker) return [];
    const resp = await this.request({ type: 'apply_up', input });
    if (resp.type === 'up') return resp.outputs;
    return [];
  }

  async applyDown(input: string): Promise<string[]> {
    const W: any = (globalThis as any).Worker;
    if (!W || !this.worker) return [];
    const resp = await this.request({ type: 'apply_down', input });
    if (resp.type === 'down') return resp.outputs;
    return [];
  }
}

