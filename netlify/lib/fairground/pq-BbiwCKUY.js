import { A as e, C as t, E as n, F as r, G as i, H as a, I as o, K as s, L as c, M as l, N as u, P as d, R as f, T as p, U as m, V as h, W as g, j as _, k as v, q as y, r as b, z as x } from "./utils-Bw_p9nq9.js";
// \0rolldown/runtime.js
var S = Object.defineProperty, C = (e, t) => {
	let n = {};
	for (var r in e) S(n, r, {
		get: e[r],
		enumerable: !0
	});
	return t || S(n, Symbol.toStringTag, { value: "Module" }), n;
};
// node_modules/nostr-tools/node_modules/@noble/hashes/utils.js
function w(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function T(e, t = "") {
	if (!Number.isSafeInteger(e) || e < 0) {
		let n = t && `"${t}" `;
		throw Error(`${n}expected integer >= 0, got ${e}`);
	}
}
function E(e, t, n = "") {
	let r = w(e), i = e?.length, a = t !== void 0;
	if (!r || a && i !== t) {
		let o = n && `"${n}" `, s = a ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
		throw Error(o + "expected Uint8Array" + s + ", got " + c);
	}
	return e;
}
function D(e, t = !0) {
	if (e.destroyed) throw Error("Hash instance has been destroyed");
	if (t && e.finished) throw Error("Hash#digest() has already been called");
}
function O(e, t) {
	E(e, void 0, "digestInto() output");
	let n = t.outputLen;
	if (e.length < n) throw Error("\"digestInto() output\" expected to be of length >=" + n);
}
function k(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function A(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function j(e, t) {
	return e << 32 - t | e >>> t;
}
var M = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", ee = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function N(e) {
	if (E(e), M) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += ee[e[n]];
	return t;
}
var P = {
	_0: 48,
	_9: 57,
	A: 65,
	F: 70,
	a: 97,
	f: 102
};
function te(e) {
	if (e >= P._0 && e <= P._9) return e - P._0;
	if (e >= P.A && e <= P.F) return e - (P.A - 10);
	if (e >= P.a && e <= P.f) return e - (P.a - 10);
}
function F(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	if (M) return Uint8Array.fromHex(e);
	let t = e.length, n = t / 2;
	if (t % 2) throw Error("hex string expected, got unpadded hex of length " + t);
	let r = new Uint8Array(n);
	for (let t = 0, i = 0; t < n; t++, i += 2) {
		let n = te(e.charCodeAt(i)), a = te(e.charCodeAt(i + 1));
		if (n === void 0 || a === void 0) {
			let t = e[i] + e[i + 1];
			throw Error("hex string expected, got non-hex character \"" + t + "\" at index " + i);
		}
		r[t] = n * 16 + a;
	}
	return r;
}
function ne(...e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		E(r), t += r.length;
	}
	let n = new Uint8Array(t);
	for (let t = 0, r = 0; t < e.length; t++) {
		let i = e[t];
		n.set(i, r), r += i.length;
	}
	return n;
}
function I(e, t = {}) {
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function re(e = 32) {
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	return t.getRandomValues(new Uint8Array(e));
}
var ie = (e) => ({ oid: Uint8Array.from([
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
// node_modules/nostr-tools/node_modules/@noble/hashes/_md.js
function ae(e, t, n) {
	return e & t ^ ~e & n;
}
function oe(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var se = class {
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
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = A(this.buffer);
	}
	update(e) {
		D(this), E(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length;
		for (let a = 0; a < i;) {
			let o = Math.min(r - this.pos, i - a);
			if (o === r) {
				let t = A(e);
				for (; r <= i - a; a += r) this.process(t, a);
			} else n.set(e.subarray(a, a + o), this.pos), this.pos += o, a += o, this.pos === r && (this.process(t, 0), this.pos = 0);
		}
		return this.length += e.length, this.roundClean(), this;
	}
	digestInto(e) {
		D(this), O(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, k(this.buffer.subarray(a)), this.padOffset > r - a && (this.process(n, 0), a = 0);
		for (let e = a; e < r; e++) t[e] = 0;
		n.setBigUint64(r - 8, BigInt(this.length * 8), i), this.process(n, 0);
		let o = A(e), s = this.outputLen;
		if (s % 4) throw Error("_sha2: outputLen must be aligned to 32bit");
		let c = s / 4, l = this.get();
		if (c > l.length) throw Error("_sha2: outputLen bigger than state");
		for (let e = 0; e < c; e++) o.setUint32(4 * e, l[e], i);
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
}, L = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), ce = /* @__PURE__ */ Uint32Array.from([
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
]), R = /* @__PURE__ */ new Uint32Array(64), le = class extends se {
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
		for (let n = 0; n < 16; n++, t += 4) R[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = R[e - 15], n = R[e - 2], r = j(t, 7) ^ j(t, 18) ^ t >>> 3, i = j(n, 17) ^ j(n, 19) ^ n >>> 10;
			R[e] = i + R[e - 7] + r + R[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = j(o, 6) ^ j(o, 11) ^ j(o, 25), u = l + t + ae(o, s, c) + ce[e] + R[e] | 0, d = (j(n, 2) ^ j(n, 13) ^ j(n, 22)) + oe(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		k(R);
	}
	destroy() {
		this.set(0, 0, 0, 0, 0, 0, 0, 0), k(this.buffer);
	}
}, ue = class extends le {
	A = L[0] | 0;
	B = L[1] | 0;
	C = L[2] | 0;
	D = L[3] | 0;
	E = L[4] | 0;
	F = L[5] | 0;
	G = L[6] | 0;
	H = L[7] | 0;
	constructor() {
		super(32);
	}
}, de = /* @__PURE__ */ I(() => new ue(), /* @__PURE__ */ ie(1)), fe = /* @__PURE__ */ BigInt(0), pe = /* @__PURE__ */ BigInt(1);
function me(e, t = "") {
	if (typeof e != "boolean") {
		let n = t && `"${t}" `;
		throw Error(n + "expected boolean, got type=" + typeof e);
	}
	return e;
}
function he(e) {
	if (typeof e == "bigint") {
		if (!Ce(e)) throw Error("positive bigint expected, got " + e);
	} else T(e);
	return e;
}
function ge(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	return e === "" ? fe : BigInt("0x" + e);
}
function _e(e) {
	return ge(N(e));
}
function ve(e) {
	return ge(N(xe(E(e)).reverse()));
}
function ye(e, t) {
	T(t), e = he(e);
	let n = F(e.toString(16).padStart(t * 2, "0"));
	if (n.length !== t) throw Error("number too large");
	return n;
}
function be(e, t) {
	return ye(e, t).reverse();
}
function xe(e) {
	return Uint8Array.from(e);
}
function Se(e) {
	return Uint8Array.from(e, (t, n) => {
		let r = t.charCodeAt(0);
		if (t.length !== 1 || r > 127) throw Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
		return r;
	});
}
var Ce = (e) => typeof e == "bigint" && fe <= e;
function we(e) {
	let t = 0;
	for (; e > fe; e >>= pe, t += 1);
	return t;
}
var Te = (e) => (pe << BigInt(e)) - pe;
function Ee(e, t = {}, n = {}) {
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
function De(e) {
	let t = /* @__PURE__ */ new WeakMap();
	return (n, ...r) => {
		let i = t.get(n);
		if (i !== void 0) return i;
		let a = e(n, ...r);
		return t.set(n, a), a;
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/modular.js
var z = /* @__PURE__ */ BigInt(0), B = /* @__PURE__ */ BigInt(1), V = /* @__PURE__ */ BigInt(2), Oe = /* @__PURE__ */ BigInt(3), ke = /* @__PURE__ */ BigInt(4), Ae = /* @__PURE__ */ BigInt(5), je = /* @__PURE__ */ BigInt(7), Me = /* @__PURE__ */ BigInt(8), Ne = /* @__PURE__ */ BigInt(9), Pe = /* @__PURE__ */ BigInt(16);
function H(e, t) {
	let n = e % t;
	return n >= z ? n : t + n;
}
function U(e, t, n) {
	let r = e;
	for (; t-- > z;) r *= r, r %= n;
	return r;
}
function Fe(e, t) {
	if (e === z) throw Error("invert: expected non-zero number");
	if (t <= z) throw Error("invert: expected positive modulus, got " + t);
	let n = H(e, t), r = t, i = z, a = B, o = B, s = z;
	for (; n !== z;) {
		let e = r / n, t = r % n, c = i - o * e, l = a - s * e;
		r = n, n = t, i = o, a = s, o = c, s = l;
	}
	if (r !== B) throw Error("invert: does not exist");
	return H(i, t);
}
function Ie(e, t, n) {
	if (!e.eql(e.sqr(t), n)) throw Error("Cannot find square root");
}
function Le(e, t) {
	let n = (e.ORDER + B) / ke, r = e.pow(t, n);
	return Ie(e, r, t), r;
}
function Re(e, t) {
	let n = (e.ORDER - Ae) / Me, r = e.mul(t, V), i = e.pow(r, n), a = e.mul(t, i), o = e.mul(e.mul(a, V), i), s = e.mul(a, e.sub(o, e.ONE));
	return Ie(e, s, t), s;
}
function ze(e) {
	let t = Ye(e), n = Be(e), r = n(t, t.neg(t.ONE)), i = n(t, r), a = n(t, t.neg(r)), o = (e + je) / Pe;
	return (e, t) => {
		let n = e.pow(t, o), s = e.mul(n, r), c = e.mul(n, i), l = e.mul(n, a), u = e.eql(e.sqr(s), t), d = e.eql(e.sqr(c), t);
		n = e.cmov(n, s, u), s = e.cmov(l, c, d);
		let f = e.eql(e.sqr(s), t), p = e.cmov(n, s, f);
		return Ie(e, p, t), p;
	};
}
function Be(e) {
	if (e < Oe) throw Error("sqrt is not defined for small field");
	let t = e - B, n = 0;
	for (; t % V === z;) t /= V, n++;
	let r = V, i = Ye(e);
	for (; Ke(i, r) === 1;) if (r++ > 1e3) throw Error("Cannot find square root: probably non-prime P");
	if (n === 1) return Le;
	let a = i.pow(r, t), o = (t + B) / V;
	return function(e, r) {
		if (e.is0(r)) return r;
		if (Ke(e, r) !== 1) throw Error("Cannot find square root");
		let i = n, s = e.mul(e.ONE, a), c = e.pow(r, t), l = e.pow(r, o);
		for (; !e.eql(c, e.ONE);) {
			if (e.is0(c)) return e.ZERO;
			let t = 1, n = e.sqr(c);
			for (; !e.eql(n, e.ONE);) if (t++, n = e.sqr(n), t === i) throw Error("Cannot find square root");
			let r = B << BigInt(i - t - 1), a = e.pow(s, r);
			i = t, s = e.sqr(a), c = e.mul(c, s), l = e.mul(l, a);
		}
		return l;
	};
}
function Ve(e) {
	return e % ke === Oe ? Le : e % Me === Ae ? Re : e % Pe === Ne ? ze(e) : Be(e);
}
var He = [
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
function Ue(e) {
	return Ee(e, He.reduce((e, t) => (e[t] = "function", e), {
		ORDER: "bigint",
		BYTES: "number",
		BITS: "number"
	})), e;
}
function We(e, t, n) {
	if (n < z) throw Error("invalid exponent, negatives unsupported");
	if (n === z) return e.ONE;
	if (n === B) return t;
	let r = e.ONE, i = t;
	for (; n > z;) n & B && (r = e.mul(r, i)), i = e.sqr(i), n >>= B;
	return r;
}
function Ge(e, t, n = !1) {
	let r = Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((t, n, i) => e.is0(n) ? t : (r[i] = t, e.mul(t, n)), e.ONE), a = e.inv(i);
	return t.reduceRight((t, n, i) => e.is0(n) ? t : (r[i] = e.mul(t, r[i]), e.mul(t, n)), a), r;
}
function Ke(e, t) {
	let n = (e.ORDER - B) / V, r = e.pow(t, n), i = e.eql(r, e.ONE), a = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
	if (!i && !a && !o) throw Error("invalid Legendre symbol result");
	return i ? 1 : a ? 0 : -1;
}
function qe(e, t) {
	t !== void 0 && T(t);
	let n = t === void 0 ? e.toString(2).length : t;
	return {
		nBitLength: n,
		nByteLength: Math.ceil(n / 8)
	};
}
var Je = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = z;
	ONE = B;
	_lengths;
	_sqrt;
	_mod;
	constructor(e, t = {}) {
		if (e <= z) throw Error("invalid field: expected ORDER > 0, got " + e);
		let n;
		this.isLE = !1, typeof t == "object" && t && (typeof t.BITS == "number" && (n = t.BITS), typeof t.sqrt == "function" && (this.sqrt = t.sqrt), typeof t.isLE == "boolean" && (this.isLE = t.isLE), t.allowedLengths && (this._lengths = t.allowedLengths?.slice()), typeof t.modFromBytes == "boolean" && (this._mod = t.modFromBytes));
		let { nBitLength: r, nByteLength: i } = qe(e, n);
		if (i > 2048) throw Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = e, this.BITS = r, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
	}
	create(e) {
		return H(e, this.ORDER);
	}
	isValid(e) {
		if (typeof e != "bigint") throw Error("invalid field element: expected bigint, got " + typeof e);
		return z <= e && e < this.ORDER;
	}
	is0(e) {
		return e === z;
	}
	isValidNot0(e) {
		return !this.is0(e) && this.isValid(e);
	}
	isOdd(e) {
		return (e & B) === B;
	}
	neg(e) {
		return H(-e, this.ORDER);
	}
	eql(e, t) {
		return e === t;
	}
	sqr(e) {
		return H(e * e, this.ORDER);
	}
	add(e, t) {
		return H(e + t, this.ORDER);
	}
	sub(e, t) {
		return H(e - t, this.ORDER);
	}
	mul(e, t) {
		return H(e * t, this.ORDER);
	}
	pow(e, t) {
		return We(this, e, t);
	}
	div(e, t) {
		return H(e * Fe(t, this.ORDER), this.ORDER);
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
		return Fe(e, this.ORDER);
	}
	sqrt(e) {
		return this._sqrt ||= Ve(this.ORDER), this._sqrt(this, e);
	}
	toBytes(e) {
		return this.isLE ? be(e, this.BYTES) : ye(e, this.BYTES);
	}
	fromBytes(e, t = !1) {
		E(e);
		let { _lengths: n, BYTES: r, isLE: i, ORDER: a, _mod: o } = this;
		if (n) {
			if (!n.includes(e.length) || e.length > r) throw Error("Field.fromBytes: expected " + n + " bytes, got " + e.length);
			let t = new Uint8Array(r);
			t.set(e, i ? 0 : t.length - e.length), e = t;
		}
		if (e.length !== r) throw Error("Field.fromBytes: expected " + r + " bytes, got " + e.length);
		let s = i ? ve(e) : _e(e);
		if (o && (s = H(s, a)), !t && !this.isValid(s)) throw Error("invalid field element: outside of range 0..ORDER");
		return s;
	}
	invertBatch(e) {
		return Ge(this, e);
	}
	cmov(e, t, n) {
		return n ? t : e;
	}
};
function Ye(e, t = {}) {
	return new Je(e, t);
}
function Xe(e) {
	if (typeof e != "bigint") throw Error("field order must be bigint");
	let t = e.toString(2).length;
	return Math.ceil(t / 8);
}
function Ze(e) {
	let t = Xe(e);
	return t + Math.ceil(t / 2);
}
function Qe(e, t, n = !1) {
	E(e);
	let r = e.length, i = Xe(t), a = Ze(t);
	if (r < 16 || r < a || r > 1024) throw Error("expected " + a + "-1024 bytes of input, got " + r);
	let o = H(n ? ve(e) : _e(e), t - B) + B;
	return n ? be(o, i) : ye(o, i);
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/curve.js
var $e = /* @__PURE__ */ BigInt(0), W = /* @__PURE__ */ BigInt(1);
function et(e, t) {
	let n = t.negate();
	return e ? n : t;
}
function tt(e, t) {
	let n = Ge(e.Fp, t.map((e) => e.Z));
	return t.map((t, r) => e.fromAffine(t.toAffine(n[r])));
}
function nt(e, t) {
	if (!Number.isSafeInteger(e) || e <= 0 || e > t) throw Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function rt(e, t) {
	nt(e, t);
	let n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e;
	return {
		windows: n,
		windowSize: r,
		mask: Te(e),
		maxNumber: i,
		shiftBy: BigInt(e)
	};
}
function it(e, t, n) {
	let { windowSize: r, mask: i, maxNumber: a, shiftBy: o } = n, s = Number(e & i), c = e >> o;
	s > r && (s -= a, c += W);
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
var at = /* @__PURE__ */ new WeakMap(), ot = /* @__PURE__ */ new WeakMap();
function st(e) {
	return ot.get(e) || 1;
}
function ct(e) {
	if (e !== $e) throw Error("invalid wNAF");
}
var lt = class {
	BASE;
	ZERO;
	Fn;
	bits;
	constructor(e, t) {
		this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = t;
	}
	_unsafeLadder(e, t, n = this.ZERO) {
		let r = e;
		for (; t > $e;) t & W && (n = n.add(r)), r = r.double(), t >>= W;
		return n;
	}
	precomputeWindow(e, t) {
		let { windows: n, windowSize: r } = rt(t, this.bits), i = [], a = e, o = a;
		for (let e = 0; e < n; e++) {
			o = a, i.push(o);
			for (let e = 1; e < r; e++) o = o.add(a), i.push(o);
			a = o.double();
		}
		return i;
	}
	wNAF(e, t, n) {
		if (!this.Fn.isValid(n)) throw Error("invalid scalar");
		let r = this.ZERO, i = this.BASE, a = rt(e, this.bits);
		for (let e = 0; e < a.windows; e++) {
			let { nextN: o, offset: s, isZero: c, isNeg: l, isNegF: u, offsetF: d } = it(n, e, a);
			n = o, c ? i = i.add(et(u, t[d])) : r = r.add(et(l, t[s]));
		}
		return ct(n), {
			p: r,
			f: i
		};
	}
	wNAFUnsafe(e, t, n, r = this.ZERO) {
		let i = rt(e, this.bits);
		for (let e = 0; e < i.windows && n !== $e; e++) {
			let { nextN: a, offset: o, isZero: s, isNeg: c } = it(n, e, i);
			if (n = a, !s) {
				let e = t[o];
				r = r.add(c ? e.negate() : e);
			}
		}
		return ct(n), r;
	}
	getPrecomputes(e, t, n) {
		let r = at.get(t);
		return r || (r = this.precomputeWindow(t, e), e !== 1 && (typeof n == "function" && (r = n(r)), at.set(t, r))), r;
	}
	cached(e, t, n) {
		let r = st(e);
		return this.wNAF(r, this.getPrecomputes(r, e, n), t);
	}
	unsafe(e, t, n, r) {
		let i = st(e);
		return i === 1 ? this._unsafeLadder(e, t, r) : this.wNAFUnsafe(i, this.getPrecomputes(i, e, n), t, r);
	}
	createCache(e, t) {
		nt(t, this.bits), ot.set(e, t), at.delete(e);
	}
	hasCache(e) {
		return st(e) !== 1;
	}
};
function ut(e, t, n, r) {
	let i = t, a = e.ZERO, o = e.ZERO;
	for (; n > $e || r > $e;) n & W && (a = a.add(i)), r & W && (o = o.add(i)), i = i.double(), n >>= W, r >>= W;
	return {
		p1: a,
		p2: o
	};
}
function dt(e, t, n) {
	if (t) {
		if (t.ORDER !== e) throw Error("Field.ORDER must match order: Fp == p, Fn == n");
		return Ue(t), t;
	}
	return Ye(e, { isLE: n });
}
function ft(e, t, n = {}, r) {
	if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object") throw Error(`expected valid ${e} CURVE object`);
	for (let e of [
		"p",
		"n",
		"h"
	]) {
		let n = t[e];
		if (!(typeof n == "bigint" && n > $e)) throw Error(`CURVE.${e} must be positive bigint`);
	}
	let i = dt(t.p, n.Fp, r), a = dt(t.n, n.Fn, r), o = [
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
function pt(e, t) {
	return function(n) {
		let r = e(n);
		return {
			secretKey: r,
			publicKey: t(r)
		};
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/weierstrass.js
var mt = (e, t) => (e + (e >= 0 ? t : -t) / vt) / t;
function ht(e, t, n) {
	let [[r, i], [a, o]] = t, s = mt(o * e, n), c = mt(-i * e, n), l = e - s * r - c * a, u = -s * i - c * o, d = l < gt, f = u < gt;
	d && (l = -l), f && (u = -u);
	let p = Te(Math.ceil(we(n) / 2)) + _t;
	if (l < gt || l >= p || u < gt || u >= p) throw Error("splitScalar (endomorphism): failed, k=" + e);
	return {
		k1neg: d,
		k1: l,
		k2neg: f,
		k2: u
	};
}
var gt = BigInt(0), _t = BigInt(1), vt = BigInt(2), yt = BigInt(3), bt = BigInt(4);
function xt(e, t = {}) {
	let n = ft("weierstrass", e, t), { Fp: r, Fn: i } = n, a = n.CURVE, { h: o, n: s } = a;
	Ee(t, {}, {
		allowInfinityPoint: "boolean",
		clearCofactor: "function",
		isTorsionFree: "function",
		fromBytes: "function",
		toBytes: "function",
		endo: "object"
	});
	let { endo: c } = t;
	if (c && (!r.is0(a.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises))) throw Error("invalid endo: expected \"beta\": bigint and \"basises\": array");
	let l = Ct(r, i);
	function u() {
		if (!r.isOdd) throw Error("compression is not supported: Field does not have .isOdd()");
	}
	function d(e, t, n) {
		let { x: i, y: a } = t.toAffine(), o = r.toBytes(i);
		return me(n, "isCompressed"), n ? (u(), ne(St(!r.isOdd(a)), o)) : ne(Uint8Array.of(4), o, r.toBytes(a));
	}
	function f(e) {
		E(e, void 0, "Point");
		let { publicKey: t, publicKeyUncompressed: n } = l, i = e.length, a = e[0], o = e.subarray(1);
		if (i === t && (a === 2 || a === 3)) {
			let e = r.fromBytes(o);
			if (!r.isValid(e)) throw Error("bad point: is not on curve, wrong x");
			let t = h(e), n;
			try {
				n = r.sqrt(t);
			} catch (e) {
				let t = e instanceof Error ? ": " + e.message : "";
				throw Error("bad point: is not on curve, sqrt error" + t);
			}
			u();
			let i = r.isOdd(n);
			return (a & 1) == 1 !== i && (n = r.neg(n)), {
				x: e,
				y: n
			};
		}
		if (i === n && a === 4) {
			let e = r.BYTES, t = r.fromBytes(o.subarray(0, e)), n = r.fromBytes(o.subarray(e, e * 2));
			if (!g(t, n)) throw Error("bad point: is not on curve");
			return {
				x: t,
				y: n
			};
		}
		throw Error(`bad point: got length ${i}, expected compressed=${t} or uncompressed=${n}`);
	}
	let p = t.toBytes || d, m = t.fromBytes || f;
	function h(e) {
		let t = r.sqr(e), n = r.mul(t, e);
		return r.add(r.add(n, r.mul(e, a.a)), a.b);
	}
	function g(e, t) {
		let n = r.sqr(t), i = h(e);
		return r.eql(n, i);
	}
	if (!g(a.Gx, a.Gy)) throw Error("bad curve params: generator point");
	let _ = r.mul(r.pow(a.a, yt), bt), v = r.mul(r.sqr(a.b), BigInt(27));
	if (r.is0(r.add(_, v))) throw Error("bad curve params: a or b");
	function y(e, t, n = !1) {
		if (!r.isValid(t) || n && r.is0(t)) throw Error(`bad point coordinate ${e}`);
		return t;
	}
	function b(e) {
		if (!(e instanceof T)) throw Error("Weierstrass Point expected");
	}
	function x(e) {
		if (!c || !c.basises) throw Error("no endo");
		return ht(e, c.basises, i.ORDER);
	}
	let S = De((e, t) => {
		let { X: n, Y: i, Z: a } = e;
		if (r.eql(a, r.ONE)) return {
			x: n,
			y: i
		};
		let o = e.is0();
		t ??= o ? r.ONE : r.inv(a);
		let s = r.mul(n, t), c = r.mul(i, t), l = r.mul(a, t);
		if (o) return {
			x: r.ZERO,
			y: r.ZERO
		};
		if (!r.eql(l, r.ONE)) throw Error("invZ was invalid");
		return {
			x: s,
			y: c
		};
	}), C = De((e) => {
		if (e.is0()) {
			if (t.allowInfinityPoint && !r.is0(e.Y)) return;
			throw Error("bad point: ZERO");
		}
		let { x: n, y: i } = e.toAffine();
		if (!r.isValid(n) || !r.isValid(i)) throw Error("bad point: x or y not field elements");
		if (!g(n, i)) throw Error("bad point: equation left != right");
		if (!e.isTorsionFree()) throw Error("bad point: not in prime-order subgroup");
		return !0;
	});
	function w(e, t, n, i, a) {
		return n = new T(r.mul(n.X, e), n.Y, n.Z), t = et(i, t), n = et(a, n), t.add(n);
	}
	class T {
		static BASE = new T(a.Gx, a.Gy, r.ONE);
		static ZERO = new T(r.ZERO, r.ONE, r.ZERO);
		static Fp = r;
		static Fn = i;
		X;
		Y;
		Z;
		constructor(e, t, n) {
			this.X = y("x", e), this.Y = y("y", t, !0), this.Z = y("z", n), Object.freeze(this);
		}
		static CURVE() {
			return a;
		}
		static fromAffine(e) {
			let { x: t, y: n } = e || {};
			if (!e || !r.isValid(t) || !r.isValid(n)) throw Error("invalid affine point");
			if (e instanceof T) throw Error("projective point not allowed");
			return r.is0(t) && r.is0(n) ? T.ZERO : new T(t, n, r.ONE);
		}
		static fromBytes(e) {
			let t = T.fromAffine(m(E(e, void 0, "point")));
			return t.assertValidity(), t;
		}
		static fromHex(e) {
			return T.fromBytes(F(e));
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(e = 8, t = !0) {
			return O.createCache(this, e), t || this.multiply(yt), this;
		}
		assertValidity() {
			C(this);
		}
		hasEvenY() {
			let { y: e } = this.toAffine();
			if (!r.isOdd) throw Error("Field doesn't support isOdd");
			return !r.isOdd(e);
		}
		equals(e) {
			b(e);
			let { X: t, Y: n, Z: i } = this, { X: a, Y: o, Z: s } = e, c = r.eql(r.mul(t, s), r.mul(a, i)), l = r.eql(r.mul(n, s), r.mul(o, i));
			return c && l;
		}
		negate() {
			return new T(this.X, r.neg(this.Y), this.Z);
		}
		double() {
			let { a: e, b: t } = a, n = r.mul(t, yt), { X: i, Y: o, Z: s } = this, c = r.ZERO, l = r.ZERO, u = r.ZERO, d = r.mul(i, i), f = r.mul(o, o), p = r.mul(s, s), m = r.mul(i, o);
			return m = r.add(m, m), u = r.mul(i, s), u = r.add(u, u), c = r.mul(e, u), l = r.mul(n, p), l = r.add(c, l), c = r.sub(f, l), l = r.add(f, l), l = r.mul(c, l), c = r.mul(m, c), u = r.mul(n, u), p = r.mul(e, p), m = r.sub(d, p), m = r.mul(e, m), m = r.add(m, u), u = r.add(d, d), d = r.add(u, d), d = r.add(d, p), d = r.mul(d, m), l = r.add(l, d), p = r.mul(o, s), p = r.add(p, p), d = r.mul(p, m), c = r.sub(c, d), u = r.mul(p, f), u = r.add(u, u), u = r.add(u, u), new T(c, l, u);
		}
		add(e) {
			b(e);
			let { X: t, Y: n, Z: i } = this, { X: o, Y: s, Z: c } = e, l = r.ZERO, u = r.ZERO, d = r.ZERO, f = a.a, p = r.mul(a.b, yt), m = r.mul(t, o), h = r.mul(n, s), g = r.mul(i, c), _ = r.add(t, n), v = r.add(o, s);
			_ = r.mul(_, v), v = r.add(m, h), _ = r.sub(_, v), v = r.add(t, i);
			let y = r.add(o, c);
			return v = r.mul(v, y), y = r.add(m, g), v = r.sub(v, y), y = r.add(n, i), l = r.add(s, c), y = r.mul(y, l), l = r.add(h, g), y = r.sub(y, l), d = r.mul(f, v), l = r.mul(p, g), d = r.add(l, d), l = r.sub(h, d), d = r.add(h, d), u = r.mul(l, d), h = r.add(m, m), h = r.add(h, m), g = r.mul(f, g), v = r.mul(p, v), h = r.add(h, g), g = r.sub(m, g), g = r.mul(f, g), v = r.add(v, g), m = r.mul(h, v), u = r.add(u, m), m = r.mul(y, v), l = r.mul(_, l), l = r.sub(l, m), m = r.mul(_, h), d = r.mul(y, d), d = r.add(d, m), new T(l, u, d);
		}
		subtract(e) {
			return this.add(e.negate());
		}
		is0() {
			return this.equals(T.ZERO);
		}
		multiply(e) {
			let { endo: n } = t;
			if (!i.isValidNot0(e)) throw Error("invalid scalar: out of range");
			let r, a, o = (e) => O.cached(this, e, (e) => tt(T, e));
			if (n) {
				let { k1neg: t, k1: i, k2neg: s, k2: c } = x(e), { p: l, f: u } = o(i), { p: d, f } = o(c);
				a = u.add(f), r = w(n.beta, l, d, t, s);
			} else {
				let { p: t, f: n } = o(e);
				r = t, a = n;
			}
			return tt(T, [r, a])[0];
		}
		multiplyUnsafe(e) {
			let { endo: n } = t, r = this;
			if (!i.isValid(e)) throw Error("invalid scalar: out of range");
			if (e === gt || r.is0()) return T.ZERO;
			if (e === _t) return r;
			if (O.hasCache(this)) return this.multiply(e);
			if (n) {
				let { k1neg: t, k1: i, k2neg: a, k2: o } = x(e), { p1: s, p2: c } = ut(T, r, i, o);
				return w(n.beta, s, c, t, a);
			}
			return O.unsafe(r, e);
		}
		toAffine(e) {
			return S(this, e);
		}
		isTorsionFree() {
			let { isTorsionFree: e } = t;
			return o === _t ? !0 : e ? e(T, this) : O.unsafe(this, s).is0();
		}
		clearCofactor() {
			let { clearCofactor: e } = t;
			return o === _t ? this : e ? e(T, this) : this.multiplyUnsafe(o);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(o).is0();
		}
		toBytes(e = !0) {
			return me(e, "isCompressed"), this.assertValidity(), p(T, this, e);
		}
		toHex(e = !0) {
			return N(this.toBytes(e));
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	let D = i.BITS, O = new lt(T, t.endo ? Math.ceil(D / 2) : D);
	return T.BASE.precompute(8), T;
}
function St(e) {
	return Uint8Array.of(e ? 2 : 3);
}
function Ct(e, t) {
	return {
		secretKey: t.BYTES,
		publicKey: 1 + e.BYTES,
		publicKeyUncompressed: 1 + 2 * e.BYTES,
		publicKeyHasPrefix: !0,
		signature: 2 * t.BYTES
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/secp256k1.js
var wt = {
	p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
	n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	h: BigInt(1),
	a: BigInt(0),
	b: BigInt(7),
	Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
	Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Tt = {
	beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
	basises: [[BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")], [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]]
}, Et = /* @__PURE__ */ BigInt(0), Dt = /* @__PURE__ */ BigInt(2);
function Ot(e) {
	let t = wt.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), a = BigInt(22), o = BigInt(23), s = BigInt(44), c = BigInt(88), l = e * e * e % t, u = l * l * e % t, d = U(U(U(u, n, t) * u % t, n, t) * u % t, Dt, t) * l % t, f = U(d, i, t) * d % t, p = U(f, a, t) * f % t, m = U(p, s, t) * p % t, h = U(U(U(U(U(U(m, c, t) * m % t, s, t) * p % t, n, t) * u % t, o, t) * f % t, r, t) * l % t, Dt, t);
	if (!kt.eql(kt.sqr(h), e)) throw Error("Cannot find square root");
	return h;
}
var kt = Ye(wt.p, { sqrt: Ot }), At = /* @__PURE__ */ xt(wt, {
	Fp: kt,
	endo: Tt
}), jt = {};
function Mt(e, ...t) {
	let n = jt[e];
	if (n === void 0) {
		let t = de(Se(e));
		n = ne(t, t), jt[e] = n;
	}
	return de(ne(n, ...t));
}
var Nt = (e) => e.toBytes(!0).slice(1), Pt = (e) => e % Dt === Et;
function Ft(e) {
	let { Fn: t, BASE: n } = At, r = t.fromBytes(e), i = n.multiply(r);
	return {
		scalar: Pt(i.y) ? r : t.neg(r),
		bytes: Nt(i)
	};
}
function It(e) {
	let t = kt;
	if (!t.isValidNot0(e)) throw Error("invalid x: Fail if x ≥ p");
	let n = t.create(e * e), r = t.create(n * e + BigInt(7)), i = t.sqrt(r);
	Pt(i) || (i = t.neg(i));
	let a = At.fromAffine({
		x: e,
		y: i
	});
	return a.assertValidity(), a;
}
var Lt = _e;
function Rt(...e) {
	return At.Fn.create(Lt(Mt("BIP0340/challenge", ...e)));
}
function zt(e) {
	return Ft(e).bytes;
}
function Bt(e, t, n = re(32)) {
	let { Fn: r } = At, i = E(e, void 0, "message"), { bytes: a, scalar: o } = Ft(t), s = E(n, 32, "auxRand"), { bytes: c, scalar: l } = Ft(Mt("BIP0340/nonce", r.toBytes(o ^ Lt(Mt("BIP0340/aux", s))), a, i)), u = Rt(c, a, i), d = /* @__PURE__ */ new Uint8Array(64);
	if (d.set(c, 0), d.set(r.toBytes(r.create(l + u * o)), 32), !Vt(d, i, a)) throw Error("sign: Invalid signature produced");
	return d;
}
function Vt(e, t, n) {
	let { Fp: r, Fn: i, BASE: a } = At, o = E(e, 64, "signature"), s = E(t, void 0, "message"), c = E(n, 32, "publicKey");
	try {
		let e = It(Lt(c)), t = Lt(o.subarray(0, 32));
		if (!r.isValidNot0(t)) return !1;
		let n = Lt(o.subarray(32, 64));
		if (!i.isValidNot0(n)) return !1;
		let l = Rt(i.toBytes(t), Nt(e), s), u = a.multiplyUnsafe(n).add(e.multiplyUnsafe(i.neg(l))), { x: d, y: f } = u.toAffine();
		return !(u.is0() || !Pt(f) || d !== t);
	} catch {
		return !1;
	}
}
var Ht = /* @__PURE__ */ (() => {
	let e = (e = re(48)) => Qe(e, wt.n);
	return {
		keygen: pt(e, zt),
		getPublicKey: zt,
		sign: Bt,
		verify: Vt,
		Point: At,
		utils: {
			randomSecretKey: e,
			taggedHash: Mt,
			lift_x: It,
			pointToBytes: Nt
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
var Ut = new TextEncoder();
function Wt(e) {
	if (e.length !== 64) return !1;
	for (let t = 0; t < 64; t++) {
		let n = e.charCodeAt(t);
		if (isNaN(n) || n < 48 || n > 102 || n > 57 && n < 97) return !1;
	}
	return !0;
}
var Gt = Symbol("verified"), Kt = (e) => e instanceof Object;
function qt(e) {
	if (!Kt(e) || typeof e.kind != "number" || typeof e.content != "string" || typeof e.created_at != "number" || typeof e.pubkey != "string" || !Wt(e.pubkey) || !Array.isArray(e.tags)) return !1;
	for (let t = 0; t < e.tags.length; t++) {
		let n = e.tags[t];
		if (!Array.isArray(n)) return !1;
		for (let e = 0; e < n.length; e++) if (typeof n[e] != "string") return !1;
	}
	return !0;
}
var Jt = class {
	generateSecretKey() {
		return Ht.utils.randomSecretKey();
	}
	getPublicKey(e) {
		return N(Ht.getPublicKey(e));
	}
	finalizeEvent(e, t) {
		let n = e;
		return n.pubkey = N(Ht.getPublicKey(t)), n.id = Xt(n), n.sig = N(Ht.sign(F(Xt(n)), t)), n[Gt] = !0, n;
	}
	verifyEvent(e) {
		if (typeof e[Gt] == "boolean") return e[Gt];
		try {
			let t = Xt(e);
			if (t !== e.id) return e[Gt] = !1, !1;
			let n = Ht.verify(F(e.sig), F(t), F(e.pubkey));
			return e[Gt] = n, n;
		} catch {
			return e[Gt] = !1, !1;
		}
	}
};
function Yt(e) {
	if (!qt(e)) throw Error("can't serialize event with wrong or missing properties");
	return JSON.stringify([
		0,
		e.pubkey,
		e.created_at,
		e.kind,
		e.tags,
		e.content
	]);
}
function Xt(e) {
	return N(de(Ut.encode(Yt(e))));
}
var Zt = new Jt();
Zt.generateSecretKey;
var Qt = Zt.getPublicKey, $t = Zt.finalizeEvent, en = Zt.verifyEvent, tn = {
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
}, nn = "ml-dsa-65", rn = "fairground/v1", an = (e, t) => e.tags.find((e) => e[0] === t), on = (e, t) => an(e, t)?.[1], sn = (e, t) => e.tags.find((e) => e[0] === "e" && e[3] === t)?.[1], cn = () => Math.floor(Date.now() / 1e3), ln = (e, t) => e.created_at - t.created_at || (e.id < t.id ? -1 : +(e.id > t.id)), un = BigInt(0), dn = BigInt(1), fn = BigInt(2), pn = BigInt(7), mn = BigInt(256), hn = BigInt(113), gn = [], _n = [], vn = [];
for (let e = 0, t = dn, n = 1, r = 0; e < 24; e++) {
	[n, r] = [r, (2 * n + 3 * r) % 5], gn.push(2 * (5 * r + n)), _n.push((e + 1) * (e + 2) / 2 % 64);
	let i = un;
	for (let e = 0; e < 7; e++) t = (t << dn ^ (t >> pn) * hn) % mn, t & fn && (i ^= dn << (dn << BigInt(e)) - dn);
	vn.push(i);
}
var yn = y(vn, !0), bn = yn[0], xn = yn[1], Sn = (e, t, n) => e << n | t >>> 32 - n, Cn = (e, t, n) => t << n | e >>> 32 - n, wn = (e, t, n) => t << n - 32 | e >>> 64 - n, Tn = (e, t, n) => e << n - 32 | t >>> 64 - n, En = (e, t, n) => n > 32 ? wn(e, t, n) : Sn(e, t, n), Dn = (e, t, n) => n > 32 ? Tn(e, t, n) : Cn(e, t, n), On = /* @__PURE__ */ new Uint32Array(10);
function kn(e, t = 24) {
	if (!(e instanceof Uint32Array)) throw TypeError("\"s\" expected Uint32Array(50), got type=" + typeof e);
	if (e.length !== 50) throw RangeError("\"s\" expected Uint32Array(50), got length=" + e.length);
	if (u(t, "rounds"), t < 1 || t > 24) throw Error("\"rounds\" expected integer 1..24");
	for (let n = 24 - t; n < 24; n++) {
		for (let t = 0; t < 10; t++) On[t] = e[t] ^ e[t + 10] ^ e[t + 20] ^ e[t + 30] ^ e[t + 40];
		for (let t = 0; t < 10; t += 2) {
			let n = (t + 8) % 10, r = (t + 2) % 10, i = On[r], a = On[r + 1], o = En(i, a, 1) ^ On[n], s = Dn(i, a, 1) ^ On[n + 1];
			for (let n = 0; n < 50; n += 10) e[t + n] ^= o, e[t + n + 1] ^= s;
		}
		let t = e[2], r = e[3];
		for (let n = 0; n < 24; n++) {
			let i = _n[n], a = En(t, r, i), o = Dn(t, r, i), s = gn[n];
			t = e[s], r = e[s + 1], e[s] = a, e[s + 1] = o;
		}
		for (let t = 0; t < 50; t += 10) {
			let n = e[t], r = e[t + 1], i = e[t + 2], a = e[t + 3];
			e[t] ^= ~e[t + 2] & e[t + 4], e[t + 1] ^= ~e[t + 3] & e[t + 5], e[t + 2] ^= ~e[t + 4] & e[t + 6], e[t + 3] ^= ~e[t + 5] & e[t + 7], e[t + 4] ^= ~e[t + 6] & e[t + 8], e[t + 5] ^= ~e[t + 7] & e[t + 9], e[t + 6] ^= ~e[t + 8] & n, e[t + 7] ^= ~e[t + 9] & r, e[t + 8] ^= ~n & i, e[t + 9] ^= ~r & a;
		}
		e[0] ^= bn[n], e[1] ^= xn[n];
	}
	c(On);
}
var An = class t {
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
	constructor(e, t, n, r = !1, a = 24) {
		if (u(e, "blockLen"), u(t, "suffix"), u(a, "rounds"), v(r, "enableXOF"), this.blockLen = e, this.suffix = t, this.outputLen = n, this.enableXOF = r, this.canXOF = r, this.rounds = a, u(n, "outputLen"), !(0 < e && e < 200)) throw Error("\"blockLen\" must be 1..199");
		this.state = /* @__PURE__ */ new Uint8Array(200), this.state32 = i(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		g(this.state32), kn(this.state32, this.rounds), g(this.state32), this.posOut = 0, this.pos = 0;
	}
	update(t) {
		_(this), e(t);
		let { blockLen: n, state: r, state32: a } = this, o = t.length, s = n % 4 == 0 && t.byteOffset % 4 == 0, c = n / 4, l = s && o >= n ? i(t) : void 0;
		for (let e = 0; e < o;) {
			if (l !== void 0 && this.pos === 0 && e % 4 == 0 && o - e >= n) {
				for (let t = 0, n = e / 4; t < c; t++) a[t] ^= l[n + t];
				e += n, this.pos = n, this.keccak();
				continue;
			}
			let i = Math.min(n - this.pos, o - e);
			for (let n = 0; n < i; n++) r[this.pos++] ^= t[e++];
			this.pos === n && this.keccak();
		}
		return this;
	}
	finish() {
		if (this.finished) return;
		this.finished = !0;
		let { state: e, suffix: t, pos: n, blockLen: r } = this;
		e[n] ^= t, t & 128 && n === r - 1 && this.keccak(), e[r - 1] ^= 128, this.keccak();
	}
	writeInto(t) {
		_(this, !1), e(t), this.finish();
		let n = this.state, { blockLen: r } = this;
		for (let e = 0, i = t.length; e < i;) {
			this.posOut >= r && this.keccak();
			let a = Math.min(r - this.posOut, i - e);
			t.set(n.subarray(this.posOut, this.posOut + a), e), this.posOut += a, e += a;
		}
		return t;
	}
	xofInto(e) {
		if (!this.enableXOF) throw Error("XOF is not enabled");
		return this.writeInto(e);
	}
	xof(e) {
		return u(e), this.xofInto(new Uint8Array(e));
	}
	digestInto(e) {
		if (d(e, this), this.finished) throw Error("digest() was already called");
		this.writeInto(e.length === this.outputLen ? e : e.subarray(0, this.outputLen)), this.destroy();
	}
	digest() {
		let e = new Uint8Array(this.outputLen);
		return this.digestInto(e), e;
	}
	destroy() {
		this.destroyed = !0, c(this.state);
	}
	_cloneInto(e) {
		let { blockLen: n, suffix: r, outputLen: i, rounds: a, enableXOF: o } = this;
		return e ||= new t(n, r, i, o, a), e.blockLen = n, e.state32.set(this.state32), e.pos = this.pos, e.posOut = this.posOut, e.finished = this.finished, e.rounds = a, e.suffix = r, e.outputLen = i, e.enableXOF = o, e.canXOF = this.canXOF, e.destroyed = this.destroyed, e;
	}
}, jn = (e, t, n, r = {}) => x((r = {}) => (r = o({}, r), new An(t, e, r.dkLen === void 0 ? n : r.dkLen, !0)), r), Mn = /* @__PURE__ */ jn(31, 168, 16, /* @__PURE__ */ a(11)), G = /* @__PURE__ */ jn(31, 136, 32, /* @__PURE__ */ a(12));
// node_modules/@noble/curves/abstract/fft.js
function Nn(e, t = "n") {
	if (typeof e != "number") throw TypeError(`wrong u32 integer "${t}": expected number, got type=${typeof e}`);
	if (!Number.isSafeInteger(e) || e < 0 || e > 4294967295) throw RangeError(`wrong u32 integer "${t}": expected 0..4294967295, got ${e}`);
	return e;
}
function Pn(e) {
	return Nn(e, "x"), !(e & e - 1) && e !== 0;
}
function Fn(e, t) {
	if (Nn(e), typeof t != "number") throw TypeError("\"bits\" expected number, got type=" + typeof t);
	if (!Number.isSafeInteger(t) || t < 0 || t > 32) throw Error(`expected integer 0 <= bits <= 32, got ${t}`);
	let n = 0;
	for (let r = 0; r < t; r++, e >>>= 1) n = n << 1 | e & 1;
	return n >>> 0;
}
function In(e) {
	return Nn(e), 31 - Math.clz32(e);
}
function Ln(e) {
	if (!e || typeof e != "object" || typeof e.length != "number") throw TypeError("\"values\" expected array-like, got type=" + typeof e);
	let t = e.length;
	if (!Pn(t)) throw Error("expected positive power-of-two length, got " + t);
	let n = In(t);
	for (let r = 0; r < t; r++) {
		let t = Fn(r, n);
		if (r < t) {
			let n = e[r];
			e[r] = e[t], e[t] = n;
		}
	}
	return e;
}
var Rn = (e, n) => {
	t(n, {
		N: "number",
		roots: "object",
		dit: "boolean"
	}, {
		invertButterflies: "boolean",
		skipStages: "number",
		brp: "boolean"
	}, "coreOpts");
	let { N: r, roots: i, dit: a, invertButterflies: o = !1, skipStages: s = 0, brp: c = !0 } = n;
	Nn(r, "coreOpts.N");
	let l = In(r);
	if (!Pn(r)) throw Error("FFT: Polynomial size should be power of two");
	Nn(s, "coreOpts.skipStages");
	let u = l === 0 ? 0 : l - 1;
	if (s > u) throw Error(`FFT: wrong skipStages: expected 0 <= skipStages <= ${u}`);
	if (i.length !== r) throw Error(`FFT: wrong roots length: expected ${r}, got ${i.length}`);
	let d = a !== o;
	return (t) => {
		if (t.length !== r) throw Error("FFT: wrong Polynomial length");
		a && c && Ln(t);
		for (let n = 0, c = 1; n < l - s; n++) {
			let u = a ? n + 1 + s : l - n, f = 1 << u, p = f >> 1, m = r >> u;
			for (let n = 0; n < r; n += f) for (let s = 0, l = c++; s < p; s++) {
				let c = o ? a ? r - l : l : s * m, u = n + s, f = n + s + p, h = i[c], g = t[f], _ = t[u];
				if (d) {
					let n = e.mul(g, h);
					t[u] = e.add(_, n), t[f] = e.sub(_, n);
				} else o ? (t[u] = e.add(g, _), t[f] = e.mul(e.sub(g, _), h)) : (t[u] = e.add(_, g), t[f] = e.mul(e.sub(_, g), h));
			}
		}
		return !a && c && Ln(t), t;
	};
}, K = e, zn = m;
function Bn(e, t, n = () => {}) {
	if (!Array.isArray(e)) throw TypeError(`"${t}" expected array, got type=${typeof e}`);
	for (let r = 0; r < e.length; r++) n(e[r], `${t}[${r}]`);
	return e;
}
function Vn(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
function Hn(t, n) {
	if (t = e(t), n = e(n), t.length !== n.length) return !1;
	let r = 0;
	for (let e = 0; e < t.length; e++) r |= t[e] ^ n[e];
	return r === 0;
}
function Un(e) {
	if (h(e)) throw TypeError("\"opts\" expected object, got Uint8Array");
	Vn(e, "opts");
	let t = Object.getPrototypeOf(e);
	if (t !== null && t !== Object.prototype) throw TypeError("\"opts\" expected a plain object");
}
var Wn = /* @__PURE__ */ Object.freeze(["context"]), Gn = /* @__PURE__ */ Object.freeze(["context", "extraEntropy"]);
function Kn(e, t) {
	Un(e);
	let n = Object.assign(Object.create(null), e);
	for (let [e, r] of Object.entries(n)) if (r !== void 0 && !t.includes(e)) throw TypeError("unexpected option \"" + String(e) + "\"; expected one of: " + t.join(", "));
	return Object.freeze(n);
}
function qn(t, n = Wn) {
	let r = Kn(t, n);
	return r.context !== void 0 && e(r.context, void 0, "opts.context"), r;
}
function Jn(t, n = Gn) {
	let r = Kn(t, n);
	return r.context !== void 0 && e(r.context, void 0, "opts.context"), r.extraEntropy !== !1 && r.extraEntropy !== void 0 && e(r.extraEntropy, void 0, "opts.extraEntropy"), r;
}
function Yn(t, ...n) {
	let r = (e) => typeof e == "number" ? e : e.bytesLen, i = n.reduce((e, t) => e + r(t), 0);
	return {
		bytesLen: i,
		encode: (a) => {
			let o = new Uint8Array(i);
			for (let i = 0, s = 0; i < n.length; i++) {
				let c = n[i], l = r(c), u = typeof c == "number" ? a[i] : c.encode(a[i]);
				e(u, l, t), o.set(u, s), typeof c != "number" && u.fill(0), s += l;
			}
			return o;
		},
		decode: (a) => {
			e(a, i, t);
			let o = [];
			for (let e of n) {
				let t = r(e), n = a.subarray(0, t);
				o.push(typeof e == "number" ? n : e.decode(n)), a = a.subarray(t);
			}
			return o;
		}
	};
}
function Xn(t, n) {
	let r = t, i = n * r.bytesLen;
	return {
		bytesLen: i,
		encode: (e) => {
			let t = Bn(e, "u");
			if (t.length !== n) throw RangeError(`vecCoder.encode: wrong length=${t.length}. Expected: ${n}`);
			let a = new Uint8Array(i);
			for (let e = 0, n = 0; e < t.length; e++) {
				let i = r.encode(t[e]);
				a.set(i, n), i.fill(0), n += i.length;
			}
			return a;
		},
		decode: (t) => {
			e(t, i);
			let n = [];
			for (let e = 0; e < t.length; e += r.bytesLen) n.push(r.decode(t.subarray(e, e + r.bytesLen)));
			return n;
		}
	};
}
function q(...e) {
	for (let t of e) if (Array.isArray(t)) for (let e of t) e.fill(0);
	else t.fill(0);
}
function Zn(e) {
	if (u(e, "bits"), e > 32) throw RangeError("\"bits\" expected <= 32, got " + e);
	return e === 32 ? 4294967295 : ~(-1 << e) >>> 0;
}
var Qn = /* @__PURE__ */ Uint8Array.of();
function $n(t, n = Qn) {
	if (e(t, void 0, "msg"), e(n, void 0, "ctx"), n.length > 255) throw RangeError("context should be 255 bytes or less");
	return f(new Uint8Array([0, n.length]), n, t);
}
var er = /* @__PURE__ */ Uint8Array.from([
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
]), tr = {
	"060960864801650304020b": 32,
	"060960864801650304020c": 64
};
function nr(t, n = 0) {
	if (typeof t != "function" || typeof t.create != "function") throw TypeError("\"hash\" expected hash function, got type=" + typeof t);
	l(t), u(n, "requiredStrength");
	let i = t.oid;
	if (e(i, void 0, "hash.oid"), !Hn(i.subarray(0, 10), er)) throw Error("\"hash.oid\" is invalid: expected NIST hash");
	let a = tr[r(i)];
	if (a !== void 0 && t.outputLen !== a) throw Error("Pre-hash XOF output length must be " + a + " bytes for this OID, got: " + t.outputLen);
	let o = t.outputLen * 8 / 2;
	if (n > o) throw Error("Pre-hash security strength too low: " + o + ", required: " + n);
}
function rr(t, n, r = Qn) {
	if (nr(t), e(n, void 0, "msg"), e(r, void 0, "ctx"), r.length > 255) throw RangeError("context should be 255 bytes or less");
	let i = t(n);
	return f(new Uint8Array([1, r.length]), r, t.oid, i);
}
// node_modules/@noble/post-quantum/_crystals.js
var ir = (e) => {
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
			let n = Fn(t, o), i = BigInt(a) ** BigInt(n) % BigInt(r);
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
	}, h = Rn(p, {
		dit: !1,
		...m
	}), g = Rn(p, {
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
			for (let t = 0, r = 0; t < n; t++) r += e, r > 32 && Zn(r), r %= 8;
			let i = Zn(e), a = n / 8 * e;
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
}, ar = (e) => (t, n) => {
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
			o.destroy(), q(a, r);
		}
	};
}, or = /* @__PURE__ */ ar(Mn), sr = /* @__PURE__ */ ar(G), cr = /* @__PURE__ */ Object.freeze(["extraEntropy", "externalMu"]), lr = /* @__PURE__ */ Object.freeze(["externalMu"]);
function ur(e, t) {
	let n = Kn(e, t);
	return n.externalMu !== void 0 && b(n.externalMu, "opts.externalMu"), n;
}
var J = 256, dr = 8380417, fr = 1753, pr = 8347681, Y = 13, mr = 95232, hr = 261888, gr = /* @__PURE__ */ Object.freeze({
	2: Object.freeze({
		K: 4,
		L: 4,
		D: Y,
		GAMMA1: 2 ** 17,
		GAMMA2: mr,
		TAU: 39,
		ETA: 2,
		OMEGA: 80
	}),
	3: Object.freeze({
		K: 6,
		L: 5,
		D: Y,
		GAMMA1: 2 ** 19,
		GAMMA2: hr,
		TAU: 49,
		ETA: 4,
		OMEGA: 55
	}),
	5: Object.freeze({
		K: 8,
		L: 7,
		D: Y,
		GAMMA1: 2 ** 19,
		GAMMA2: hr,
		TAU: 60,
		ETA: 2,
		OMEGA: 75
	})
}), X = (e) => new Int32Array(e), Z = /* @__PURE__ */ ir({
	N: J,
	Q: dr,
	F: pr,
	ROOT_OF_UNITY: fr,
	newPoly: X,
	isKyber: !1,
	brvBits: 8
}), _r = (e) => e, vr = (e, t = _r, n = _r) => Z.bitsCoder(e, {
	encode: (e) => t(n(e)),
	decode: (e) => n(t(e))
}), Q = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Z.mod(n[e] + r[e]);
	return n;
}, yr = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Z.mod(n[e] - r[e]);
	return n;
}, br = (e) => {
	let t = e;
	for (let e = 0; e < J; e++) t[e] <<= Y;
	return t;
}, xr = (e, t) => {
	let n = e;
	for (let e = 0; e < J; e++) if (Math.abs(Z.smod(n[e])) >= t) return !0;
	return !1;
}, $ = (e, t) => {
	let n = e, r = t, i = X(J);
	for (let e = 0; e < n.length; e++) i[e] = Z.mod(n[e] * r[e]);
	return i;
};
function Sr(e) {
	let t = e, n = X(J);
	for (let e = 0; e < J;) {
		let r = t();
		if (r.length % 3) throw Error("RejNTTPoly: unaligned block");
		for (let t = 0; e < J && t <= r.length - 3; t += 3) {
			let i = (r[t + 0] | r[t + 1] << 8 | r[t + 2] << 16) & 8388607;
			i < dr && (n[e++] = i);
		}
	}
	return n;
}
function Cr(e) {
	let t = e, { K: n, L: r, GAMMA1: i, GAMMA2: a, TAU: o, ETA: s, OMEGA: c } = t, { CRH_BYTES: l, TR_BYTES: u, C_TILDE_BYTES: d, XOF128: f, XOF256: p, securityLevel: m } = t;
	if (![2, 4].includes(s)) throw Error("Wrong ETA");
	if (![1 << 17, 1 << 19].includes(i)) throw Error("Wrong GAMMA1");
	if (![mr, hr].includes(a)) throw Error("Wrong GAMMA2");
	let h = o * s, g = (e) => {
		let t = Z.mod(e), n = Z.smod(t, 2 * a) | 0;
		return t - n === 8380416 ? {
			r1: 0,
			r0: n - 1 | 0
		} : {
			r1: Math.floor((t - n) / (2 * a)) | 0,
			r0: n
		};
	}, _ = (e) => g(e).r1, v = (e) => g(e).r0, y = (e, t) => e <= a || e > dr - a || e === dr - a && t === 0 ? 0 : 1, b = Math.floor(8380416 / (2 * a)), x = (e, t) => {
		let { r1: n, r0: r } = g(t);
		return e === 1 ? r > 0 ? Z.mod(n + 1, b) | 0 : Z.mod(n - 1, b) | 0 : n | 0;
	}, S = (e) => {
		let t = Z.mod(e), n = Z.smod(t, 2 ** Y) | 0;
		return {
			r1: Math.floor((t - n) / 2 ** Y) | 0,
			r0: n
		};
	}, C = {
		bytesLen: c + n,
		encode: (e) => {
			let t = e;
			if (t === !1) throw Error("hint.encode: hint is false");
			let r = new Uint8Array(c + n);
			for (let e = 0, i = 0; e < n; e++) {
				for (let n = 0; n < J; n++) t[e][n] !== 0 && (r[i++] = n);
				r[c + e] = i;
			}
			return r;
		},
		decode: (e) => {
			let t = [], r = 0;
			for (let i = 0; i < n; i++) {
				let n = X(J);
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
	}, w = vr(s === 2 ? 3 : 4, (e) => s - e, (e) => {
		if (!(-s <= e && e <= s)) throw Error(`malformed key s1/s3 ${e} outside of ETA range [${-s}, ${s}]`);
		return e;
	}), T = vr(13, (e) => 4096 - e), E = vr(10), D = vr(i === 1 << 17 ? 18 : 20, (e) => Z.smod(i - e)), O = Xn(vr(a === mr ? 6 : 4), n), k = Yn("publicKey", 32, Xn(E, n)), A = Yn("secretKey", 32, 32, u, Xn(w, r), Xn(w, n), Xn(T, n)), j = Yn("signature", d, Xn(D, r), C), M = s === 2 ? (e) => e < 15 && 2 - e % 5 : (e) => e < 9 && 4 - e;
	function ee(e) {
		let t = e, n = X(J);
		for (let e = 0; e < J;) {
			let r = t();
			for (let t = 0; e < J && t < r.length; t += 1) {
				let i = M(r[t] & 15), a = M(r[t] >> 4 & 15);
				i !== !1 && (n[e++] = i), e < J && a !== !1 && (n[e++] = a);
			}
		}
		return n;
	}
	let N = (e) => {
		let t = X(J), n = G.create({}).update(e), r = new Uint8Array(G.blockLen);
		n.xofInto(r);
		let i = r.slice(0, 8);
		for (let e = J - o, a = 8, s = 0, c = 0; e < J; e++) {
			let o = e + 1;
			for (; o > e;) o = r[a++], !(a < G.blockLen) && (n.xofInto(r), a = 0);
			t[e] = t[o], t[o] = 1 - ((i[s] >> c++ & 1) << 1), c >= 8 && (s++, c = 0);
		}
		return t;
	}, P = (e) => {
		let t = e, n = X(J), r = X(J);
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
		for (let e = 0; e < J; e++) n[e] = x(r[e], n[e]);
		return n;
	}, F = (e, t) => {
		let n = e, r = t, i = X(J), a = 0;
		for (let e = 0; e < J; e++) {
			let t = y(n[e], r[e]);
			i[e] = t, a += t;
		}
		return {
			v: i,
			cnt: a
		};
	}, ne = Yn("seed", 32, 64, 32), I = Object.freeze({
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
			i && (e = zn(32)), K(e, 32, "seed"), t.set(e), i && q(e), t[32] = n, t[33] = r;
			let [a, o, s] = ne.decode(G(t, { dkLen: ne.bytesLen })), c = p(o), l = [];
			for (let e = 0; e < r; e++) l.push(ee(c.get(e & 255, e >> 8 & 255)));
			let d = [];
			for (let e = r; e < r + n; e++) d.push(ee(c.get(e & 255, e >> 8 & 255)));
			let m = l.map((e) => Z.NTT.encode(e.slice())), h = [], g = [], _ = f(a), v = X(J);
			for (let e = 0; e < n; e++) {
				q(v);
				for (let t = 0; t < r; t++) Q(v, $(Sr(_.get(t, e)), m[t]));
				Z.NTT.decode(v);
				let { r0: t, r1: n } = P(Q(v, d[e]));
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
			return _.clean(), c.clean(), q(a, o, s, l, d, m, v, h, g, b, t), {
				publicKey: y,
				secretKey: x
			};
		},
		getPublicKey: (e) => {
			let [t, i, a, o, s, c] = A.decode(e), l = f(t), u = o.map((e) => Z.NTT.encode(e.slice())), d = [], p = X(J);
			for (let e = 0; e < n; e++) {
				p.fill(0);
				for (let t = 0; t < r; t++) Q(p, $(Sr(l.get(t, e)), u[t]));
				Z.NTT.decode(p), Q(p, s[e]);
				let { r1: t } = P(p);
				d.push(t);
			}
			return l.clean(), q(p, u, c, o, s), k.encode([t, d]);
		},
		sign: (e, t, o = {}) => {
			o = Jn(o, cr), o = ur(o, cr);
			let { extraEntropy: s, externalMu: u = !1 } = o;
			u && K(e, l, "mu");
			let m = s === !1 || s === void 0, g = s === !1 ? /* @__PURE__ */ new Uint8Array(32) : s === void 0 ? zn(32) : s;
			K(g, 32, "extraEntropy");
			let [y, b, x, S, C, w] = (() => {
				try {
					return A.decode(t);
				} catch (e) {
					throw m && q(g), e;
				}
			})(), T = [], E = f(y);
			for (let e = 0; e < n; e++) {
				let t = [];
				for (let n = 0; n < r; n++) t.push(Sr(E.get(n, e)));
				T.push(t);
			}
			E.clean();
			for (let e = 0; e < r; e++) Z.NTT.encode(S[e]);
			for (let e = 0; e < n; e++) Z.NTT.encode(C[e]), Z.NTT.encode(w[e]);
			let k = u ? e : G.create({ dkLen: l }).update(x).update(e).digest(), M = G.create({ dkLen: l }).update(b).update(g).update(k).digest();
			m && q(g), K(M, l);
			let ee = p(M, D.bytesLen);
			main_loop: for (let e = 0;;) {
				let t = [];
				for (let n = 0; n < r; n++, e++) t.push(D.decode(ee.get(e & 255, e >> 8)()));
				let o = t.map((e) => Z.NTT.encode(e.slice())), s = [];
				for (let e = 0; e < n; e++) {
					let t = X(J);
					for (let n = 0; n < r; n++) Q(t, $(T[e][n], o[n]));
					Z.NTT.decode(t), s.push(t);
				}
				let l = s.map((e) => e.map(_)), f = G.create({ dkLen: d }).update(k).update(O.encode(l)).digest(), p = Z.NTT.encode(N(f)), m = S.map((e) => $(e, p));
				for (let e = 0; e < r; e++) if (Q(Z.NTT.decode(m[e]), t[e]), xr(m[e], i - h)) {
					q(f, m, p, l, s, o, t);
					continue main_loop;
				}
				let g = 0, y = [];
				for (let e = 0; e < n; e++) {
					let n = Z.NTT.decode($(C[e], p)), r = yr(s[e], n).map(v);
					if (xr(r, a - h)) {
						q(f, m, p, l, s, o, t, y, n, r);
						continue main_loop;
					}
					let i = Z.NTT.decode($(w[e], p));
					if (xr(i, a)) {
						q(f, m, p, l, s, o, t, y, n, r, i);
						continue main_loop;
					}
					Q(r, i);
					let c = F(r, l[e]);
					y.push(c.v), g += c.cnt;
				}
				if (g > c) {
					q(f, m, p, l, s, o, t, y);
					continue;
				}
				ee.clean();
				let b = j.encode([
					f,
					m,
					y
				]);
				return q(f, m, y, p, l, s, o, t, M, S, C, w, ...T), u || q(k), b;
			}
			throw Error("Unreachable code path reached, report this error");
		},
		verify: (e, t, a, o = {}) => {
			o = ur(o, lr);
			let { externalMu: s = !1 } = o;
			s && K(t, l, "mu");
			let [p, m] = k.decode(a), g = G(a, { dkLen: u });
			if (e.length !== j.bytesLen) return !1;
			let [_, v, y] = j.decode(e);
			if (y === !1) return !1;
			for (let e = 0; e < r; e++) if (xr(v[e], i - h)) return !1;
			let b = s ? t : G.create({ dkLen: l }).update(g).update(t).digest(), x = Z.NTT.encode(N(_)), S = v.map((e) => e.slice());
			for (let e = 0; e < r; e++) Z.NTT.encode(S[e]);
			let C = [], w = f(p);
			for (let e = 0; e < n; e++) {
				let t = $(Z.NTT.encode(br(m[e])), x), n = X(J);
				for (let t = 0; t < r; t++) Q(n, $(Sr(w.get(t, e)), S[t]));
				let i = Z.NTT.decode(yr(n, t));
				C.push(te(i, y[e]));
			}
			w.clean();
			let T = G.create({ dkLen: d }).update(b).update(O.encode(C)).digest();
			for (let e of y) if (!(e.reduce((e, t) => e + t, 0) <= c)) return !1;
			for (let e of v) if (xr(e, i - h)) return !1;
			return Hn(_, T);
		}
	});
	return Object.freeze({
		info: Object.freeze({ type: "ml-dsa" }),
		internal: I,
		securityLevel: m,
		keygen: I.keygen,
		lengths: I.lengths,
		getPublicKey: I.getPublicKey,
		sign: (e, t, n = {}) => {
			n = Jn(n);
			let r = $n(e, n.context), i = I.sign(r, t, {
				extraEntropy: n.extraEntropy,
				externalMu: !1
			});
			return q(r), i;
		},
		verify: (e, t, n, r = {}) => (r = qn(r), K(e, void 0, "signature"), I.verify(e, $n(t, r.context), n, { externalMu: !1 })),
		prehash: (e) => {
			nr(e, m);
			let t = e;
			return Object.freeze({
				info: Object.freeze({ type: "hashml-dsa" }),
				securityLevel: m,
				lengths: I.lengths,
				keygen: I.keygen,
				getPublicKey: I.getPublicKey,
				sign: (e, n, r = {}) => {
					r = Jn(r);
					let i = rr(t, e, r.context), a = I.sign(i, n, {
						extraEntropy: r.extraEntropy,
						externalMu: !1
					});
					return q(i), a;
				},
				verify: (e, n, r, i = {}) => (i = qn(i), K(e, void 0, "signature"), I.verify(e, rr(t, n, i.context), r, { externalMu: !1 }))
			});
		}
	});
}
var wr = /* @__PURE__ */ Cr({
	...gr[3],
	CRH_BYTES: 64,
	TR_BYTES: 64,
	C_TILDE_BYTES: 48,
	XOF128: or,
	XOF256: sr,
	securityLevel: 192
}), Tr = /* @__PURE__ */ C({
	PQ_ALG: () => nn,
	createPqBinding: () => Fr,
	generatePqKeys: () => Or,
	keyLookup: () => Rr,
	resolvePqKey: () => Lr,
	signHybrid: () => jr,
	verifyHybrid: () => Pr,
	verifyPq: () => Nr
}), Er = s(rn), Dr = /* @__PURE__ */ new Set(["pq", "pq-prev"]);
function Or(e = m(32)) {
	return wr.keygen(e);
}
function kr(e, t) {
	let r = t.tags.filter((e) => !Dr.has(e[0]));
	return n(s(JSON.stringify([
		0,
		e,
		t.created_at,
		t.kind,
		r,
		t.content
	])));
}
var Ar = (e, t, n) => p.encode(wr.sign(kr(e, t), n.secretKey, { context: Er }));
function jr(e, t, n, r) {
	let i = Qt(t), a = {
		...e,
		tags: e.tags.filter((e) => !Dr.has(e[0]))
	}, o = [...a.tags, [
		"pq",
		nn,
		Ar(i, a, n)
	]];
	return r && o.push([
		"pq-prev",
		nn,
		Ar(i, a, r)
	]), $t({
		...a,
		tags: o
	}, t);
}
function Mr(e, t) {
	let n = e.tags.filter((e) => e[0] === t);
	if (n.length === 1 && n[0][1] === "ml-dsa-65" && n[0][2]) try {
		return p.decode(n[0][2]);
	} catch {
		return;
	}
}
function Nr(e, t, n = "pq") {
	let r = Mr(e, n);
	if (!r) return !1;
	try {
		return wr.verify(r, kr(e.pubkey, e), t, { context: Er });
	} catch {
		return !1;
	}
}
var Pr = (e, t) => en(e) && Nr(e, t);
function Fr(e, t, n, r = cn()) {
	let i = [["alg", nn], ["key", p.encode(t.publicKey)]];
	return n && i.push([
		"e",
		n.binding.id,
		"",
		"prev"
	]), jr({
		kind: tn.pqBinding,
		created_at: r,
		content: "",
		tags: i
	}, e, t, n?.keys);
}
function Ir(e) {
	if (on(e, "alg") === "ml-dsa-65") try {
		let t = p.decode(on(e, "key") ?? "");
		return t.length === wr.lengths.publicKey ? t : void 0;
	} catch {
		return;
	}
}
function Lr(e, t) {
	let n = e.filter((e) => {
		if (e.kind !== tn.pqBinding || e.pubkey !== t) return !1;
		let n = Ir(e);
		return n !== void 0 && Pr(e, n);
	}), r = n.filter((e) => !sn(e, "prev")).sort(ln);
	if (!r.length) return;
	let i = r[0], a = Ir(i), o = (e) => new Set(e.map((e) => on(e, "key"))).size, s = o(r) > 1, c = /* @__PURE__ */ new Set([i.id]);
	for (;;) {
		let e = n.filter((e) => sn(e, "prev") === i.id && !c.has(e.id) && Nr(e, a, "pq-prev")).sort(ln);
		if (!e.length) break;
		s ||= o(e) > 1, i = e[0], a = Ir(i), c.add(i.id);
	}
	return {
		key: a,
		binding: i,
		conflict: s
	};
}
function Rr(e) {
	let t = /* @__PURE__ */ new Map();
	return (n) => (t.has(n) || t.set(n, Lr(e, n)?.key), t.get(n));
}
export { sn as a, on as c, $t as d, en as f, Nr as i, tn as l, F as m, jr as n, cn as o, N as p, Pr as r, an as s, Tr as t, nn as u };
