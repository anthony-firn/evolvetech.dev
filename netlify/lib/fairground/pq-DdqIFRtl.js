// \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
};
// node_modules/nostr-tools/node_modules/@noble/hashes/utils.js
function n(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function r(e, t = "") {
	if (!Number.isSafeInteger(e) || e < 0) {
		let n = t && `"${t}" `;
		throw Error(`${n}expected integer >= 0, got ${e}`);
	}
}
function i(e, t, r = "") {
	let i = n(e), a = e?.length, o = t !== void 0;
	if (!i || o && a !== t) {
		let n = r && `"${r}" `, s = o ? ` of length ${t}` : "", c = i ? `length=${a}` : `type=${typeof e}`;
		throw Error(n + "expected Uint8Array" + s + ", got " + c);
	}
	return e;
}
function a(e, t = !0) {
	if (e.destroyed) throw Error("Hash instance has been destroyed");
	if (t && e.finished) throw Error("Hash#digest() has already been called");
}
function o(e, t) {
	i(e, void 0, "digestInto() output");
	let n = t.outputLen;
	if (e.length < n) throw Error("\"digestInto() output\" expected to be of length >=" + n);
}
function s(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function c(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function l(e, t) {
	return e << 32 - t | e >>> t;
}
var u = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", d = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function f(e) {
	if (i(e), u) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += d[e[n]];
	return t;
}
var p = {
	_0: 48,
	_9: 57,
	A: 65,
	F: 70,
	a: 97,
	f: 102
};
function m(e) {
	if (e >= p._0 && e <= p._9) return e - p._0;
	if (e >= p.A && e <= p.F) return e - (p.A - 10);
	if (e >= p.a && e <= p.f) return e - (p.a - 10);
}
function h(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	if (u) return Uint8Array.fromHex(e);
	let t = e.length, n = t / 2;
	if (t % 2) throw Error("hex string expected, got unpadded hex of length " + t);
	let r = new Uint8Array(n);
	for (let t = 0, i = 0; t < n; t++, i += 2) {
		let n = m(e.charCodeAt(i)), a = m(e.charCodeAt(i + 1));
		if (n === void 0 || a === void 0) {
			let t = e[i] + e[i + 1];
			throw Error("hex string expected, got non-hex character \"" + t + "\" at index " + i);
		}
		r[t] = n * 16 + a;
	}
	return r;
}
function g(...e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		i(r), t += r.length;
	}
	let n = new Uint8Array(t);
	for (let t = 0, r = 0; t < e.length; t++) {
		let i = e[t];
		n.set(i, r), r += i.length;
	}
	return n;
}
function _(e, t = {}) {
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function v(e = 32) {
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	return t.getRandomValues(new Uint8Array(e));
}
var y = (e) => ({ oid: Uint8Array.from([
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
function b(e, t, n) {
	return e & t ^ ~e & n;
}
function x(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var S = class {
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
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = c(this.buffer);
	}
	update(e) {
		a(this), i(e);
		let { view: t, buffer: n, blockLen: r } = this, o = e.length;
		for (let i = 0; i < o;) {
			let a = Math.min(r - this.pos, o - i);
			if (a === r) {
				let t = c(e);
				for (; r <= o - i; i += r) this.process(t, i);
			} else n.set(e.subarray(i, i + a), this.pos), this.pos += a, i += a, this.pos === r && (this.process(t, 0), this.pos = 0);
		}
		return this.length += e.length, this.roundClean(), this;
	}
	digestInto(e) {
		a(this), o(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: l } = this;
		t[l++] = 128, s(this.buffer.subarray(l)), this.padOffset > r - l && (this.process(n, 0), l = 0);
		for (let e = l; e < r; e++) t[e] = 0;
		n.setBigUint64(r - 8, BigInt(this.length * 8), i), this.process(n, 0);
		let u = c(e), d = this.outputLen;
		if (d % 4) throw Error("_sha2: outputLen must be aligned to 32bit");
		let f = d / 4, p = this.get();
		if (f > p.length) throw Error("_sha2: outputLen bigger than state");
		for (let e = 0; e < f; e++) u.setUint32(4 * e, p[e], i);
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
}, C = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), w = /* @__PURE__ */ Uint32Array.from([
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
]), T = /* @__PURE__ */ new Uint32Array(64), ee = class extends S {
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
		for (let n = 0; n < 16; n++, t += 4) T[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = T[e - 15], n = T[e - 2], r = l(t, 7) ^ l(t, 18) ^ t >>> 3, i = l(n, 17) ^ l(n, 19) ^ n >>> 10;
			T[e] = i + T[e - 7] + r + T[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: u } = this;
		for (let e = 0; e < 64; e++) {
			let t = l(o, 6) ^ l(o, 11) ^ l(o, 25), d = u + t + b(o, s, c) + w[e] + T[e] | 0, f = (l(n, 2) ^ l(n, 13) ^ l(n, 22)) + x(n, r, i) | 0;
			u = c, c = s, s = o, o = a + d | 0, a = i, i = r, r = n, n = d + f | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, u = u + this.H | 0, this.set(n, r, i, a, o, s, c, u);
	}
	roundClean() {
		s(T);
	}
	destroy() {
		this.set(0, 0, 0, 0, 0, 0, 0, 0), s(this.buffer);
	}
}, te = class extends ee {
	A = C[0] | 0;
	B = C[1] | 0;
	C = C[2] | 0;
	D = C[3] | 0;
	E = C[4] | 0;
	F = C[5] | 0;
	G = C[6] | 0;
	H = C[7] | 0;
	constructor() {
		super(32);
	}
}, E = /* @__PURE__ */ _(() => new te(), /* @__PURE__ */ y(1)), D = /* @__PURE__ */ BigInt(0), O = /* @__PURE__ */ BigInt(1);
function ne(e, t = "") {
	if (typeof e != "boolean") {
		let n = t && `"${t}" `;
		throw Error(n + "expected boolean, got type=" + typeof e);
	}
	return e;
}
function k(e) {
	if (typeof e == "bigint") {
		if (!ce(e)) throw Error("positive bigint expected, got " + e);
	} else r(e);
	return e;
}
function A(e) {
	if (typeof e != "string") throw Error("hex string expected, got " + typeof e);
	return e === "" ? D : BigInt("0x" + e);
}
function re(e) {
	return A(f(e));
}
function ie(e) {
	return A(f(se(i(e)).reverse()));
}
function ae(e, t) {
	r(t), e = k(e);
	let n = h(e.toString(16).padStart(t * 2, "0"));
	if (n.length !== t) throw Error("number too large");
	return n;
}
function oe(e, t) {
	return ae(e, t).reverse();
}
function se(e) {
	return Uint8Array.from(e);
}
function j(e) {
	return Uint8Array.from(e, (t, n) => {
		let r = t.charCodeAt(0);
		if (t.length !== 1 || r > 127) throw Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
		return r;
	});
}
var ce = (e) => typeof e == "bigint" && D <= e;
function le(e) {
	let t = 0;
	for (; e > D; e >>= O, t += 1);
	return t;
}
var ue = (e) => (O << BigInt(e)) - O;
function de(e, t = {}, n = {}) {
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
function fe(e) {
	let t = /* @__PURE__ */ new WeakMap();
	return (n, ...r) => {
		let i = t.get(n);
		if (i !== void 0) return i;
		let a = e(n, ...r);
		return t.set(n, a), a;
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/modular.js
var M = /* @__PURE__ */ BigInt(0), N = /* @__PURE__ */ BigInt(1), P = /* @__PURE__ */ BigInt(2), pe = /* @__PURE__ */ BigInt(3), me = /* @__PURE__ */ BigInt(4), he = /* @__PURE__ */ BigInt(5), ge = /* @__PURE__ */ BigInt(7), _e = /* @__PURE__ */ BigInt(8), ve = /* @__PURE__ */ BigInt(9), ye = /* @__PURE__ */ BigInt(16);
function F(e, t) {
	let n = e % t;
	return n >= M ? n : t + n;
}
function I(e, t, n) {
	let r = e;
	for (; t-- > M;) r *= r, r %= n;
	return r;
}
function be(e, t) {
	if (e === M) throw Error("invert: expected non-zero number");
	if (t <= M) throw Error("invert: expected positive modulus, got " + t);
	let n = F(e, t), r = t, i = M, a = N, o = N, s = M;
	for (; n !== M;) {
		let e = r / n, t = r % n, c = i - o * e, l = a - s * e;
		r = n, n = t, i = o, a = s, o = c, s = l;
	}
	if (r !== N) throw Error("invert: does not exist");
	return F(i, t);
}
function xe(e, t, n) {
	if (!e.eql(e.sqr(t), n)) throw Error("Cannot find square root");
}
function Se(e, t) {
	let n = (e.ORDER + N) / me, r = e.pow(t, n);
	return xe(e, r, t), r;
}
function Ce(e, t) {
	let n = (e.ORDER - he) / _e, r = e.mul(t, P), i = e.pow(r, n), a = e.mul(t, i), o = e.mul(e.mul(a, P), i), s = e.mul(a, e.sub(o, e.ONE));
	return xe(e, s, t), s;
}
function we(e) {
	let t = Pe(e), n = Te(e), r = n(t, t.neg(t.ONE)), i = n(t, r), a = n(t, t.neg(r)), o = (e + ge) / ye;
	return (e, t) => {
		let n = e.pow(t, o), s = e.mul(n, r), c = e.mul(n, i), l = e.mul(n, a), u = e.eql(e.sqr(s), t), d = e.eql(e.sqr(c), t);
		n = e.cmov(n, s, u), s = e.cmov(l, c, d);
		let f = e.eql(e.sqr(s), t), p = e.cmov(n, s, f);
		return xe(e, p, t), p;
	};
}
function Te(e) {
	if (e < pe) throw Error("sqrt is not defined for small field");
	let t = e - N, n = 0;
	for (; t % P === M;) t /= P, n++;
	let r = P, i = Pe(e);
	for (; je(i, r) === 1;) if (r++ > 1e3) throw Error("Cannot find square root: probably non-prime P");
	if (n === 1) return Se;
	let a = i.pow(r, t), o = (t + N) / P;
	return function(e, r) {
		if (e.is0(r)) return r;
		if (je(e, r) !== 1) throw Error("Cannot find square root");
		let i = n, s = e.mul(e.ONE, a), c = e.pow(r, t), l = e.pow(r, o);
		for (; !e.eql(c, e.ONE);) {
			if (e.is0(c)) return e.ZERO;
			let t = 1, n = e.sqr(c);
			for (; !e.eql(n, e.ONE);) if (t++, n = e.sqr(n), t === i) throw Error("Cannot find square root");
			let r = N << BigInt(i - t - 1), a = e.pow(s, r);
			i = t, s = e.sqr(a), c = e.mul(c, s), l = e.mul(l, a);
		}
		return l;
	};
}
function Ee(e) {
	return e % me === pe ? Se : e % _e === he ? Ce : e % ye === ve ? we(e) : Te(e);
}
var De = [
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
function Oe(e) {
	return de(e, De.reduce((e, t) => (e[t] = "function", e), {
		ORDER: "bigint",
		BYTES: "number",
		BITS: "number"
	})), e;
}
function ke(e, t, n) {
	if (n < M) throw Error("invalid exponent, negatives unsupported");
	if (n === M) return e.ONE;
	if (n === N) return t;
	let r = e.ONE, i = t;
	for (; n > M;) n & N && (r = e.mul(r, i)), i = e.sqr(i), n >>= N;
	return r;
}
function Ae(e, t, n = !1) {
	let r = Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((t, n, i) => e.is0(n) ? t : (r[i] = t, e.mul(t, n)), e.ONE), a = e.inv(i);
	return t.reduceRight((t, n, i) => e.is0(n) ? t : (r[i] = e.mul(t, r[i]), e.mul(t, n)), a), r;
}
function je(e, t) {
	let n = (e.ORDER - N) / P, r = e.pow(t, n), i = e.eql(r, e.ONE), a = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
	if (!i && !a && !o) throw Error("invalid Legendre symbol result");
	return i ? 1 : a ? 0 : -1;
}
function Me(e, t) {
	t !== void 0 && r(t);
	let n = t === void 0 ? e.toString(2).length : t;
	return {
		nBitLength: n,
		nByteLength: Math.ceil(n / 8)
	};
}
var Ne = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = M;
	ONE = N;
	_lengths;
	_sqrt;
	_mod;
	constructor(e, t = {}) {
		if (e <= M) throw Error("invalid field: expected ORDER > 0, got " + e);
		let n;
		this.isLE = !1, typeof t == "object" && t && (typeof t.BITS == "number" && (n = t.BITS), typeof t.sqrt == "function" && (this.sqrt = t.sqrt), typeof t.isLE == "boolean" && (this.isLE = t.isLE), t.allowedLengths && (this._lengths = t.allowedLengths?.slice()), typeof t.modFromBytes == "boolean" && (this._mod = t.modFromBytes));
		let { nBitLength: r, nByteLength: i } = Me(e, n);
		if (i > 2048) throw Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = e, this.BITS = r, this.BYTES = i, this._sqrt = void 0, Object.preventExtensions(this);
	}
	create(e) {
		return F(e, this.ORDER);
	}
	isValid(e) {
		if (typeof e != "bigint") throw Error("invalid field element: expected bigint, got " + typeof e);
		return M <= e && e < this.ORDER;
	}
	is0(e) {
		return e === M;
	}
	isValidNot0(e) {
		return !this.is0(e) && this.isValid(e);
	}
	isOdd(e) {
		return (e & N) === N;
	}
	neg(e) {
		return F(-e, this.ORDER);
	}
	eql(e, t) {
		return e === t;
	}
	sqr(e) {
		return F(e * e, this.ORDER);
	}
	add(e, t) {
		return F(e + t, this.ORDER);
	}
	sub(e, t) {
		return F(e - t, this.ORDER);
	}
	mul(e, t) {
		return F(e * t, this.ORDER);
	}
	pow(e, t) {
		return ke(this, e, t);
	}
	div(e, t) {
		return F(e * be(t, this.ORDER), this.ORDER);
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
		return be(e, this.ORDER);
	}
	sqrt(e) {
		return this._sqrt ||= Ee(this.ORDER), this._sqrt(this, e);
	}
	toBytes(e) {
		return this.isLE ? oe(e, this.BYTES) : ae(e, this.BYTES);
	}
	fromBytes(e, t = !1) {
		i(e);
		let { _lengths: n, BYTES: r, isLE: a, ORDER: o, _mod: s } = this;
		if (n) {
			if (!n.includes(e.length) || e.length > r) throw Error("Field.fromBytes: expected " + n + " bytes, got " + e.length);
			let t = new Uint8Array(r);
			t.set(e, a ? 0 : t.length - e.length), e = t;
		}
		if (e.length !== r) throw Error("Field.fromBytes: expected " + r + " bytes, got " + e.length);
		let c = a ? ie(e) : re(e);
		if (s && (c = F(c, o)), !t && !this.isValid(c)) throw Error("invalid field element: outside of range 0..ORDER");
		return c;
	}
	invertBatch(e) {
		return Ae(this, e);
	}
	cmov(e, t, n) {
		return n ? t : e;
	}
};
function Pe(e, t = {}) {
	return new Ne(e, t);
}
function Fe(e) {
	if (typeof e != "bigint") throw Error("field order must be bigint");
	let t = e.toString(2).length;
	return Math.ceil(t / 8);
}
function Ie(e) {
	let t = Fe(e);
	return t + Math.ceil(t / 2);
}
function Le(e, t, n = !1) {
	i(e);
	let r = e.length, a = Fe(t), o = Ie(t);
	if (r < 16 || r < o || r > 1024) throw Error("expected " + o + "-1024 bytes of input, got " + r);
	let s = F(n ? ie(e) : re(e), t - N) + N;
	return n ? oe(s, a) : ae(s, a);
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/curve.js
var Re = /* @__PURE__ */ BigInt(0), L = /* @__PURE__ */ BigInt(1);
function ze(e, t) {
	let n = t.negate();
	return e ? n : t;
}
function Be(e, t) {
	let n = Ae(e.Fp, t.map((e) => e.Z));
	return t.map((t, r) => e.fromAffine(t.toAffine(n[r])));
}
function Ve(e, t) {
	if (!Number.isSafeInteger(e) || e <= 0 || e > t) throw Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function He(e, t) {
	Ve(e, t);
	let n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e;
	return {
		windows: n,
		windowSize: r,
		mask: ue(e),
		maxNumber: i,
		shiftBy: BigInt(e)
	};
}
function Ue(e, t, n) {
	let { windowSize: r, mask: i, maxNumber: a, shiftBy: o } = n, s = Number(e & i), c = e >> o;
	s > r && (s -= a, c += L);
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
var We = /* @__PURE__ */ new WeakMap(), Ge = /* @__PURE__ */ new WeakMap();
function Ke(e) {
	return Ge.get(e) || 1;
}
function qe(e) {
	if (e !== Re) throw Error("invalid wNAF");
}
var Je = class {
	BASE;
	ZERO;
	Fn;
	bits;
	constructor(e, t) {
		this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = t;
	}
	_unsafeLadder(e, t, n = this.ZERO) {
		let r = e;
		for (; t > Re;) t & L && (n = n.add(r)), r = r.double(), t >>= L;
		return n;
	}
	precomputeWindow(e, t) {
		let { windows: n, windowSize: r } = He(t, this.bits), i = [], a = e, o = a;
		for (let e = 0; e < n; e++) {
			o = a, i.push(o);
			for (let e = 1; e < r; e++) o = o.add(a), i.push(o);
			a = o.double();
		}
		return i;
	}
	wNAF(e, t, n) {
		if (!this.Fn.isValid(n)) throw Error("invalid scalar");
		let r = this.ZERO, i = this.BASE, a = He(e, this.bits);
		for (let e = 0; e < a.windows; e++) {
			let { nextN: o, offset: s, isZero: c, isNeg: l, isNegF: u, offsetF: d } = Ue(n, e, a);
			n = o, c ? i = i.add(ze(u, t[d])) : r = r.add(ze(l, t[s]));
		}
		return qe(n), {
			p: r,
			f: i
		};
	}
	wNAFUnsafe(e, t, n, r = this.ZERO) {
		let i = He(e, this.bits);
		for (let e = 0; e < i.windows && n !== Re; e++) {
			let { nextN: a, offset: o, isZero: s, isNeg: c } = Ue(n, e, i);
			if (n = a, !s) {
				let e = t[o];
				r = r.add(c ? e.negate() : e);
			}
		}
		return qe(n), r;
	}
	getPrecomputes(e, t, n) {
		let r = We.get(t);
		return r || (r = this.precomputeWindow(t, e), e !== 1 && (typeof n == "function" && (r = n(r)), We.set(t, r))), r;
	}
	cached(e, t, n) {
		let r = Ke(e);
		return this.wNAF(r, this.getPrecomputes(r, e, n), t);
	}
	unsafe(e, t, n, r) {
		let i = Ke(e);
		return i === 1 ? this._unsafeLadder(e, t, r) : this.wNAFUnsafe(i, this.getPrecomputes(i, e, n), t, r);
	}
	createCache(e, t) {
		Ve(t, this.bits), Ge.set(e, t), We.delete(e);
	}
	hasCache(e) {
		return Ke(e) !== 1;
	}
};
function Ye(e, t, n, r) {
	let i = t, a = e.ZERO, o = e.ZERO;
	for (; n > Re || r > Re;) n & L && (a = a.add(i)), r & L && (o = o.add(i)), i = i.double(), n >>= L, r >>= L;
	return {
		p1: a,
		p2: o
	};
}
function Xe(e, t, n) {
	if (t) {
		if (t.ORDER !== e) throw Error("Field.ORDER must match order: Fp == p, Fn == n");
		return Oe(t), t;
	}
	return Pe(e, { isLE: n });
}
function Ze(e, t, n = {}, r) {
	if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object") throw Error(`expected valid ${e} CURVE object`);
	for (let e of [
		"p",
		"n",
		"h"
	]) {
		let n = t[e];
		if (!(typeof n == "bigint" && n > Re)) throw Error(`CURVE.${e} must be positive bigint`);
	}
	let i = Xe(t.p, n.Fp, r), a = Xe(t.n, n.Fn, r), o = [
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
function Qe(e, t) {
	return function(n) {
		let r = e(n);
		return {
			secretKey: r,
			publicKey: t(r)
		};
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/abstract/weierstrass.js
var $e = (e, t) => (e + (e >= 0 ? t : -t) / rt) / t;
function et(e, t, n) {
	let [[r, i], [a, o]] = t, s = $e(o * e, n), c = $e(-i * e, n), l = e - s * r - c * a, u = -s * i - c * o, d = l < tt, f = u < tt;
	d && (l = -l), f && (u = -u);
	let p = ue(Math.ceil(le(n) / 2)) + nt;
	if (l < tt || l >= p || u < tt || u >= p) throw Error("splitScalar (endomorphism): failed, k=" + e);
	return {
		k1neg: d,
		k1: l,
		k2neg: f,
		k2: u
	};
}
var tt = BigInt(0), nt = BigInt(1), rt = BigInt(2), it = BigInt(3), at = BigInt(4);
function ot(e, t = {}) {
	let n = Ze("weierstrass", e, t), { Fp: r, Fn: a } = n, o = n.CURVE, { h: s, n: c } = o;
	de(t, {}, {
		allowInfinityPoint: "boolean",
		clearCofactor: "function",
		isTorsionFree: "function",
		fromBytes: "function",
		toBytes: "function",
		endo: "object"
	});
	let { endo: l } = t;
	if (l && (!r.is0(o.a) || typeof l.beta != "bigint" || !Array.isArray(l.basises))) throw Error("invalid endo: expected \"beta\": bigint and \"basises\": array");
	let u = ct(r, a);
	function d() {
		if (!r.isOdd) throw Error("compression is not supported: Field does not have .isOdd()");
	}
	function p(e, t, n) {
		let { x: i, y: a } = t.toAffine(), o = r.toBytes(i);
		return ne(n, "isCompressed"), n ? (d(), g(st(!r.isOdd(a)), o)) : g(Uint8Array.of(4), o, r.toBytes(a));
	}
	function m(e) {
		i(e, void 0, "Point");
		let { publicKey: t, publicKeyUncompressed: n } = u, a = e.length, o = e[0], s = e.subarray(1);
		if (a === t && (o === 2 || o === 3)) {
			let e = r.fromBytes(s);
			if (!r.isValid(e)) throw Error("bad point: is not on curve, wrong x");
			let t = y(e), n;
			try {
				n = r.sqrt(t);
			} catch (e) {
				let t = e instanceof Error ? ": " + e.message : "";
				throw Error("bad point: is not on curve, sqrt error" + t);
			}
			d();
			let i = r.isOdd(n);
			return (o & 1) == 1 !== i && (n = r.neg(n)), {
				x: e,
				y: n
			};
		}
		if (a === n && o === 4) {
			let e = r.BYTES, t = r.fromBytes(s.subarray(0, e)), n = r.fromBytes(s.subarray(e, e * 2));
			if (!b(t, n)) throw Error("bad point: is not on curve");
			return {
				x: t,
				y: n
			};
		}
		throw Error(`bad point: got length ${a}, expected compressed=${t} or uncompressed=${n}`);
	}
	let _ = t.toBytes || p, v = t.fromBytes || m;
	function y(e) {
		let t = r.sqr(e), n = r.mul(t, e);
		return r.add(r.add(n, r.mul(e, o.a)), o.b);
	}
	function b(e, t) {
		let n = r.sqr(t), i = y(e);
		return r.eql(n, i);
	}
	if (!b(o.Gx, o.Gy)) throw Error("bad curve params: generator point");
	let x = r.mul(r.pow(o.a, it), at), S = r.mul(r.sqr(o.b), BigInt(27));
	if (r.is0(r.add(x, S))) throw Error("bad curve params: a or b");
	function C(e, t, n = !1) {
		if (!r.isValid(t) || n && r.is0(t)) throw Error(`bad point coordinate ${e}`);
		return t;
	}
	function w(e) {
		if (!(e instanceof D)) throw Error("Weierstrass Point expected");
	}
	function T(e) {
		if (!l || !l.basises) throw Error("no endo");
		return et(e, l.basises, a.ORDER);
	}
	let ee = fe((e, t) => {
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
	}), te = fe((e) => {
		if (e.is0()) {
			if (t.allowInfinityPoint && !r.is0(e.Y)) return;
			throw Error("bad point: ZERO");
		}
		let { x: n, y: i } = e.toAffine();
		if (!r.isValid(n) || !r.isValid(i)) throw Error("bad point: x or y not field elements");
		if (!b(n, i)) throw Error("bad point: equation left != right");
		if (!e.isTorsionFree()) throw Error("bad point: not in prime-order subgroup");
		return !0;
	});
	function E(e, t, n, i, a) {
		return n = new D(r.mul(n.X, e), n.Y, n.Z), t = ze(i, t), n = ze(a, n), t.add(n);
	}
	class D {
		static BASE = new D(o.Gx, o.Gy, r.ONE);
		static ZERO = new D(r.ZERO, r.ONE, r.ZERO);
		static Fp = r;
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
			if (!e || !r.isValid(t) || !r.isValid(n)) throw Error("invalid affine point");
			if (e instanceof D) throw Error("projective point not allowed");
			return r.is0(t) && r.is0(n) ? D.ZERO : new D(t, n, r.ONE);
		}
		static fromBytes(e) {
			let t = D.fromAffine(v(i(e, void 0, "point")));
			return t.assertValidity(), t;
		}
		static fromHex(e) {
			return D.fromBytes(h(e));
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(e = 8, t = !0) {
			return k.createCache(this, e), t || this.multiply(it), this;
		}
		assertValidity() {
			te(this);
		}
		hasEvenY() {
			let { y: e } = this.toAffine();
			if (!r.isOdd) throw Error("Field doesn't support isOdd");
			return !r.isOdd(e);
		}
		equals(e) {
			w(e);
			let { X: t, Y: n, Z: i } = this, { X: a, Y: o, Z: s } = e, c = r.eql(r.mul(t, s), r.mul(a, i)), l = r.eql(r.mul(n, s), r.mul(o, i));
			return c && l;
		}
		negate() {
			return new D(this.X, r.neg(this.Y), this.Z);
		}
		double() {
			let { a: e, b: t } = o, n = r.mul(t, it), { X: i, Y: a, Z: s } = this, c = r.ZERO, l = r.ZERO, u = r.ZERO, d = r.mul(i, i), f = r.mul(a, a), p = r.mul(s, s), m = r.mul(i, a);
			return m = r.add(m, m), u = r.mul(i, s), u = r.add(u, u), c = r.mul(e, u), l = r.mul(n, p), l = r.add(c, l), c = r.sub(f, l), l = r.add(f, l), l = r.mul(c, l), c = r.mul(m, c), u = r.mul(n, u), p = r.mul(e, p), m = r.sub(d, p), m = r.mul(e, m), m = r.add(m, u), u = r.add(d, d), d = r.add(u, d), d = r.add(d, p), d = r.mul(d, m), l = r.add(l, d), p = r.mul(a, s), p = r.add(p, p), d = r.mul(p, m), c = r.sub(c, d), u = r.mul(p, f), u = r.add(u, u), u = r.add(u, u), new D(c, l, u);
		}
		add(e) {
			w(e);
			let { X: t, Y: n, Z: i } = this, { X: a, Y: s, Z: c } = e, l = r.ZERO, u = r.ZERO, d = r.ZERO, f = o.a, p = r.mul(o.b, it), m = r.mul(t, a), h = r.mul(n, s), g = r.mul(i, c), _ = r.add(t, n), v = r.add(a, s);
			_ = r.mul(_, v), v = r.add(m, h), _ = r.sub(_, v), v = r.add(t, i);
			let y = r.add(a, c);
			return v = r.mul(v, y), y = r.add(m, g), v = r.sub(v, y), y = r.add(n, i), l = r.add(s, c), y = r.mul(y, l), l = r.add(h, g), y = r.sub(y, l), d = r.mul(f, v), l = r.mul(p, g), d = r.add(l, d), l = r.sub(h, d), d = r.add(h, d), u = r.mul(l, d), h = r.add(m, m), h = r.add(h, m), g = r.mul(f, g), v = r.mul(p, v), h = r.add(h, g), g = r.sub(m, g), g = r.mul(f, g), v = r.add(v, g), m = r.mul(h, v), u = r.add(u, m), m = r.mul(y, v), l = r.mul(_, l), l = r.sub(l, m), m = r.mul(_, h), d = r.mul(y, d), d = r.add(d, m), new D(l, u, d);
		}
		subtract(e) {
			return this.add(e.negate());
		}
		is0() {
			return this.equals(D.ZERO);
		}
		multiply(e) {
			let { endo: n } = t;
			if (!a.isValidNot0(e)) throw Error("invalid scalar: out of range");
			let r, i, o = (e) => k.cached(this, e, (e) => Be(D, e));
			if (n) {
				let { k1neg: t, k1: a, k2neg: s, k2: c } = T(e), { p: l, f: u } = o(a), { p: d, f } = o(c);
				i = u.add(f), r = E(n.beta, l, d, t, s);
			} else {
				let { p: t, f: n } = o(e);
				r = t, i = n;
			}
			return Be(D, [r, i])[0];
		}
		multiplyUnsafe(e) {
			let { endo: n } = t, r = this;
			if (!a.isValid(e)) throw Error("invalid scalar: out of range");
			if (e === tt || r.is0()) return D.ZERO;
			if (e === nt) return r;
			if (k.hasCache(this)) return this.multiply(e);
			if (n) {
				let { k1neg: t, k1: i, k2neg: a, k2: o } = T(e), { p1: s, p2: c } = Ye(D, r, i, o);
				return E(n.beta, s, c, t, a);
			}
			return k.unsafe(r, e);
		}
		toAffine(e) {
			return ee(this, e);
		}
		isTorsionFree() {
			let { isTorsionFree: e } = t;
			return s === nt ? !0 : e ? e(D, this) : k.unsafe(this, c).is0();
		}
		clearCofactor() {
			let { clearCofactor: e } = t;
			return s === nt ? this : e ? e(D, this) : this.multiplyUnsafe(s);
		}
		isSmallOrder() {
			return this.multiplyUnsafe(s).is0();
		}
		toBytes(e = !0) {
			return ne(e, "isCompressed"), this.assertValidity(), _(D, this, e);
		}
		toHex(e = !0) {
			return f(this.toBytes(e));
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	let O = a.BITS, k = new Je(D, t.endo ? Math.ceil(O / 2) : O);
	return D.BASE.precompute(8), D;
}
function st(e) {
	return Uint8Array.of(e ? 2 : 3);
}
function ct(e, t) {
	return {
		secretKey: t.BYTES,
		publicKey: 1 + e.BYTES,
		publicKeyUncompressed: 1 + 2 * e.BYTES,
		publicKeyHasPrefix: !0,
		signature: 2 * t.BYTES
	};
}
// node_modules/nostr-tools/node_modules/@noble/curves/secp256k1.js
var lt = {
	p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
	n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	h: BigInt(1),
	a: BigInt(0),
	b: BigInt(7),
	Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
	Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, ut = {
	beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
	basises: [[BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")], [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]]
}, dt = /* @__PURE__ */ BigInt(0), ft = /* @__PURE__ */ BigInt(2);
function pt(e) {
	let t = lt.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), a = BigInt(22), o = BigInt(23), s = BigInt(44), c = BigInt(88), l = e * e * e % t, u = l * l * e % t, d = I(I(I(u, n, t) * u % t, n, t) * u % t, ft, t) * l % t, f = I(d, i, t) * d % t, p = I(f, a, t) * f % t, m = I(p, s, t) * p % t, h = I(I(I(I(I(I(m, c, t) * m % t, s, t) * p % t, n, t) * u % t, o, t) * f % t, r, t) * l % t, ft, t);
	if (!mt.eql(mt.sqr(h), e)) throw Error("Cannot find square root");
	return h;
}
var mt = Pe(lt.p, { sqrt: pt }), ht = /* @__PURE__ */ ot(lt, {
	Fp: mt,
	endo: ut
}), gt = {};
function _t(e, ...t) {
	let n = gt[e];
	if (n === void 0) {
		let t = E(j(e));
		n = g(t, t), gt[e] = n;
	}
	return E(g(n, ...t));
}
var vt = (e) => e.toBytes(!0).slice(1), yt = (e) => e % ft === dt;
function bt(e) {
	let { Fn: t, BASE: n } = ht, r = t.fromBytes(e), i = n.multiply(r);
	return {
		scalar: yt(i.y) ? r : t.neg(r),
		bytes: vt(i)
	};
}
function xt(e) {
	let t = mt;
	if (!t.isValidNot0(e)) throw Error("invalid x: Fail if x ≥ p");
	let n = t.create(e * e), r = t.create(n * e + BigInt(7)), i = t.sqrt(r);
	yt(i) || (i = t.neg(i));
	let a = ht.fromAffine({
		x: e,
		y: i
	});
	return a.assertValidity(), a;
}
var St = re;
function Ct(...e) {
	return ht.Fn.create(St(_t("BIP0340/challenge", ...e)));
}
function wt(e) {
	return bt(e).bytes;
}
function Tt(e, t, n = v(32)) {
	let { Fn: r } = ht, a = i(e, void 0, "message"), { bytes: o, scalar: s } = bt(t), c = i(n, 32, "auxRand"), { bytes: l, scalar: u } = bt(_t("BIP0340/nonce", r.toBytes(s ^ St(_t("BIP0340/aux", c))), o, a)), d = Ct(l, o, a), f = /* @__PURE__ */ new Uint8Array(64);
	if (f.set(l, 0), f.set(r.toBytes(r.create(u + d * s)), 32), !Et(f, a, o)) throw Error("sign: Invalid signature produced");
	return f;
}
function Et(e, t, n) {
	let { Fp: r, Fn: a, BASE: o } = ht, s = i(e, 64, "signature"), c = i(t, void 0, "message"), l = i(n, 32, "publicKey");
	try {
		let e = xt(St(l)), t = St(s.subarray(0, 32));
		if (!r.isValidNot0(t)) return !1;
		let n = St(s.subarray(32, 64));
		if (!a.isValidNot0(n)) return !1;
		let i = Ct(a.toBytes(t), vt(e), c), u = o.multiplyUnsafe(n).add(e.multiplyUnsafe(a.neg(i))), { x: d, y: f } = u.toAffine();
		return !(u.is0() || !yt(f) || d !== t);
	} catch {
		return !1;
	}
}
var Dt = /* @__PURE__ */ (() => {
	let e = (e = v(48)) => Le(e, lt.n);
	return {
		keygen: Qe(e, wt),
		getPublicKey: wt,
		sign: Tt,
		verify: Et,
		Point: ht,
		utils: {
			randomSecretKey: e,
			taggedHash: _t,
			lift_x: xt,
			pointToBytes: vt
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
var Ot = new TextEncoder();
function kt(e) {
	if (e.length !== 64) return !1;
	for (let t = 0; t < 64; t++) {
		let n = e.charCodeAt(t);
		if (isNaN(n) || n < 48 || n > 102 || n > 57 && n < 97) return !1;
	}
	return !0;
}
var At = Symbol("verified"), jt = (e) => e instanceof Object;
function Mt(e) {
	if (!jt(e) || typeof e.kind != "number" || typeof e.content != "string" || typeof e.created_at != "number" || typeof e.pubkey != "string" || !kt(e.pubkey) || !Array.isArray(e.tags)) return !1;
	for (let t = 0; t < e.tags.length; t++) {
		let n = e.tags[t];
		if (!Array.isArray(n)) return !1;
		for (let e = 0; e < n.length; e++) if (typeof n[e] != "string") return !1;
	}
	return !0;
}
var Nt = class {
	generateSecretKey() {
		return Dt.utils.randomSecretKey();
	}
	getPublicKey(e) {
		return f(Dt.getPublicKey(e));
	}
	finalizeEvent(e, t) {
		let n = e;
		return n.pubkey = f(Dt.getPublicKey(t)), n.id = Ft(n), n.sig = f(Dt.sign(h(Ft(n)), t)), n[At] = !0, n;
	}
	verifyEvent(e) {
		if (typeof e[At] == "boolean") return e[At];
		try {
			let t = Ft(e);
			if (t !== e.id) return e[At] = !1, !1;
			let n = Dt.verify(h(e.sig), h(t), h(e.pubkey));
			return e[At] = n, n;
		} catch {
			return e[At] = !1, !1;
		}
	}
};
function Pt(e) {
	if (!Mt(e)) throw Error("can't serialize event with wrong or missing properties");
	return JSON.stringify([
		0,
		e.pubkey,
		e.created_at,
		e.kind,
		e.tags,
		e.content
	]);
}
function Ft(e) {
	return f(E(Ot.encode(Pt(e))));
}
var It = new Nt();
It.generateSecretKey;
var Lt = It.getPublicKey, Rt = It.finalizeEvent, zt = It.verifyEvent, Bt = {
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
}, Vt = "ml-dsa-65", Ht = "fairground/v1", Ut = /* @__PURE__ */ BigInt(2 ** 32 - 1), Wt = /* @__PURE__ */ BigInt(32);
function Gt(e, t = !1) {
	return t ? {
		h: Number(e & Ut),
		l: Number(e >> Wt & Ut)
	} : {
		h: Number(e >> Wt & Ut) | 0,
		l: Number(e & Ut) | 0
	};
}
function Kt(e, t = !1) {
	let n = e.length, r = new Uint32Array(n), i = new Uint32Array(n);
	for (let a = 0; a < n; a++) {
		let { h: n, l: o } = Gt(e[a], t);
		[r[a], i[a]] = [n, o];
	}
	return [r, i];
}
var qt = (e) => e / 2 ** 32 | 0, Jt = (e) => e >>> 0;
function Yt(e, t, n, r) {
	let i = qt(n), a = Jt(n);
	e.setUint32(t, r ? a : i, r), e.setUint32(t + 4, r ? i : a, r);
}
var Xt = (e, t, n) => e >>> n, Zt = (e, t, n) => e << 32 - n | t >>> n, Qt = (e, t, n) => e >>> n | t << 32 - n, $t = (e, t, n) => e << 32 - n | t >>> n, en = (e, t, n) => e << 64 - n | t >>> n - 32, tn = (e, t, n) => e >>> n - 32 | t << 64 - n;
function R(e, t, n, r) {
	let i = (t >>> 0) + (r >>> 0);
	return {
		h: e + n + (i / 2 ** 32 | 0) | 0,
		l: i | 0
	};
}
var nn = (e, t, n) => (e >>> 0) + (t >>> 0) + (n >>> 0), rn = (e, t, n, r) => t + n + r + (e / 2 ** 32 | 0) | 0, an = (e, t, n, r) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0), on = (e, t, n, r, i) => t + n + r + i + (e / 2 ** 32 | 0) | 0, sn = (e, t, n, r, i) => (e >>> 0) + (t >>> 0) + (n >>> 0) + (r >>> 0) + (i >>> 0), cn = (e, t, n, r, i, a) => t + n + r + i + a + (e / 2 ** 32 | 0) | 0;
// node_modules/@noble/hashes/utils.js
function ln(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
var un = (e) => e ? `"${e}" ` : "";
function z(e, t = "") {
	if (typeof e != "number") throw TypeError(un(t) + "expected number, got " + typeof e);
	if (!Number.isSafeInteger(e) || e < 0) throw RangeError(un(t) + "expected integer >= 0, got " + e);
	return e;
}
function dn(e, t = "") {
	if (typeof e != "boolean") throw TypeError(un(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function B(e, t, n = "") {
	if (ln(e) && (t === void 0 || e.length === t)) return e;
	t !== void 0 && z(t, "length");
	let r = ln(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = un(n) + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}
function fn(e) {
	if (typeof e != "function" || typeof e.create != "function") throw TypeError("expected hash wrapped by utils.createHasher");
	if (z(e.outputLen), z(e.blockLen), e.outputLen < 1 || e.blockLen < 1) throw Error("hash blockLen / outputLen must be >= 1");
}
var pn = (e, t) => {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, mn = (e, t) => {
	pn(e, t);
	let n = Object.getPrototypeOf(e);
	if (n !== Object.prototype && n !== null) throw TypeError(`"${t}" expected plain object`);
	if (Object.hasOwn(e, "__proto__")) throw TypeError(`"${t}.__proto__" is not allowed`);
};
function hn(e, t = !0) {
	if (e.destroyed) throw Error("hash was destroyed");
	if (t && e.finished) throw Error("digest() was already called");
}
function gn(e, t) {
	B(e, void 0, "output");
	let n = t.outputLen;
	if (!(e.length >= n)) throw RangeError("\"output\" expected length >= " + n);
}
function _n(e) {
	return new Uint32Array(e.buffer, e.byteOffset, Math.floor(e.byteLength / 4));
}
function V(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function vn(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function H(e, t) {
	return e << 32 - t | e >>> t;
}
var yn = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function bn(e) {
	return e << 24 & 4278190080 | e << 8 & 16711680 | e >>> 8 & 65280 | e >>> 24 & 255;
}
function xn(e) {
	for (let t = 0; t < e.length; t++) e[t] = bn(e[t]);
	return e;
}
var Sn = yn ? (e) => e : xn, Cn = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", wn = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Tn(e) {
	if (B(e), Cn) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += wn[e[n]];
	return t;
}
function En(e) {
	if (typeof e != "string") throw TypeError("string expected");
	let t = new TextEncoder().encode(e);
	try {
		return new Uint8Array(t);
	} finally {
		V(t);
	}
}
function Dn(...e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		B(r), t += r.length;
	}
	let n = new Uint8Array(t);
	for (let t = 0, r = 0; t < e.length; t++) {
		let i = e[t];
		n.set(i, r), r += i.length;
	}
	return n;
}
function On(e, t, n = "opts") {
	return mn(e, "defaults"), t !== void 0 && mn(t, n), Object.assign(Object.create(null), e, t);
}
function kn(e, t = {}) {
	if (typeof e != "function") throw TypeError("\"hashCons\" expected function, got type=" + typeof e);
	t = On({}, t, "info");
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
function An(e = 32) {
	z(e, "bytesLength");
	let t = typeof globalThis == "object" ? globalThis.crypto : null;
	if (typeof t?.getRandomValues != "function") throw Error("crypto.getRandomValues must be defined");
	if (e > 65536) throw RangeError(`"bytesLength" expected <= 65536, got ${e}`);
	return t.getRandomValues(new Uint8Array(e));
}
var jn = (e) => ({ oid: Uint8Array.from([
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
function Mn(e, t, n) {
	return e & t ^ ~e & n;
}
function Nn(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var Pn = class {
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
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = vn(this.buffer);
	}
	update(e) {
		hn(this), B(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length, a = !1;
		for (let o = 0; o < i;) {
			let s = Math.min(r - this.pos, i - o);
			if (s === r) {
				let t = vn(e);
				for (; r <= i - o; o += r) this.process(t, o);
				a = !0;
			} else n.set(o === 0 && s === i ? e : e.subarray(o, o + s), this.pos), this.pos += s, o += s, this.pos === r && (this.process(t, 0), this.pos = 0, a = !0);
		}
		return this.length += e.length, a && this.roundClean(), this;
	}
	digestInto(e) {
		hn(this), gn(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, t.fill(0, a), this.padOffset > r - a && (this.process(n, 0), t.fill(0)), Yt(n, r - 8, this.length * 8, i), this.process(n, 0), this.roundClean();
		let o = e === t ? n : vn(e), s = this.outputLen, c = s / 4, l = this.get();
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
}, Fn = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), In = (e, t) => e.tags.find((e) => e[0] === t), Ln = (e, t) => In(e, t)?.[1], Rn = (e, t) => e.tags.find((e) => e[0] === "e" && e[3] === t)?.[1], zn = () => Math.floor(Date.now() / 1e3), Bn = (e, t) => e.created_at - t.created_at || (e.id < t.id ? -1 : +(e.id > t.id)), Vn = /* @__PURE__ */ Uint32Array.from([
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
]), U = /* @__PURE__ */ new Uint32Array(64), Hn = class extends Pn {
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
		for (let n = 0; n < 16; n++, t += 4) U[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = U[e - 15], n = U[e - 2], r = H(t, 7) ^ H(t, 18) ^ t >>> 3, i = H(n, 17) ^ H(n, 19) ^ n >>> 10;
			U[e] = i + U[e - 7] + r + U[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = H(o, 6) ^ H(o, 11) ^ H(o, 25), u = l + t + Mn(o, s, c) + Vn[e] + U[e] | 0, d = (H(n, 2) ^ H(n, 13) ^ H(n, 22)) + Nn(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		V(U);
	}
	destroy() {
		this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), V(this.buffer);
	}
}, Un = class extends Hn {
	constructor() {
		super(32, Fn);
	}
}, Wn = /* @__PURE__ */ Kt((/* @__PURE__ */ "0x428a2f98d728ae22.0x7137449123ef65cd.0xb5c0fbcfec4d3b2f.0xe9b5dba58189dbbc.0x3956c25bf348b538.0x59f111f1b605d019.0x923f82a4af194f9b.0xab1c5ed5da6d8118.0xd807aa98a3030242.0x12835b0145706fbe.0x243185be4ee4b28c.0x550c7dc3d5ffb4e2.0x72be5d74f27b896f.0x80deb1fe3b1696b1.0x9bdc06a725c71235.0xc19bf174cf692694.0xe49b69c19ef14ad2.0xefbe4786384f25e3.0x0fc19dc68b8cd5b5.0x240ca1cc77ac9c65.0x2de92c6f592b0275.0x4a7484aa6ea6e483.0x5cb0a9dcbd41fbd4.0x76f988da831153b5.0x983e5152ee66dfab.0xa831c66d2db43210.0xb00327c898fb213f.0xbf597fc7beef0ee4.0xc6e00bf33da88fc2.0xd5a79147930aa725.0x06ca6351e003826f.0x142929670a0e6e70.0x27b70a8546d22ffc.0x2e1b21385c26c926.0x4d2c6dfc5ac42aed.0x53380d139d95b3df.0x650a73548baf63de.0x766a0abb3c77b2a8.0x81c2c92e47edaee6.0x92722c851482353b.0xa2bfe8a14cf10364.0xa81a664bbc423001.0xc24b8b70d0f89791.0xc76c51a30654be30.0xd192e819d6ef5218.0xd69906245565a910.0xf40e35855771202a.0x106aa07032bbd1b8.0x19a4c116b8d2d0c8.0x1e376c085141ab53.0x2748774cdf8eeb99.0x34b0bcb5e19b48a8.0x391c0cb3c5c95a63.0x4ed8aa4ae3418acb.0x5b9cca4f7763e373.0x682e6ff3d6b2b8a3.0x748f82ee5defb2fc.0x78a5636f43172f60.0x84c87814a1f0ab72.0x8cc702081a6439ec.0x90befffa23631e28.0xa4506cebde82bde9.0xbef9a3f7b2c67915.0xc67178f2e372532b.0xca273eceea26619c.0xd186b8c721c0c207.0xeada7dd6cde0eb1e.0xf57d4f7fee6ed178.0x06f067aa72176fba.0x0a637dc5a2c898a6.0x113f9804bef90dae.0x1b710b35131c471b.0x28db77f523047d84.0x32caab7b40c72493.0x3c9ebe0a15c9bebc.0x431d67c49c100d4c.0x4cc5d4becb3e42b6.0x597f299cfc657e2a.0x5fcb6fab3ad6faec.0x6c44198c4a475817".split(".")).map((e) => BigInt(e))), Gn = Wn[0], Kn = Wn[1], W = /* @__PURE__ */ new Uint32Array(80), G = /* @__PURE__ */ new Uint32Array(80), qn = class extends Pn {
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
		for (let n = 0; n < 16; n++, t += 4) W[n] = e.getUint32(t), G[n] = e.getUint32(t += 4);
		for (let e = 16; e < 80; e++) {
			let t = W[e - 15] | 0, n = G[e - 15] | 0, r = Qt(t, n, 1) ^ Qt(t, n, 8) ^ Xt(t, n, 7), i = $t(t, n, 1) ^ $t(t, n, 8) ^ Zt(t, n, 7), a = W[e - 2] | 0, o = G[e - 2] | 0, s = Qt(a, o, 19) ^ en(a, o, 61) ^ Xt(a, o, 6), c = an(i, $t(a, o, 19) ^ tn(a, o, 61) ^ Zt(a, o, 6), G[e - 7], G[e - 16]), l = on(c, r, s, W[e - 7], W[e - 16]);
			W[e] = l | 0, G[e] = c | 0;
		}
		let { Ah: n, Al: r, Bh: i, Bl: a, Ch: o, Cl: s, Dh: c, Dl: l, Eh: u, El: d, Fh: f, Fl: p, Gh: m, Gl: h, Hh: g, Hl: _ } = this;
		for (let e = 0; e < 80; e++) {
			let t = Qt(u, d, 14) ^ Qt(u, d, 18) ^ en(u, d, 41), v = $t(u, d, 14) ^ $t(u, d, 18) ^ tn(u, d, 41), y = u & f ^ ~u & m, b = d & p ^ ~d & h, x = sn(_, v, b, Kn[e], G[e]), S = cn(x, g, t, y, Gn[e], W[e]), C = x | 0, w = Qt(n, r, 28) ^ en(n, r, 34) ^ en(n, r, 39), T = $t(n, r, 28) ^ tn(n, r, 34) ^ tn(n, r, 39), ee = n & i ^ n & o ^ i & o, te = r & a ^ r & s ^ a & s;
			g = m | 0, _ = h | 0, m = f | 0, h = p | 0, f = u | 0, p = d | 0, {h: u, l: d} = R(c | 0, l | 0, S | 0, C | 0), c = o | 0, l = s | 0, o = i | 0, s = a | 0, i = n | 0, a = r | 0;
			let E = nn(C, T, te);
			n = rn(E, S, w, ee), r = E | 0;
		}
		({h: n, l: r} = R(this.Ah | 0, this.Al | 0, n | 0, r | 0)), {h: i, l: a} = R(this.Bh | 0, this.Bl | 0, i | 0, a | 0), {h: o, l: s} = R(this.Ch | 0, this.Cl | 0, o | 0, s | 0), {h: c, l: l} = R(this.Dh | 0, this.Dl | 0, c | 0, l | 0), {h: u, l: d} = R(this.Eh | 0, this.El | 0, u | 0, d | 0), {h: f, l: p} = R(this.Fh | 0, this.Fl | 0, f | 0, p | 0), {h: m, l: h} = R(this.Gh | 0, this.Gl | 0, m | 0, h | 0), {h: g, l: _} = R(this.Hh | 0, this.Hl | 0, g | 0, _ | 0), this.set(n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _);
	}
	roundClean() {
		V(W, G);
	}
	destroy() {
		this.destroyed = !0, V(this.buffer), this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
}, Jn = /* @__PURE__ */ Uint32Array.from([
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
]), Yn = class extends qn {
	constructor() {
		super(32, Jn);
	}
}, Xn = /* @__PURE__ */ kn(() => new Un(), /* @__PURE__ */ jn(1)), Zn = /* @__PURE__ */ kn(() => new Yn(), /* @__PURE__ */ jn(6)), Qn = (e) => Object.freeze(e());
function $n(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
function er(e) {
	if (!$n(e)) throw TypeError("Uint8Array expected");
}
function tr(e, t) {
	if (typeof t != "string") throw TypeError(`${e}: string expected`);
	return !0;
}
function nr(e, t = "number") {
	if (typeof e != "number") throw TypeError(`${t}: expected number, got ${typeof e}`);
	if (!Number.isSafeInteger(e)) throw RangeError(`${t}: expected safe integer, got ${e}`);
}
function rr(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
var ir = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})(), ar = /* @__PURE__ */ (() => {
	try {
		let e = new TextDecoder();
		return e.decode(Uint8Array.of(65, 48, 43, 127)) === "A0+" ? e : void 0;
	} catch {
		return;
	}
})(), or = 8192;
function sr(e) {
	let t = e.length;
	if (ar !== void 0 && t >= 12) return ar.decode(e);
	if (t <= or) return String.fromCharCode.apply(null, e);
	let n = "";
	for (let r = 0; r < t; r += or) n += String.fromCharCode.apply(null, e.subarray(r, r + or));
	return n;
}
function cr(e) {
	if (nr(e), e <= 0 || e > 8) throw RangeError("radix2: bits should be in (0..8]");
	let t = ir[e] - 1;
	return {
		encode: (n) => {
			er(n);
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
function lr(e, t) {
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
			return sr(t);
		},
		decode: (t) => {
			tr("decode", t);
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
function ur(e, t = "=") {
	return nr(e), tr("padding", t), {
		encode(n) {
			for (; n.length * e % 8;) n += t;
			return n;
		},
		decode(n) {
			tr("decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid length");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: excess padding");
			return n.slice(0, r);
		}
	};
}
var dr = /* @__PURE__ */ Qn(() => rr(cr(5), lr("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"))), fr = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", pr = /[\t\n\f\r ]/, mr = (e, t) => {
	tr("base64", e);
	let n = t ? "base64url" : "base64";
	if (e.length > 0 && pr.test(e)) throw Error("invalid base64");
	return Uint8Array.fromBase64(e, {
		alphabet: n,
		lastChunkHandling: "strict"
	});
}, hr = /* @__PURE__ */ Qn(() => rr(cr(6), lr("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), ur(6))), gr = /* @__PURE__ */ Qn(() => fr ? {
	encode(e) {
		return er(e), e.toBase64();
	},
	decode(e) {
		return mr(e, !1);
	}
} : hr);
// node_modules/@noble/curves/utils.js
function _r(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
var vr = (e) => e ? `"${e}" ` : "";
function yr(e, t = "") {
	if (typeof e != "boolean") throw TypeError(vr(t) + "expected boolean, got type=" + typeof e);
	return e;
}
function br(e, t = {}, n = {}, r = "object") {
	_r(e, r), _r(t, "fields"), _r(n, "optFields");
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
// node_modules/@noble/hashes/sha3.js
var xr = BigInt(0), Sr = BigInt(1), Cr = BigInt(2), wr = BigInt(7), Tr = BigInt(256), Er = BigInt(113), Dr = [], Or = [], kr = [];
for (let e = 0, t = Sr, n = 1, r = 0; e < 24; e++) {
	[n, r] = [r, (2 * n + 3 * r) % 5], Dr.push(2 * (5 * r + n)), Or.push((e + 1) * (e + 2) / 2 % 64);
	let i = xr;
	for (let e = 0; e < 7; e++) t = (t << Sr ^ (t >> wr) * Er) % Tr, t & Cr && (i ^= Sr << (Sr << BigInt(e)) - Sr);
	kr.push(i);
}
var Ar = Kt(kr, !0), jr = Ar[0], Mr = Ar[1], Nr = (e, t, n) => e << n | t >>> 32 - n, Pr = (e, t, n) => t << n | e >>> 32 - n, Fr = (e, t, n) => t << n - 32 | e >>> 64 - n, Ir = (e, t, n) => e << n - 32 | t >>> 64 - n, Lr = (e, t, n) => n > 32 ? Fr(e, t, n) : Nr(e, t, n), Rr = (e, t, n) => n > 32 ? Ir(e, t, n) : Pr(e, t, n), zr = /* @__PURE__ */ new Uint32Array(10);
function Br(e, t = 24) {
	if (!(e instanceof Uint32Array)) throw TypeError("\"s\" expected Uint32Array(50), got type=" + typeof e);
	if (e.length !== 50) throw RangeError("\"s\" expected Uint32Array(50), got length=" + e.length);
	if (z(t, "rounds"), t < 1 || t > 24) throw Error("\"rounds\" expected integer 1..24");
	for (let n = 24 - t; n < 24; n++) {
		for (let t = 0; t < 10; t++) zr[t] = e[t] ^ e[t + 10] ^ e[t + 20] ^ e[t + 30] ^ e[t + 40];
		for (let t = 0; t < 10; t += 2) {
			let n = (t + 8) % 10, r = (t + 2) % 10, i = zr[r], a = zr[r + 1], o = Lr(i, a, 1) ^ zr[n], s = Rr(i, a, 1) ^ zr[n + 1];
			for (let n = 0; n < 50; n += 10) e[t + n] ^= o, e[t + n + 1] ^= s;
		}
		let t = e[2], r = e[3];
		for (let n = 0; n < 24; n++) {
			let i = Or[n], a = Lr(t, r, i), o = Rr(t, r, i), s = Dr[n];
			t = e[s], r = e[s + 1], e[s] = a, e[s + 1] = o;
		}
		for (let t = 0; t < 50; t += 10) {
			let n = e[t], r = e[t + 1], i = e[t + 2], a = e[t + 3];
			e[t] ^= ~e[t + 2] & e[t + 4], e[t + 1] ^= ~e[t + 3] & e[t + 5], e[t + 2] ^= ~e[t + 4] & e[t + 6], e[t + 3] ^= ~e[t + 5] & e[t + 7], e[t + 4] ^= ~e[t + 6] & e[t + 8], e[t + 5] ^= ~e[t + 7] & e[t + 9], e[t + 6] ^= ~e[t + 8] & n, e[t + 7] ^= ~e[t + 9] & r, e[t + 8] ^= ~n & i, e[t + 9] ^= ~r & a;
		}
		e[0] ^= jr[n], e[1] ^= Mr[n];
	}
	V(zr);
}
var Vr = class e {
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
		if (z(e, "blockLen"), z(t, "suffix"), z(i, "rounds"), dn(r, "enableXOF"), this.blockLen = e, this.suffix = t, this.outputLen = n, this.enableXOF = r, this.canXOF = r, this.rounds = i, z(n, "outputLen"), !(0 < e && e < 200)) throw Error("\"blockLen\" must be 1..199");
		this.state = /* @__PURE__ */ new Uint8Array(200), this.state32 = _n(this.state);
	}
	clone() {
		return this._cloneInto();
	}
	keccak() {
		Sn(this.state32), Br(this.state32, this.rounds), Sn(this.state32), this.posOut = 0, this.pos = 0;
	}
	update(e) {
		hn(this), B(e);
		let { blockLen: t, state: n, state32: r } = this, i = e.length, a = t % 4 == 0 && e.byteOffset % 4 == 0, o = t / 4, s = a && i >= t ? _n(e) : void 0;
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
		hn(this, !1), B(e), this.finish();
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
		return z(e), this.xofInto(new Uint8Array(e));
	}
	digestInto(e) {
		if (gn(e, this), this.finished) throw Error("digest() was already called");
		this.writeInto(e.length === this.outputLen ? e : e.subarray(0, this.outputLen)), this.destroy();
	}
	digest() {
		let e = new Uint8Array(this.outputLen);
		return this.digestInto(e), e;
	}
	destroy() {
		this.destroyed = !0, V(this.state);
	}
	_cloneInto(t) {
		let { blockLen: n, suffix: r, outputLen: i, rounds: a, enableXOF: o } = this;
		return t ||= new e(n, r, i, o, a), t.blockLen = n, t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = a, t.suffix = r, t.outputLen = i, t.enableXOF = o, t.canXOF = this.canXOF, t.destroyed = this.destroyed, t;
	}
}, Hr = (e, t, n, r = {}) => kn((r = {}) => (r = On({}, r), new Vr(t, e, r.dkLen === void 0 ? n : r.dkLen, !0)), r), Ur = /* @__PURE__ */ Hr(31, 168, 16, /* @__PURE__ */ jn(11)), K = /* @__PURE__ */ Hr(31, 136, 32, /* @__PURE__ */ jn(12));
// node_modules/@noble/curves/abstract/fft.js
function Wr(e, t = "n") {
	if (typeof e != "number") throw TypeError(`wrong u32 integer "${t}": expected number, got type=${typeof e}`);
	if (!Number.isSafeInteger(e) || e < 0 || e > 4294967295) throw RangeError(`wrong u32 integer "${t}": expected 0..4294967295, got ${e}`);
	return e;
}
function Gr(e) {
	return Wr(e, "x"), !(e & e - 1) && e !== 0;
}
function Kr(e, t) {
	if (Wr(e), typeof t != "number") throw TypeError("\"bits\" expected number, got type=" + typeof t);
	if (!Number.isSafeInteger(t) || t < 0 || t > 32) throw Error(`expected integer 0 <= bits <= 32, got ${t}`);
	let n = 0;
	for (let r = 0; r < t; r++, e >>>= 1) n = n << 1 | e & 1;
	return n >>> 0;
}
function qr(e) {
	return Wr(e), 31 - Math.clz32(e);
}
function Jr(e) {
	if (!e || typeof e != "object" || typeof e.length != "number") throw TypeError("\"values\" expected array-like, got type=" + typeof e);
	let t = e.length;
	if (!Gr(t)) throw Error("expected positive power-of-two length, got " + t);
	let n = qr(t);
	for (let r = 0; r < t; r++) {
		let t = Kr(r, n);
		if (r < t) {
			let n = e[r];
			e[r] = e[t], e[t] = n;
		}
	}
	return e;
}
var Yr = (e, t) => {
	br(t, {
		N: "number",
		roots: "object",
		dit: "boolean"
	}, {
		invertButterflies: "boolean",
		skipStages: "number",
		brp: "boolean"
	}, "coreOpts");
	let { N: n, roots: r, dit: i, invertButterflies: a = !1, skipStages: o = 0, brp: s = !0 } = t;
	Wr(n, "coreOpts.N");
	let c = qr(n);
	if (!Gr(n)) throw Error("FFT: Polynomial size should be power of two");
	Wr(o, "coreOpts.skipStages");
	let l = c === 0 ? 0 : c - 1;
	if (o > l) throw Error(`FFT: wrong skipStages: expected 0 <= skipStages <= ${l}`);
	if (r.length !== n) throw Error(`FFT: wrong roots length: expected ${n}, got ${r.length}`);
	let u = i !== a;
	return (t) => {
		if (t.length !== n) throw Error("FFT: wrong Polynomial length");
		i && s && Jr(t);
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
		return !i && s && Jr(t), t;
	};
}, q = B, Xr = An;
function Zr(e, t, n = () => {}) {
	if (!Array.isArray(e)) throw TypeError(`"${t}" expected array, got type=${typeof e}`);
	for (let r = 0; r < e.length; r++) n(e[r], `${t}[${r}]`);
	return e;
}
function Qr(e, t = "object") {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError(t === "object" ? "expected valid options object" : `"${t}" expected object, got type=${typeof e}`);
	return e;
}
function $r(e, t) {
	if (e = B(e), t = B(t), e.length !== t.length) return !1;
	let n = 0;
	for (let r = 0; r < e.length; r++) n |= e[r] ^ t[r];
	return n === 0;
}
function ei(e) {
	if (ln(e)) throw TypeError("\"opts\" expected object, got Uint8Array");
	Qr(e, "opts");
	let t = Object.getPrototypeOf(e);
	if (t !== null && t !== Object.prototype) throw TypeError("\"opts\" expected a plain object");
}
var ti = /* @__PURE__ */ Object.freeze(["context"]), ni = /* @__PURE__ */ Object.freeze(["context", "extraEntropy"]);
function ri(e, t) {
	ei(e);
	let n = Object.assign(Object.create(null), e);
	for (let [e, r] of Object.entries(n)) if (r !== void 0 && !t.includes(e)) throw TypeError("unexpected option \"" + String(e) + "\"; expected one of: " + t.join(", "));
	return Object.freeze(n);
}
function ii(e, t = ti) {
	let n = ri(e, t);
	return n.context !== void 0 && B(n.context, void 0, "opts.context"), n;
}
function ai(e, t = ni) {
	let n = ri(e, t);
	return n.context !== void 0 && B(n.context, void 0, "opts.context"), n.extraEntropy !== !1 && n.extraEntropy !== void 0 && B(n.extraEntropy, void 0, "opts.extraEntropy"), n;
}
function oi(e, ...t) {
	let n = (e) => typeof e == "number" ? e : e.bytesLen, r = t.reduce((e, t) => e + n(t), 0);
	return {
		bytesLen: r,
		encode: (i) => {
			let a = new Uint8Array(r);
			for (let r = 0, o = 0; r < t.length; r++) {
				let s = t[r], c = n(s), l = typeof s == "number" ? i[r] : s.encode(i[r]);
				B(l, c, e), a.set(l, o), typeof s != "number" && l.fill(0), o += c;
			}
			return a;
		},
		decode: (i) => {
			B(i, r, e);
			let a = [];
			for (let e of t) {
				let t = n(e), r = i.subarray(0, t);
				a.push(typeof e == "number" ? r : e.decode(r)), i = i.subarray(t);
			}
			return a;
		}
	};
}
function si(e, t) {
	let n = e, r = t * n.bytesLen;
	return {
		bytesLen: r,
		encode: (e) => {
			let i = Zr(e, "u");
			if (i.length !== t) throw RangeError(`vecCoder.encode: wrong length=${i.length}. Expected: ${t}`);
			let a = new Uint8Array(r);
			for (let e = 0, t = 0; e < i.length; e++) {
				let r = n.encode(i[e]);
				a.set(r, t), r.fill(0), t += r.length;
			}
			return a;
		},
		decode: (e) => {
			B(e, r);
			let t = [];
			for (let r = 0; r < e.length; r += n.bytesLen) t.push(n.decode(e.subarray(r, r + n.bytesLen)));
			return t;
		}
	};
}
function J(...e) {
	for (let t of e) if (Array.isArray(t)) for (let e of t) e.fill(0);
	else t.fill(0);
}
function ci(e) {
	if (z(e, "bits"), e > 32) throw RangeError("\"bits\" expected <= 32, got " + e);
	return e === 32 ? 4294967295 : ~(-1 << e) >>> 0;
}
var li = /* @__PURE__ */ Uint8Array.of();
function ui(e, t = li) {
	if (B(e, void 0, "msg"), B(t, void 0, "ctx"), t.length > 255) throw RangeError("context should be 255 bytes or less");
	return Dn(new Uint8Array([0, t.length]), t, e);
}
var di = /* @__PURE__ */ Uint8Array.from([
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
]), fi = {
	"060960864801650304020b": 32,
	"060960864801650304020c": 64
};
function pi(e, t = 0) {
	if (typeof e != "function" || typeof e.create != "function") throw TypeError("\"hash\" expected hash function, got type=" + typeof e);
	fn(e), z(t, "requiredStrength");
	let n = e.oid;
	if (B(n, void 0, "hash.oid"), !$r(n.subarray(0, 10), di)) throw Error("\"hash.oid\" is invalid: expected NIST hash");
	let r = fi[Tn(n)];
	if (r !== void 0 && e.outputLen !== r) throw Error("Pre-hash XOF output length must be " + r + " bytes for this OID, got: " + e.outputLen);
	let i = e.outputLen * 8 / 2;
	if (t > i) throw Error("Pre-hash security strength too low: " + i + ", required: " + t);
}
function mi(e, t, n = li) {
	if (pi(e), B(t, void 0, "msg"), B(n, void 0, "ctx"), n.length > 255) throw RangeError("context should be 255 bytes or less");
	let r = e(t);
	return Dn(new Uint8Array([1, n.length]), n, e.oid, r);
}
// node_modules/@noble/post-quantum/_crystals.js
var hi = (e) => {
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
			let n = Kr(t, o), i = BigInt(a) ** BigInt(n) % BigInt(r);
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
	}, h = Yr(p, {
		dit: !1,
		...m
	}), g = Yr(p, {
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
			for (let t = 0, r = 0; t < n; t++) r += e, r > 32 && ci(r), r %= 8;
			let i = ci(e), a = n / 8 * e;
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
}, gi = (e) => (t, n) => {
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
			o.destroy(), J(a, r);
		}
	};
}, _i = /* @__PURE__ */ gi(Ur), vi = /* @__PURE__ */ gi(K), yi = /* @__PURE__ */ Object.freeze(["extraEntropy", "externalMu"]), bi = /* @__PURE__ */ Object.freeze(["externalMu"]);
function xi(e, t) {
	let n = ri(e, t);
	return n.externalMu !== void 0 && yr(n.externalMu, "opts.externalMu"), n;
}
var Y = 256, Si = 8380417, Ci = 1753, wi = 8347681, Ti = 13, Ei = 95232, Di = 261888, Oi = /* @__PURE__ */ Object.freeze({
	2: Object.freeze({
		K: 4,
		L: 4,
		D: Ti,
		GAMMA1: 2 ** 17,
		GAMMA2: Ei,
		TAU: 39,
		ETA: 2,
		OMEGA: 80
	}),
	3: Object.freeze({
		K: 6,
		L: 5,
		D: Ti,
		GAMMA1: 2 ** 19,
		GAMMA2: Di,
		TAU: 49,
		ETA: 4,
		OMEGA: 55
	}),
	5: Object.freeze({
		K: 8,
		L: 7,
		D: Ti,
		GAMMA1: 2 ** 19,
		GAMMA2: Di,
		TAU: 60,
		ETA: 2,
		OMEGA: 75
	})
}), X = (e) => new Int32Array(e), Z = /* @__PURE__ */ hi({
	N: Y,
	Q: Si,
	F: wi,
	ROOT_OF_UNITY: Ci,
	newPoly: X,
	isKyber: !1,
	brvBits: 8
}), ki = (e) => e, Ai = (e, t = ki, n = ki) => Z.bitsCoder(e, {
	encode: (e) => t(n(e)),
	decode: (e) => n(t(e))
}), Q = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Z.mod(n[e] + r[e]);
	return n;
}, ji = (e, t) => {
	let n = e, r = t;
	for (let e = 0; e < n.length; e++) n[e] = Z.mod(n[e] - r[e]);
	return n;
}, Mi = (e) => {
	let t = e;
	for (let e = 0; e < Y; e++) t[e] <<= Ti;
	return t;
}, Ni = (e, t) => {
	let n = e;
	for (let e = 0; e < Y; e++) if (Math.abs(Z.smod(n[e])) >= t) return !0;
	return !1;
}, $ = (e, t) => {
	let n = e, r = t, i = X(Y);
	for (let e = 0; e < n.length; e++) i[e] = Z.mod(n[e] * r[e]);
	return i;
};
function Pi(e) {
	let t = e, n = X(Y);
	for (let e = 0; e < Y;) {
		let r = t();
		if (r.length % 3) throw Error("RejNTTPoly: unaligned block");
		for (let t = 0; e < Y && t <= r.length - 3; t += 3) {
			let i = (r[t + 0] | r[t + 1] << 8 | r[t + 2] << 16) & 8388607;
			i < Si && (n[e++] = i);
		}
	}
	return n;
}
function Fi(e) {
	let t = e, { K: n, L: r, GAMMA1: i, GAMMA2: a, TAU: o, ETA: s, OMEGA: c } = t, { CRH_BYTES: l, TR_BYTES: u, C_TILDE_BYTES: d, XOF128: f, XOF256: p, securityLevel: m } = t;
	if (![2, 4].includes(s)) throw Error("Wrong ETA");
	if (![1 << 17, 1 << 19].includes(i)) throw Error("Wrong GAMMA1");
	if (![Ei, Di].includes(a)) throw Error("Wrong GAMMA2");
	let h = o * s, g = (e) => {
		let t = Z.mod(e), n = Z.smod(t, 2 * a) | 0;
		return t - n === 8380416 ? {
			r1: 0,
			r0: n - 1 | 0
		} : {
			r1: Math.floor((t - n) / (2 * a)) | 0,
			r0: n
		};
	}, _ = (e) => g(e).r1, v = (e) => g(e).r0, y = (e, t) => e <= a || e > Si - a || e === Si - a && t === 0 ? 0 : 1, b = Math.floor(8380416 / (2 * a)), x = (e, t) => {
		let { r1: n, r0: r } = g(t);
		return e === 1 ? r > 0 ? Z.mod(n + 1, b) | 0 : Z.mod(n - 1, b) | 0 : n | 0;
	}, S = (e) => {
		let t = Z.mod(e), n = Z.smod(t, 2 ** Ti) | 0;
		return {
			r1: Math.floor((t - n) / 2 ** Ti) | 0,
			r0: n
		};
	}, C = {
		bytesLen: c + n,
		encode: (e) => {
			let t = e;
			if (t === !1) throw Error("hint.encode: hint is false");
			let r = new Uint8Array(c + n);
			for (let e = 0, i = 0; e < n; e++) {
				for (let n = 0; n < Y; n++) t[e][n] !== 0 && (r[i++] = n);
				r[c + e] = i;
			}
			return r;
		},
		decode: (e) => {
			let t = [], r = 0;
			for (let i = 0; i < n; i++) {
				let n = X(Y);
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
	}, w = Ai(s === 2 ? 3 : 4, (e) => s - e, (e) => {
		if (!(-s <= e && e <= s)) throw Error(`malformed key s1/s3 ${e} outside of ETA range [${-s}, ${s}]`);
		return e;
	}), T = Ai(13, (e) => 4096 - e), ee = Ai(10), te = Ai(i === 1 << 17 ? 18 : 20, (e) => Z.smod(i - e)), E = si(Ai(a === Ei ? 6 : 4), n), D = oi("publicKey", 32, si(ee, n)), O = oi("secretKey", 32, 32, u, si(w, r), si(w, n), si(T, n)), ne = oi("signature", d, si(te, r), C), k = s === 2 ? (e) => e < 15 && 2 - e % 5 : (e) => e < 9 && 4 - e;
	function A(e) {
		let t = e, n = X(Y);
		for (let e = 0; e < Y;) {
			let r = t();
			for (let t = 0; e < Y && t < r.length; t += 1) {
				let i = k(r[t] & 15), a = k(r[t] >> 4 & 15);
				i !== !1 && (n[e++] = i), e < Y && a !== !1 && (n[e++] = a);
			}
		}
		return n;
	}
	let re = (e) => {
		let t = X(Y), n = K.create({}).update(e), r = new Uint8Array(K.blockLen);
		n.xofInto(r);
		let i = r.slice(0, 8);
		for (let e = Y - o, a = 8, s = 0, c = 0; e < Y; e++) {
			let o = e + 1;
			for (; o > e;) o = r[a++], !(a < K.blockLen) && (n.xofInto(r), a = 0);
			t[e] = t[o], t[o] = 1 - ((i[s] >> c++ & 1) << 1), c >= 8 && (s++, c = 0);
		}
		return t;
	}, ie = (e) => {
		let t = e, n = X(Y), r = X(Y);
		for (let e = 0; e < t.length; e++) {
			let { r0: i, r1: a } = S(t[e]);
			n[e] = i, r[e] = a;
		}
		return {
			r0: n,
			r1: r
		};
	}, ae = (e, t) => {
		let n = e, r = t;
		for (let e = 0; e < Y; e++) n[e] = x(r[e], n[e]);
		return n;
	}, oe = (e, t) => {
		let n = e, r = t, i = X(Y), a = 0;
		for (let e = 0; e < Y; e++) {
			let t = y(n[e], r[e]);
			i[e] = t, a += t;
		}
		return {
			v: i,
			cnt: a
		};
	}, se = oi("seed", 32, 64, 32), j = Object.freeze({
		info: Object.freeze({ type: "internal-ml-dsa" }),
		lengths: Object.freeze({
			secretKey: O.bytesLen,
			publicKey: D.bytesLen,
			seed: 32,
			signature: ne.bytesLen,
			signRand: 32
		}),
		keygen: (e) => {
			let t = /* @__PURE__ */ new Uint8Array(34), i = e === void 0;
			i && (e = Xr(32)), q(e, 32, "seed"), t.set(e), i && J(e), t[32] = n, t[33] = r;
			let [a, o, s] = se.decode(K(t, { dkLen: se.bytesLen })), c = p(o), l = [];
			for (let e = 0; e < r; e++) l.push(A(c.get(e & 255, e >> 8 & 255)));
			let d = [];
			for (let e = r; e < r + n; e++) d.push(A(c.get(e & 255, e >> 8 & 255)));
			let m = l.map((e) => Z.NTT.encode(e.slice())), h = [], g = [], _ = f(a), v = X(Y);
			for (let e = 0; e < n; e++) {
				J(v);
				for (let t = 0; t < r; t++) Q(v, $(Pi(_.get(t, e)), m[t]));
				Z.NTT.decode(v);
				let { r0: t, r1: n } = ie(Q(v, d[e]));
				h.push(t), g.push(n);
			}
			let y = D.encode([a, g]), b = K(y, { dkLen: u }), x = O.encode([
				a,
				s,
				b,
				l,
				d,
				h
			]);
			return _.clean(), c.clean(), J(a, o, s, l, d, m, v, h, g, b, t), {
				publicKey: y,
				secretKey: x
			};
		},
		getPublicKey: (e) => {
			let [t, i, a, o, s, c] = O.decode(e), l = f(t), u = o.map((e) => Z.NTT.encode(e.slice())), d = [], p = X(Y);
			for (let e = 0; e < n; e++) {
				p.fill(0);
				for (let t = 0; t < r; t++) Q(p, $(Pi(l.get(t, e)), u[t]));
				Z.NTT.decode(p), Q(p, s[e]);
				let { r1: t } = ie(p);
				d.push(t);
			}
			return l.clean(), J(p, u, c, o, s), D.encode([t, d]);
		},
		sign: (e, t, o = {}) => {
			o = ai(o, yi), o = xi(o, yi);
			let { extraEntropy: s, externalMu: u = !1 } = o;
			u && q(e, l, "mu");
			let m = s === !1 || s === void 0, g = s === !1 ? /* @__PURE__ */ new Uint8Array(32) : s === void 0 ? Xr(32) : s;
			q(g, 32, "extraEntropy");
			let [y, b, x, S, C, w] = (() => {
				try {
					return O.decode(t);
				} catch (e) {
					throw m && J(g), e;
				}
			})(), T = [], ee = f(y);
			for (let e = 0; e < n; e++) {
				let t = [];
				for (let n = 0; n < r; n++) t.push(Pi(ee.get(n, e)));
				T.push(t);
			}
			ee.clean();
			for (let e = 0; e < r; e++) Z.NTT.encode(S[e]);
			for (let e = 0; e < n; e++) Z.NTT.encode(C[e]), Z.NTT.encode(w[e]);
			let D = u ? e : K.create({ dkLen: l }).update(x).update(e).digest(), k = K.create({ dkLen: l }).update(b).update(g).update(D).digest();
			m && J(g), q(k, l);
			let A = p(k, te.bytesLen);
			main_loop: for (let e = 0;;) {
				let t = [];
				for (let n = 0; n < r; n++, e++) t.push(te.decode(A.get(e & 255, e >> 8)()));
				let o = t.map((e) => Z.NTT.encode(e.slice())), s = [];
				for (let e = 0; e < n; e++) {
					let t = X(Y);
					for (let n = 0; n < r; n++) Q(t, $(T[e][n], o[n]));
					Z.NTT.decode(t), s.push(t);
				}
				let l = s.map((e) => e.map(_)), f = K.create({ dkLen: d }).update(D).update(E.encode(l)).digest(), p = Z.NTT.encode(re(f)), m = S.map((e) => $(e, p));
				for (let e = 0; e < r; e++) if (Q(Z.NTT.decode(m[e]), t[e]), Ni(m[e], i - h)) {
					J(f, m, p, l, s, o, t);
					continue main_loop;
				}
				let g = 0, y = [];
				for (let e = 0; e < n; e++) {
					let n = Z.NTT.decode($(C[e], p)), r = ji(s[e], n).map(v);
					if (Ni(r, a - h)) {
						J(f, m, p, l, s, o, t, y, n, r);
						continue main_loop;
					}
					let i = Z.NTT.decode($(w[e], p));
					if (Ni(i, a)) {
						J(f, m, p, l, s, o, t, y, n, r, i);
						continue main_loop;
					}
					Q(r, i);
					let c = oe(r, l[e]);
					y.push(c.v), g += c.cnt;
				}
				if (g > c) {
					J(f, m, p, l, s, o, t, y);
					continue;
				}
				A.clean();
				let b = ne.encode([
					f,
					m,
					y
				]);
				return J(f, m, y, p, l, s, o, t, k, S, C, w, ...T), u || J(D), b;
			}
			throw Error("Unreachable code path reached, report this error");
		},
		verify: (e, t, a, o = {}) => {
			o = xi(o, bi);
			let { externalMu: s = !1 } = o;
			s && q(t, l, "mu");
			let [p, m] = D.decode(a), g = K(a, { dkLen: u });
			if (e.length !== ne.bytesLen) return !1;
			let [_, v, y] = ne.decode(e);
			if (y === !1) return !1;
			for (let e = 0; e < r; e++) if (Ni(v[e], i - h)) return !1;
			let b = s ? t : K.create({ dkLen: l }).update(g).update(t).digest(), x = Z.NTT.encode(re(_)), S = v.map((e) => e.slice());
			for (let e = 0; e < r; e++) Z.NTT.encode(S[e]);
			let C = [], w = f(p);
			for (let e = 0; e < n; e++) {
				let t = $(Z.NTT.encode(Mi(m[e])), x), n = X(Y);
				for (let t = 0; t < r; t++) Q(n, $(Pi(w.get(t, e)), S[t]));
				let i = Z.NTT.decode(ji(n, t));
				C.push(ae(i, y[e]));
			}
			w.clean();
			let T = K.create({ dkLen: d }).update(b).update(E.encode(C)).digest();
			for (let e of y) if (!(e.reduce((e, t) => e + t, 0) <= c)) return !1;
			for (let e of v) if (Ni(e, i - h)) return !1;
			return $r(_, T);
		}
	});
	return Object.freeze({
		info: Object.freeze({ type: "ml-dsa" }),
		internal: j,
		securityLevel: m,
		keygen: j.keygen,
		lengths: j.lengths,
		getPublicKey: j.getPublicKey,
		sign: (e, t, n = {}) => {
			n = ai(n);
			let r = ui(e, n.context), i = j.sign(r, t, {
				extraEntropy: n.extraEntropy,
				externalMu: !1
			});
			return J(r), i;
		},
		verify: (e, t, n, r = {}) => (r = ii(r), q(e, void 0, "signature"), j.verify(e, ui(t, r.context), n, { externalMu: !1 })),
		prehash: (e) => {
			pi(e, m);
			let t = e;
			return Object.freeze({
				info: Object.freeze({ type: "hashml-dsa" }),
				securityLevel: m,
				lengths: j.lengths,
				keygen: j.keygen,
				getPublicKey: j.getPublicKey,
				sign: (e, n, r = {}) => {
					r = ai(r);
					let i = mi(t, e, r.context), a = j.sign(i, n, {
						extraEntropy: r.extraEntropy,
						externalMu: !1
					});
					return J(i), a;
				},
				verify: (e, n, r, i = {}) => (i = ii(i), q(e, void 0, "signature"), j.verify(e, mi(t, n, i.context), r, { externalMu: !1 }))
			});
		}
	});
}
var Ii = /* @__PURE__ */ Fi({
	...Oi[3],
	CRH_BYTES: 64,
	TR_BYTES: 64,
	C_TILDE_BYTES: 48,
	XOF128: _i,
	XOF256: vi,
	securityLevel: 192
}), Li = /* @__PURE__ */ t({
	PQ_ALG: () => Vt,
	createPqBinding: () => qi,
	generatePqKeys: () => Bi,
	keyLookup: () => Xi,
	resolvePqKey: () => Yi,
	signHybrid: () => Ui,
	verifyHybrid: () => Ki,
	verifyPq: () => Gi
}), Ri = En(Ht), zi = /* @__PURE__ */ new Set(["pq", "pq-prev"]);
function Bi(e = An(32)) {
	return Ii.keygen(e);
}
function Vi(e, t) {
	let n = t.tags.filter((e) => !zi.has(e[0]));
	return Xn(En(JSON.stringify([
		0,
		e,
		t.created_at,
		t.kind,
		n,
		t.content
	])));
}
var Hi = (e, t, n) => gr.encode(Ii.sign(Vi(e, t), n.secretKey, { context: Ri }));
function Ui(e, t, n, r) {
	let i = Lt(t), a = {
		...e,
		tags: e.tags.filter((e) => !zi.has(e[0]))
	}, o = [...a.tags, [
		"pq",
		Vt,
		Hi(i, a, n)
	]];
	return r && o.push([
		"pq-prev",
		Vt,
		Hi(i, a, r)
	]), Rt({
		...a,
		tags: o
	}, t);
}
function Wi(e, t) {
	let n = e.tags.filter((e) => e[0] === t);
	if (n.length === 1 && n[0][1] === "ml-dsa-65" && n[0][2]) try {
		return gr.decode(n[0][2]);
	} catch {
		return;
	}
}
function Gi(e, t, n = "pq") {
	let r = Wi(e, n);
	if (!r) return !1;
	try {
		return Ii.verify(r, Vi(e.pubkey, e), t, { context: Ri });
	} catch {
		return !1;
	}
}
var Ki = (e, t) => zt(e) && Gi(e, t);
function qi(e, t, n, r = zn()) {
	let i = [["alg", Vt], ["key", gr.encode(t.publicKey)]];
	return n && i.push([
		"e",
		n.binding.id,
		"",
		"prev"
	]), Ui({
		kind: Bt.pqBinding,
		created_at: r,
		content: "",
		tags: i
	}, e, t, n?.keys);
}
function Ji(e) {
	if (Ln(e, "alg") === "ml-dsa-65") try {
		let t = gr.decode(Ln(e, "key") ?? "");
		return t.length === Ii.lengths.publicKey ? t : void 0;
	} catch {
		return;
	}
}
function Yi(e, t) {
	let n = e.filter((e) => {
		if (e.kind !== Bt.pqBinding || e.pubkey !== t) return !1;
		let n = Ji(e);
		return n !== void 0 && Ki(e, n);
	}), r = n.filter((e) => !Rn(e, "prev")).sort(Bn);
	if (!r.length) return;
	let i = r[0], a = Ji(i), o = (e) => new Set(e.map((e) => Ln(e, "key"))).size, s = o(r) > 1, c = /* @__PURE__ */ new Set([i.id]);
	for (;;) {
		let e = n.filter((e) => Rn(e, "prev") === i.id && !c.has(e.id) && Gi(e, a, "pq-prev")).sort(Bn);
		if (!e.length) break;
		s ||= o(e) > 1, i = e[0], a = Ji(i), c.add(i.id);
	}
	return {
		key: a,
		binding: i,
		conflict: s
	};
}
function Xi(e) {
	let t = /* @__PURE__ */ new Map();
	return (n) => (t.has(n) || t.set(n, Yi(e, n)?.key), t.get(n));
}
export { zt as _, dr as a, Zn as c, In as d, Ln as f, Rt as g, Vt as h, Gi as i, Rn as l, Bt as m, Ui as n, gr as o, Tn as p, Ki as r, Xn as s, Li as t, zn as u, f as v, h as y };
