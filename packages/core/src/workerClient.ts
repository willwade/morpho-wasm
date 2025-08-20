// Minimal client wrapper around our Web Worker stub.
// In Node (tests) there is no Worker; we gracefully no-op.

import type { JoinDecision } from './index.js';

export type WorkerRequest =
  | { type: 'init'; wasmUrl: string; packUrl?: string }
  | { type: 'load_pack'; packUrl: string }
  | { type: 'apply_up'; input: string }
  | { type: 'apply_down'; input: string }
  | { type: 'apply_join'; prev: string; next: string; lang: string };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'up'; outputs: string[] }
  | { type: 'down'; outputs: string[] }
  | { type: 'join'; decision: JoinDecision }
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

    if (!W) {
      console.log('🔧 Node.js environment detected - trying worker_threads');
      try {
        // Try to use Node.js worker_threads
        const { Worker: NodeWorker } = await import('worker_threads');
        const { fileURLToPath } = await import('url');

        // Get the worker script path
        const workerUrl = new URL('../dist-worker/worker.js', import.meta.url);
        const workerPath = fileURLToPath(workerUrl);

        console.log(`🔧 Creating Node.js worker: ${workerPath}`);

        // Create Node.js worker
        this.worker = new NodeWorker(workerPath) as any;

        // Set up message handling for Node.js worker
        this.worker.on('message', (data: WorkerResponse) => {
          if (this.pendingResolve) {
            const resolve = this.pendingResolve;
            this.pendingResolve = null;
            resolve(data);
            this.sending = false;
            this.processQueue();
          }
        });

        this.worker.on('error', (error: Error) => {
          console.error('🔧 Node.js worker error:', error);
          this.initialized = true; // Mark as initialized to avoid loops
        });

        this.worker.on('exit', (code: number) => {
          console.log(`🔧 Node.js worker exited with code: ${code}`);
        });

        // Send init and wait for ready
        const resp = await this.request({ type: 'init', wasmUrl, packUrl });
        if (resp.type === 'ready') {
          console.log('🔧 Node.js worker initialized successfully');
          this.initialized = true;
        }
        return;

      } catch (error: any) {
        console.log('🔧 Node.js worker_threads failed, using stub mode:', error?.message || error);
        this.initialized = true;
        return;
      }
    }

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
    if (!this.worker) return;
    if (this.sending) return;
    const next = this.queue.shift();
    if (!next) return;
    this.sending = true;
    this.pendingResolve = next.resolve;
    this.worker.postMessage(next.msg);
  }

  private request(msg: WorkerRequest): Promise<WorkerResponse> {
    if (!this.worker) return Promise.resolve({ type: 'error', message: 'no-worker' });
    return new Promise<WorkerResponse>((resolve) => {
      this.queue.push({ msg, resolve });
      this.processQueue();
    });
  }

  async loadPack(packUrl: string): Promise<void> {
    if (!this.worker) return;
    await this.request({ type: 'load_pack', packUrl });
  }

  async applyUp(input: string): Promise<string[]> {
    if (!this.worker) return [];
    const resp = await this.request({ type: 'apply_up', input });
    if (resp.type === 'up') return resp.outputs;
    return [];
  }

  async applyDown(input: string): Promise<string[]> {
    if (!this.worker) return [];
    const resp = await this.request({ type: 'apply_down', input });
    if (resp.type === 'down') return resp.outputs;
    return [];
  }

  async applyJoin(prev: string, next: string, lang: string): Promise<JoinDecision | null> {
    console.log(`🔧 applyJoin called: ${prev} + ${next} (${lang})`);
    if (!this.worker) {
      console.log(`🔧 No worker available - returning null`);
      return null;
    }
    console.log(`🔧 Sending join request to worker`);
    const resp = await this.request({ type: 'apply_join', prev, next, lang });
    console.log(`🔧 Worker response:`, resp);
    if (resp.type === 'join') return resp.decision;
    return null;
  }

  /**
   * Terminate the worker and clean up resources.
   * This is important for Node.js environments to prevent hanging processes.
   */
  terminate(): void {
    console.log('🔧 Terminating worker...');
    if (this.worker) {
      console.log('🔧 Worker exists, attempting to terminate');
      try {
        if (typeof this.worker.terminate === 'function') {
          // Browser Worker or Node.js worker_threads
          console.log('🔧 Calling worker.terminate()');
          this.worker.terminate();
          console.log('🔧 Worker.terminate() called successfully');
        } else {
          console.log('🔧 Worker has no terminate method');
        }
      } catch (error) {
        console.error('🔧 Error terminating worker:', error);
      }
      this.worker = null;
      this.initialized = false;
      this.pendingResolve = null;
      this.queue = [];
      this.sending = false;
      console.log('🔧 Worker cleanup complete');
    } else {
      console.log('🔧 No worker to terminate');
    }
  }
}

