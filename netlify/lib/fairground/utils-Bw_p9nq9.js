// node_modules/@noble/hashes/_u64.js
var e = /* @__PURE__ */ BigInt(2 ** 32 - 1), t = /* @__PURE__ */ BigInt(32);
function n(n, r = !1) {
	return r ? {
		h: Number(n & e),
		l: Number(n >> t & e)
	} : {
		h: Number(n >> t & e) | 0,
		l: Number(n & e) | 0
	};
}
function r(e, t = !1) {
	let r = e.length, i = new Uint32Array(r), a = new Uint32Array(r);
	for (let o = 0; o < r; o++) {
		let { h: r, l: s } = n(e[o], t);
		[i[o], a[o]] = [r, s];
	}
	return [i, a];
}
var i = (e) => e / 2 ** 32 | 0, a = (e) => e >>> 0;
function o(e, t, n, r) {
	let o = i(n), s = a(n);
	e.setUint32(t, r ? s : o, r), e.setUint32(t + 4, r ? o : s, r);
}
var s = (e, t, n) => e >>> n, c = (e, t, n) => e << 32 - n | t >>> n, l = (e, t, n) => e >>> n | t << 32 - n, u = (e, t, n) => e << 32 - n | t >>> n, d = (e, t, n) => e << 64 - n | t >>> n - 32, f = (e, t, n) => e >>> n - 32 | t << 64 - n;
function p(e, t, n, r) {
	let i = (t >>> 0) + (r >>> 0);
	return {
		h: e + n + (i / 2 ** 32 | 0) | 0,
		l: i | 0
	};
}
var m = (e, t, n) => (e >>> 0) + (t >>> 0) + (n >>> 0), h = (e, t, n, r) => t + n + r + (e / 2 ** 32 | 0) | 0, ee = (e, t, n, r) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0), g = (e, t, n, r, i) => t + n + r + i + (e / 2 ** 32 | 0) | 0, te = (e, t, n, r, i) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0) + (i >>> 0), ne = (e, t, n, r, i, a) => t + n + r + i + a + (e / 2 ** 32 | 0) | 0;
// node_modules/@noble/hashes/utils.js
function _(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
var v = (e) => e ? `"${e}" ` : "";
function y(e, t = "") {
	if (typeof e != "number") throw TypeError(v(t) + "expected number, got " + typeof e);
	if (!Number.isSafeInteger(e) || e < 0) throw RangeError(v(t) + "expected integer >= 0, got " + e);
	return e;
}
function b(e, t = "") {
	if (typeof e != "boolean") throw TypeError(v(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function x(e, t, n = "") {
	if (_(e) && (t === void 0 || e.length === t)) return e;
	t !== void 0 && y(t, "length");
	let r = _(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = v(n) + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}
function S(e) {
	if (typeof e != "function" || typeof e.create != "function") throw TypeError("expected hash wrapped by utils.createHasher");
	if (y(e.outputLen), y(e.blockLen), e.outputLen < 1 || e.blockLen < 1) throw Error("hash blockLen / outputLen must be >= 1");
}
var C = (e, t) => {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, w = (e, t) => {
	C(e, t);
	let n = Object.getPrototypeOf(e);
	if (n !== Object.prototype && n !== null) throw TypeError(`"${t}" expected plain object`);
	if (Object.hasOwn(e, "__proto__")) throw TypeError(`"${t}.__proto__" is not allowed`);
};
function T(e, t = !0) {
	if (e.destroyed) throw Error("hash was destroyed");
	if (t && e.finished) throw Error("digest() was already called");
}
function E(e, t) {
	x(e, void 0, "output");
	let n = t.outputLen;
	if (!(e.length >= n)) throw RangeError("\"output\" expected length >= " + n);
}
function D(e) {
	return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function O(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function k(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function A(e, t) {
	return e << 32 - t | e >>> t;
}
var j = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function M(e) {
	return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
function re(e) {
	for (let t = 0; t < e.length; t++) e[t] = M(e[t]);
	return e;
}
var N = j ? (e) => e : re, ie = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ae = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function P(e) {
	if (x(e), ie) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += ae[e[n]];
	return t;
}
function F(e) {
	return e >= 48 && e <= 57 ? e - 48 : e >= 65 && e <= 70 ? e - 55 : e >= 97 && e <= 102 ? e - 87 : void 0;
}
function I(e) {
	if (typeof e != "string") throw TypeError("hex string expected, got " + typeof e);
	if (ie) try {
		return Uint8Array.fromHex(e);
	} catch (e) {
		throw e instanceof SyntaxError ? RangeError(e.message) : e;
	}
	let t = e.length, n = t / 2;
	if (t % 2) throw RangeError("hex string expected, got unpadded hex of length " + t);
	let r = new Uint8Array(n);
	for (let t = 0, i = 0; t < n; t++, i += 2) {
		let n = F(e.charCodeAt(i)), a = F(e.charCodeAt(i + 1));
		if (n === void 0 || a === void 0) {
			let t = e[i] + e[i + 1];
			throw RangeError("hex string expected, got non-hex character \"" + t + "\" at index " + i);
		}
		r[t] = n * 16 + a;
	}
	return r;
}
function oe(e) {
	if (typeof e != "string") throw TypeError("string expected");
	let t = new TextEncoder().encode(e);
	try {
		return new Uint8Array(t);
	} finally {
		O(t);
	}
}
function L(...e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		x(r), t += r.length;
	}
	let n = new Uint8Array(t);
	for (let t = 0, r = 0; t < e.length; t++) {
		let i = e[t];
		n.set(i, r), r += i.length;
	}
	return n;
}
function se(e, t, n = "opts") {
	return w(e, "defaults"), t !== void 0 && w(t, n), Object.assign(Object.create(null), e, t);
}
function R(e, t = {}) {
	if (typeof e != "function") throw TypeError("\"hashCons\" expected function, got type=" + typeof e);
	t = se({}, t, "info");
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function ce(e = 32) {
	y(e, "bytesLength");
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	if (e > 65536) throw RangeError(`"bytesLength" expected <= 65536, got ${e}`);
	return t.getRandomValues(new Uint8Array(e));
}
var z = (e) => ({ oid: Uint8Array.from([
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
// node_modules/@noble/hashes/_md.js
function le(e, t, n) {
	return e & t ^ ~e & n;
}
function ue(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var de = class {
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
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = k(this.buffer);
	}
	update(e) {
		T(this), x(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length, a = !1;
		for (let o = 0; o < i;) {
			let s = Math.min(r - this.pos, i - o);
			if (s === r) {
				let t = k(e);
				for (; r <= i - o; o += r) this.process(t, o);
				a = !0;
			} else n.set(o === 0 && s === i ? e : e.subarray(o, o + s), this.pos), this.pos += s, o += s, this.pos === r && (this.process(t, 0), this.pos = 0, a = !0);
		}
		return this.length += e.length, a && this.roundClean(), this;
	}
	digestInto(e) {
		T(this), E(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, t.fill(0, a), this.padOffset > r - a && (this.process(n, 0), t.fill(0)), o(n, r - 8, this.length * 8, i), this.process(n, 0), this.roundClean();
		let s = e === t ? n : k(e), c = this.outputLen, l = c / 4, u = this.get();
		if (c % 4 || l > u.length) throw Error("invalid outputLen");
		for (let e = 0; e < l; e++) s.setUint32(4 * e, u[e], i);
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
}, fe = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), pe = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	4089235720,
	3144134277,
	2227873595,
	1013904242,
	4271175723,
	2773480762,
	1595750129,
	1359893119,
	2917565137,
	2600822924,
	725511199,
	528734635,
	4215389547,
	1541459225,
	327033209
]), me = /* @__PURE__ */ Uint32Array.from([
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
]), B = /* @__PURE__ */ new Uint32Array(64), he = class extends de {
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
		for (let n = 0; n < 16; n++, t += 4) B[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = B[e - 15], n = B[e - 2], r = A(t, 7) ^ A(t, 18) ^ t >>> 3, i = A(n, 17) ^ A(n, 19) ^ n >>> 10;
			B[e] = i + B[e - 7] + r + B[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = A(o, 6) ^ A(o, 11) ^ A(o, 25), u = l + t + le(o, s, c) + me[e] + B[e] | 0, d = (A(n, 2) ^ A(n, 13) ^ A(n, 22)) + ue(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		O(B);
	}
	destroy() {
		this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), O(this.buffer);
	}
}, ge = class extends he {
	constructor() {
		super(32, fe);
	}
}, V = /* @__PURE__ */ r((/* @__PURE__ */ "0x428a2f98d728ae22.0x7137449123ef65cd.0xb5c0fbcfec4d3b2f.0xe9b5dba58189dbbc.0x3956c25bf348b538.0x59f111f1b605d019.0x923f82a4af194f9b.0xab1c5ed5da6d8118.0xd807aa98a3030242.0x12835b0145706fbe.0x243185be4ee4b28c.0x550c7dc3d5ffb4e2.0x72be5d74f27b896f.0x80deb1fe3b1696b1.0x9bdc06a725c71235.0xc19bf174cf692694.0xe49b69c19ef14ad2.0xefbe4786384f25e3.0x0fc19dc68b8cd5b5.0x240ca1cc77ac9c65.0x2de92c6f592b0275.0x4a7484aa6ea6e483.0x5cb0a9dcbd41fbd4.0x76f988da831153b5.0x983e5152ee66dfab.0xa831c66d2db43210.0xb00327c898fb213f.0xbf597fc7beef0ee4.0xc6e00bf33da88fc2.0xd5a79147930aa725.0x06ca6351e003826f.0x142929670a0e6e70.0x27b70a8546d22ffc.0x2e1b21385c26c926.0x4d2c6dfc5ac42aed.0x53380d139d95b3df.0x650a73548baf63de.0x766a0abb3c77b2a8.0x81c2c92e47edaee6.0x92722c851482353b.0xa2bfe8a14cf10364.0xa81a664bbc423001.0xc24b8b70d0f89791.0xc76c51a30654be30.0xd192e819d6ef5218.0xd69906245565a910.0xf40e35855771202a.0x106aa07032bbd1b8.0x19a4c116b8d2d0c8.0x1e376c085141ab53.0x2748774cdf8eeb99.0x34b0bcb5e19b48a8.0x391c0cb3c5c95a63.0x4ed8aa4ae3418acb.0x5b9cca4f7763e373.0x682e6ff3d6b2b8a3.0x748f82ee5defb2fc.0x78a5636f43172f60.0x84c87814a1f0ab72.0x8cc702081a6439ec.0x90befffa23631e28.0xa4506cebde82bde9.0xbef9a3f7b2c67915.0xc67178f2e372532b.0xca273eceea26619c.0xd186b8c721c0c207.0xeada7dd6cde0eb1e.0xf57d4f7fee6ed178.0x06f067aa72176fba.0x0a637dc5a2c898a6.0x113f9804bef90dae.0x1b710b35131c471b.0x28db77f523047d84.0x32caab7b40c72493.0x3c9ebe0a15c9bebc.0x431d67c49c100d4c.0x4cc5d4becb3e42b6.0x597f299cfc657e2a.0x5fcb6fab3ad6faec.0x6c44198c4a475817".split(".")).map((e) => BigInt(e))), _e = V[0], ve = V[1], H = /* @__PURE__ */ new Uint32Array(80), U = /* @__PURE__ */ new Uint32Array(80), W = class extends de {
	Ah = 0;
	Al = 0;
	Bh = 0;
	Bl = 0;
	Ch = 0;
	Cl = 0;
	Dh = 0;
	Dl = 0;
	Eh = 0;
	El = 0;
	Fh = 0;
	Fl = 0;
	Gh = 0;
	Gl = 0;
	Hh = 0;
	Hl = 0;
	constructor(e, t) {
		super(128, e, 16, !1), this.Ah = t[0] | 0, this.Al = t[1] | 0, this.Bh = t[2] | 0, this.Bl = t[3] | 0, this.Ch = t[4] | 0, this.Cl = t[5] | 0, this.Dh = t[6] | 0, this.Dl = t[7] | 0, this.Eh = t[8] | 0, this.El = t[9] | 0, this.Fh = t[10] | 0, this.Fl = t[11] | 0, this.Gh = t[12] | 0, this.Gl = t[13] | 0, this.Hh = t[14] | 0, this.Hl = t[15] | 0;
	}
	get() {
		let { Ah: e, Al: t, Bh: n, Bl: r, Ch: i, Cl: a, Dh: o, Dl: s, Eh: c, El: l, Fh: u, Fl: d, Gh: f, Gl: p, Hh: m, Hl: h } = this;
		return [
			e,
			t,
			n,
			r,
			i,
			a,
			o,
			s,
			c,
			l,
			u,
			d,
			f,
			p,
			m,
			h
		];
	}
	set(e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h) {
		this.Ah = e | 0, this.Al = t | 0, this.Bh = n | 0, this.Bl = r | 0, this.Ch = i | 0, this.Cl = a | 0, this.Dh = o | 0, this.Dl = s | 0, this.Eh = c | 0, this.El = l | 0, this.Fh = u | 0, this.Fl = d | 0, this.Gh = f | 0, this.Gl = p | 0, this.Hh = m | 0, this.Hl = h | 0;
	}
	_cloneInto(e) {
		return (e ||= new this.constructor()).set(...this.get()), this._cloneIntoMeta(e);
	}
	process(e, t) {
		for (let n = 0; n < 16; n++, t += 4) H[n] = e.getUint32(t), U[n] = e.getUint32(t += 4);
		for (let e = 16; e < 80; e++) {
			let t = H[e - 15] | 0, n = U[e - 15] | 0, r = l(t, n, 1) ^ l(t, n, 8) ^ s(t, n, 7), i = u(t, n, 1) ^ u(t, n, 8) ^ c(t, n, 7), a = H[e - 2] | 0, o = U[e - 2] | 0, p = l(a, o, 19) ^ d(a, o, 61) ^ s(a, o, 6), m = ee(i, u(a, o, 19) ^ f(a, o, 61) ^ c(a, o, 6), U[e - 7], U[e - 16]), h = g(m, r, p, H[e - 7], H[e - 16]);
			H[e] = h | 0, U[e] = m | 0;
		}
		let { Ah: n, Al: r, Bh: i, Bl: a, Ch: o, Cl: _, Dh: v, Dl: y, Eh: b, El: x, Fh: S, Fl: C, Gh: w, Gl: T, Hh: E, Hl: D } = this;
		for (let e = 0; e < 80; e++) {
			let t = l(b, x, 14) ^ l(b, x, 18) ^ d(b, x, 41), s = u(b, x, 14) ^ u(b, x, 18) ^ f(b, x, 41), c = b & S ^ ~b & w, ee = x & C ^ ~x & T, g = te(D, s, ee, ve[e], U[e]), O = ne(g, E, t, c, _e[e], H[e]), k = g | 0, A = l(n, r, 28) ^ d(n, r, 34) ^ d(n, r, 39), j = u(n, r, 28) ^ f(n, r, 34) ^ f(n, r, 39), M = n & i ^ n & o ^ i & o, re = r & a ^ r & _ ^ a & _;
			E = w | 0, D = T | 0, w = S | 0, T = C | 0, S = b | 0, C = x | 0, {h: b, l: x} = p(v | 0, y | 0, O | 0, k | 0), v = o | 0, y = _ | 0, o = i | 0, _ = a | 0, i = n | 0, a = r | 0;
			let N = m(k, j, re);
			n = h(N, O, A, M), r = N | 0;
		}
		({h: n, l: r} = p(this.Ah | 0, this.Al | 0, n | 0, r | 0)), {h: i, l: a} = p(this.Bh | 0, this.Bl | 0, i | 0, a | 0), {h: o, l: _} = p(this.Ch | 0, this.Cl | 0, o | 0, _ | 0), {h: v, l: y} = p(this.Dh | 0, this.Dl | 0, v | 0, y | 0), {h: b, l: x} = p(this.Eh | 0, this.El | 0, b | 0, x | 0), {h: S, l: C} = p(this.Fh | 0, this.Fl | 0, S | 0, C | 0), {h: w, l: T} = p(this.Gh | 0, this.Gl | 0, w | 0, T | 0), {h: E, l: D} = p(this.Hh | 0, this.Hl | 0, E | 0, D | 0), this.set(n, r, i, a, o, _, v, y, b, x, S, C, w, T, E, D);
	}
	roundClean() {
		O(H, U);
	}
	destroy() {
		this.destroyed = !0, O(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
}, ye = class extends W {
	constructor() {
		super(64, pe);
	}
}, be = /* @__PURE__ */ Uint32Array.from([
	573645204,
	4230739756,
	2673172387,
	3360449730,
	596883563,
	1867755857,
	2520282905,
	1497426621,
	2519219938,
	2827943907,
	3193839141,
	1401305490,
	721525244,
	746961066,
	246885852,
	2177182882
]), xe = class extends W {
	constructor() {
		super(32, be);
	}
}, Se = /* @__PURE__ */ R(() => new ge(), /* @__PURE__ */ z(1)), Ce = /* @__PURE__ */ R(() => new ye(), /* @__PURE__ */ z(3)), we = /* @__PURE__ */ R(() => new xe(), /* @__PURE__ */ z(6)), G = (e) => Object.freeze(e());
function Te(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
function K(e) {
	if (!Te(e)) throw TypeError("Uint8Array expected");
}
function q(e, t) {
	if (typeof t != "string") throw TypeError(`${e}: string expected`);
	return !0;
}
function J(e, t = "number") {
	if (typeof e != "number") throw TypeError(`${t}: expected number, got ${typeof e}`);
	if (!Number.isSafeInteger(e)) throw RangeError(`${t}: expected safe integer, got ${e}`);
}
function Ee(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
var De = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})(), Oe = /* @__PURE__ */ (() => {
	try {
		let e = new TextDecoder();
		return e.decode(Uint8Array.of(65, 48, 43, 127)) === "A0+" ? e : void 0;
	} catch {
		return;
	}
})(), Y = 8192;
function ke(e) {
	let t = e.length;
	if (Oe !== void 0 && t >= 12) return Oe.decode(e);
	if (t <= Y) return String.fromCharCode.apply(null, e);
	let n = "";
	for (let r = 0; r < t; r += Y) n += String.fromCharCode.apply(null, e.subarray(r, r + Y));
	return n;
}
function Ae(e) {
	if (J(e), e <= 0 || e > 8) throw RangeError("radix2: bits should be in (0..8]");
	let t = De[e] - 1;
	return {
		encode: (n) => {
			K(n);
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
function je(e, t) {
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
			return ke(t);
		},
		decode: (t) => {
			q("decode", t);
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
function Me(e, t = "=") {
	return J(e), q("padding", t), {
		encode(n) {
			for (; n.length * e % 8;) n += t;
			return n;
		},
		decode(n) {
			q("decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid length");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: excess padding");
			return n.slice(0, r);
		}
	};
}
var Ne = /* @__PURE__ */ G(() => Ee(Ae(5), je("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"))), Pe = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Fe = /[\t\n\f\r ]/, Ie = (e, t) => {
	q("base64", e);
	let n = t ? "base64url" : "base64";
	if (e.length > 0 && Fe.test(e)) throw Error("invalid base64");
	return Uint8Array.fromBase64(e, {
		alphabet: n,
		lastChunkHandling: "strict"
	});
}, Le = /* @__PURE__ */ G(() => Ee(Ae(6), je("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), Me(6))), Re = /* @__PURE__ */ G(() => Pe ? {
	encode(e) {
		return K(e), e.toBase64();
	},
	decode(e) {
		return Ie(e, !1);
	}
} : Le);
// node_modules/@noble/curves/utils.js
function ze(e, t, n = () => {}) {
	if (!Array.isArray(e)) throw TypeError(`"${t}" expected array, got type=${typeof e}`);
	for (let r = 0; r < e.length; r++) n(e[r], `${t}[${r}]`);
	return e;
}
var Be = (e, t, n) => x(e, t, n), Ve = y;
function X(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
function He(e, t) {
	if (typeof e != "function") throw TypeError(`"${t}" is invalid: expected function, got ${typeof e}`);
	return e;
}
var Ue = P, We = (...e) => L(...e), Ge = (e) => I(e), Ke = _, qe = (e) => ce(e), Z = /* @__PURE__ */ BigInt(0), Q = /* @__PURE__ */ BigInt(1), Je = (e) => e ? `"${e}" ` : "";
function Ye(e, t = "") {
	if (typeof e != "boolean") throw TypeError(Je(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function Xe(e) {
	if (typeof e == "bigint") {
		if (!$(e)) throw RangeError("positive bigint expected, got " + e);
	} else Ve(e);
	return e;
}
function Ze(e, t = "") {
	if (typeof e != "number") {
		let n = t && `"${t}" `;
		throw TypeError(n + "expected number, got type=" + typeof e);
	}
	if (!Number.isSafeInteger(e)) {
		let n = t && `"${t}" `;
		throw RangeError(n + "expected safe integer, got " + e);
	}
}
function Qe(e) {
	if (typeof e != "string") throw TypeError("hex string expected, got " + typeof e);
	return e === "" ? Z : BigInt("0x" + e);
}
function $e(e) {
	return Qe(P(e));
}
function et(e) {
	return Qe(P(rt(x(e)).reverse()));
}
function tt(e, t) {
	if (y(t), t === 0) throw Error("zero output length is invalid");
	e = Xe(e);
	let n = t * 2, r = e.toString(16);
	if (r.length > n) throw RangeError("number is too large");
	return I(r.padStart(n, "0"));
}
function nt(e, t) {
	return tt(e, t).reverse();
}
function rt(e) {
	return Uint8Array.from(Be(e));
}
function $(e) {
	return typeof e == "bigint" && Z <= e;
}
function it(e, t, n) {
	return $(e) && $(t) && $(n) && t <= e && e < n;
}
function at(e, t, n, r) {
	if (!it(t, n, r)) throw RangeError("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function ot(e) {
	if (e < Z) throw Error("expected non-negative bigint, got " + e);
	return e === Z ? 0 : e.toString(2).length;
}
var st = (e) => (Ze(e, "n"), (Q << BigInt(e)) - Q);
function ct(e, t = {}, n = {}, r = "object") {
	X(e, r), X(t, "fields"), X(n, "optFields");
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
export { x as A, I as B, ct as C, Ce as D, Se as E, P as F, D as G, z as H, se as I, oe as K, O as L, S as M, y as N, we as O, E as P, L as R, qe as S, Re as T, ce as U, _ as V, N as W, it as _, He as a, tt as b, Ze as c, Ue as d, $e as f, Ge as g, rt as h, Be as i, T as j, b as k, ot as l, We as m, ze as n, Ve as o, et as p, r as q, Ye as r, X as s, at as t, st as u, Ke as v, Ne as w, nt as x, $ as y, R as z };
