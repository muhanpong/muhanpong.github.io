/* tslint:disable */
/* eslint-disable */

export class Mv2Encoder {
    free(): void;
    [Symbol.dispose](): void;
    add_frame(rgba_data: Uint8Array, in_w: number, in_h: number, channels: number, mp3_data?: Uint8Array | null, pcm_data?: Int16Array | null): void;
    finish(): Uint8Array;
    get_last_dithered_frame(): Uint8Array;
    constructor(config_json: string);
}

export function init_panic_hook(): void;

export function test_anchor_resolution(shorthand: string, peak_val: number): Float32Array;
