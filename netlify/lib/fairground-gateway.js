// node_modules/nostr-tools/node_modules/@noble/hashes/utils.js
function e(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function t(e, t = "") {
	if (!Number.isSafeInteger(e) || e < 0) {
		let n = t && `"${t}" `;
		throw Error(`${n}expected integer >= 0, got ${e}`);
	}
}
function n(t, n, r = "") {
	let i = e(t), a = t?.length, o = n !== void 0;
	if (!i || o && a !== n) {
		let e = r && `"${r}" `, s = o ? ` of length ${n}` : "", c = i ? `length=${a}` : `type=${typeof t}`;
		throw Error(e + "expected Uint8Array" + s + ", got " + c);
	}
	return t;
}
function r(e, t = !0) {
	if (e.destroyed) throw Error("Hash instance has been destroyed");
	if (t && e.finished) throw Error("Hash#digest() has already been called");
}
function i(e, t) {
	n(e, void 0, "digestInto() output");
	let r = t.outputLen;
	if (e.length < r) throw Error("\"digestInto() output\" expected to be of length >=" + r);
}
function a(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function o(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function s(e, t) {
	return e << 32 - t | e >>> t;
}
var c = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", l = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function u(e) {
	if (n(e), c) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += l[e[n]];
	return t;
}
var d = {
	_0: 48,
	_9: 57,
	A: 65,
	F: 70,
	a: 97,
	f: 102
};
function f(e) {
	if (e >= d._0 && e <= d._9) return e - d._0;
	if (e >= d.A && e <= d.F) return e - (d.A - 10);
	if (e >= d.a && e <= d.f) return e - (d.a - 10);
}
function p(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	if (c) return Uint8Array.fromHex(e);
	let t = e.length, n = t / 2;
	if (t % 2) throw Error("hex string expected, got unpadded hex of length " + t);
	let r = new Uint8Array(n);
	for (let t = 0, i = 0; t < n; t++, i += 2) {
		let n = f(e.charCodeAt(i)), a = f(e.charCodeAt(i + 1));
		if (n === void 0 || a === void 0) {
			let t = e[i] + e[i + 1];
			throw Error("hex string expected, got non-hex character \"" + t + "\" at index " + i);
		}
		r[t] = n * 16 + a;
	}
	return r;
}
function m(...e) {
	let t = 0;
	for (let r = 0; r < e.length; r++) {
		let i = e[r];
		n(i), t += i.length;
	}
	let r = new Uint8Array(t);
	for (let t = 0, n = 0; t < e.length; t++) {
		let i = e[t];
		r.set(i, n), n += i.length;
	}
	return r;
}
function h(e, t = {}) {
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function g(e = 32) {
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	return t.getRandomValues(new Uint8Array(e));
}
var _ = (e) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	e
]) });
// node_modules/nostr-tools/node_modules/@scure/base/index.js
function v(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function y(e, t) {
	return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((e) => typeof e == "string") : t.every((e) => Number.isSafeInteger(e)) : !1;
}
function b(e) {
	if (typeof e != "function") throw Error("function expected");
	return !0;
}
function x(e, t) {
	if (typeof t != "string") throw Error(`${e}: string expected`);
	return !0;
}
function S(e) {
	if (!Number.isSafeInteger(e)) throw Error(`invalid integer: ${e}`);
}
function C(e) {
	if (!Array.isArray(e)) throw Error("array expected");
}
function w(e, t) {
	if (!y(!0, t)) throw Error(`${e}: array of strings expected`);
}
function T(e, t) {
	if (!y(!1, t)) throw Error(`${e}: array of numbers expected`);
}
function E(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
function D(e) {
	let t = typeof e == "string" ? e.split("") : e, n = t.length;
	w("alphabet", t);
	let r = new Map(t.map((e, t) => [e, t]));
	return {
		encode: (r) => (C(r), r.map((r) => {
			if (!Number.isSafeInteger(r) || r < 0 || r >= n) throw Error(`alphabet.encode: digit index outside alphabet "${r}". Allowed: ${e}`);
			return t[r];
		})),
		decode: (t) => (C(t), t.map((t) => {
			x("alphabet.decode", t);
			let n = r.get(t);
			if (n === void 0) throw Error(`Unknown letter: "${t}". Allowed: ${e}`);
			return n;
		}))
	};
}
function O(e = "") {
	return x("join", e), {
		encode: (t) => (w("join.decode", t), t.join(e)),
		decode: (t) => (x("join.decode", t), t.split(e))
	};
}
function k(e, t = "=") {
	return S(e), x("padding", t), {
		encode(n) {
			for (w("padding.encode", n); n.length * e % 8;) n.push(t);
			return n;
		},
		decode(n) {
			w("padding.decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid, string should have whole number of bytes");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: invalid, string has too much padding");
			return n.slice(0, r);
		}
	};
}
function A(e) {
	return b(e), {
		encode: (e) => e,
		decode: (t) => e(t)
	};
}
var j = (e, t) => t === 0 ? e : j(t, e % t), M = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - j(e, t)), N = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})();
function ee(e, t, n, r) {
	if (C(e), t <= 0 || t > 32) throw Error(`convertRadix2: wrong from=${t}`);
	if (n <= 0 || n > 32) throw Error(`convertRadix2: wrong to=${n}`);
	if (/* @__PURE__ */ M(t, n) > 32) throw Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ M(t, n)}`);
	let i = 0, a = 0, o = N[t], s = N[n] - 1, c = [];
	for (let r of e) {
		if (S(r), r >= o) throw Error(`convertRadix2: invalid data word=${r} from=${t}`);
		if (i = i << t | r, a + t > 32) throw Error(`convertRadix2: carry overflow pos=${a} from=${t}`);
		for (a += t; a >= n; a -= n) c.push((i >> a - n & s) >>> 0);
		let e = N[a];
		if (e === void 0) throw Error("invalid carry");
		i &= e - 1;
	}
	if (i = i << n - a & s, !r && a >= t) throw Error("Excess padding");
	if (!r && i > 0) throw Error(`Non-zero padding: ${i}`);
	return r && a > 0 && c.push(i >>> 0), c;
}
function P(e, t = !1) {
	if (S(e), e <= 0 || e > 32) throw Error("radix2: bits should be in (0..32]");
	if (/* @__PURE__ */ M(8, e) > 32 || /* @__PURE__ */ M(e, 8) > 32) throw Error("radix2: carry overflow");
	return {
		encode: (n) => {
			if (!v(n)) throw Error("radix2.encode input should be Uint8Array");
			return ee(Array.from(n), 8, e, !t);
		},
		decode: (n) => (T("radix2.decode", n), Uint8Array.from(ee(n, e, 8, t)))
	};
}
function te(e) {
	return b(e), function(...t) {
		try {
			return e.apply(null, t);
		} catch {}
	};
}
E(P(4), D("0123456789ABCDEF"), O("")), E(P(5), D("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), k(5), O("")), E(P(5), D("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), O("")), E(P(5), D("0123456789ABCDEFGHIJKLMNOPQRSTUV"), k(5), O("")), E(P(5), D("0123456789ABCDEFGHIJKLMNOPQRSTUV"), O("")), E(P(5), D("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), O(""), A((e) => e.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1")));
var ne = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function";
ne || E(P(6), D("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), k(6), O("")), E(P(6), D("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), O("")), ne || E(P(6), D("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), k(6), O("")), E(P(6), D("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), O(""));
var re = E(D("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), O("")), F = [
	996825010,
	642813549,
	513874426,
	1027748829,
	705979059
];
function ie(e) {
	let t = e >> 25, n = (e & 33554431) << 5;
	for (let e = 0; e < F.length; e++) (t >> e & 1) == 1 && (n ^= F[e]);
	return n;
}
function ae(e, t, n = 1) {
	let r = e.length, i = 1;
	for (let t = 0; t < r; t++) {
		let n = e.charCodeAt(t);
		if (n < 33 || n > 126) throw Error(`Invalid prefix (${e})`);
		i = ie(i) ^ n >> 5;
	}
	i = ie(i);
	for (let t = 0; t < r; t++) i = ie(i) ^ e.charCodeAt(t) & 31;
	for (let e of t) i = ie(i) ^ e;
	for (let e = 0; e < 6; e++) i = ie(i);
	return i ^= n, re.encode(ee([i % N[30]], 30, 5, !1));
}
function oe(e) {
	let t = e === "bech32" ? 1 : 734539939, n = P(5), r = n.decode, i = n.encode, a = te(r);
	function o(e, n, r = 90) {
		x("bech32.encode prefix", e), v(n) && (n = Array.from(n)), T("bech32.encode", n);
		let i = e.length;
		if (i === 0) throw TypeError(`Invalid prefix length ${i}`);
		let a = i + 7 + n.length;
		if (r !== !1 && a > r) throw TypeError(`Length ${a} exceeds limit ${r}`);
		let o = e.toLowerCase(), s = ae(o, n, t);
		return `${o}1${re.encode(n)}${s}`;
	}
	function s(e, n = 90) {
		x("bech32.decode input", e);
		let r = e.length;
		if (r < 8 || n !== !1 && r > n) throw TypeError(`invalid string length: ${r} (${e}). Expected (8..${n})`);
		let i = e.toLowerCase();
		if (e !== i && e !== e.toUpperCase()) throw Error("String must be lowercase or uppercase");
		let a = i.lastIndexOf("1");
		if (a === 0 || a === -1) throw Error("Letter \"1\" must be present between prefix and data only");
		let o = i.slice(0, a), s = i.slice(a + 1);
		if (s.length < 6) throw Error("Data must be at least 6 characters long");
		let c = re.decode(s).slice(0, -6), l = ae(o, c, t);
		if (!s.endsWith(l)) throw Error(`Invalid checksum in ${e}: expected "${l}"`);
		return {
			prefix: o,
			words: c
		};
	}
	let c = te(s);
	function l(e) {
		let { prefix: t, words: n } = s(e, !1);
		return {
			prefix: t,
			words: n,
			bytes: r(n)
		};
	}
	function u(e, t) {
		return o(e, i(t));
	}
	return {
		encode: o,
		decode: s,
		encodeFromBytes: u,
		decodeToBytes: l,
		decodeUnsafe: c,
		fromWords: r,
		fromWordsUnsafe: a,
		toWords: i
	};
}
var se = oe("bech32");
oe("bech32m"), typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function" || E(P(4), D("0123456789abcdef"), O(""), A((e) => {
	if (typeof e != "string" || e.length % 2 != 0) throw TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
	return e.toLowerCase();
}));
// node_modules/nostr-tools/lib/esm/nip19.js
var ce = new TextDecoder("utf-8");
new TextEncoder();
var le = 5e3;
function ue(e) {
	let { prefix: t, words: n } = se.decode(e, le), r = new Uint8Array(se.fromWords(n));
	switch (t) {
		case "nprofile": {
			let e = de(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nprofile");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			return {
				type: "nprofile",
				data: {
					pubkey: u(e[0][0]),
					relays: e[1] ? e[1].map((e) => ce.decode(e)) : []
				}
			};
		}
		case "nevent": {
			let e = de(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nevent");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			if (e[2] && e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (e[3] && e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "nevent",
				data: {
					id: u(e[0][0]),
					relays: e[1] ? e[1].map((e) => ce.decode(e)) : [],
					author: e[2]?.[0] ? u(e[2][0]) : void 0,
					kind: e[3]?.[0] ? parseInt(u(e[3][0]), 16) : void 0
				}
			};
		}
		case "naddr": {
			let e = de(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for naddr");
			if (!e[2]?.[0]) throw Error("missing TLV 2 for naddr");
			if (e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (!e[3]?.[0]) throw Error("missing TLV 3 for naddr");
			if (e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "naddr",
				data: {
					identifier: ce.decode(e[0][0]),
					pubkey: u(e[2][0]),
					kind: parseInt(u(e[3][0]), 16),
					relays: e[1] ? e[1].map((e) => ce.decode(e)) : []
				}
			};
		}
		case "nsec": return {
			type: t,
			data: r
		};
		case "npub":
		case "note": return {
			type: t,
			data: u(r)
		};
		default: throw Error(`unknown prefix ${t}`);
	}
}
function de(e) {
	let t = {}, n = e;
	for (; n.length > 0;) {
		if (n.length < 2) throw Error("not enough data to read TLV");
		let e = n[0], r = n[1], i = n.slice(2, 2 + r);
		if (n = n.slice(2 + r), i.length < r) throw Error(`not enough data to read on TLV ${e}`);
		t[e] = t[e] || [], t[e].push(i);
	}
	return t;
}
function fe(e) {
	return me("npub", p(e));
}
function pe(e, t) {
	let n = se.toWords(t);
	return se.encode(e, n, le);
}
function me(e, t) {
	return pe(e, t);
}
// node_modules/nostr-tools/node_modules/@noble/hashes/_md.js
function he(e, t, n) {
	return e & t ^ ~e & n;
}
function ge(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var _e = class {
	blockLen;
	outputLen;
	padOffset;
	isLE;
	buffer;
	view;
	finished = !1;
	length = 0;
	pos = 0;
	destroyed = !1;
	constructor(e, t, n, r) {
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = o(this.buffer);
	}
	update(e) {
		r(this), n(e);
		let { view: t, buffer: i, blockLen: a } = this, s = e.length;
		for (let n = 0; n < s;) {
			let r = Math.min(a - this.pos, s - n);
			if (r === a) {
				let t = o(e);
				for (; a <= s - n; n += a) this.process(t, n);
			} else i.set(e.subarray(n, n + r), this.pos), this.pos += r, n += r, this.pos === a && (this.process(t, 0), this.pos = 0);
		}
		return this.length += e.length, this.roundClean(), this;
	}
	digestInto(e) {
		r(this), i(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: s, isLE: c } = this, { pos: l } = this;
		t[l++] = 128, a(this.buffer.subarray(l)), this.padOffset > s - l && (this.process(n, 0), l = 0);
		for (let e = l; e < s; e++) t[e] = 0;
		n.setBigUint64(s - 8, BigInt(this.length * 8), c), this.process(n, 0);
		let u = o(e), d = this.outputLen;
		if (d % 4) throw Error("_sha2: outputLen must be aligned to 32bit");
		let f = d / 4, p = this.get();
		if (f > p.length) throw Error("_sha2: outputLen bigger than state");
		for (let e = 0; e < f; e++) u.setUint32(4 * e, p[e], c);
	}
	digest() {
		let { buffer: e, outputLen: t } = this;
		this.digestInto(e);
		let n = e.slice(0, t);
		return this.destroy(), n;
	}
	_cloneInto(e) {
		e ||= new this.constructor(), e.set(...this.get());
		let { blockLen: t, buffer: n, length: r, finished: i, destroyed: a, pos: o } = this;
		return e.destroyed = a, e.finished = i, e.length = r, e.pos = o, r % t && e.buffer.set(n), e;
	}
	clone() {
		return this._cloneInto();
	}
}, I = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), ve = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]), ye = /* @__PURE__ */ new Uint32Array(64), be = class extends _e {
	constructor(e) {
		super(64, e, 8, !1);
	}
	get() {
		let { A: e, B: t, C: n, D: r, E: i, F: a, G: o, H: s } = this;
		return [
			e,
			t,
			n,
			r,
			i,
			a,
			o,
			s
		];
	}
	set(e, t, n, r, i, a, o, s) {
		this.A = e | 0, this.B = t | 0, this.C = n | 0, this.D = r | 0, this.E = i | 0, this.F = a | 0, this.G = o | 0, this.H = s | 0;
	}
	process(e, t) {
		for (let n = 0; n < 16; n++, t += 4) ye[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = ye[e - 15], n = ye[e - 2], r = s(t, 7) ^ s(t, 18) ^ t >>> 3, i = s(n, 17) ^ s(n, 19) ^ n >>> 10;
			ye[e] = i + ye[e - 7] + r + ye[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: c, G: l, H: u } = this;
		for (let e = 0; e < 64; e++) {
			let t = s(o, 6) ^ s(o, 11) ^ s(o, 25), d = u + t + he(o, c, l) + ve[e] + ye[e] | 0, f = (s(n, 2) ^ s(n, 13) ^ s(n, 22)) + ge(n, r, i) | 0;
			u = l, l = c, c = o, o = a + d | 0, a = i, i = r, r = n, n = d + f | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, c = c + this.F | 0, l = l + this.G | 0, u = u + this.H | 0, this.set(n, r, i, a, o, c, l, u);
	}
	roundClean() {
		a(ye);
	}
	destroy() {
		this.set(0, 0, 0, 0, 0, 0, 0, 0), a(this.buffer);
	}
}, xe = class extends be {
	A = I[0] | 0;
	B = I[1] | 0;
	C = I[2] | 0;
	D = I[3] | 0;
	E = I[4] | 0;
	F = I[5] | 0;
	G = I[6] | 0;
	H = I[7] | 0;
	constructor() {
		super(32);
	}
}, Se = /* @__PURE__ */ h(() => new xe(), /* @__PURE__ */ _(1)), Ce = /* @__PURE__ */ BigInt(0), we = /* @__PURE__ */ BigInt(1);
function Te(e, t = "") {
	if (typeof e != "boolean") {
		let n = t && `"${t}" `;
		throw Error(n + "expected boolean, got type=" + typeof e);
	}
	return e;
}
function Ee(e) {
	if (typeof e == "bigint") {
		if (!Pe(e)) throw Error("positive bigint expected, got " + e);
	} else t(e);
	return e;
}
function De(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	return e === "" ? Ce : BigInt("0x" + e);
}
function Oe(e) {
	return De(u(e));
}
function ke(e) {
	return De(u(Me(n(e)).reverse()));
}
function Ae(e, n) {
	t(n), e = Ee(e);
	let r = p(e.toString(16).padStart(n * 2, "0"));
	if (r.length !== n) throw Error("number too large");
	return r;
}
function je(e, t) {
	return Ae(e, t).reverse();
}
function Me(e) {
	return Uint8Array.from(e);
}
function Ne(e) {
	return Uint8Array.from(e, (t, n) => {
		let r = t.charCodeAt(0);
		if (t.length !== 1 || r > 127) throw Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
		return r;
	});
}
var Pe = (e) => typeof e == "bigint" && Ce <= e;
function Fe(e) {
	let t = 0;
	for (; e > Ce; e >>= we, t += 1);
	return t;
}
var Ie = (e) => (we << BigInt(e)) - we;
function Le(e, t = {}, n = {}) {
	if (!e || typeof e != "object") throw Error("expected valid options object");
	function r(t, n, r) {
		let i = e[t];
		if (r && i === void 0) return;
		let a = typeof i;
		if (a !== n || i === null) throw Error(`param "${t}" is invalid: expected ${n}, got ${a}`);
	}
	let i = (e, t) => Object.entries(e).forEach(([e, n]) => r(e, n, t));
	i(t, !1), i(n, !0);
}
function Re(e) {
	let t = /* @__PURE__ */ new WeakMap();
	return (n, ...r) => {
		let i = t.get(n);
		if (i !== void 0) return i;
		let a = e(n, ...r);
		return t.set(n, a), a;
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/modular.js
var L = /* @__PURE__ */ BigInt(0), R = /* @__PURE__ */ BigInt(1), ze = /* @__PURE__ */ BigInt(2), Be = /* @__PURE__ */ BigInt(3), Ve = /* @__PURE__ */ BigInt(4), He = /* @__PURE__ */ BigInt(5), Ue = /* @__PURE__ */ BigInt(7), We = /* @__PURE__ */ BigInt(8), Ge = /* @__PURE__ */ BigInt(9), Ke = /* @__PURE__ */ BigInt(16);
function z(e, t) {
	let n = e % t;
	return n >= L ? n : t + n;
}
function B(e, t, n) {
	let r = e;
	for (; t-- > L;) r *= r, r %= n;
	return r;
}
function qe(e, t) {
	if (e === L) throw Error("invert: expected non-zero number");
	if (t <= L) throw Error("invert: expected positive modulus, got " + t);
	let n = z(e, t), r = t, i = L, a = R, o = R, s = L;
	for (; n !== L;) {
		let e = r / n, t = r % n, c = i - o * e, l = a - s * e;
		r = n, n = t, i = o, a = s, o = c, s = l;
	}
	if (r !== R) throw Error("invert: does not exist");
	return z(i, t);
}
function Je(e, t, n) {
	if (!e.eql(e.sqr(t), n)) throw Error("Cannot find square root");
}
function Ye(e, t) {
	let n = (e.ORDER + R) / Ve, r = e.pow(t, n);
	return Je(e, r, t), r;
}
function Xe(e, t) {
	let n = (e.ORDER - He) / We, r = e.mul(t, ze), i = e.pow(r, n), a = e.mul(t, i), o = e.mul(e.mul(a, ze), i), s = e.mul(a, e.sub(o, e.ONE));
	return Je(e, s, t), s;
}
function Ze(e) {
	let t = st(e), n = Qe(e), r = n(t, t.neg(t.ONE)), i = n(t, r), a = n(t, t.neg(r)), o = (e + Ue) / Ke;
	return (e, t) => {
		let n = e.pow(t, o), s = e.mul(n, r), c = e.mul(n, i), l = e.mul(n, a), u = e.eql(e.sqr(s), t), d = e.eql(e.sqr(c), t);
		n = e.cmov(n, s, u), s = e.cmov(l, c, d);
		let f = e.eql(e.sqr(s), t), p = e.cmov(n, s, f);
		return Je(e, p, t), p;
	};
}
function Qe(e) {
	if (e < Be) throw Error("sqrt is not defined for small field");
	let t = e - R, n = 0;
	for (; t % ze === L;) t /= ze, n++;
	let r = ze, i = st(e);
	for (; it(i, r) === 1;) if (r++ > 1e3) throw Error("Cannot find square root: probably non-prime P");
	if (n === 1) return Ye;
	let a = i.pow(r, t), o = (t + R) / ze;
	return function(e, r) {
		if (e.is0(r)) return r;
		if (it(e, r) !== 1) throw Error("Cannot find square root");
		let i = n, s = e.mul(e.ONE, a), c = e.pow(r, t), l = e.pow(r, o);
		for (; !e.eql(c, e.ONE);) {
			if (e.is0(c)) return e.ZERO;
			let t = 1, n = e.sqr(c);
			for (; !e.eql(n, e.ONE);) if (t++, n = e.sqr(n), t === i) throw Error("Cannot find square root");
			let r = R << BigInt(i - t - 1), a = e.pow(s, r);
			i = t, s = e.sqr(a), c = e.mul(c, s), l = e.mul(l, a);
		}
		return l;
	};
}
function $e(e) {
	return e % Ve === Be ? Ye : e % We === He ? Xe : e % Ke === Ge ? Ze(e) : Qe(e);
}
var et = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
function tt(e) {
	return Le(e, et.reduce((e, t) => (e[t] = "function", e), {
		ORDER: "bigint",
		BYTES: "number",
		BITS: "number"
	})), e;
}
function nt(e, t, n) {
	if (n < L) throw Error("invalid exponent, negatives unsupported");
	if (n === L) return e.ONE;
	if (n === R) return t;
	let r = e.ONE, i = t;
	for (; n > L;) n & R && (r = e.mul(r, i)), i = e.sqr(i), n >>= R;
	return r;
}
function rt(e, t, n = !1) {
	let r = Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((t, n, i) => e.is0(n) ? t : (r[i] = t, e.mul(t, n)), e.ONE), a = e.inv(i);
	return t.reduceRight((t, n, i) => e.is0(n) ? t : (r[i] = e.mul(t, r[i]), e.mul(t, n)), a), r;
}
function it(e, t) {
	let n = (e.ORDER - R) / ze, r = e.pow(t, n), i = e.eql(r, e.ONE), a = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
	if (!i && !a && !o) throw Error("invalid Legendre symbol result");
	return i ? 1 : a ? 0 : -1;
}
function at(e, n) {
	n !== void 0 && t(n);
	let r = n === void 0 ? e.toString(2).length : n;
	return {
		nBitLength: r,
		nByteLength: Math.ceil(r / 8)
	};
}
var ot = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = L;
	ONE = R;
	_lengths;
	_sqrt;
	_mod;
	constructor(e, t = {}) {
		if (e <= L) throw Error("invalid field: expected ORDER > 0, got " + e);
		let n;
		this.isLE = !1, typeof t == "object" && t && (typeof t.BITS == "number" && (n = t.BITS), typeof t.sqrt == "function" && (this.sqrt = t.sqrt), typeof t.isLE == "boolean" && (this.isLE = t.isLE), t.allowedLengths && (this._lengths = t.allowedLengths?.slice()), typeof t.modFromBytes == "boolean" && (this._mod = t.modFromBytes));
		let { nBitLength: r, nByteLength: i } = at(e, n);
		if (i > 2048) throw Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = e, this.BITS = r, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
	}
	create(e) {
		return z(e, this.ORDER);
	}
	isValid(e) {
		if (typeof e != "bigint") throw Error("invalid field element: expected bigint, got " + typeof e);
		return L <= e && e < this.ORDER;
	}
	is0(e) {
		return e === L;
	}
	isValidNot0(e) {
		return !this.is0(e) && this.isValid(e);
	}
	isOdd(e) {
		return (e & R) === R;
	}
	neg(e) {
		return z(-e, this.ORDER);
	}
	eql(e, t) {
		return e === t;
	}
	sqr(e) {
		return z(e * e, this.ORDER);
	}
	add(e, t) {
		return z(e + t, this.ORDER);
	}
	sub(e, t) {
		return z(e - t, this.ORDER);
	}
	mul(e, t) {
		return z(e * t, this.ORDER);
	}
	pow(e, t) {
		return nt(this, e, t);
	}
	div(e, t) {
		return z(e * qe(t, this.ORDER), this.ORDER);
	}
	sqrN(e) {
		return e * e;
	}
	addN(e, t) {
		return e + t;
	}
	subN(e, t) {
		return e - t;
	}
	mulN(e, t) {
		return e * t;
	}
	inv(e) {
		return qe(e, this.ORDER);
	}
	sqrt(e) {
		return this._sqrt ||= $e(this.ORDER), this._sqrt(this, e);
	}
	toBytes(e) {
		return this.isLE ? je(e, this.BYTES) : Ae(e, this.BYTES);
	}
	fromBytes(e, t = !1) {
		n(e);
		let { _lengths: r, BYTES: i, isLE: a, ORDER: o, _mod: s } = this;
		if (r) {
			if (!r.includes(e.length) || e.length > i) throw Error("Field.fromBytes: expected " + r + " bytes, got " + e.length);
			let t = new Uint8Array(i);
			t.set(e, a ? 0 : t.length - e.length), e = t;
		}
		if (e.length !== i) throw Error("Field.fromBytes: expected " + i + " bytes, got " + e.length);
		let c = a ? ke(e) : Oe(e);
		if (s && (c = z(c, o)), !t && !this.isValid(c)) throw Error("invalid field element: outside of range 0..ORDER");
		return c;
	}
	invertBatch(e) {
		return rt(this, e);
	}
	cmov(e, t, n) {
		return n ? t : e;
	}
};
function st(e, t = {}) {
	return new ot(e, t);
}
function ct(e) {
	if (typeof e != "bigint") throw Error("field order must be bigint");
	let t = e.toString(2).length;
	return Math.ceil(t / 8);
}
function lt(e) {
	let t = ct(e);
	return t + Math.ceil(t / 2);
}
function ut(e, t, r = !1) {
	n(e);
	let i = e.length, a = ct(t), o = lt(t);
	if (i < 16 || i < o || i > 1024) throw Error("expected " + o + "-1024 bytes of input, got " + i);
	let s = z(r ? ke(e) : Oe(e), t - R) + R;
	return r ? je(s, a) : Ae(s, a);
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/curve.js
var dt = /* @__PURE__ */ BigInt(0), ft = /* @__PURE__ */ BigInt(1);
function pt(e, t) {
	let n = t.negate();
	return e ? n : t;
}
function mt(e, t) {
	let n = rt(e.Fp, t.map((e) => e.Z));
	return t.map((t, r) => e.fromAffine(t.toAffine(n[r])));
}
function ht(e, t) {
	if (!Number.isSafeInteger(e) || e <= 0 || e > t) throw Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function gt(e, t) {
	ht(e, t);
	let n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e;
	return {
		windows: n,
		windowSize: r,
		mask: Ie(e),
		maxNumber: i,
		shiftBy: BigInt(e)
	};
}
function _t(e, t, n) {
	let { windowSize: r, mask: i, maxNumber: a, shiftBy: o } = n, s = Number(e & i), c = e >> o;
	s > r && (s -= a, c += ft);
	let l = t * r, u = l + Math.abs(s) - 1, d = s === 0, f = s < 0, p = t % 2 != 0;
	return {
		nextN: c,
		offset: u,
		isZero: d,
		isNeg: f,
		isNegF: p,
		offsetF: l
	};
}
var vt = /* @__PURE__ */ new WeakMap(), yt = /* @__PURE__ */ new WeakMap();
function bt(e) {
	return yt.get(e) || 1;
}
function xt(e) {
	if (e !== dt) throw Error("invalid wNAF");
}
var St = class {
	BASE;
	ZERO;
	Fn;
	bits;
	constructor(e, t) {
		this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = t;
	}
	_unsafeLadder(e, t, n = this.ZERO) {
		let r = e;
		for (; t > dt;) t & ft && (n = n.add(r)), r = r.double(), t >>= ft;
		return n;
	}
	precomputeWindow(e, t) {
		let { windows: n, windowSize: r } = gt(t, this.bits), i = [], a = e, o = a;
		for (let e = 0; e < n; e++) {
			o = a, i.push(o);
			for (let e = 1; e < r; e++) o = o.add(a), i.push(o);
			a = o.double();
		}
		return i;
	}
	wNAF(e, t, n) {
		if (!this.Fn.isValid(n)) throw Error("invalid scalar");
		let r = this.ZERO, i = this.BASE, a = gt(e, this.bits);
		for (let e = 0; e < a.windows; e++) {
			let { nextN: o, offset: s, isZero: c, isNeg: l, isNegF: u, offsetF: d } = _t(n, e, a);
			n = o, c ? i = i.add(pt(u, t[d])) : r = r.add(pt(l, t[s]));
		}
		return xt(n), {
			p: r,
			f: i
		};
	}
	wNAFUnsafe(e, t, n, r = this.ZERO) {
		let i = gt(e, this.bits);
		for (let e = 0; e < i.windows && n !== dt; e++) {
			let { nextN: a, offset: o, isZero: s, isNeg: c } = _t(n, e, i);
			if (n = a, !s) {
				let e = t[o];
				r = r.add(c ? e.negate() : e);
			}
		}
		return xt(n), r;
	}
	getPrecomputes(e, t, n) {
		let r = vt.get(t);
		return r || (r = this.precomputeWindow(t, e), e !== 1 && (typeof n == "function" && (r = n(r)), vt.set(t, r))), r;
	}
	cached(e, t, n) {
		let r = bt(e);
		return this.wNAF(r, this.getPrecomputes(r, e, n), t);
	}
	unsafe(e, t, n, r) {
		let i = bt(e);
		return i === 1 ? this._unsafeLadder(e, t, r) : this.wNAFUnsafe(i, this.getPrecomputes(i, e, n), t, r);
	}
	createCache(e, t) {
		ht(t, this.bits), yt.set(e, t), vt.delete(e);
	}
	hasCache(e) {
		return bt(e) !== 1;
	}
};
function Ct(e, t, n, r) {
	let i = t, a = e.ZERO, o = e.ZERO;
	for (; n > dt || r > dt;) n & ft && (a = a.add(i)), r & ft && (o = o.add(i)), i = i.double(), n >>= ft, r >>= ft;
	return {
		p1: a,
		p2: o
	};
}
function wt(e, t, n) {
	if (t) {
		if (t.ORDER !== e) throw Error("Field.ORDER must match order: Fp == p, Fn == n");
		return tt(t), t;
	}
	return st(e, { isLE: n });
}
function Tt(e, t, n = {}, r) {
	if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object") throw Error(`expected valid ${e} CURVE object`);
	for (let e of [
		"p",
		"n",
		"h"
	]) {
		let n = t[e];
		if (!(typeof n == "bigint" && n > dt)) throw Error(`CURVE.${e} must be positive bigint`);
	}
	let i = wt(t.p, n.Fp, r), a = wt(t.n, n.Fn, r), o = [
		"Gx",
		"Gy",
		"a",
		e === "weierstrass" ? "b" : "d"
	];
	for (let e of o) if (!i.isValid(t[e])) throw Error(`CURVE.${e} must be valid field element of CURVE.Fp`);
	return t = Object.freeze(Object.assign({}, t)), {
		CURVE: t,
		Fp: i,
		Fn: a
	};
}
function Et(e, t) {
	return function(n) {
		let r = e(n);
		return {
			secretKey: r,
			publicKey: t(r)
		};
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/weierstrass.js
var Dt = (e, t) => (e + (e >= 0 ? t : -t) / jt) / t;
function Ot(e, t, n) {
	let [[r, i], [a, o]] = t, s = Dt(o * e, n), c = Dt(-i * e, n), l = e - s * r - c * a, u = -s * i - c * o, d = l < kt, f = u < kt;
	d && (l = -l), f && (u = -u);
	let p = Ie(Math.ceil(Fe(n) / 2)) + At;
	if (l < kt || l >= p || u < kt || u >= p) throw Error("splitScalar (endomorphism): failed, k=" + e);
	return {
		k1neg: d,
		k1: l,
		k2neg: f,
		k2: u
	};
}
var kt = BigInt(0), At = BigInt(1), jt = BigInt(2), Mt = BigInt(3), Nt = BigInt(4);
function Pt(e, t = {}) {
	let r = Tt("weierstrass", e, t), { Fp: i, Fn: a } = r, o = r.CURVE, { h: s, n: c } = o;
	Le(t, {}, {
		allowInfinityPoint: "boolean",
		clearCofactor: "function",
		isTorsionFree: "function",
		fromBytes: "function",
		toBytes: "function",
		endo: "object"
	});
	let { endo: l } = t;
	if (l && (!i.is0(o.a) || typeof l.beta != "bigint" || !Array.isArray(l.basises))) throw Error("invalid endo: expected \"beta\": bigint and \"basises\": array");
	let d = It(i, a);
	function f() {
		if (!i.isOdd) throw Error("compression is not supported: Field does not have .isOdd()");
	}
	function h(e, t, n) {
		let { x: r, y: a } = t.toAffine(), o = i.toBytes(r);
		return Te(n, "isCompressed"), n ? (f(), m(Ft(!i.isOdd(a)), o)) : m(Uint8Array.of(4), o, i.toBytes(a));
	}
	function g(e) {
		n(e, void 0, "Point");
		let { publicKey: t, publicKeyUncompressed: r } = d, a = e.length, o = e[0], s = e.subarray(1);
		if (a === t && (o === 2 || o === 3)) {
			let e = i.fromBytes(s);
			if (!i.isValid(e)) throw Error("bad point: is not on curve, wrong x");
			let t = y(e), n;
			try {
				n = i.sqrt(t);
			} catch (e) {
				let t = e instanceof Error ? ": " + e.message : "";
				throw Error("bad point: is not on curve, sqrt error" + t);
			}
			f();
			let r = i.isOdd(n);
			return (o & 1) == 1 !== r && (n = i.neg(n)), {
				x: e,
				y: n
			};
		}
		if (a === r && o === 4) {
			let e = i.BYTES, t = i.fromBytes(s.subarray(0, e)), n = i.fromBytes(s.subarray(e, e * 2));
			if (!b(t, n)) throw Error("bad point: is not on curve");
			return {
				x: t,
				y: n
			};
		}
		throw Error(`bad point: got length ${a}, expected compressed=${t} or uncompressed=${r}`);
	}
	let _ = t.toBytes || h, v = t.fromBytes || g;
	function y(e) {
		let t = i.sqr(e), n = i.mul(t, e);
		return i.add(i.add(n, i.mul(e, o.a)), o.b);
	}
	function b(e, t) {
		let n = i.sqr(t), r = y(e);
		return i.eql(n, r);
	}
	if (!b(o.Gx, o.Gy)) throw Error("bad curve params: generator point");
	let x = i.mul(i.pow(o.a, Mt), Nt), S = i.mul(i.sqr(o.b), BigInt(27));
	if (i.is0(i.add(x, S))) throw Error("bad curve params: a or b");
	function C(e, t, n = !1) {
		if (!i.isValid(t) || n && i.is0(t)) throw Error(`bad point coordinate ${e}`);
		return t;
	}
	function w(e) {
		if (!(e instanceof k)) throw Error("Weierstrass Point expected");
	}
	function T(e) {
		if (!l || !l.basises) throw Error("no endo");
		return Ot(e, l.basises, a.ORDER);
	}
	let E = Re((e, t) => {
		let { X: n, Y: r, Z: a } = e;
		if (i.eql(a, i.ONE)) return {
			x: n,
			y: r
		};
		let o = e.is0();
		t ??= o ? i.ONE : i.inv(a);
		let s = i.mul(n, t), c = i.mul(r, t), l = i.mul(a, t);
		if (o) return {
			x: i.ZERO,
			y: i.ZERO
		};
		if (!i.eql(l, i.ONE)) throw Error("invZ was invalid");
		return {
			x: s,
			y: c
		};
	}), D = Re((e) => {
		if (e.is0()) {
			if (t.allowInfinityPoint && !i.is0(e.Y)) return;
			throw Error("bad point: ZERO");
		}
		let { x: n, y: r } = e.toAffine();
		if (!i.isValid(n) || !i.isValid(r)) throw Error("bad point: x or y not field elements");
		if (!b(n, r)) throw Error("bad point: equation left != right");
		if (!e.isTorsionFree()) throw Error("bad point: not in prime-order subgroup");
		return !0;
	});
	function O(e, t, n, r, a) {
		return n = new k(i.mul(n.X, e), n.Y, n.Z), t = pt(r, t), n = pt(a, n), t.add(n);
	}
	class k {
		static BASE = new k(o.Gx, o.Gy, i.ONE);
		static ZERO = new k(i.ZERO, i.ONE, i.ZERO);
		static Fp = i;
		static Fn = a;
		X;
		Y;
		Z;
		constructor(e, t, n) {
			this.X = C("x", e), this.Y = C("y", t, !0), this.Z = C("z", n), Object.freeze(this);
		}
		static CURVE() {
			return o;
		}
		static fromAffine(e) {
			let { x: t, y: n } = e || {};
			if (!e || !i.isValid(t) || !i.isValid(n)) throw Error("invalid affine point");
			if (e instanceof k) throw Error("projective point not allowed");
			return i.is0(t) && i.is0(n) ? k.ZERO : new k(t, n, i.ONE);
		}
		static fromBytes(e) {
			let t = k.fromAffine(v(n(e, void 0, "point")));
			return t.assertValidity(), t;
		}
		static fromHex(e) {
			return k.fromBytes(p(e));
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(e = 8, t = !0) {
			return j.createCache(this, e), t || this.multiply(Mt), this;
		}
		assertValidity() {
			D(this);
		}
		hasEvenY() {
			let { y: e } = this.toAffine();
			if (!i.isOdd) throw Error("Field doesn't support isOdd");
			return !i.isOdd(e);
		}
		equals(e) {
			w(e);
			let { X: t, Y: n, Z: r } = this, { X: a, Y: o, Z: s } = e, c = i.eql(i.mul(t, s), i.mul(a, r)), l = i.eql(i.mul(n, s), i.mul(o, r));
			return c && l;
		}
		negate() {
			return new k(this.X, i.neg(this.Y), this.Z);
		}
		double() {
			let { a: e, b: t } = o, n = i.mul(t, Mt), { X: r, Y: a, Z: s } = this, c = i.ZERO, l = i.ZERO, u = i.ZERO, d = i.mul(r, r), f = i.mul(a, a), p = i.mul(s, s), m = i.mul(r, a);
			return m = i.add(m, m), u = i.mul(r, s), u = i.add(u, u), c = i.mul(e, u), l = i.mul(n, p), l = i.add(c, l), c = i.sub(f, l), l = i.add(f, l), l = i.mul(c, l), c = i.mul(m, c), u = i.mul(n, u), p = i.mul(e, p), m = i.sub(d, p), m = i.mul(e, m), m = i.add(m, u), u = i.add(d, d), d = i.add(u, d), d = i.add(d, p), d = i.mul(d, m), l = i.add(l, d), p = i.mul(a, s), p = i.add(p, p), d = i.mul(p, m), c = i.sub(c, d), u = i.mul(p, f), u = i.add(u, u), u = i.add(u, u), new k(c, l, u);
		}
		add(e) {
			w(e);
			let { X: t, Y: n, Z: r } = this, { X: a, Y: s, Z: c } = e, l = i.ZERO, u = i.ZERO, d = i.ZERO, f = o.a, p = i.mul(o.b, Mt), m = i.mul(t, a), h = i.mul(n, s), g = i.mul(r, c), _ = i.add(t, n), v = i.add(a, s);
			_ = i.mul(_, v), v = i.add(m, h), _ = i.sub(_, v), v = i.add(t, r);
			let y = i.add(a, c);
			return v = i.mul(v, y), y = i.add(m, g), v = i.sub(v, y), y = i.add(n, r), l = i.add(s, c), y = i.mul(y, l), l = i.add(h, g), y = i.sub(y, l), d = i.mul(f, v), l = i.mul(p, g), d = i.add(l, d), l = i.sub(h, d), d = i.add(h, d), u = i.mul(l, d), h = i.add(m, m), h = i.add(h, m), g = i.mul(f, g), v = i.mul(p, v), h = i.add(h, g), g = i.sub(m, g), g = i.mul(f, g), v = i.add(v, g), m = i.mul(h, v), u = i.add(u, m), m = i.mul(y, v), l = i.mul(_, l), l = i.sub(l, m), m = i.mul(_, h), d = i.mul(y, d), d = i.add(d, m), new k(l, u, d);
		}
		subtract(e) {
			return this.add(e.negate());
		}
		is0() {
			return this.equals(k.ZERO);
		}
		multiply(e) {
			let { endo: n } = t;
			if (!a.isValidNot0(e)) throw Error("invalid scalar: out of range");
			let r, i, o = (e) => j.cached(this, e, (e) => mt(k, e));
			if (n) {
				let { k1neg: t, k1: a, k2neg: s, k2: c } = T(e), { p: l, f: u } = o(a), { p: d, f } = o(c);
				i = u.add(f), r = O(n.beta, l, d, t, s);
			} else {
				let { p: t, f: n } = o(e);
				r = t, i = n;
			}
			return mt(k, [r, i])[0];
		}
		multiplyUnsafe(e) {
			let { endo: n } = t, r = this;
			if (!a.isValid(e)) throw Error("invalid scalar: out of range");
			if (e === kt || r.is0()) return k.ZERO;
			if (e === At) return r;
			if (j.hasCache(this)) return this.multiply(e);
			if (n) {
				let { k1neg: t, k1: i, k2neg: a, k2: o } = T(e), { p1: s, p2: c } = Ct(k, r, i, o);
				return O(n.beta, s, c, t, a);
			}
			return j.unsafe(r, e);
		}
		toAffine(e) {
			return E(this, e);
		}
		isTorsionFree() {
			let { isTorsionFree: e } = t;
			return s === At ? !0 : e ? e(k, this) : j.unsafe(this, c).is0();
		}
		clearCofactor() {
			let { clearCofactor: e } = t;
			return s === At ? this : e ? e(k, this) : this.multiplyUnsafe(s);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(s).is0();
		}
		toBytes(e = !0) {
			return Te(e, "isCompressed"), this.assertValidity(), _(k, this, e);
		}
		toHex(e = !0) {
			return u(this.toBytes(e));
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	let A = a.BITS, j = new St(k, t.endo ? Math.ceil(A / 2) : A);
	return k.BASE.precompute(8), k;
}
function Ft(e) {
	return Uint8Array.of(e ? 2 : 3);
}
function It(e, t) {
	return {
		secretKey: t.BYTES,
		publicKey: 1 + e.BYTES,
		publicKeyUncompressed: 1 + 2 * e.BYTES,
		publicKeyHasPrefix: !0,
		signature: 2 * t.BYTES
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/secp256k1.js
var Lt = {
	p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
	n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	h: BigInt(1),
	a: BigInt(0),
	b: BigInt(7),
	Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
	Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Rt = {
	beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
	basises: [[BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")], [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]]
}, zt = /* @__PURE__ */ BigInt(0), Bt = /* @__PURE__ */ BigInt(2);
function Vt(e) {
	let t = Lt.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), a = BigInt(22), o = BigInt(23), s = BigInt(44), c = BigInt(88), l = e * e * e % t, u = l * l * e % t, d = B(B(B(u, n, t) * u % t, n, t) * u % t, Bt, t) * l % t, f = B(d, i, t) * d % t, p = B(f, a, t) * f % t, m = B(p, s, t) * p % t, h = B(B(B(B(B(B(m, c, t) * m % t, s, t) * p % t, n, t) * u % t, o, t) * f % t, r, t) * l % t, Bt, t);
	if (!Ht.eql(Ht.sqr(h), e)) throw Error("Cannot find square root");
	return h;
}
var Ht = st(Lt.p, { sqrt: Vt }), Ut = /* @__PURE__ */ Pt(Lt, {
	Fp: Ht,
	endo: Rt
}), Wt = {};
function Gt(e, ...t) {
	let n = Wt[e];
	if (n === void 0) {
		let t = Se(Ne(e));
		n = m(t, t), Wt[e] = n;
	}
	return Se(m(n, ...t));
}
var Kt = (e) => e.toBytes(!0).slice(1), qt = (e) => e % Bt === zt;
function Jt(e) {
	let { Fn: t, BASE: n } = Ut, r = t.fromBytes(e), i = n.multiply(r);
	return {
		scalar: qt(i.y) ? r : t.neg(r),
		bytes: Kt(i)
	};
}
function Yt(e) {
	let t = Ht;
	if (!t.isValidNot0(e)) throw Error("invalid x: Fail if x ≥ p");
	let n = t.create(e * e), r = t.create(n * e + BigInt(7)), i = t.sqrt(r);
	qt(i) || (i = t.neg(i));
	let a = Ut.fromAffine({
		x: e,
		y: i
	});
	return a.assertValidity(), a;
}
var Xt = Oe;
function Zt(...e) {
	return Ut.Fn.create(Xt(Gt("BIP0340/challenge", ...e)));
}
function Qt(e) {
	return Jt(e).bytes;
}
function $t(e, t, r = g(32)) {
	let { Fn: i } = Ut, a = n(e, void 0, "message"), { bytes: o, scalar: s } = Jt(t), c = n(r, 32, "auxRand"), { bytes: l, scalar: u } = Jt(Gt("BIP0340/nonce", i.toBytes(s ^ Xt(Gt("BIP0340/aux", c))), o, a)), d = Zt(l, o, a), f = /* @__PURE__ */ new Uint8Array(64);
	if (f.set(l, 0), f.set(i.toBytes(i.create(u + d * s)), 32), !en(f, a, o)) throw Error("sign: Invalid signature produced");
	return f;
}
function en(e, t, r) {
	let { Fp: i, Fn: a, BASE: o } = Ut, s = n(e, 64, "signature"), c = n(t, void 0, "message"), l = n(r, 32, "publicKey");
	try {
		let e = Yt(Xt(l)), t = Xt(s.subarray(0, 32));
		if (!i.isValidNot0(t)) return !1;
		let n = Xt(s.subarray(32, 64));
		if (!a.isValidNot0(n)) return !1;
		let r = Zt(a.toBytes(t), Kt(e), c), u = o.multiplyUnsafe(n).add(e.multiplyUnsafe(a.neg(r))), { x: d, y: f } = u.toAffine();
		return !(u.is0() || !qt(f) || d !== t);
	} catch {
		return !1;
	}
}
var tn = /* @__PURE__ */ (() => {
	let e = (e = g(48)) => ut(e, Lt.n);
	return {
		keygen: Et(e, Qt),
		getPublicKey: Qt,
		sign: $t,
		verify: en,
		Point: Ut,
		utils: {
			randomSecretKey: e,
			taggedHash: Gt,
			lift_x: Yt,
			pointToBytes: Kt
		},
		lengths: {
			secretKey: 32,
			publicKey: 32,
			publicKeyHasPrefix: !1,
			signature: 64,
			seed: 48
		}
	};
})();
// node_modules/nostr-tools/lib/esm/pure.js
new TextDecoder("utf-8");
var nn = new TextEncoder();
function rn(e) {
	if (e.length !== 64) return !1;
	for (let t = 0; t < 64; t++) {
		let n = e.charCodeAt(t);
		if (isNaN(n) || n < 48 || n > 102 || n > 57 && n < 97) return !1;
	}
	return !0;
}
var an = Symbol("verified"), on = (e) => e instanceof Object;
function sn(e) {
	if (!on(e) || typeof e.kind != "number" || typeof e.content != "string" || typeof e.created_at != "number" || typeof e.pubkey != "string" || !rn(e.pubkey) || !Array.isArray(e.tags)) return !1;
	for (let t = 0; t < e.tags.length; t++) {
		let n = e.tags[t];
		if (!Array.isArray(n)) return !1;
		for (let e = 0; e < n.length; e++) if (typeof n[e] != "string") return !1;
	}
	return !0;
}
var cn = class {
	generateSecretKey() {
		return tn.utils.randomSecretKey();
	}
	getPublicKey(e) {
		return u(tn.getPublicKey(e));
	}
	finalizeEvent(e, t) {
		let n = e;
		return n.pubkey = u(tn.getPublicKey(t)), n.id = un(n), n.sig = u(tn.sign(p(un(n)), t)), n[an] = !0, n;
	}
	verifyEvent(e) {
		if (typeof e[an] == "boolean") return e[an];
		try {
			let t = un(e);
			if (t !== e.id) return e[an] = !1, !1;
			let n = tn.verify(p(e.sig), p(t), p(e.pubkey));
			return e[an] = n, n;
		} catch {
			return e[an] = !1, !1;
		}
	}
};
function ln(e) {
	if (!sn(e)) throw Error("can't serialize event with wrong or missing properties");
	return JSON.stringify([
		0,
		e.pubkey,
		e.created_at,
		e.kind,
		e.tags,
		e.content
	]);
}
function un(e) {
	return u(Se(nn.encode(ln(e))));
}
var dn = new cn();
dn.generateSecretKey, dn.getPublicKey, dn.finalizeEvent;
var fn = dn.verifyEvent, V = {
	note: 1,
	pqBinding: 3470,
	acceptance: 3471,
	payment: 3472,
	donation: 3473,
	indexValue: 3474,
	survey: 3475,
	tokenRequest: 3476,
	tokenIssue: 3477,
	answer: 3478,
	review: 3479,
	credential: 3480,
	approval: 3481,
	comment: 1111,
	reaction: 7,
	report: 1984,
	listing: 30402,
	supportPage: 13470,
	relayPayout: 13471,
	feedRecipe: 33475,
	mediaKit: 33476,
	store: 33477,
	show: 33478,
	campaign: 33479,
	placement: 33480,
	offer: 33470
}, pn = "fairground/v1";
// node_modules/@noble/hashes/utils.js
function mn(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
var hn = (e) => e ? `"${e}" ` : "";
function H(e, t = "") {
	if (typeof e != "number") throw TypeError(hn(t) + "expected number, got " + typeof e);
	if (!Number.isSafeInteger(e) || e < 0) throw RangeError(hn(t) + "expected integer >= 0, got " + e);
	return e;
}
function gn(e, t = "") {
	if (typeof e != "boolean") throw TypeError(hn(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function U(e, t, n = "") {
	if (mn(e) && (t === void 0 || e.length === t)) return e;
	t !== void 0 && H(t, "length");
	let r = mn(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = hn(n) + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}
function _n(e) {
	if (typeof e != "function" || typeof e.create != "function") throw TypeError("expected hash wrapped by utils.createHasher");
	if (H(e.outputLen), H(e.blockLen), e.outputLen < 1 || e.blockLen < 1) throw Error("hash blockLen / outputLen must be >= 1");
}
var vn = (e, t) => {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, yn = (e, t) => {
	vn(e, t);
	let n = Object.getPrototypeOf(e);
	if (n !== Object.prototype && n !== null) throw TypeError(`"${t}" expected plain object`);
	if (Object.hasOwn(e, "__proto__")) throw TypeError(`"${t}.__proto__" is not allowed`);
};
function bn(e, t = !0) {
	if (e.destroyed) throw Error("hash was destroyed");
	if (t && e.finished) throw Error("digest() was already called");
}
function xn(e, t) {
	U(e, void 0, "output");
	let n = t.outputLen;
	if (!(e.length >= n)) throw RangeError("\"output\" expected length >= " + n);
}
function Sn(e) {
	return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function Cn(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function wn(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function W(e, t) {
	return e << 32 - t | e >>> t;
}
var Tn = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function En(e) {
	return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
function Dn(e) {
	for (let t = 0; t < e.length; t++) e[t] = En(e[t]);
	return e;
}
var On = Tn ? (e) => e : Dn, kn = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", An = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function jn(e) {
	if (U(e), kn) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += An[e[n]];
	return t;
}
function Mn(e) {
	if (typeof e != "string") throw TypeError("string expected");
	let t = new TextEncoder().encode(e);
	try {
		return new Uint8Array(t);
	} finally {
		Cn(t);
	}
}
function Nn(...e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		U(r), t += r.length;
	}
	let n = new Uint8Array(t);
	for (let t = 0, r = 0; t < e.length; t++) {
		let i = e[t];
		n.set(i, r), r += i.length;
	}
	return n;
}
function Pn(e, t, n = "opts") {
	return yn(e, "defaults"), t !== void 0 && yn(t, n), Object.assign(Object.create(null), e, t);
}
function Fn(e, t = {}) {
	if (typeof e != "function") throw TypeError("\"hashCons\" expected function, got type=" + typeof e);
	t = Pn({}, t, "info");
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function In(e = 32) {
	H(e, "bytesLength");
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	if (e > 65536) throw RangeError(`"bytesLength" expected <= 65536, got ${e}`);
	return t.getRandomValues(new Uint8Array(e));
}
var Ln = (e) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	e
]) });
// node_modules/@noble/curves/utils.js
function Rn(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
var zn = (e) => e ? `"${e}" ` : "";
function Bn(e, t = "") {
	if (typeof e != "boolean") throw TypeError(zn(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function Vn(e, t = {}, n = {}, r = "object") {
	Rn(e, r), Rn(t, "fields"), Rn(n, "optFields");
	function i(t, n, i) {
		let a = r === "object" ? `param "${String(t)}"` : `"${r}.${String(t)}"`, o = e[t];
		if (!Object.hasOwn(e, t) && (i ? o !== void 0 : n !== "function")) throw TypeError(`${a} is invalid: expected own property`);
		if (i && o === void 0) return;
		let s = typeof o;
		if (s !== n || o === null) throw TypeError(`${a} is invalid: expected ${n}, got ${s}`);
	}
	let a = (e, t) => Object.entries(e).forEach(([e, n]) => i(e, n, t));
	a(t, !1), a(n, !0);
}
// node_modules/@noble/hashes/_u64.js
var Hn = /* @__PURE__ */ BigInt(2 ** 32 - 1), Un = /* @__PURE__ */ BigInt(32);
function Wn(e, t = !1) {
	return t ? {
		h: Number(e & Hn),
		l: Number(e >> Un & Hn)
	} : {
		h: Number(e >> Un & Hn) | 0,
		l: Number(e & Hn) | 0
	};
}
function Gn(e, t = !1) {
	let n = e.length, r = new Uint32Array(n), i = new Uint32Array(n);
	for (let a = 0; a < n; a++) {
		let { h: n, l: o } = Wn(e[a], t);
		[r[a], i[a]] = [n, o];
	}
	return [r, i];
}
var Kn = (e) => e / 2 ** 32 | 0, qn = (e) => e >>> 0;
function Jn(e, t, n, r) {
	let i = Kn(n), a = qn(n);
	e.setUint32(t, r ? a : i, r), e.setUint32(t + 4, r ? i : a, r);
}
var Yn = BigInt(0), Xn = BigInt(1), Zn = BigInt(2), Qn = BigInt(7), $n = BigInt(256), er = BigInt(113), tr = [], nr = [], rr = [];
for (let e = 0, t = Xn, n = 1, r = 0; e < 24; e++) {
	[n, r] = [r, (2 * n + 3 * r) % 5], tr.push(2 * (5 * r + n)), nr.push((e + 1) * (e + 2) / 2 % 64);
	let i = Yn;
	for (let e = 0; e < 7; e++) t = (t << Xn ^ (t >> Qn) * er) % $n, t & Zn && (i ^= Xn << (Xn << BigInt(e)) - Xn);
	rr.push(i);
}
var ir = Gn(rr, !0), ar = ir[0], or = ir[1], sr = (e, t, n) => e << n | t >>> 32 - n, cr = (e, t, n) => t << n | e >>> 32 - n, lr = (e, t, n) => t << n - 32 | e >>> 64 - n, ur = (e, t, n) => e << n - 32 | t >>> 64 - n, dr = (e, t, n) => n > 32 ? lr(e, t, n) : sr(e, t, n), fr = (e, t, n) => n > 32 ? ur(e, t, n) : cr(e, t, n), pr = /* @__PURE__ */ new Uint32Array(10);
function mr(e, t = 24) {
	if (!(e instanceof Uint32Array)) throw TypeError("\"s\" expected Uint32Array(50), got type=" + typeof e);
	if (e.length !== 50) throw RangeError("\"s\" expected Uint32Array(50), got length=" + e.length);
	if (H(t, "rounds"), t < 1 || t > 24) throw Error("\"rounds\" expected integer 1..24");
	for (let n = 24 - t; n < 24; n++) {
		for (let t = 0; t < 10; t++) pr[t] = e[t] ^ e[t + 10] ^ e[t + 20] ^ e[t + 30] ^ e[t + 40];
		for (let t = 0; t < 10; t += 2) {
			let n = (t + 8) % 10, r = (t + 2) % 10, i = pr[r], a = pr[r + 1], o = dr(i, a, 1) ^ pr[n], s = fr(i, a, 1) ^ pr[n + 1];
			for (let n = 0; n < 50; n += 10) e[t + n] ^= o, e[t + n + 1] ^= s;
		}
		let t = e[2], r = e[3];
		for (let n = 0; n < 24; n++) {
			let i = nr[n], a = dr(t, r, i), o = fr(t, r, i), s = tr[n];
			t = e[s], r = e[s + 1], e[s] = a, e[s + 1] = o;
		}
		for (let t = 0; t < 50; t += 10) {
			let n = e[t], r = e[t + 1], i = e[t + 2], a = e[t + 3];
			e[t] ^= ~e[t + 2] & e[t + 4], e[t + 1] ^= ~e[t + 3] & e[t + 5], e[t + 2] ^= ~e[t + 4] & e[t + 6], e[t + 3] ^= ~e[t + 5] & e[t + 7], e[t + 4] ^= ~e[t + 6] & e[t + 8], e[t + 5] ^= ~e[t + 7] & e[t + 9], e[t + 6] ^= ~e[t + 8] & n, e[t + 7] ^= ~e[t + 9] & r, e[t + 8] ^= ~n & i, e[t + 9] ^= ~r & a;
		}
		e[0] ^= ar[n], e[1] ^= or[n];
	}
	Cn(pr);
}
var hr = class e {
	state;
	pos = 0;
	posOut = 0;
	finished = !1;
	state32;
	destroyed = !1;
	blockLen;
	suffix;
	outputLen;
	canXOF;
	enableXOF = !1;
	rounds;
	constructor(e, t, n, r = !1, i = 24) {
		if (H(e, "blockLen"), H(t, "suffix"), H(i, "rounds"), gn(r, "enableXOF"), this.blockLen = e, this.suffix = t, this.outputLen = n, this.enableXOF = r, this.canXOF = r, this.rounds = i, H(n, "outputLen"), !(0 < e && e < 200)) throw Error("\"blockLen\" must be 1..199");
		this.state = /* @__PURE__ */ new Uint8Array(200), this.state32 = Sn(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		On(this.state32), mr(this.state32, this.rounds), On(this.state32), this.posOut = 0, this.pos = 0;
	}
	update(e) {
		bn(this), U(e);
		let { blockLen: t, state: n, state32: r } = this, i = e.length, a = t % 4 == 0 && e.byteOffset % 4 == 0, o = t / 4, s = a && i >= t ? Sn(e) : void 0;
		for (let a = 0; a < i;) {
			if (s !== void 0 && this.pos === 0 && a % 4 == 0 && i - a >= t) {
				for (let e = 0, t = a / 4; e < o; e++) r[e] ^= s[t + e];
				a += t, this.pos = t, this.keccak();
				continue;
			}
			let c = Math.min(t - this.pos, i - a);
			for (let t = 0; t < c; t++) n[this.pos++] ^= e[a++];
			this.pos === t && this.keccak();
		}
		return this;
	}
	finish() {
		if (this.finished) return;
		this.finished = !0;
		let { state: e, suffix: t, pos: n, blockLen: r } = this;
		e[n] ^= t, t & 128 && n === r - 1 && this.keccak(), e[r - 1] ^= 128, this.keccak();
	}
	writeInto(e) {
		bn(this, !1), U(e), this.finish();
		let t = this.state, { blockLen: n } = this;
		for (let r = 0, i = e.length; r < i;) {
			this.posOut >= n && this.keccak();
			let a = Math.min(n - this.posOut, i - r);
			e.set(t.subarray(this.posOut, this.posOut + a), r), this.posOut += a, r += a;
		}
		return e;
	}
	xofInto(e) {
		if (!this.enableXOF) throw Error("XOF is not enabled");
		return this.writeInto(e);
	}
	xof(e) {
		return H(e), this.xofInto(new Uint8Array(e));
	}
	digestInto(e) {
		if (xn(e, this), this.finished) throw Error("digest() was already called");
		this.writeInto(e.length === this.outputLen ? e : e.subarray(0, this.outputLen)), this.destroy();
	}
	digest() {
		let e = new Uint8Array(this.outputLen);
		return this.digestInto(e), e;
	}
	destroy() {
		this.destroyed = !0, Cn(this.state);
	}
	_cloneInto(t) {
		let { blockLen: n, suffix: r, outputLen: i, rounds: a, enableXOF: o } = this;
		return t ||= new e(n, r, i, o, a), t.blockLen = n, t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = a, t.suffix = r, t.outputLen = i, t.enableXOF = o, t.canXOF = this.canXOF, t.destroyed = this.destroyed, t;
	}
}, gr = (e, t, n, r = {}) => Fn((r = {}) => (r = Pn({}, r), new hr(t, e, r.dkLen === void 0 ? n : r.dkLen, !0)), r), _r = /* @__PURE__ */ gr(31, 168, 16, /* @__PURE__ */ Ln(11)), G = /* @__PURE__ */ gr(31, 136, 32, /* @__PURE__ */ Ln(12));
// node_modules/@noble/curves/abstract/fft.js
function vr(e, t = "n") {
	if (typeof e != "number") throw TypeError(`wrong u32 integer "${t}": expected number, got type=${typeof e}`);
	if (!Number.isSafeInteger(e) || e < 0 || e > 4294967295) throw RangeError(`wrong u32 integer "${t}": expected 0..4294967295, got ${e}`);
	return e;
}
function yr(e) {
	return vr(e, "x"), !(e & e - 1) && e !== 0;
}
function br(e, t) {
	if (vr(e), typeof t != "number") throw TypeError("\"bits\" expected number, got type=" + typeof t);
	if (!Number.isSafeInteger(t) || t < 0 || t > 32) throw Error(`expected integer 0 <= bits <= 32, got ${t}`);
	let n = 0;
	for (let r = 0; r < t; r++, e >>>= 1) n = n << 1 | e & 1;
	return n >>> 0;
}
function xr(e) {
	return vr(e), 31 - Math.clz32(e);
}
function Sr(e) {
	if (!e || typeof e != "object" || typeof e.length != "number") throw TypeError("\"values\" expected array-like, got type=" + typeof e);
	let t = e.length;
	if (!yr(t)) throw Error("expected positive power-of-two length, got " + t);
	let n = xr(t);
	for (let r = 0; r < t; r++) {
		let t = br(r, n);
		if (r < t) {
			let n = e[r];
			e[r] = e[t], e[t] = n;
		}
	}
	return e;
}
var Cr = (e, t) => {
	Vn(t, {
		N: "number",
		roots: "object",
		dit: "boolean"
	}, {
		invertButterflies: "boolean",
		skipStages: "number",
		brp: "boolean"
	}, "coreOpts");
	let { N: n, roots: r, dit: i, invertButterflies: a = !1, skipStages: o = 0, brp: s = !0 } = t;
	vr(n, "coreOpts.N");
	let c = xr(n);
	if (!yr(n)) throw Error("FFT: Polynomial size should be power of two");
	vr(o, "coreOpts.skipStages");
	let l = c === 0 ? 0 : c - 1;
	if (o > l) throw Error(`FFT: wrong skipStages: expected 0 <= skipStages <= ${l}`);
	if (r.length !== n) throw Error(`FFT: wrong roots length: expected ${n}, got ${r.length}`);
	let u = i !== a;
	return (t) => {
		if (t.length !== n) throw Error("FFT: wrong Polynomial length");
		i && s && Sr(t);
		for (let s = 0, l = 1; s < c - o; s++) {
			let d = i ? s + 1 + o : c - s, f = 1 << d, p = f >> 1, m = n >> d;
			for (let o = 0; o < n; o += f) for (let s = 0, c = l++; s < p; s++) {
				let l = a ? i ? n - c : c : s * m, d = o + s, f = o + s + p, h = r[l], g = t[f], _ = t[d];
				if (u) {
					let n = e.mul(g, h);
					t[d] = e.add(_, n), t[f] = e.sub(_, n);
				} else a ? (t[d] = e.add(g, _), t[f] = e.mul(e.sub(g, _), h)) : (t[d] = e.add(_, g), t[f] = e.mul(e.sub(_, g), h));
			}
		}
		return !i && s && Sr(t), t;
	};
}, wr = U, Tr = In;
function Er(e, t, n = () => {}) {
	if (!Array.isArray(e)) throw TypeError(`"${t}" expected array, got type=${typeof e}`);
	for (let r = 0; r < e.length; r++) n(e[r], `${t}[${r}]`);
	return e;
}
function Dr(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
function Or(e, t) {
	if (e = U(e), t = U(t), e.length !== t.length) return !1;
	let n = 0;
	for (let r = 0; r < e.length; r++) n |= e[r] ^ t[r];
	return n === 0;
}
function kr(e) {
	if (mn(e)) throw TypeError("\"opts\" expected object, got Uint8Array");
	Dr(e, "opts");
	let t = Object.getPrototypeOf(e);
	if (t !== null && t !== Object.prototype) throw TypeError("\"opts\" expected a plain object");
}
var Ar = /* @__PURE__ */ Object.freeze(["context"]), jr = /* @__PURE__ */ Object.freeze(["context", "extraEntropy"]);
function Mr(e, t) {
	kr(e);
	let n = Object.assign(Object.create(null), e);
	for (let [e, r] of Object.entries(n)) if (r !== void 0 && !t.includes(e)) throw TypeError("unexpected option \"" + String(e) + "\"; expected one of: " + t.join(", "));
	return Object.freeze(n);
}
function Nr(e, t = Ar) {
	let n = Mr(e, t);
	return n.context !== void 0 && U(n.context, void 0, "opts.context"), n;
}
function Pr(e, t = jr) {
	let n = Mr(e, t);
	return n.context !== void 0 && U(n.context, void 0, "opts.context"), n.extraEntropy !== !1 && n.extraEntropy !== void 0 && U(n.extraEntropy, void 0, "opts.extraEntropy"), n;
}
function Fr(e, ...t) {
	let n = (e) => typeof e == "number" ? e : e.bytesLen, r = t.reduce((e, t) => e + n(t), 0);
	return {
		bytesLen: r,
		encode: (i) => {
			let a = new Uint8Array(r);
			for (let r = 0, o = 0; r < t.length; r++) {
				let s = t[r], c = n(s), l = typeof s == "number" ? i[r] : s.encode(i[r]);
				U(l, c, e), a.set(l, o), typeof s != "number" && l.fill(0), o += c;
			}
			return a;
		},
		decode: (i) => {
			U(i, r, e);
			let a = [];
			for (let e of t) {
				let t = n(e), r = i.subarray(0, t);
				a.push(typeof e == "number" ? r : e.decode(r)), i = i.subarray(t);
			}
			return a;
		}
	};
}
function Ir(e, t) {
	let n = e, r = t * n.bytesLen;
	return {
		bytesLen: r,
		encode: (e) => {
			let i = Er(e, "u");
			if (i.length !== t) throw RangeError(`vecCoder.encode: wrong length=${i.length}. Expected: ${t}`);
			let a = new Uint8Array(r);
			for (let e = 0, t = 0; e < i.length; e++) {
				let r = n.encode(i[e]);
				a.set(r, t), r.fill(0), t += r.length;
			}
			return a;
		},
		decode: (e) => {
			U(e, r);
			let t = [];
			for (let r = 0; r < e.length; r += n.bytesLen) t.push(n.decode(e.subarray(r, r + n.bytesLen)));
			return t;
		}
	};
}
function K(...e) {
	for (let t of e) if (Array.isArray(t)) for (let e of t) e.fill(0);
	else t.fill(0);
}
function Lr(e) {
	if (H(e, "bits"), e > 32) throw RangeError("\"bits\" expected <= 32, got " + e);
	return e === 32 ? 4294967295 : ~(-1 << e) >>> 0;
}
var Rr = /* @__PURE__ */ Uint8Array.of();
function zr(e, t = Rr) {
	if (U(e, void 0, "msg"), U(t, void 0, "ctx"), t.length > 255) throw RangeError("context should be 255 bytes or less");
	return Nn(new Uint8Array([0, t.length]), t, e);
}
var Br = /* @__PURE__ */ Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2
]), Vr = {
	"060960864801650304020b": 32,
	"060960864801650304020c": 64
};
function Hr(e, t = 0) {
	if (typeof e != "function" || typeof e.create != "function") throw TypeError("\"hash\" expected hash function, got type=" + typeof e);
	_n(e), H(t, "requiredStrength");
	let n = e.oid;
	if (U(n, void 0, "hash.oid"), !Or(n.subarray(0, 10), Br)) throw Error("\"hash.oid\" is invalid: expected NIST hash");
	let r = Vr[jn(n)];
	if (r !== void 0 && e.outputLen !== r) throw Error("Pre-hash XOF output length must be " + r + " bytes for this OID, got: " + e.outputLen);
	let i = e.outputLen * 8 / 2;
	if (t > i) throw Error("Pre-hash security strength too low: " + i + ", required: " + t);
}
function Ur(e, t, n = Rr) {
	if (Hr(e), U(t, void 0, "msg"), U(n, void 0, "ctx"), n.length > 255) throw RangeError("context should be 255 bytes or less");
	let r = e(t);
	return Nn(new Uint8Array([1, n.length]), n, e.oid, r);
}
// node_modules/@noble/post-quantum/_crystals.js
var Wr = (e) => {
	let { newPoly: t, N: n, Q: r, F: i, ROOT_OF_UNITY: a, brvBits: o, isKyber: s } = e, c = (e, t = r) => {
		let n = e % t | 0;
		return (n >= 0 ? n | 0 : t + n | 0) | 0;
	}, l = (e, t = r) => {
		let n = c(e, t) | 0;
		return (n > t >> 1 ? n - t | 0 : n) | 0;
	};
	function u() {
		let e = t(n);
		for (let t = 0; t < n; t++) {
			let n = br(t, o), i = BigInt(a) ** BigInt(n) % BigInt(r);
			e[t] = Number(i) | 0;
		}
		return e;
	}
	let d = u(), f = (e) => {
		throw Error("not implemented");
	}, p = s ? {
		add: (e, t) => {
			let n = e + t | 0;
			return n >= r ? n - r | 0 : n;
		},
		sub: (e, t) => {
			let n = e - t | 0;
			return n < 0 ? n + r | 0 : n;
		},
		mul: (e, t) => c((e | 0) * (t | 0)) | 0,
		inv: f
	} : {
		add: (e, t) => c((e | 0) + (t | 0)) | 0,
		sub: (e, t) => c((e | 0) - (t | 0)) | 0,
		mul: (e, t) => c((e | 0) * (t | 0)) | 0,
		inv: f
	}, m = {
		N: n,
		roots: d,
		invertButterflies: !0,
		skipStages: +!!s,
		brp: !1
	}, h = Cr(p, {
		dit: !1,
		...m
	}), g = Cr(p, {
		dit: !0,
		...m
	}), _ = {
		encode: (e) => h(e),
		decode: (e) => {
			g(e);
			for (let t = 0; t < e.length; t++) e[t] = c(i * e[t]);
			return e;
		}
	};
	return {
		mod: c,
		smod: l,
		nttZetas: d,
		NTT: {
			encode: (e) => _.encode(e),
			decode: (e) => _.decode(e)
		},
		bitsCoder: (e, r) => {
			for (let t = 0, r = 0; t < n; t++) r += e, r > 32 && Lr(r), r %= 8;
			let i = Lr(e), a = n / 8 * e;
			return {
				bytesLen: a,
				encode: (t) => {
					let n = t, o = new Uint8Array(a);
					for (let t = 0, a = 0, s = 0, c = 0; t < n.length; t++) for (a |= (r.encode(n[t]) & i) << s, s += e; s >= 8; s -= 8, a >>= 8) o[c++] = a & 255;
					return o;
				},
				decode: (a) => {
					let o = t(n);
					for (let t = 0, n = 0, s = 0, c = 0; t < a.length; t++) for (n |= a[t] << s, s += 8; s >= e; s -= e, n >>= e) o[c++] = r.decode(n & i);
					return o;
				}
			};
		}
	};
}, Gr = (e) => (t, n) => {
	n ||= e.blockLen;
	let r = new Uint8Array(t.length + 2);
	r.set(t);
	let i = t.length, a = new Uint8Array(n), o = e.create({}), s = 0, c = 0;
	return {
		stats: () => ({
			calls: s,
			xofs: c
		}),
		get: (t, n) => (r[i + 0] = t, r[i + 1] = n, o.destroy(), o = e.create({}).update(r), s++, () => (c++, o.xofInto(a))),
		clean: () => {
			o.destroy(), K(a, r);
		}
	};
}, Kr = /* @__PURE__ */ Gr(_r), qr = /* @__PURE__ */ Gr(G), Jr = /* @__PURE__ */ Object.freeze(["extraEntropy", "externalMu"]), Yr = /* @__PURE__ */ Object.freeze(["externalMu"]);
function Xr(e, t) {
	let n = Mr(e, t);
	return n.externalMu !== void 0 && Bn(n.externalMu, "opts.externalMu"), n;
}
var q = 256, Zr = 8380417, Qr = 1753, $r = 8347681, ei = 13, ti = 95232, ni = 261888, ri = /* @__PURE__ */ Object.freeze({
	2: Object.freeze({
		K: 4,
		L: 4,
		D: ei,
		GAMMA1: 2 ** 17,
		GAMMA2: ti,
		TAU: 39,
		ETA: 2,
		OMEGA: 80
	}),
	3: Object.freeze({
		K: 6,
		L: 5,
		D: ei,
		GAMMA1: 2 ** 19,
		GAMMA2: ni,
		TAU: 49,
		ETA: 4,
		OMEGA: 55
	}),
	5: Object.freeze({
		K: 8,
		L: 7,
		D: ei,
		GAMMA1: 2 ** 19,
		GAMMA2: ni,
		TAU: 60,
		ETA: 2,
		OMEGA: 75
	})
}), J = (e) => new Int32Array(e), Y = /* @__PURE__ */ Wr({
	N: q,
	Q: Zr,
	F: $r,
	ROOT_OF_UNITY: Qr,
	newPoly: J,
	isKyber: !1,
	brvBits: 8
}), ii = (e) => e, ai = (e, t = ii, n = ii) => Y.bitsCoder(e, {
	encode: (e) => t(n(e)),
	decode: (e) => n(t(e))
}), oi = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Y.mod(n[e] + r[e]);
	return n;
}, si = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Y.mod(n[e] - r[e]);
	return n;
}, ci = (e) => {
	let t = e;
	for (let e = 0; e < q; e++) t[e] <<= ei;
	return t;
}, li = (e, t) => {
	let n = e;
	for (let e = 0; e < q; e++) if (Math.abs(Y.smod(n[e])) >= t) return !0;
	return !1;
}, ui = (e, t) => {
	let n = e, r = t, i = J(q);
	for (let e = 0; e < n.length; e++) i[e] = Y.mod(n[e] * r[e]);
	return i;
};
function di(e) {
	let t = e, n = J(q);
	for (let e = 0; e < q;) {
		let r = t();
		if (r.length % 3) throw Error("RejNTTPoly: unaligned block");
		for (let t = 0; e < q && t <= r.length - 3; t += 3) {
			let i = (r[t + 0] | r[t + 1] << 8 | r[t + 2] << 16) & 8388607;
			i < Zr && (n[e++] = i);
		}
	}
	return n;
}
function fi(e) {
	let t = e, { K: n, L: r, GAMMA1: i, GAMMA2: a, TAU: o, ETA: s, OMEGA: c } = t, { CRH_BYTES: l, TR_BYTES: u, C_TILDE_BYTES: d, XOF128: f, XOF256: p, securityLevel: m } = t;
	if (![2, 4].includes(s)) throw Error("Wrong ETA");
	if (![1 << 17, 1 << 19].includes(i)) throw Error("Wrong GAMMA1");
	if (![ti, ni].includes(a)) throw Error("Wrong GAMMA2");
	let h = o * s, g = (e) => {
		let t = Y.mod(e), n = Y.smod(t, 2 * a) | 0;
		return t - n === 8380416 ? {
			r1: 0,
			r0: n - 1 | 0
		} : {
			r1: Math.floor((t - n) / (2 * a)) | 0,
			r0: n
		};
	}, _ = (e) => g(e).r1, v = (e) => g(e).r0, y = (e, t) => e <= a || e > Zr - a || e === Zr - a && t === 0 ? 0 : 1, b = Math.floor(8380416 / (2 * a)), x = (e, t) => {
		let { r1: n, r0: r } = g(t);
		return e === 1 ? r > 0 ? Y.mod(n + 1, b) | 0 : Y.mod(n - 1, b) | 0 : n | 0;
	}, S = (e) => {
		let t = Y.mod(e), n = Y.smod(t, 2 ** ei) | 0;
		return {
			r1: Math.floor((t - n) / 2 ** ei) | 0,
			r0: n
		};
	}, C = {
		bytesLen: c + n,
		encode: (e) => {
			let t = e;
			if (t === !1) throw Error("hint.encode: hint is false");
			let r = new Uint8Array(c + n);
			for (let e = 0, i = 0; e < n; e++) {
				for (let n = 0; n < q; n++) t[e][n] !== 0 && (r[i++] = n);
				r[c + e] = i;
			}
			return r;
		},
		decode: (e) => {
			let t = [], r = 0;
			for (let i = 0; i < n; i++) {
				let n = J(q);
				if (e[c + i] < r || e[c + i] > c) return !1;
				for (let t = r; t < e[c + i]; t++) {
					if (t > r && e[t] <= e[t - 1]) return !1;
					n[e[t]] = 1;
				}
				r = e[c + i], t.push(n);
			}
			for (let t = r; t < c; t++) if (e[t] !== 0) return !1;
			return t;
		}
	}, w = ai(s === 2 ? 3 : 4, (e) => s - e, (e) => {
		if (!(-s <= e && e <= s)) throw Error(`malformed key s1/s3 ${e} outside of ETA range [${-s}, ${s}]`);
		return e;
	}), T = ai(13, (e) => 4096 - e), E = ai(10), D = ai(i === 1 << 17 ? 18 : 20, (e) => Y.smod(i - e)), O = Ir(ai(a === ti ? 6 : 4), n), k = Fr("publicKey", 32, Ir(E, n)), A = Fr("secretKey", 32, 32, u, Ir(w, r), Ir(w, n), Ir(T, n)), j = Fr("signature", d, Ir(D, r), C), M = s === 2 ? (e) => e < 15 && 2 - e % 5 : (e) => e < 9 && 4 - e;
	function N(e) {
		let t = e, n = J(q);
		for (let e = 0; e < q;) {
			let r = t();
			for (let t = 0; e < q && t < r.length; t += 1) {
				let i = M(r[t] & 15), a = M(r[t] >> 4 & 15);
				i !== !1 && (n[e++] = i), e < q && a !== !1 && (n[e++] = a);
			}
		}
		return n;
	}
	let ee = (e) => {
		let t = J(q), n = G.create({}).update(e), r = new Uint8Array(G.blockLen);
		n.xofInto(r);
		let i = r.slice(0, 8);
		for (let e = q - o, a = 8, s = 0, c = 0; e < q; e++) {
			let o = e + 1;
			for (; o > e;) o = r[a++], !(a < G.blockLen) && (n.xofInto(r), a = 0);
			t[e] = t[o], t[o] = 1 - ((i[s] >> c++ & 1) << 1), c >= 8 && (s++, c = 0);
		}
		return t;
	}, P = (e) => {
		let t = e, n = J(q), r = J(q);
		for (let e = 0; e < t.length; e++) {
			let { r0: i, r1: a } = S(t[e]);
			n[e] = i, r[e] = a;
		}
		return {
			r0: n,
			r1: r
		};
	}, te = (e, t) => {
		let n = e, r = t;
		for (let e = 0; e < q; e++) n[e] = x(r[e], n[e]);
		return n;
	}, ne = (e, t) => {
		let n = e, r = t, i = J(q), a = 0;
		for (let e = 0; e < q; e++) {
			let t = y(n[e], r[e]);
			i[e] = t, a += t;
		}
		return {
			v: i,
			cnt: a
		};
	}, re = Fr("seed", 32, 64, 32), F = Object.freeze({
		info: Object.freeze({ type: "internal-ml-dsa" }),
		lengths: Object.freeze({
			secretKey: A.bytesLen,
			publicKey: k.bytesLen,
			seed: 32,
			signature: j.bytesLen,
			signRand: 32
		}),
		keygen: (e) => {
			let t = /* @__PURE__ */ new Uint8Array(34), i = e === void 0;
			i && (e = Tr(32)), wr(e, 32, "seed"), t.set(e), i && K(e), t[32] = n, t[33] = r;
			let [a, o, s] = re.decode(G(t, { dkLen: re.bytesLen })), c = p(o), l = [];
			for (let e = 0; e < r; e++) l.push(N(c.get(e & 255, e >> 8 & 255)));
			let d = [];
			for (let e = r; e < r + n; e++) d.push(N(c.get(e & 255, e >> 8 & 255)));
			let m = l.map((e) => Y.NTT.encode(e.slice())), h = [], g = [], _ = f(a), v = J(q);
			for (let e = 0; e < n; e++) {
				K(v);
				for (let t = 0; t < r; t++) oi(v, ui(di(_.get(t, e)), m[t]));
				Y.NTT.decode(v);
				let { r0: t, r1: n } = P(oi(v, d[e]));
				h.push(t), g.push(n);
			}
			let y = k.encode([a, g]), b = G(y, { dkLen: u }), x = A.encode([
				a,
				s,
				b,
				l,
				d,
				h
			]);
			return _.clean(), c.clean(), K(a, o, s, l, d, m, v, h, g, b, t), {
				publicKey: y,
				secretKey: x
			};
		},
		getPublicKey: (e) => {
			let [t, i, a, o, s, c] = A.decode(e), l = f(t), u = o.map((e) => Y.NTT.encode(e.slice())), d = [], p = J(q);
			for (let e = 0; e < n; e++) {
				p.fill(0);
				for (let t = 0; t < r; t++) oi(p, ui(di(l.get(t, e)), u[t]));
				Y.NTT.decode(p), oi(p, s[e]);
				let { r1: t } = P(p);
				d.push(t);
			}
			return l.clean(), K(p, u, c, o, s), k.encode([t, d]);
		},
		sign: (e, t, o = {}) => {
			o = Pr(o, Jr), o = Xr(o, Jr);
			let { extraEntropy: s, externalMu: u = !1 } = o;
			u && wr(e, l, "mu");
			let m = s === !1 || s === void 0, g = s === !1 ? /* @__PURE__ */ new Uint8Array(32) : s === void 0 ? Tr(32) : s;
			wr(g, 32, "extraEntropy");
			let [y, b, x, S, C, w] = (() => {
				try {
					return A.decode(t);
				} catch (e) {
					throw m && K(g), e;
				}
			})(), T = [], E = f(y);
			for (let e = 0; e < n; e++) {
				let t = [];
				for (let n = 0; n < r; n++) t.push(di(E.get(n, e)));
				T.push(t);
			}
			E.clean();
			for (let e = 0; e < r; e++) Y.NTT.encode(S[e]);
			for (let e = 0; e < n; e++) Y.NTT.encode(C[e]), Y.NTT.encode(w[e]);
			let k = u ? e : G.create({ dkLen: l }).update(x).update(e).digest(), M = G.create({ dkLen: l }).update(b).update(g).update(k).digest();
			m && K(g), wr(M, l);
			let N = p(M, D.bytesLen);
			main_loop: for (let e = 0;;) {
				let t = [];
				for (let n = 0; n < r; n++, e++) t.push(D.decode(N.get(e & 255, e >> 8)()));
				let o = t.map((e) => Y.NTT.encode(e.slice())), s = [];
				for (let e = 0; e < n; e++) {
					let t = J(q);
					for (let n = 0; n < r; n++) oi(t, ui(T[e][n], o[n]));
					Y.NTT.decode(t), s.push(t);
				}
				let l = s.map((e) => e.map(_)), f = G.create({ dkLen: d }).update(k).update(O.encode(l)).digest(), p = Y.NTT.encode(ee(f)), m = S.map((e) => ui(e, p));
				for (let e = 0; e < r; e++) if (oi(Y.NTT.decode(m[e]), t[e]), li(m[e], i - h)) {
					K(f, m, p, l, s, o, t);
					continue main_loop;
				}
				let g = 0, y = [];
				for (let e = 0; e < n; e++) {
					let n = Y.NTT.decode(ui(C[e], p)), r = si(s[e], n).map(v);
					if (li(r, a - h)) {
						K(f, m, p, l, s, o, t, y, n, r);
						continue main_loop;
					}
					let i = Y.NTT.decode(ui(w[e], p));
					if (li(i, a)) {
						K(f, m, p, l, s, o, t, y, n, r, i);
						continue main_loop;
					}
					oi(r, i);
					let c = ne(r, l[e]);
					y.push(c.v), g += c.cnt;
				}
				if (g > c) {
					K(f, m, p, l, s, o, t, y);
					continue;
				}
				N.clean();
				let b = j.encode([
					f,
					m,
					y
				]);
				return K(f, m, y, p, l, s, o, t, M, S, C, w, ...T), u || K(k), b;
			}
			throw Error("Unreachable code path reached, report this error");
		},
		verify: (e, t, a, o = {}) => {
			o = Xr(o, Yr);
			let { externalMu: s = !1 } = o;
			s && wr(t, l, "mu");
			let [p, m] = k.decode(a), g = G(a, { dkLen: u });
			if (e.length !== j.bytesLen) return !1;
			let [_, v, y] = j.decode(e);
			if (y === !1) return !1;
			for (let e = 0; e < r; e++) if (li(v[e], i - h)) return !1;
			let b = s ? t : G.create({ dkLen: l }).update(g).update(t).digest(), x = Y.NTT.encode(ee(_)), S = v.map((e) => e.slice());
			for (let e = 0; e < r; e++) Y.NTT.encode(S[e]);
			let C = [], w = f(p);
			for (let e = 0; e < n; e++) {
				let t = ui(Y.NTT.encode(ci(m[e])), x), n = J(q);
				for (let t = 0; t < r; t++) oi(n, ui(di(w.get(t, e)), S[t]));
				let i = Y.NTT.decode(si(n, t));
				C.push(te(i, y[e]));
			}
			w.clean();
			let T = G.create({ dkLen: d }).update(b).update(O.encode(C)).digest();
			for (let e of y) if (!(e.reduce((e, t) => e + t, 0) <= c)) return !1;
			for (let e of v) if (li(e, i - h)) return !1;
			return Or(_, T);
		}
	});
	return Object.freeze({
		info: Object.freeze({ type: "ml-dsa" }),
		internal: F,
		securityLevel: m,
		keygen: F.keygen,
		lengths: F.lengths,
		getPublicKey: F.getPublicKey,
		sign: (e, t, n = {}) => {
			n = Pr(n);
			let r = zr(e, n.context), i = F.sign(r, t, {
				extraEntropy: n.extraEntropy,
				externalMu: !1
			});
			return K(r), i;
		},
		verify: (e, t, n, r = {}) => (r = Nr(r), wr(e, void 0, "signature"), F.verify(e, zr(t, r.context), n, { externalMu: !1 })),
		prehash: (e) => {
			Hr(e, m);
			let t = e;
			return Object.freeze({
				info: Object.freeze({ type: "hashml-dsa" }),
				securityLevel: m,
				lengths: F.lengths,
				keygen: F.keygen,
				getPublicKey: F.getPublicKey,
				sign: (e, n, r = {}) => {
					r = Pr(r);
					let i = Ur(t, e, r.context), a = F.sign(i, n, {
						extraEntropy: r.extraEntropy,
						externalMu: !1
					});
					return K(i), a;
				},
				verify: (e, n, r, i = {}) => (i = Nr(i), wr(e, void 0, "signature"), F.verify(e, Ur(t, n, i.context), r, { externalMu: !1 }))
			});
		}
	});
}
var pi = /* @__PURE__ */ fi({
	...ri[3],
	CRH_BYTES: 64,
	TR_BYTES: 64,
	C_TILDE_BYTES: 48,
	XOF128: Kr,
	XOF256: qr,
	securityLevel: 192
});
// node_modules/@noble/hashes/_md.js
function mi(e, t, n) {
	return e & t ^ ~e & n;
}
function hi(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var gi = class {
	blockLen;
	outputLen;
	canXOF = !1;
	padOffset;
	isLE;
	buffer;
	view;
	finished = !1;
	length = 0;
	pos = 0;
	destroyed = !1;
	constructor(e, t, n, r) {
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = wn(this.buffer);
	}
	update(e) {
		bn(this), U(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length, a = !1;
		for (let o = 0; o < i;) {
			let s = Math.min(r - this.pos, i - o);
			if (s === r) {
				let t = wn(e);
				for (; r <= i - o; o += r) this.process(t, o);
				a = !0;
			} else n.set(o === 0 && s === i ? e : e.subarray(o, o + s), this.pos), this.pos += s, o += s, this.pos === r && (this.process(t, 0), this.pos = 0, a = !0);
		}
		return this.length += e.length, a && this.roundClean(), this;
	}
	digestInto(e) {
		bn(this), xn(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, t.fill(0, a), this.padOffset > r - a && (this.process(n, 0), t.fill(0)), Jn(n, r - 8, this.length * 8, i), this.process(n, 0), this.roundClean();
		let o = e === t ? n : wn(e), s = this.outputLen, c = s / 4, l = this.get();
		if (s % 4 || c > l.length) throw Error("invalid outputLen");
		for (let e = 0; e < c; e++) o.setUint32(4 * e, l[e], i);
	}
	digest() {
		let { buffer: e, outputLen: t } = this;
		this.digestInto(e);
		let n = e.slice(0, t);
		return this.destroy(), n;
	}
	_cloneIntoMeta(e) {
		let { buffer: t, length: n, finished: r, destroyed: i, pos: a } = this;
		return e.destroyed = i, e.finished = r, e.length = n, e.pos = a, a && e.buffer.set(t), e;
	}
	clone() {
		return this._cloneInto();
	}
}, _i = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), vi = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]), yi = /* @__PURE__ */ new Uint32Array(64), bi = class extends gi {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(e, t) {
		super(64, e, 8, !1), this.A = t[0] | 0, this.B = t[1] | 0, this.C = t[2] | 0, this.D = t[3] | 0, this.E = t[4] | 0, this.F = t[5] | 0, this.G = t[6] | 0, this.H = t[7] | 0;
	}
	get() {
		let { A: e, B: t, C: n, D: r, E: i, F: a, G: o, H: s } = this;
		return [
			e,
			t,
			n,
			r,
			i,
			a,
			o,
			s
		];
	}
	set(e, t, n, r, i, a, o, s) {
		this.A = e | 0, this.B = t | 0, this.C = n | 0, this.D = r | 0, this.E = i | 0, this.F = a | 0, this.G = o | 0, this.H = s | 0;
	}
	_cloneInto(e) {
		return (e ||= new this.constructor()).set(...this.get()), this._cloneIntoMeta(e);
	}
	process(e, t) {
		for (let n = 0; n < 16; n++, t += 4) yi[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = yi[e - 15], n = yi[e - 2], r = W(t, 7) ^ W(t, 18) ^ t >>> 3, i = W(n, 17) ^ W(n, 19) ^ n >>> 10;
			yi[e] = i + yi[e - 7] + r + yi[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = W(o, 6) ^ W(o, 11) ^ W(o, 25), u = l + t + mi(o, s, c) + vi[e] + yi[e] | 0, d = (W(n, 2) ^ W(n, 13) ^ W(n, 22)) + hi(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		Cn(yi);
	}
	destroy() {
		this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), Cn(this.buffer);
	}
}, xi = class extends bi {
	constructor() {
		super(32, _i);
	}
}, Si = /* @__PURE__ */ Gn((/* @__PURE__ */ "0x428a2f98d728ae22.0x7137449123ef65cd.0xb5c0fbcfec4d3b2f.0xe9b5dba58189dbbc.0x3956c25bf348b538.0x59f111f1b605d019.0x923f82a4af194f9b.0xab1c5ed5da6d8118.0xd807aa98a3030242.0x12835b0145706fbe.0x243185be4ee4b28c.0x550c7dc3d5ffb4e2.0x72be5d74f27b896f.0x80deb1fe3b1696b1.0x9bdc06a725c71235.0xc19bf174cf692694.0xe49b69c19ef14ad2.0xefbe4786384f25e3.0x0fc19dc68b8cd5b5.0x240ca1cc77ac9c65.0x2de92c6f592b0275.0x4a7484aa6ea6e483.0x5cb0a9dcbd41fbd4.0x76f988da831153b5.0x983e5152ee66dfab.0xa831c66d2db43210.0xb00327c898fb213f.0xbf597fc7beef0ee4.0xc6e00bf33da88fc2.0xd5a79147930aa725.0x06ca6351e003826f.0x142929670a0e6e70.0x27b70a8546d22ffc.0x2e1b21385c26c926.0x4d2c6dfc5ac42aed.0x53380d139d95b3df.0x650a73548baf63de.0x766a0abb3c77b2a8.0x81c2c92e47edaee6.0x92722c851482353b.0xa2bfe8a14cf10364.0xa81a664bbc423001.0xc24b8b70d0f89791.0xc76c51a30654be30.0xd192e819d6ef5218.0xd69906245565a910.0xf40e35855771202a.0x106aa07032bbd1b8.0x19a4c116b8d2d0c8.0x1e376c085141ab53.0x2748774cdf8eeb99.0x34b0bcb5e19b48a8.0x391c0cb3c5c95a63.0x4ed8aa4ae3418acb.0x5b9cca4f7763e373.0x682e6ff3d6b2b8a3.0x748f82ee5defb2fc.0x78a5636f43172f60.0x84c87814a1f0ab72.0x8cc702081a6439ec.0x90befffa23631e28.0xa4506cebde82bde9.0xbef9a3f7b2c67915.0xc67178f2e372532b.0xca273eceea26619c.0xd186b8c721c0c207.0xeada7dd6cde0eb1e.0xf57d4f7fee6ed178.0x06f067aa72176fba.0x0a637dc5a2c898a6.0x113f9804bef90dae.0x1b710b35131c471b.0x28db77f523047d84.0x32caab7b40c72493.0x3c9ebe0a15c9bebc.0x431d67c49c100d4c.0x4cc5d4becb3e42b6.0x597f299cfc657e2a.0x5fcb6fab3ad6faec.0x6c44198c4a475817".split(".")).map((e) => BigInt(e)));
Si[0], Si[1];
var Ci = /* @__PURE__ */ Fn(() => new xi(), /* @__PURE__ */ Ln(1)), wi = (e) => Object.freeze(e());
function Ti(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
function Ei(e) {
	if (!Ti(e)) throw TypeError("Uint8Array expected");
}
function Di(e, t) {
	if (typeof t != "string") throw TypeError(`${e}: string expected`);
	return !0;
}
function Oi(e, t = "number") {
	if (typeof e != "number") throw TypeError(`${t}: expected number, got ${typeof e}`);
	if (!Number.isSafeInteger(e)) throw RangeError(`${t}: expected safe integer, got ${e}`);
}
function ki(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
var Ai = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})(), ji = /* @__PURE__ */ (() => {
	try {
		let e = new TextDecoder();
		return e.decode(Uint8Array.of(65, 48, 43, 127)) === "A0+" ? e : void 0;
	} catch {
		return;
	}
})(), Mi = 8192;
function Ni(e) {
	let t = e.length;
	if (ji !== void 0 && t >= 12) return ji.decode(e);
	if (t <= Mi) return String.fromCharCode.apply(null, e);
	let n = "";
	for (let r = 0; r < t; r += Mi) n += String.fromCharCode.apply(null, e.subarray(r, r + Mi));
	return n;
}
function Pi(e) {
	if (Oi(e), e <= 0 || e > 8) throw RangeError("radix2: bits should be in (0..8]");
	let t = Ai[e] - 1;
	return {
		encode: (n) => {
			Ei(n);
			let r = n.length, i = new Uint8Array(Math.ceil(r * 8 / e)), a = 0, o = 0, s = 0;
			for (let c = 0; c < r;) for (c + 2 < r ? (a = a << 24 | n[c] << 16 | n[c + 1] << 8 | n[c + 2], o += 24, c += 3) : (a = (a << 8 | n[c]) & 65535, o += 8, c++); o -= e, i[s++] = a >> o & t, !(o < e););
			return o > 0 && (i[s] = a << e - o & t), i;
		},
		decode: (t) => {
			let n = t.length, r = new Uint8Array(Math.floor(n * e / 8)), i = 0, a = 0, o = 0;
			for (let s = 0; s < n; s++) for (i = (i << e | t[s]) & 65535, a += e; a >= 8; a -= 8) r[o++] = i >> a - 8 & 255;
			if (i = i << 8 - a & 255, a >= e) throw Error("Excess padding");
			if (i > 0) throw Error(`Non-zero padding: ${i}`);
			return r;
		}
	};
}
function Fi(e, t) {
	let n = e.length;
	if (n > 128) throw Error("alphabet: max 128 letters");
	let r = new Uint8Array(n), i = (/* @__PURE__ */ new Int8Array(128)).fill(-1);
	for (let t = 0; t < n; t++) {
		let n = e.charCodeAt(t);
		if (e.codePointAt(t) !== n || n > 127) throw Error("alphabet: single-char ASCII letters only");
		r[t] = n, i[n] = t;
	}
	if (t !== void 0) for (let e of Object.keys(t)) {
		let n = e.charCodeAt(0), r = i[t[e].charCodeAt(0)];
		if (e.length !== 1 || n > 127 || r === void 0 || r === -1) throw Error(`alphabet: invalid alias ${e}`);
		i[n] = r;
	}
	return {
		encode: (e) => {
			let t = new Uint8Array(e.length);
			for (let n = 0; n < e.length; n++) {
				let i = e[n], a = r[i];
				if (a === void 0) throw Error(`alphabet.encode: invalid digit ${i}`);
				t[n] = a;
			}
			return Ni(t);
		},
		decode: (t) => {
			Di("decode", t);
			let n = t.length, r = new Uint8Array(n);
			for (let a = 0; a < n; a++) {
				let n = t.charCodeAt(a), o = n < 128 ? i[n] : -1;
				if (o === -1) throw Error(`Unknown letter "${t[a]}". Allowed: ${e}`);
				r[a] = o;
			}
			return r;
		}
	};
}
function Ii(e, t = "=") {
	return Oi(e), Di("padding", t), {
		encode(n) {
			for (; n.length * e % 8;) n += t;
			return n;
		},
		decode(n) {
			Di("decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid length");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: excess padding");
			return n.slice(0, r);
		}
	};
}
var Li = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Ri = /[\t\n\f\r ]/, zi = (e, t) => {
	Di("base64", e);
	let n = t ? "base64url" : "base64";
	if (e.length > 0 && Ri.test(e)) throw Error("invalid base64");
	return Uint8Array.fromBase64(e, {
		alphabet: n,
		lastChunkHandling: "strict"
	});
}, Bi = /* @__PURE__ */ wi(() => ki(Pi(6), Fi("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), Ii(6))), Vi = /* @__PURE__ */ wi(() => Li ? {
	encode(e) {
		return Ei(e), e.toBase64();
	},
	decode(e) {
		return zi(e, !1);
	}
} : Bi), X = (e, t) => e.tags.find((e) => e[0] === t), Z = (e, t) => X(e, t)?.[1], Hi = (e, t) => e.tags.find((e) => e[0] === "e" && e[3] === t)?.[1], Ui = () => Math.floor(Date.now() / 1e3), Wi = (e, t) => e.created_at - t.created_at || (e.id < t.id ? -1 : +(e.id > t.id)), Gi = Mn(pn), Ki = /* @__PURE__ */ new Set(["pq", "pq-prev"]);
function qi(e, t) {
	let n = t.tags.filter((e) => !Ki.has(e[0]));
	return Ci(Mn(JSON.stringify([
		0,
		e,
		t.created_at,
		t.kind,
		n,
		t.content
	])));
}
function Ji(e, t) {
	let n = e.tags.filter((e) => e[0] === t);
	if (n.length === 1 && n[0][1] === "ml-dsa-65" && n[0][2]) try {
		return Vi.decode(n[0][2]);
	} catch {
		return;
	}
}
function Yi(e, t, n = "pq") {
	let r = Ji(e, n);
	if (!r) return !1;
	try {
		return pi.verify(r, qi(e.pubkey, e), t, { context: Gi });
	} catch {
		return !1;
	}
}
var Xi = (e, t) => fn(e) && Yi(e, t);
function Zi(e) {
	if (Z(e, "alg") === "ml-dsa-65") try {
		let t = Vi.decode(Z(e, "key") ?? "");
		return t.length === pi.lengths.publicKey ? t : void 0;
	} catch {
		return;
	}
}
function Qi(e, t) {
	let n = e.filter((e) => {
		if (e.kind !== V.pqBinding || e.pubkey !== t) return !1;
		let n = Zi(e);
		return n !== void 0 && Xi(e, n);
	}), r = n.filter((e) => !Hi(e, "prev")).sort(Wi);
	if (!r.length) return;
	let i = r[0], a = Zi(i), o = (e) => new Set(e.map((e) => Z(e, "key"))).size, s = o(r) > 1, c = /* @__PURE__ */ new Set([i.id]);
	for (;;) {
		let e = n.filter((e) => Hi(e, "prev") === i.id && !c.has(e.id) && Yi(e, a, "pq-prev")).sort(Wi);
		if (!e.length) break;
		s ||= o(e) > 1, i = e[0], a = Zi(i), c.add(i.id);
	}
	return {
		key: a,
		binding: i,
		conflict: s
	};
}
function $i(e) {
	let t = /* @__PURE__ */ new Map();
	return (n) => (t.has(n) || t.set(n, Qi(e, n)?.key), t.get(n));
}
// src/pricing.ts
var ea = (e) => /^\d{4}-(0[1-9]|1[0-2])$/.test(e);
// src/sponsorship.ts
function ta(e) {
	if (e.kind !== V.offer) return;
	let [, t = "", n, r, i = ""] = X(e, "price") ?? [], a = Z(e, "d"), o = Z(e, "title"), s = Z(e, "rail"), c = Number(Z(e, "deadline"));
	if (a && o && s && r && n === "USD" && ea(i) && /^[1-9]\d*$/.test(t) && Number.isSafeInteger(c)) return {
		event: e,
		advertiser: e.pubkey,
		slug: a,
		title: o,
		brief: e.content,
		price: {
			amount: BigInt(t),
			currency: n,
			index: r,
			basePeriod: i
		},
		rail: s,
		deadline: c,
		creator: Z(e, "p"),
		terms: na(e)
	};
}
function na(e) {
	let t = Z(e, "format");
	if (t !== "host-read" && t !== "post") return;
	let n = (t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), [, r, i] = X(e, "flight") ?? [];
	return {
		format: t,
		media: n("media").filter((e) => e === "audio" || e === "video"),
		slots: n("slot").filter((e) => ia.includes(e)),
		flight: r && i && Number(i) > Number(r) ? {
			start: Number(r),
			end: Number(i)
		} : void 0,
		points: n("point"),
		avoid: n("avoid"),
		url: Z(e, "r"),
		code: Z(e, "code"),
		approval: Z(e, "approval") === "read",
		campaign: Z(e, "a")
	};
}
function ra(e) {
	try {
		let t = JSON.parse(e.content);
		return t?.id === Hi(e, "offer") ? t : void 0;
	} catch {
		return;
	}
}
// src/ads.ts
var ia = [
	"pre",
	"mid",
	"post"
], aa = (e, t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), oa = (e, t) => `${V.placement}:${e}:${t}`;
function sa(e) {
	let [, t, n, r, i, a, o, s, c] = e;
	if (!t?.startsWith("https://") || !/^(audio|video)\//.test(n ?? "") && !/mpegurl/i.test(n ?? "")) return;
	let l = {
		url: t,
		type: n,
		duration: Number(r) > 0 ? Number(r) : void 0
	}, u = [
		i,
		a,
		o,
		s,
		c
	].map(Number);
	return i && [
		1,
		2,
		2.5
	].includes(u[0]) && u[1] > 0 && (u[2] === 1 || u[2] === 2) && Number.isSafeInteger(u[3]) && u[4] > u[3] && (l.mp3 = {
		version: u[0],
		sampleRate: u[1],
		channels: u[2],
		audioStart: u[3],
		audioEnd: u[4]
	}), l;
}
function ca(e) {
	let t = Hi(e, "sponsorship"), [, n, r] = X(e, "flight") ?? [], i = Z(e, "label"), a = Z(e, "p");
	if (e.kind !== V.placement || !t || Z(e, "d") !== t || !i || !a || !n || !r) return;
	let o = e.tags.filter((e) => e[0] === "spot").map(sa).filter((e) => !!e), s = aa(e, "slot").filter((e) => ia.includes(e));
	if (o.length && s.length) return {
		event: e,
		creator: e.pubkey,
		advertiser: a,
		acceptanceId: t,
		address: oa(e.pubkey, t),
		slots: s,
		start: Number(n),
		end: Number(r),
		shows: aa(e, "a"),
		video: aa(e, "scope").includes("video"),
		spots: o,
		label: i,
		link: Z(e, "r"),
		code: Z(e, "code"),
		script: e.content || void 0
	};
}
function la(e, t, n) {
	let r = n(e.advertiser), i = t.filter((t) => t.kind === V.approval && t.pubkey === e.advertiser && Hi(t, "placement") === e.event.id).filter((e) => r && Xi(e, r)).sort((e, t) => t.created_at - e.created_at), a = i[0] && Z(i[0], "status");
	return a === "approved" || a === "changes" ? a : void 0;
}
function ua(e, t) {
	let n = t.now ?? Ui();
	if (n < e.start || n >= e.end) return !1;
	let r = t.acceptances.find((t) => t.id === e.acceptanceId && t.pubkey === e.creator && t.kind === V.acceptance), i = r && ra(r), a = i && ta(i);
	if (!a || a.advertiser !== e.advertiser) return !1;
	let o = la(e, t.approvals, t.pqKeyOf);
	return o === "changes" ? !1 : !a.terms?.approval || o === "approved";
}
function da(e, t, n) {
	let r = t.filter((t) => t.creator === e.creator && ua(t, n)).filter((t) => e.kind === "video" ? t.video : !t.shows.length || e.show !== void 0 && t.shows.includes(e.show)).sort((e, t) => e.start - t.start || (e.event.id < t.event.id ? -1 : 1)), i = (t) => e.kind === "video" ? t.spots.find((e) => e.type.startsWith("video/")) ?? t.spots.find((e) => e.type.startsWith("audio/")) : t.spots.find((e) => e.type.startsWith("audio/")), a = (e) => r.filter((t) => t.slots.includes(e) && i(t)).slice(0, 3).map((e) => ({
		placement: e,
		spot: i(e)
	})), o = [], s = a("pre");
	s.length && o.push({
		slot: "pre",
		at: 0,
		ads: s
	});
	let c = a("mid");
	if (c.length) for (let t of e.marks) o.push({
		slot: "mid",
		at: t.at,
		byteOffset: t.byteOffset,
		ads: c
	});
	let l = a("post");
	return l.length && o.push({
		slot: "post",
		at: e.duration ?? Infinity,
		ads: l
	}), o;
}
// src/mp3.ts
var fa = (e, t) => e.version === t.version && e.sampleRate === t.sampleRate && e.channels === t.channels, pa = (e, t) => `${V.show}:${e}:${t}`;
function ma(e) {
	let t = Z(e, "d"), n = Z(e, "title"), r = Z(e, "image"), [, i, a] = X(e, "category") ?? [], o = Z(e, "guid");
	if (e.kind !== V.show || !t || !n || !r || !i || !o) return;
	let [, s, c] = X(e, "owner") ?? [], l = Z(e, "type");
	return {
		event: e,
		creator: e.pubkey,
		address: pa(e.pubkey, t),
		slug: t,
		title: n,
		description: e.content,
		image: r,
		author: Z(e, "author") ?? n,
		category: i,
		subcategory: a || void 0,
		explicit: Z(e, "explicit") === "true",
		language: Z(e, "language") ?? "en",
		type: l === "serial" ? "serial" : "episodic",
		ownerName: s || void 0,
		ownerEmail: c || void 0,
		link: Z(e, "r"),
		copyright: Z(e, "copyright"),
		guid: o
	};
}
function ha(e) {
	if (!e) return;
	let [t, n, r, i, a, o] = e.slice(1).map(Number);
	if ([
		1,
		2,
		2.5
	].includes(t) && n > 0 && (r === 1 || r === 2) && [
		i,
		a,
		o
	].every(Number.isSafeInteger) && i <= a && a < o) return {
		version: t,
		sampleRate: n,
		channels: r,
		id3End: i,
		audioStart: a,
		audioEnd: o
	};
}
function ga(e) {
	return e.tags.filter((e) => e[0] === "break").map((e) => ({
		at: Number(e[1]),
		byteOffset: e[2] === void 0 ? void 0 : Number(e[2])
	})).filter((e) => Number.isFinite(e.at) && e.at > 0 && (e.byteOffset === void 0 || Number.isSafeInteger(e.byteOffset))).sort((e, t) => e.at - t.at);
}
var _a = (e) => e && /^\d+(\.\d+)?$/.test(e) && Number(e) > 0 ? Number(e) : void 0;
function va(e) {
	let t = Z(e, "a"), n = Z(e, "guid"), r = Z(e, "title"), [, i, a = "audio/mpeg"] = X(e, "audio") ?? [];
	if (e.kind !== 54 || !t?.startsWith(`${V.show}:${e.pubkey}:`) || !n || !r || !i?.startsWith("https://")) return;
	let [, o, s] = X(e, "transcript") ?? [], c = Z(e, "episode_type");
	return {
		event: e,
		creator: e.pubkey,
		published: e.created_at,
		show: t,
		guid: n,
		title: r,
		description: e.content || Z(e, "description") || "",
		audio: {
			url: i,
			type: a,
			size: _a(Z(e, "size")),
			duration: _a(Z(e, "duration"))
		},
		image: Z(e, "image"),
		episode: _a(Z(e, "episode")),
		season: _a(Z(e, "season")),
		episodeType: c === "trailer" || c === "bonus" ? c : "full",
		explicit: Z(e, "explicit") === "true",
		hls: Z(e, "hls"),
		transcript: o ? {
			url: o,
			type: s ?? "text/plain"
		} : void 0,
		breaks: ga(e),
		mp3: ha(X(e, "mp3"))
	};
}
function ya(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = va(r);
		if (!e || e.show !== t) continue;
		let i = n.get(e.guid);
		(!i || r.created_at > i.event.created_at) && n.set(e.guid, e);
	}
	return [...n.values()].sort((e, t) => t.published - e.published);
}
var Q = (e) => e.replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
})[e]), $ = (e, t) => t === void 0 || t === "" ? "" : `<${e}>${Q(String(t))}</${e}>`, ba = (e) => e.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "");
function xa(e, t, n) {
	let r = (e) => (/* @__PURE__ */ new Date(e * 1e3)).toUTCString(), i = e.subcategory ? `<itunes:category text="${Q(e.category)}"><itunes:category text="${Q(e.subcategory)}"/></itunes:category>` : `<itunes:category text="${Q(e.category)}"/>`, a = e.ownerEmail ? `<itunes:owner>${$("itunes:name", e.ownerName ?? e.author)}${$("itunes:email", e.ownerEmail)}</itunes:owner>` : "", o = t.map((t) => [
		"<item>",
		$("title", t.title),
		$("description", t.description),
		$("link", n.pageUrl(t)),
		`<guid isPermaLink="false">${Q(t.guid)}</guid>`,
		$("pubDate", r(t.published)),
		`<enclosure url="${Q(n.enclosureUrl(t))}" length="${t.audio.size ?? 0}" type="${Q(t.audio.type)}"/>`,
		$("itunes:duration", t.audio.duration ? Math.round(t.audio.duration) : void 0),
		$("itunes:episode", t.episode),
		$("itunes:season", t.season),
		$("itunes:episodeType", t.episodeType ?? "full"),
		$("itunes:explicit", t.explicit || e.explicit ? "true" : "false"),
		t.image ? `<itunes:image href="${Q(t.image)}"/>` : "",
		t.transcript ? `<podcast:transcript url="${Q(t.transcript.url)}" type="${Q(t.transcript.type)}"/>` : "",
		t.hls ? `<podcast:alternateEnclosure type="application/x-mpegURL"><podcast:source uri="${Q(t.hls)}"/></podcast:alternateEnclosure>` : "",
		"</item>"
	].join(""));
	return ba([
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<rss version=\"2.0\" xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" xmlns:podcast=\"https://podcastindex.org/namespace/1.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
		"<channel>",
		`<atom:link href="${Q(n.feedUrl)}" rel="self" type="application/rss+xml"/>`,
		$("title", e.title),
		$("link", e.link ?? n.pageUrl()),
		$("language", e.language),
		$("description", e.description),
		$("itunes:author", e.author),
		`<itunes:image href="${Q(e.image)}"/>`,
		`<image>${$("url", e.image)}${$("title", e.title)}${$("link", e.link ?? n.pageUrl())}</image>`,
		i,
		$("itunes:explicit", e.explicit ? "true" : "false"),
		$("itunes:type", e.type ?? "episodic"),
		a,
		$("copyright", e.copyright),
		$("podcast:guid", e.guid),
		e.ownerEmail ? `<podcast:locked owner="${Q(e.ownerEmail)}">yes</podcast:locked>` : "",
		$("generator", "Fairground"),
		$("lastBuildDate", r(n.generatedAt ?? Ui())),
		...o,
		"</channel>",
		"</rss>"
	].join("\n"));
}
// src/network.ts
var Sa = 2604, Ca = (e) => e.kind === V.pqBinding && Z(e, "alg") === "ml-dsa-65" && Z(e, "key")?.length === Sa;
function wa(e) {
	return new Set(e.filter(Ca).map((e) => e.pubkey));
}
// src/safety.ts
var Ta = (e) => [
	e.content,
	...e.tags.filter((e) => [
		"title",
		"summary",
		"description",
		"alt"
	].includes(e[0])).map((e) => e[1] ?? ""),
	...e.tags.filter((e) => e[0] === "imeta").flatMap((e) => e.filter((e) => e.startsWith("alt ")).map((e) => e.slice(4)))
].join(" ").trim(), Ea = (e) => `${Ta(e)} ${e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`).join(" ")}`.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, ""), Da = /\b(teen(s|age|ager|agers)?|young(er)?|underage|minors?|child(ren)?|kids?|kiddies|pre-?teens?|infants?|babies|toddlers?|lolita|schoolgirls?|schoolboys?|schoolthot|pyt|(1[0-7]|[1-9]) ?(yo|y\/o|years? old))\b/, Oa = /\b(sex|sexy|nudes?|naked|porn\w*|xxx|nsfw|horny|blowjobs?|cum|dicks?|cocks?|pussy|tits?|boobs?|nipples?|lewd|rape\w*|cnc\w*|fetish\w*|onlyfans|explicit|erotic\w*|incest|bestiality|snapleak|nolimit|taboo|momson)\b/, ka = /\b(pthc|child ?porn\w*|csam|jailbait|loli|shota)\b/, Aa = /(t\.me\/|telegram|dm me|\bcontents?\b|\bleaks?\b)/, ja = /\b(porn\w*|xxx|nsfw|nudes?|naked|horny|blowjobs?|onlyfans|lewd|erotic\w*|cum|dicks?|cocks?|pussy|tits|boobs|nipples?|fetish\w*)\b/, Ma = /\b(bestiality|zoophil\w*)\b/, Na = /\b(revenge ?porn|hidden ?cams?|spy ?cams?|upskirts?|creepshots?|leaked ?nudes|deepfake ?(porn|nudes?))\b/, Pa = /\b(fag(got)?s?|homos|n[i1y]gg(a|as|er|ers|ah)|kikes?|retards?|trann(y|ies)|chinks?|spics?|wetbacks?|kys)\b|you('| ha)ve been warned|i('| wi)ll kill you|kill yourself/;
function Fa(e) {
	let t = Ea(e);
	return !!(ka.test(t) || Da.test(t) && Oa.test(t) || /\b(cp|pedo\w*)\b/.test(t) && (Oa.test(t) || Da.test(t) || Aa.test(t)));
}
function Ia(e) {
	if (Fa(e)) return !0;
	let t = Ea(e);
	return Ma.test(t) || Na.test(t);
}
var La = (e) => new Set([...e.content.matchAll(/#[\p{L}\p{N}_]+/gu)].map((e) => e[0].toLowerCase()).concat(e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`))).size;
function Ra(e) {
	let t = e.trim();
	if (!/^[{[]/.test(t)) return !1;
	try {
		return JSON.parse(t), !0;
	} catch {
		return !1;
	}
}
function za(e, t) {
	if (Ia(e)) return { block: !0 };
	let n = Ea(e);
	return e.tags.some((e) => e[0] === "content-warning") || ja.test(n) ? {
		block: !1,
		hide: "sexual"
	} : Pa.test(n) ? {
		block: !1,
		hide: "hate"
	} : La(e) > 10 ? {
		block: !1,
		hide: "spam"
	} : Ra(e.content) || Ta(e).length < 2 ? {
		block: !1,
		hide: "junk"
	} : t?.bot ? {
		block: !1,
		hide: "bot"
	} : { block: !1 };
}
// src/gateway.ts
async function Ba(e, t, n = WebSocket, r = 4e3) {
	let i = /* @__PURE__ */ new Map();
	return await Promise.all(e.map((e) => new Promise((a) => {
		let o, s = Math.random().toString(36).slice(2, 10), c = () => {
			clearTimeout(l);
			try {
				o.close();
			} catch {}
			a();
		}, l = setTimeout(c, r);
		try {
			o = new n(e);
		} catch {
			clearTimeout(l), a();
			return;
		}
		o.onopen = () => o.send(JSON.stringify([
			"REQ",
			s,
			t
		])), o.onerror = c, o.onclose = c, o.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(String(e.data));
			} catch {
				return;
			}
			Array.isArray(t) && t[1] === s && (t[0] === "EOSE" || t[0] === "CLOSED" ? c() : t[0] === "EVENT" && !i.has(t[2]?.id) && fn(t[2]) && i.set(t[2].id, t[2]));
		};
	}))), [...i.values()];
}
function Va(e, t) {
	let n = e.mp3;
	if (!n) return;
	let r = e.audio.url, i = (e) => e.ads.map((e) => e.spot.mp3 && fa(e.spot.mp3, n) ? {
		url: e.spot.url,
		start: e.spot.mp3.audioStart,
		end: e.spot.mp3.audioEnd
	} : void 0).filter((e) => !!e), a = [], o = 0, s = (e) => {
		a.push(...e), o += e.length;
	};
	n.id3End > 0 && a.push({
		url: r,
		start: 0,
		end: n.id3End
	});
	for (let e of t.filter((e) => e.slot === "pre")) s(i(e));
	let c = n.audioStart;
	for (let e of t.filter((e) => e.slot === "mid").sort((e, t) => e.at - t.at)) {
		if (e.byteOffset === void 0 || e.byteOffset <= c || e.byteOffset >= n.audioEnd) continue;
		let t = i(e);
		t.length && (a.push({
			url: r,
			start: c,
			end: e.byteOffset
		}), s(t), c = e.byteOffset);
	}
	a.push({
		url: r,
		start: c,
		end: n.audioEnd
	});
	for (let e of t.filter((e) => e.slot === "post")) s(i(e));
	return o ? a : void 0;
}
function Ha(e, t) {
	let n = /^bytes=(\d*)-(\d*)$/.exec((e ?? "").split(",")[0].trim());
	if (!n || !n[1] && !n[2]) return;
	let r, i;
	return n[1] ? (r = Number(n[1]), i = n[2] ? Math.min(Number(n[2]), t - 1) : t - 1) : (r = Math.max(0, t - Number(n[2])), i = t - 1), r > i || r >= t ? "unsatisfiable" : [r, i];
}
function Ua(e, t, n, r) {
	let i = [], a = 0;
	for (let r of e) {
		let e = r.end - r.start, o = Math.max(t, a), s = Math.min(n + 1, a + e);
		o < s && i.push({
			url: r.url,
			start: r.start + (o - a),
			end: r.start + (s - a)
		}), a += e;
	}
	let o = 0, s, c = 0, l = 0;
	return new ReadableStream({
		async pull(e) {
			for (;;) {
				if (!s) {
					if (o >= i.length) return e.close();
					let t = i[o++], n = await r(t.url, { headers: { Range: `bytes=${t.start}-${t.end - 1}` } });
					if (n.status !== 206 && n.status !== 200) return e.error(/* @__PURE__ */ Error(`upstream returned ${n.status}`));
					c = n.status === 200 ? t.start : 0, l = t.end - t.start, s = n.body.getReader();
				}
				let { done: t, value: n } = await s.read();
				if (t) {
					if (s = void 0, l > 0) return e.error(/* @__PURE__ */ Error("upstream file ended early"));
					continue;
				}
				let a = n;
				if (c) {
					let e = Math.min(c, a.length);
					a = a.subarray(e), c -= e;
				}
				if (a.length > l && (a = a.subarray(0, l)), l -= a.length, l === 0 && (await s.cancel().catch(() => void 0), s = void 0), a.length) return e.enqueue(a);
			}
		},
		async cancel() {
			await s?.cancel().catch(() => void 0);
		}
	});
}
async function Wa(e) {
	let t = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(e)));
	return `"${[...new Uint8Array(t)].slice(0, 12).map((e) => e.toString(16).padStart(2, "0")).join("")}"`;
}
var Ga = (e) => /mpeg|mp3/.test(e) ? "mp3" : /mp4|m4a|aac/.test(e) ? "m4a" : "audio";
function Ka(e) {
	let t = e.base.replace(/\/+$/, ""), n = e.fetch ?? ((...e) => fetch(...e)), r = e.WebSocket ?? WebSocket, i = e.now ?? (() => Math.floor(Date.now() / 1e3)), a = (e.cacheSeconds ?? 120) * 1e3, o = /* @__PURE__ */ new Map(), s = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag"
	}, c = (t) => Ba(e.relays, t, r);
	async function l(e, t) {
		let n = pa(e, t), [r, i, a, o] = await Promise.all([
			c({
				kinds: [V.show],
				authors: [e],
				"#d": [t]
			}),
			c({
				kinds: [54],
				authors: [e],
				"#a": [n],
				limit: 1e3
			}),
			c({
				kinds: [V.placement],
				authors: [e],
				limit: 500
			}),
			c({
				kinds: [V.pqBinding],
				authors: [e]
			})
		]);
		if (!wa(o).has(e)) return;
		let s = r.map(ma).filter((e) => !!e).sort((e, t) => t.event.created_at - e.event.created_at)[0];
		if (!s || za(s.event).block) return;
		let l = ya(i.filter((e) => !za(e).block), n);
		!s.explicit && [s.event, ...l.map((e) => e.event)].some((e) => {
			let t = za(e);
			return !t.block && t.hide === "sexual";
		}) && (s.explicit = !0);
		let u = a.map(ca).filter((e) => !!e), [d, f, p] = u.length ? await Promise.all([
			c({ ids: [...new Set(u.map((e) => e.acceptanceId))] }),
			c({
				kinds: [V.approval],
				"#e": u.map((e) => e.event.id)
			}),
			c({
				kinds: [V.pqBinding],
				authors: [...new Set(u.map((e) => e.advertiser))]
			})
		]) : [
			[],
			[],
			[]
		];
		return {
			show: s,
			episodes: l,
			placements: u,
			acceptances: d,
			approvals: f,
			bindings: p
		};
	}
	function u(e, t) {
		let n = `${e}:${t}`, r = o.get(n);
		if (r && Date.now() - r.at < a) return r.data;
		let i = l(e, t).catch(() => void 0);
		return o.set(n, {
			at: Date.now(),
			data: i
		}), o.size > 500 && o.delete(o.keys().next().value), i;
	}
	let d = (e) => new Response(`${e} not found\n`, {
		status: 404,
		headers: {
			...s,
			"Content-Type": "text/plain"
		}
	});
	return async function(a) {
		if (a.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers: {
				...s,
				"Access-Control-Allow-Headers": "Range",
				"Access-Control-Allow-Methods": "GET, HEAD"
			}
		});
		if (a.method !== "GET" && a.method !== "HEAD") return new Response("method not allowed\n", {
			status: 405,
			headers: s
		});
		let o = new URL(a.url), c = o.pathname.startsWith(t) ? o.pathname.slice(t.length) : o.pathname;
		if (c === "/health") {
			let t = await Promise.all(e.relays.map(async (e) => {
				let t = Date.now();
				return {
					relay: e,
					ok: (await Ba([e], {
						kinds: [V.pqBinding],
						limit: 1
					}, r, 3e3)).length > 0,
					ms: Date.now() - t
				};
			}));
			return Response.json({
				gateway: "fairground",
				relays: t
			}, {
				status: t.some((e) => e.ok) ? 200 : 503,
				headers: {
					...s,
					"Cache-Control": "no-store"
				}
			});
		}
		let l = /^\/podcast\/(npub1[02-9ac-hj-np-z]+)\/([A-Za-z0-9_-]{1,64})(?:\.xml|\/([^/]{1,200})\.(mp3|m4a|audio))$/.exec(c);
		if (!l) return d("page");
		let f;
		try {
			let e = ue(l[1]);
			if (e.type !== "npub") return d("show");
			f = e.data;
		} catch {
			return d("show");
		}
		let p = l[2];
		if (e.blocked?.includes(f)) return d("show");
		let m = await u(f, p);
		if (!m) return d("show");
		let h = `${`${o.protocol}//${o.host}`}${t}/podcast/${fe(f)}/${p}`;
		if (!l[3]) {
			let t = xa(m.show, m.episodes, {
				feedUrl: `${h}.xml`,
				enclosureUrl: (e) => `${h}/${encodeURIComponent(e.guid)}.${Ga(e.audio.type)}`,
				pageUrl: (t) => t ? `${e.appUrl}#/media/${t.event.id}` : `${e.appUrl}#/show/${fe(f)}/${p}`,
				generatedAt: i()
			});
			return new Response(a.method === "HEAD" ? null : t, { headers: {
				...s,
				"Content-Type": "application/rss+xml; charset=utf-8",
				"Cache-Control": "public, max-age=300",
				...e.feedHeaders
			} });
		}
		let g = decodeURIComponent(l[3]), _ = m.episodes.find((e) => e.guid === g);
		if (!_) return d("episode");
		let v = da({
			creator: f,
			kind: "audio",
			show: m.show.address,
			duration: _.audio.duration,
			marks: _.breaks ?? []
		}, m.placements, {
			now: i(),
			acceptances: m.acceptances,
			approvals: m.approvals,
			pqKeyOf: $i(m.bindings)
		}), y = Va(_, v);
		if (!y) return new Response(null, {
			status: 302,
			headers: {
				...s,
				Location: _.audio.url,
				"Cache-Control": "public, max-age=300"
			}
		});
		let b = y.reduce((e, t) => e + t.end - t.start, 0), x = await Wa(y), S = {
			...s,
			"Content-Type": "audio/mpeg",
			"Accept-Ranges": "bytes",
			ETag: x,
			"Cache-Control": "private, max-age=0",
			"X-Fairground-Ads": String(v.reduce((e, t) => e + t.ads.length, 0))
		}, C = a.headers.get("If-Range"), w = C && C !== x ? void 0 : Ha(a.headers.get("Range"), b);
		if (w === "unsatisfiable") return new Response(null, {
			status: 416,
			headers: {
				...S,
				"Content-Range": `bytes */${b}`
			}
		});
		let [T, E] = w ?? [0, b - 1], D = w ? 206 : 200;
		return w && (S["Content-Range"] = `bytes ${T}-${E}/${b}`), S["Content-Length"] = String(E - T + 1), a.method === "HEAD" ? new Response(null, {
			status: D,
			headers: S
		}) : new Response(Ua(y, T, E, n), {
			status: D,
			headers: S
		});
	};
}
// src/defaults.ts
var qa = [
	"wss://relay.damus.io",
	"wss://nos.lol",
	"wss://relay.primal.net",
	"wss://offchain.pub"
];
export { qa as DEFAULT_RELAYS, Ka as createGateway, Ba as queryRelays };
