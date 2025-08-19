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

  async init(wasmUrl: string, packUrl?: string): Promise<void> {
    if (this.initialized) return;
    const W: any = (globalThis as any).Worker;
    if (!W) { this.initialized = true; return; }

    const workerUrl = new URL('../dist-worker/worker.js', import.meta.url);
    this.worker = new W(workerUrl, { type: 'module' });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      if (this.pendingResolve) {
        const resolve = this.pendingResolve; this.pendingResolve = null; resolve(ev.data);
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

  private request(msg: WorkerRequest): Promise<WorkerResponse> {
    const W: any = (globalThis as any).Worker;
    if (!this.worker || !W) return Promise.resolve({ type: 'error', message: 'no-worker' });
    if (this.pendingResolve) return Promise.reject(new Error('concurrent worker request'));
    return new Promise<WorkerResponse>((resolve) => {
      this.pendingResolve = resolve;
      this.worker.postMessage(msg);
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

