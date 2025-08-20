// Minimal client wrapper around our Web Worker stub.
// In Node (tests) there is no Worker; we gracefully no-op.
export class HFSTWorkerClient {
    constructor() {
        this.worker = null;
        this.pendingResolve = null;
        this.initialized = false;
        // Simple in-memory queue to serialize requests to the Worker
        this.queue = [];
        this.sending = false;
    }
    async init(wasmUrl, packUrl) {
        if (this.initialized)
            return;
        const W = globalThis.Worker;
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
                this.worker = new NodeWorker(workerPath);
                // Set up message handling for Node.js worker
                this.worker.on('message', (data) => {
                    if (this.pendingResolve) {
                        const resolve = this.pendingResolve;
                        this.pendingResolve = null;
                        resolve(data);
                        this.sending = false;
                        this.processQueue();
                    }
                });
                this.worker.on('error', (error) => {
                    console.error('🔧 Node.js worker error:', error);
                    this.initialized = true; // Mark as initialized to avoid loops
                });
                // Send init and wait for ready
                const resp = await this.request({ type: 'init', wasmUrl, packUrl });
                if (resp.type === 'ready') {
                    console.log('🔧 Node.js worker initialized successfully');
                    this.initialized = true;
                }
                return;
            }
            catch (error) {
                console.log('🔧 Node.js worker_threads failed, using stub mode:', error?.message || error);
                this.initialized = true;
                return;
            }
        }
        const rawUrl = new URL('../dist-worker/worker.js', import.meta.url);
        let workerScriptUrl = rawUrl;
        try {
            const loc = globalThis.location;
            if (loc && rawUrl.origin !== loc.origin) {
                // Cross-origin workers are blocked; create a same-origin module worker shim that imports the CDN worker
                const blob = new Blob([`import '${rawUrl.href}';`], { type: 'application/javascript' });
                workerScriptUrl = URL.createObjectURL(blob);
            }
        }
        catch { }
        this.worker = new W(workerScriptUrl, { type: 'module' });
        this.worker.onmessage = (ev) => {
            if (this.pendingResolve) {
                const resolve = this.pendingResolve;
                this.pendingResolve = null;
                resolve(ev.data);
                // Mark not sending and process next queued item, if any
                this.sending = false;
                this.processQueue();
            }
        };
        // Send init and wait for ready (or ignore if errors)
        try {
            const resp = await this.request({ type: 'init', wasmUrl, packUrl });
            if (resp.type === 'ready')
                this.initialized = true;
        }
        catch {
            // Keep initialized to true to avoid loops, but remain in stub mode
            this.initialized = true;
        }
    }
    processQueue() {
        if (!this.worker)
            return;
        if (this.sending)
            return;
        const next = this.queue.shift();
        if (!next)
            return;
        this.sending = true;
        this.pendingResolve = next.resolve;
        this.worker.postMessage(next.msg);
    }
    request(msg) {
        if (!this.worker)
            return Promise.resolve({ type: 'error', message: 'no-worker' });
        return new Promise((resolve) => {
            this.queue.push({ msg, resolve });
            this.processQueue();
        });
    }
    async loadPack(packUrl) {
        if (!this.worker)
            return;
        await this.request({ type: 'load_pack', packUrl });
    }
    async applyUp(input) {
        if (!this.worker)
            return [];
        const resp = await this.request({ type: 'apply_up', input });
        if (resp.type === 'up')
            return resp.outputs;
        return [];
    }
    async applyDown(input) {
        if (!this.worker)
            return [];
        const resp = await this.request({ type: 'apply_down', input });
        if (resp.type === 'down')
            return resp.outputs;
        return [];
    }
    async applyJoin(prev, next, lang) {
        console.log(`🔧 applyJoin called: ${prev} + ${next} (${lang})`);
        if (!this.worker) {
            console.log(`🔧 No worker available - returning null`);
            return null;
        }
        console.log(`🔧 Sending join request to worker`);
        const resp = await this.request({ type: 'apply_join', prev, next, lang });
        console.log(`🔧 Worker response:`, resp);
        if (resp.type === 'join')
            return resp.decision;
        return null;
    }
}
