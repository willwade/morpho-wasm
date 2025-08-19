export type WorkerRequest = {
    type: 'init';
    wasmUrl: string;
    packUrl?: string;
} | {
    type: 'load_pack';
    packUrl: string;
} | {
    type: 'apply_up';
    input: string;
} | {
    type: 'apply_down';
    input: string;
};
export type WorkerResponse = {
    type: 'ready';
} | {
    type: 'up';
    outputs: string[];
} | {
    type: 'down';
    outputs: string[];
} | {
    type: 'error';
    message: string;
};
