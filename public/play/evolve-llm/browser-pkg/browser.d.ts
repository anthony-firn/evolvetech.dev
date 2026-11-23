/* tslint:disable */
/* eslint-disable */

export class Browser {
    free(): void;
    [Symbol.dispose](): void;
    agentClick(r: number): string;
    agentKey(key: string): string;
    agentRefAt(x: number, y: number): string;
    agentScroll(dy: number): string;
    agentSelect(r: number, value: string): string;
    agentType(r: number, text: string, submit: boolean): string;
    back(): void;
    /**
     * The person picked an option from a `select` event's menu (-1 = cancelled).
     */
    chooseOption(id: number, index: number): void;
    clearData(): void;
    cookiesJson(): string;
    /**
     * Log the Tor client's progress (circuit builds, extends, streams) to the worker console.
     */
    enableTorLog(): void;
    evaluate(code: string): string;
    forward(): void;
    frameHeight(): number;
    frameWidth(): number;
    imeCommit(text: string): void;
    imePreedit(text: string): void;
    key(kind: string, key: string, code: string, mods: number, repeat: boolean): void;
    navigate(url: string): void;
    networkLog(): string;
    constructor(fonts: Array<any>, relay_url: string, cookies_json: string | null | undefined, storage_json: string | null | undefined, wake: Function);
    pointer(kind: string, x: number, y: number, button: number, buttons: number, mods: number): void;
    /**
     * Start connecting the route now (Tor takes several seconds to reach its first circuit).
     */
    prepareNetwork(): void;
    reload(): void;
    resize(css_width: number, css_height: number, dpr: number): void;
    /**
     * Diagnostic content-negotiation profile; must be selected before the first navigation.
     */
    setIdentity(profile: string): void;
    /**
     * The route to websites: `"tor:"` for the Tor network, or a Wisp relay's ws(s):// URL.
     */
    setRelay(url: string): void;
    setTlsProfile(profile: string): void;
    /**
     * Base URLs serving Tor's cached consensus (`consensus.txt.br`, `microdescriptors.txt.br`),
     * tried in order when the Tor route starts.
     */
    setTorConsensus(urls: string[]): void;
    snapshot(max_chars: number): string;
    stop(): void;
    storageJson(): string;
    takeEvents(): string;
    takeFrame(): Uint8Array | undefined;
    tick(now: number): number;
    /**
     * Transfer counters of the Tor route's Snowflake layers (JSON), for diagnostics.
     */
    torStats(): string;
    wheel(x: number, y: number, dx: number, dy: number, delta_mode: number, mods: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_browser_free: (a: number, b: number) => void;
    readonly browser_agentClick: (a: number, b: number) => [number, number];
    readonly browser_agentKey: (a: number, b: number, c: number) => [number, number];
    readonly browser_agentRefAt: (a: number, b: number, c: number) => [number, number];
    readonly browser_agentScroll: (a: number, b: number) => [number, number];
    readonly browser_agentSelect: (a: number, b: number, c: number, d: number) => [number, number];
    readonly browser_agentType: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly browser_back: (a: number) => void;
    readonly browser_chooseOption: (a: number, b: number, c: number) => void;
    readonly browser_clearData: (a: number) => void;
    readonly browser_cookiesJson: (a: number) => [number, number];
    readonly browser_enableTorLog: (a: number) => void;
    readonly browser_evaluate: (a: number, b: number, c: number) => [number, number];
    readonly browser_forward: (a: number) => void;
    readonly browser_frameHeight: (a: number) => number;
    readonly browser_frameWidth: (a: number) => number;
    readonly browser_imeCommit: (a: number, b: number, c: number) => void;
    readonly browser_imePreedit: (a: number, b: number, c: number) => void;
    readonly browser_key: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly browser_navigate: (a: number, b: number, c: number) => void;
    readonly browser_networkLog: (a: number) => [number, number];
    readonly browser_new: (a: any, b: number, c: number, d: number, e: number, f: number, g: number, h: any) => [number, number, number];
    readonly browser_pointer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly browser_prepareNetwork: (a: number) => void;
    readonly browser_reload: (a: number) => void;
    readonly browser_resize: (a: number, b: number, c: number, d: number) => void;
    readonly browser_setIdentity: (a: number, b: number, c: number) => [number, number];
    readonly browser_setRelay: (a: number, b: number, c: number) => void;
    readonly browser_setTlsProfile: (a: number, b: number, c: number) => [number, number];
    readonly browser_setTorConsensus: (a: number, b: number, c: number) => void;
    readonly browser_snapshot: (a: number, b: number) => [number, number];
    readonly browser_stop: (a: number) => void;
    readonly browser_storageJson: (a: number) => [number, number];
    readonly browser_takeEvents: (a: number) => [number, number];
    readonly browser_takeFrame: (a: number) => any;
    readonly browser_tick: (a: number, b: number) => number;
    readonly browser_torStats: (a: number) => [number, number];
    readonly browser_wheel: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly ring_core_0_17_14__bn_mul_mont: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly Servo_NumericType_MatchesAngle: (a: number) => number;
    readonly Servo_NumericType_MatchesLength: (a: number) => number;
    readonly Servo_NumericType_MatchesLengthPercentage: (a: number) => number;
    readonly Servo_NumericType_MatchesNumber: (a: number) => number;
    readonly Servo_NumericType_MatchesPercentage: (a: number) => number;
    readonly wasm_bindgen__convert__closures_____invoke__h0b954ebff9e69eda: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__he3e3914ed696371b: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h02fbaeaf32f22b48: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3dd84e27953d120e: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3dd84e27953d120e_41: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3dd84e27953d120e_42: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3dd84e27953d120e_43: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h27c5e105281d6b36: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
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
