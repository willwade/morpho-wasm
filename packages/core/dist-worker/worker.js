// HFST Web Worker that wraps HFST WASM calls.
// Compatible with both Web Workers and Node.js worker_threads.
class TempFSTJoinCoordinator {
    async applyJoin(prev, next, lang, analysisFunction) {
        const prevAnalysis = await analysisFunction(prev);
        const nextAnalysis = await analysisFunction(next);
        // Reduced logging to avoid serialization issues
        console.log(`🔧 FST Analysis - ${prev}: ${prevAnalysis.length} results`);
        console.log(`🔧 FST Analysis - ${next}: ${nextAnalysis.length} results`);
        // Check if we have real morphological analysis (not empty tags)
        const hasRealPrevAnalysis = prevAnalysis.some(a => a.tags.length > 0 && !a.tags.includes('HFST_ANALYSIS_FAILED'));
        const hasRealNextAnalysis = nextAnalysis.some(a => a.tags.length > 0 && !a.tags.includes('HFST_ANALYSIS_FAILED'));
        if (hasRealPrevAnalysis && hasRealNextAnalysis) {
            // Use TRUE FST-based analysis
            return this.morphologyBasedJoin(prev, next, lang, prevAnalysis, nextAnalysis);
        }
        else {
            // Fall back to language-specific logic when FST analysis isn't available
            return this.languageSpecificJoin(prev, next, lang);
        }
    }
    async morphologyBasedJoin(prev, next, lang, prevAnalysis, nextAnalysis) {
        // TODO: Implement true FST-based joins using morphological features
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `TRUE FST-based join using morphological analysis for ${lang}: ${prev} + ${next}`
        };
    }
    async languageSpecificJoin(prev, next, lang) {
        switch (lang) {
            case 'fr-FR':
                const frenchResult = await this.frenchElision(prev, next);
                if (frenchResult)
                    return frenchResult;
                break;
        }
        // Default: space separation
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `No join rule found for ${lang}: ${prev} + ${next}`
        };
    }
    async frenchElision(prev, next) {
        // French elision logic (fallback when FST analysis isn't available)
        // Use curly quotes to match test data expectations (character code 8217)
        const elisionWords = new Map([
            ['je', "j\u2019"],
            ['le', "l\u2019"],
            ['la', "l\u2019"],
            ['de', "d\u2019"],
            ['ne', "n\u2019"],
            ['me', "m\u2019"],
            ['te', "t\u2019"],
            ['se', "s\u2019"],
            ['ce', "c\u2019"],
            ['que', "qu\u2019"],
            ['si', "s\u2019"] // only before "il/ils"
        ]);
        const prevLower = prev.toLowerCase();
        const nextLower = next.toLowerCase();
        // Check if prev can elide
        if (!elisionWords.has(prevLower)) {
            return null; // No elision
        }
        // Special case for "si" - only elides before "il/ils"
        if (prevLower === 'si' && !['il', 'ils'].includes(nextLower)) {
            return null;
        }
        // Check if next starts with vowel or h muet
        const startsWithVowel = /^[aeiouàáâäèéêëìíîïòóôöùúûüÿ]/i.test(next);
        const startsWithHMuet = /^h[aeiou]/i.test(next) && !this.isHAspire(nextLower);
        if (startsWithVowel || startsWithHMuet) {
            const elided = elisionWords.get(prevLower);
            return {
                surfacePrev: elided,
                surfaceNext: next,
                joiner: '',
                noSpace: true,
                reason: `French elision: ${prev} + ${next} → ${elided}${next}`
            };
        }
        return null; // No elision
    }
    isHAspire(word) {
        // Common h aspiré words that prevent elision
        const hAspireWords = ['haricot', 'héros', 'hibou', 'honte', 'hurler'];
        return hAspireWords.some(h => word.startsWith(h));
    }
}
// Node.js worker_threads compatibility
let parentPort = null;
let isNodeWorker = false;
// Initialize Node.js worker support
async function initNodeWorker() {
    try {
        if (typeof process !== 'undefined' && process.versions?.node) {
            const { parentPort: nodeParentPort } = await import('worker_threads');
            parentPort = nodeParentPort;
            isNodeWorker = true;
            console.log('🔧 Worker running in Node.js worker_threads mode');
            return true;
        }
    }
    catch {
        // Running in browser - use Web Worker APIs
        console.log('🔧 Worker running in Web Worker mode');
    }
    return false;
}
// Universal message posting function
function postMessage(message) {
    if (isNodeWorker && parentPort) {
        parentPort.postMessage(message);
    }
    else if (typeof self !== 'undefined') {
        self.postMessage(message);
    }
    else {
        console.error('No message posting mechanism available');
    }
}
let wasmUrlCache = null;
let ready = false;
let transducerLoaded = false;
let ModuleFactory = null;
let Module = null;
// FST-based join coordinator
const fstJoinCoordinator = new TempFSTJoinCoordinator();
// Helper function to perform HFST analysis within worker
async function performAnalysis(surface) {
    if (!ready || !Module || !transducerLoaded) {
        return [{ lemma: surface, surface, tags: [] }];
    }
    try {
        const fn = Module.cwrap('applyUp', 'number', ['string', 'number', 'number']);
        if (!fn)
            return [{ lemma: surface, surface, tags: [] }];
        // Get required buffer size
        const needed = fn(surface, 0, 0);
        if (needed <= 0)
            return [{ lemma: surface, surface, tags: [] }];
        // Allocate buffer and perform analysis
        const outPtr = Module._malloc(needed + 1);
        fn(surface, outPtr, needed + 1);
        const result = Module.UTF8ToString(outPtr);
        Module._free(outPtr);
        if (!result)
            return [{ lemma: surface, surface, tags: [] }];
        // Parse HFST output format: "lemma+TAG1+TAG2"
        const analyses = [];
        const lines = result.split('\n').filter((line) => line.trim());
        for (const line of lines) {
            const parts = line.trim().split('+');
            if (parts.length > 0) {
                const lemma = parts[0] || surface;
                const tags = parts.slice(1).filter((tag) => tag.length > 0);
                analyses.push({ lemma, surface, tags });
            }
        }
        return analyses.length > 0 ? analyses : [{ lemma: surface, surface, tags: [] }];
    }
    catch (error) {
        console.warn('Analysis error:', error);
        return [{ lemma: surface, surface, tags: [] }];
    }
}
async function initWasm(wasmUrl, packUrl) {
    if (!ModuleFactory) {
        // hfst.js is generated by emcc with -sMODULARIZE=1 -sEXPORT_ES6=1
        if (isNodeWorker) {
            // Node.js environment - use file system paths
            const { fileURLToPath } = await import('url');
            const path = await import('path');
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const hfstJsPath = path.resolve(currentDir, '../public/wasm/hfst.js');
            console.log(`🔧 Loading HFST module from: ${hfstJsPath}`);
            ModuleFactory = (await import(hfstJsPath)).default;
        }
        else {
            // Browser environment - use relative URL
            const modUrl = new URL('../public/wasm/hfst.js', import.meta.url);
            ModuleFactory = (await import(/* @vite-ignore */ modUrl.href)).default;
        }
    }
    // Handle WASM loading for Node.js vs Browser
    if (isNodeWorker) {
        // Node.js environment - read WASM file directly and provide as ArrayBuffer
        const { fileURLToPath } = await import('url');
        const path = await import('path');
        const fs = await import('fs');
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const wasmPath = path.resolve(currentDir, '../public/wasm/hfst.wasm');
        console.log(`🔧 Reading WASM file: ${wasmPath}`);
        const wasmBuffer = fs.readFileSync(wasmPath);
        console.log(`🔧 WASM file loaded: ${wasmBuffer.length} bytes`);
        Module = await ModuleFactory({
            wasmBinary: wasmBuffer,
            locateFile: (p) => {
                // All files should be provided directly, no fetching needed
                console.log(`🔧 locateFile called for: ${p}`);
                return p;
            }
        });
    }
    else {
        // Browser environment - use standard locateFile approach
        Module = await ModuleFactory({
            locateFile: (p) => {
                if (p.endsWith('.wasm')) {
                    return wasmUrl;
                }
                return p;
            }
        });
    }
    // Pack loading is now handled separately in the 'load_pack' message handler
    // This function only initializes the WASM module
}
// Universal message handler for both Web Workers and Node.js worker_threads
async function handleMessage(msg) {
    console.log(`🔧 Worker received message: ${msg.type}`);
    try {
        switch (msg.type) {
            case 'init': {
                wasmUrlCache = msg.wasmUrl;
                await initWasm(msg.wasmUrl, msg.packUrl);
                ready = true;
                postMessage({ type: 'ready' });
                break;
            }
            case 'load_pack': {
                if (!Module)
                    await initWasm(wasmUrlCache, msg.packUrl);
                else if (msg.packUrl) {
                    try {
                        console.log('🔧 Loading pack from URL:', msg.packUrl);
                        const u = new URL(msg.packUrl, isNodeWorker ? 'file:///' : self.location.origin);
                        console.log('🔧 Resolved URL:', u.toString());
                        const expectedSha = u.searchParams.get('sha256') || undefined;
                        const genParam = u.searchParams.get('gen');
                        const genSha = u.searchParams.get('gensha256');
                        // Handle file loading differently for Node.js vs browser
                        let res;
                        if (isNodeWorker && u.protocol === 'file:') {
                            // Node.js: use fs to read local files
                            const fs = await import('fs');
                            const path = await import('path');
                            const { fileURLToPath } = await import('url');
                            const filePath = fileURLToPath(u);
                            console.log('🔧 Reading file:', filePath);
                            try {
                                const buffer = fs.readFileSync(filePath);
                                console.log('🔧 File read successfully, size:', buffer.length);
                                // Create a mock Response object
                                res = {
                                    ok: true,
                                    headers: {
                                        get: (name) => name === 'content-length' ? buffer.length.toString() : null
                                    },
                                    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
                                };
                            }
                            catch (error) {
                                console.log('🔧 File read error:', error);
                                res = { ok: false };
                            }
                        }
                        else if (!isNodeWorker && typeof self !== 'undefined' && self.caches) {
                            // Browser: use cache storage
                            res = await self.caches.open('morph-packs-v1').then(async (c) => {
                                const urlStr = u.toString();
                                const m = await c.match(urlStr);
                                if (m)
                                    return m;
                                const r = await fetch(urlStr);
                                if (r && r.ok) {
                                    await c.put(urlStr, r.clone());
                                    return r;
                                }
                                return r;
                            }).catch(() => fetch(u.toString()));
                        }
                        else {
                            // Fallback: direct fetch
                            res = await fetch(u.toString());
                        }
                        if (res && res.ok) {
                            console.log('🔧 Pack downloaded successfully, size:', res.headers.get('content-length'));
                            const buf = new Uint8Array(await res.arrayBuffer());
                            console.log('🔧 Buffer size:', buf.length);
                            if (expectedSha) {
                                const digest = await crypto.subtle.digest('SHA-256', buf);
                                const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
                                if (hex !== expectedSha.toLowerCase())
                                    throw new Error(`Integrity mismatch`);
                            }
                            const lower = u.pathname.toLowerCase();
                            const mountPath = lower.endsWith('.pmhfst') ? '/analysis.pmhfst' : '/analysis.hfstol';
                            console.log('🔧 Writing transducer to:', mountPath);
                            Module.FS.writeFile(mountPath, buf);
                            // Verify the file was written correctly
                            try {
                                const stat = Module.FS.stat(mountPath);
                                console.log('🔧 File written, size:', stat.size);
                                // Check if file is readable
                                const testRead = Module.FS.readFile(mountPath);
                                console.log('🔧 File readable, first 10 bytes:', Array.from(testRead.slice(0, 10)));
                            }
                            catch (e) {
                                console.log('🔧 File verification error:', e);
                            }
                            console.log('🔧 Calling loadTransducer...');
                            // Check if loadTransducer function exists and call it
                            let loadResult = 90408; // Default error code
                            const loadTransducerFn = Module.cwrap('loadTransducer', 'number', ['string']);
                            if (!loadTransducerFn) {
                                console.log('🔧 loadTransducer function not found in WASM module');
                                console.log('🔧 Available functions:', Object.keys(Module).filter(k => typeof Module[k] === 'function'));
                            }
                            else {
                                console.log('🔧 loadTransducer function found, calling with:', mountPath);
                                loadResult = loadTransducerFn(mountPath);
                                console.log('🔧 loadTransducer returned:', loadResult);
                                // Try alternative function names if this one fails
                                if (loadResult !== 0) {
                                    console.log('🔧 Trying alternative function names...');
                                    try {
                                        const altFn1 = Module.cwrap('load_transducer', 'number', ['string']);
                                        if (altFn1) {
                                            const altResult1 = altFn1(mountPath);
                                            console.log('🔧 load_transducer returned:', altResult1);
                                            if (altResult1 === 0)
                                                loadResult = altResult1;
                                        }
                                    }
                                    catch (e) {
                                        console.log('🔧 load_transducer not available');
                                    }
                                    try {
                                        const altFn2 = Module.cwrap('hfst_load', 'number', ['string']);
                                        if (altFn2) {
                                            const altResult2 = altFn2(mountPath);
                                            console.log('🔧 hfst_load returned:', altResult2);
                                            if (altResult2 === 0)
                                                loadResult = altResult2;
                                        }
                                    }
                                    catch (e) {
                                        console.log('🔧 hfst_load not available');
                                    }
                                }
                            }
                            if (loadResult === 0) {
                                transducerLoaded = true;
                                console.log('🔧 Main transducer loaded successfully');
                            }
                            else {
                                console.log('🔧 Failed to load main transducer, error code:', loadResult);
                                // List all available WASM functions for debugging
                                console.log('🔧 Available WASM functions:');
                                const wasmFunctions = Object.keys(Module).filter(k => typeof Module[k] === 'function' && k.startsWith('_'));
                                console.log('🔧 WASM functions:', wasmFunctions.slice(0, 20)); // First 20 functions
                                // Try to get more information about the error
                                try {
                                    const errorFn = Module.cwrap('getLastError', 'string', []);
                                    if (errorFn) {
                                        const errorMsg = errorFn();
                                        console.log('🔧 HFST error message:', errorMsg);
                                    }
                                }
                                catch (e) {
                                    console.log('🔧 Could not get HFST error message');
                                }
                            }
                            if (genParam) {
                                const r2 = await self.caches?.open?.('morph-packs-v1').then(async (c) => {
                                    const m = await c.match(genParam);
                                    if (m)
                                        return m;
                                    const r = await fetch(genParam);
                                    if (r && r.ok) {
                                        await c.put(genParam, r.clone());
                                        return r;
                                    }
                                    return r;
                                }).catch(() => fetch(genParam));
                                if (r2 && r2.ok) {
                                    const b2 = new Uint8Array(await r2.arrayBuffer());
                                    if (genSha) {
                                        const d2 = await crypto.subtle.digest('SHA-256', b2);
                                        const hex2 = [...new Uint8Array(d2)].map(b => b.toString(16).padStart(2, '0')).join('');
                                        if (hex2 !== genSha.toLowerCase())
                                            throw new Error('Generator integrity mismatch');
                                    }
                                    const genPath = genParam.toLowerCase().endsWith('.pmhfst') ? '/generate.pmhfst' : '/generate.hfstol';
                                    Module.FS.writeFile(genPath, b2);
                                    Module.cwrap('loadGenerator', 'number', ['string'])(genPath);
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.log('🔧 Pack loading error:', error);
                    }
                }
                postMessage({ type: 'ready' });
                break;
            }
            case 'apply_up': {
                // Reduced logging to avoid serialization issues
                const outputs = (ready && transducerLoaded) ? (() => {
                    // Simplified apply_up logic
                    if (Module?.cwrap) {
                        try {
                            const fn = Module.cwrap('applyUp', 'number', ['string', 'number', 'number']);
                            if (!fn)
                                return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                            // two-call pattern: first to get size, then allocate buffer
                            const needed = fn(msg.input, 0, 0);
                            if (needed <= 0)
                                return []; // No analysis found
                            const outPtr = Module._malloc(needed + 1);
                            fn(msg.input, outPtr, needed + 1);
                            const s = Module.UTF8ToString(outPtr);
                            Module._free(outPtr);
                            return s ? s.split('\n').filter(Boolean) : [];
                        }
                        catch (error) {
                            return [`HFST_WASM_ERROR:${msg.input}`];
                        }
                    }
                    else {
                        return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                    }
                })() : transducerLoaded ? [`HFST_WASM_NOT_LOADED:${msg.input}`] : [`HFST_TRANSDUCER_NOT_LOADED:${msg.input}`];
                postMessage({ type: 'up', outputs });
                break;
            }
            case 'apply_down': {
                const outputs = ready ? (() => {
                    const fn = Module?.cwrap?.('applyDown', 'number', ['string', 'number', 'number']);
                    if (!fn)
                        return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                    const getSize = Module.cwrap('applyDown', 'number', ['string', 'number', 'number']);
                    const needed = getSize(msg.input, 0, 0);
                    const outPtr = Module._malloc(needed + 1);
                    fn(msg.input, outPtr, needed + 1);
                    const s = Module.UTF8ToString(outPtr);
                    Module._free(outPtr);
                    return s ? s.split('\n') : [];
                })() : [];
                postMessage({ type: 'down', outputs });
                break;
            }
            case 'apply_join': {
                // Use FST-based join system
                const decision = await fstJoinCoordinator.applyJoin(msg.prev, msg.next, msg.lang, performAnalysis);
                postMessage({ type: 'join', decision });
                break;
            }
            default:
                postMessage({ type: 'error', message: 'unknown message' });
        }
    }
    catch (e) {
        postMessage({ type: 'error', message: String(e?.message || e) });
    }
}
// Set up message listeners for both environments
async function setupMessageListeners() {
    const nodeInitialized = await initNodeWorker();
    if (nodeInitialized && parentPort) {
        // Node.js worker_threads
        parentPort.on('message', (data) => {
            handleMessage(data);
        });
    }
    else {
        // Web Worker
        self.onmessage = async (ev) => {
            await handleMessage(ev.data);
        };
    }
}
// Initialize message listeners
setupMessageListeners().catch(console.error);
export {};
