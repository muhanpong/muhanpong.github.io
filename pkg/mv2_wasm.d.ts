/* tslint:disable */
/* eslint-disable */

export class Mv2Encoder {
    free(): void;
    [Symbol.dispose](): void;
    add_frame(rgba_data: Uint8Array, in_w: number, in_h: number, channels: number, mp3_data?: Uint8Array | null, pcm_data?: Int16Array | null): void;
    finish(remaining_mp3?: Uint8Array | null): Uint8Array;
    finish_rgb(): Uint8Array;
    get_last_dithered_frame(): Uint8Array;
    constructor(config_json: string);
}

export function initThreadPool(num_threads: number): Promise<any>;

export function init_panic_hook(): void;

export function test_anchor_resolution(shorthand: string, peak_val: number): Float32Array;

export class wbg_rayon_PoolBuilder {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    build(): void;
    numThreads(): number;
    receiver(): number;
}

export function wbg_rayon_start_worker(receiver: number): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_mv2encoder_free: (a: number, b: number) => void;
    readonly mv2encoder_add_frame: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly mv2encoder_finish: (a: number, b: number, c: number) => any;
    readonly mv2encoder_finish_rgb: (a: number) => any;
    readonly mv2encoder_get_last_dithered_frame: (a: number) => any;
    readonly mv2encoder_new: (a: number, b: number) => [number, number, number];
    readonly test_anchor_resolution: (a: number, b: number, c: number) => any;
    readonly init_panic_hook: () => void;
    readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void;
    readonly initThreadPool: (a: number) => any;
    readonly wbg_rayon_poolbuilder_build: (a: number) => void;
    readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
    readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
    readonly wbg_rayon_start_worker: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
