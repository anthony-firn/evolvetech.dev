import { A as e, B as t, C as n, D as r, O as i, S as a, T as o, _ as s, a as c, b as l, c as u, d, f, g as p, h as m, i as h, l as g, m as _, n as v, o as y, p as b, r as x, s as S, t as C, u as w, v as T, w as E, x as D, y as O } from "./utils-Bw_p9nq9.js";
import { t as k } from "./algorand-C7lP2Qb4.js";
// node_modules/@noble/curves/abstract/modular.js
var A = /* @__PURE__ */ BigInt(0), j = /* @__PURE__ */ BigInt(1), M = /* @__PURE__ */ BigInt(2), N = /* @__PURE__ */ BigInt(3), P = /* @__PURE__ */ BigInt(4), F = /* @__PURE__ */ BigInt(5), ee = /* @__PURE__ */ BigInt(7), te = /* @__PURE__ */ BigInt(8), I = /* @__PURE__ */ BigInt(9), ne = /* @__PURE__ */ BigInt(15), re = /* @__PURE__ */ BigInt(16), ie = /* @__PURE__ */ BigInt("0x10000000000000000");
function L(e, t) {
	if (t <= A) throw Error("mod: expected positive modulus, got " + t);
	let n = e % t;
	return n >= A ? n : t + n;
}
function ae(e, t, n) {
	if (n <= j) throw Error("pow: expected modulus > 1, got " + n);
	if (typeof t != "bigint") throw TypeError("invalid exponent: expected bigint, got " + typeof t);
	if (t < A) throw Error("invalid exponent, negatives unsupported");
	if (t === A) return j;
	if (t === j) return e;
	let r = e % n;
	if (r < A && (r += n), t < ie) {
		let e = j;
		for (; t > A;) t & j && (e = e * r % n), r = r * r % n, t >>= j;
		return e;
	}
	let i = [];
	for (; t > A;) i.push(Number(t & ne)), t >>= P;
	let a = Array(16);
	a[0] = j, a[1] = r;
	for (let e = 2; e < 16; e++) a[e] = a[e - 1] * r % n;
	let o = a[i[i.length - 1]];
	for (let e = i.length - 2; e >= 0; e--) {
		o = o * o % n, o = o * o % n, o = o * o % n, o = o * o % n;
		let t = i[e];
		t !== 0 && (o = o * a[t] % n);
	}
	return o;
}
function R(e, t, n) {
	if (n <= j) throw Error("pow2: expected modulus > 1, got " + n);
	if (t < A) throw Error("pow2: expected non-negative exponent, got " + t);
	let r = e;
	for (; t-- > A;) r *= r, r %= n;
	return r;
}
function oe(e, t) {
	if (e === A) throw Error("invert: expected non-zero number");
	if (t <= j) throw Error("invert: expected modulus > 1, got " + t);
	let n = L(e, t), r = t, i = A, a = j;
	for (; n !== A;) {
		let e = r / n, t = r - n * e, o = i - a * e;
		r = n, n = t, i = a, a = o;
	}
	if (r !== j) throw Error("invert: does not exist");
	return L(i, t);
}
function se(e, t, n) {
	let r = e;
	if (!r.eql(r.sqr(t), n)) throw Error("Cannot find square root");
}
function ce(e, t) {
	if ((e & j) === A) throw Error(t + ": expected odd modulus, got " + e);
}
function le(e, t) {
	let n = e, r = (n.ORDER + j) / P, i = n.pow(t, r);
	return se(n, i, t), i;
}
function ue(e, t) {
	let n = e, r = (n.ORDER - F) / te, i = n.mul(t, M), a = n.pow(i, r), o = n.mul(t, a), s = n.mul(n.mul(o, M), a), c = n.mul(o, n.sub(s, n.ONE));
	return se(n, c, t), c;
}
function de(e) {
	let t = V(e), n = fe(e), r = n(t, t.neg(t.ONE)), i = n(t, r), a = n(t, t.neg(r)), o = (e + ee) / re;
	return ((e, t) => {
		let n = e, s = n.pow(t, o), c = n.mul(s, r), l = n.mul(s, i), u = n.mul(s, a), d = n.eql(n.sqr(c), t), f = n.eql(n.sqr(l), t);
		s = n.cmov(s, c, d), c = n.cmov(u, l, f);
		let p = n.eql(n.sqr(c), t), m = n.cmov(s, c, p);
		return se(n, m, t), m;
	});
}
function fe(e) {
	if (e < N) throw Error("sqrt is not defined for small field");
	ce(e, "tonelliShanks");
	let t = e - j, n = 0;
	for (; t % M === A;) t /= M, n++;
	let r = M, i = V(e);
	for (; B(i, r) === 1;) if (r++ > 1e3) throw Error("Cannot find square root: probably non-prime P");
	if (n === 1) return le;
	let a = i.pow(r, t), o = (t + j) / M;
	return function(e, r) {
		let i = e;
		if (i.is0(r)) return r;
		if (B(i, r) !== 1) throw Error("Cannot find square root");
		let s = n, c = i.mul(i.ONE, a), l = i.pow(r, t), u = i.pow(r, o);
		for (; !i.eql(l, i.ONE);) {
			if (i.is0(l)) throw Error("Cannot find square root: probably non-prime P");
			let e = 1, t = i.sqr(l);
			for (; !i.eql(t, i.ONE);) if (e++, t = i.sqr(t), e === s) throw Error("Cannot find square root");
			let n = j << BigInt(s - e - 1), r = i.pow(c, n);
			s = e, c = i.sqr(r), l = i.mul(l, c), u = i.mul(u, r);
		}
		return u;
	};
}
function pe(e) {
	return ce(e, "Fp.sqrt"), e % P === N ? le : e % te === F ? ue : e % re === I ? de(e) : fe(e);
}
var me = (e, t) => (L(e, t) & j) === j, he = [
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
function z(e) {
	if (S(e, "field"), typeof e.ORDER != "bigint") throw TypeError("param \"ORDER\" is invalid: expected bigint, got " + typeof e.ORDER);
	u(e.BYTES, "BYTES"), u(e.BITS, "BITS");
	for (let t of he) c(e[t], "field." + t);
	if (e.BYTES < 1 || e.BITS < 1) throw Error("invalid field: expected BYTES/BITS > 0");
	if (e.ORDER <= j) throw Error("invalid field: expected ORDER > 1, got " + e.ORDER);
	return e;
}
function ge(e, t, n = !1) {
	z(e), v(t, "nums"), x(n, "passZero");
	let r = e, i = Array(t.length).fill(n ? r.ZERO : void 0), a = t.reduce((e, t, n) => r.is0(t) ? e : (i[n] = e, r.mul(e, t)), r.ONE), o = r.inv(a);
	return t.reduceRight((e, t, n) => r.is0(t) ? e : (i[n] = r.mul(e, i[n]), r.mul(e, t)), o), i;
}
function B(e, t) {
	z(e);
	let n = e;
	ce(n.ORDER, "FpLegendre");
	let r = (n.ORDER - j) / M, i = n.pow(t, r), a = n.eql(i, n.ONE), o = n.eql(i, n.ZERO), s = n.eql(i, n.neg(n.ONE));
	if (!a && !o && !s) throw Error("invalid Legendre symbol result");
	return a ? 1 : o ? 0 : -1;
}
function _e(e, t) {
	if (t !== void 0 && y(t), e <= A) throw Error("invalid n length: expected positive n, got " + e);
	if (t !== void 0 && t < 1) throw Error("invalid n length: expected positive bit length, got " + t);
	let n = g(e);
	if (t !== void 0 && t < n) throw Error(`invalid n length: expected nBitLength (${t}) >= bitLen(n) (${n})`);
	let r = t === void 0 ? n : t;
	return {
		nBitLength: r,
		nByteLength: Math.ceil(r / 8)
	};
}
var ve = /* @__PURE__ */ new WeakMap(), ye = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = A;
	ONE = j;
	_lengths;
	_mod;
	constructor(e, t = {}) {
		if (e <= j) throw Error("invalid field: expected ORDER > 1, got " + e);
		let n;
		this.isLE = !1, typeof t == "object" && t && (typeof t.BITS == "number" && (n = t.BITS), typeof t.sqrt == "function" && Object.defineProperty(this, "sqrt", {
			value: t.sqrt,
			enumerable: !0
		}), typeof t.isLE == "boolean" && (this.isLE = t.isLE), t.allowedLengths && (this._lengths = Object.freeze(t.allowedLengths.slice())), typeof t.modFromBytes == "boolean" && (this._mod = t.modFromBytes));
		let { nBitLength: r, nByteLength: i } = _e(e, n);
		if (i > 2048) throw Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = e, this.BITS = r, this.BYTES = i, Object.freeze(this);
	}
	create(e) {
		return L(e, this.ORDER);
	}
	isValid(e) {
		if (typeof e != "bigint") throw TypeError("invalid field element: expected bigint, got " + typeof e);
		return A <= e && e < this.ORDER;
	}
	is0(e) {
		return e === A;
	}
	isValidNot0(e) {
		return !this.is0(e) && this.isValid(e);
	}
	isOdd(e) {
		return (e & j) === j;
	}
	neg(e) {
		return L(-e, this.ORDER);
	}
	eql(e, t) {
		return e === t;
	}
	sqr(e) {
		return L(e * e, this.ORDER);
	}
	add(e, t) {
		return L(e + t, this.ORDER);
	}
	sub(e, t) {
		return L(e - t, this.ORDER);
	}
	mul(e, t) {
		return L(e * t, this.ORDER);
	}
	pow(e, t) {
		return ae(e, t, this.ORDER);
	}
	div(e, t) {
		return L(e * oe(t, this.ORDER), this.ORDER);
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
		return oe(e, this.ORDER);
	}
	sqrt(e) {
		let t = ve.get(this);
		return t || ve.set(this, t = pe(this.ORDER)), t(this, e);
	}
	toBytes(e) {
		return this.isLE ? D(e, this.BYTES) : l(e, this.BYTES);
	}
	fromBytes(e, t = !1) {
		h(e);
		let { _lengths: n, BYTES: r, isLE: i, ORDER: a, _mod: o } = this;
		if (n) {
			if (e.length < 1 || !n.includes(e.length) || e.length > r) throw Error("Field.fromBytes: expected " + n + " bytes, got " + e.length);
			let t = new Uint8Array(r);
			t.set(e, i ? 0 : t.length - e.length), e = t;
		}
		if (e.length !== r) throw Error("Field.fromBytes: expected " + r + " bytes, got " + e.length);
		let s = i ? b(e) : f(e);
		if (o && (s = L(s, a)), !t && !this.isValid(s)) throw Error("invalid field element: outside of range 0..ORDER");
		return s;
	}
	invertBatch(e) {
		return ge(this, e, !0);
	}
	cmov(e, t, n) {
		return x(n, "condition"), n ? t : e;
	}
};
function V(e, t = {}) {
	return Object.freeze(ye.prototype), new ye(e, t);
}
// node_modules/@noble/curves/abstract/curve.js
var H = /* @__PURE__ */ BigInt(0), U = /* @__PURE__ */ BigInt(1), be = /* @__PURE__ */ BigInt(4), xe = 16, Se = 128, Ce = 5, we = 2 ** 31;
function W(e) {
	let t = e;
	if (typeof t != "function") throw TypeError("\"Point\" expected constructor, got type=" + typeof e);
	c(t.fromAffine, "Point.fromAffine"), c(t.fromBytes, "Point.fromBytes"), c(t.fromHex, "Point.fromHex"), S(t.BASE, "Point.BASE"), S(t.ZERO, "Point.ZERO"), z(t.Fp), z(t.Fn);
}
function Te(e, t) {
	W(e), ke(t, e);
	let n = ge(e.Fp, t.map((e) => e.Z));
	return t.map((t, r) => e.fromAffine(t.toAffine(n[r])));
}
function Ee(e, t, n = 1) {
	if (!Number.isSafeInteger(e) || e < n || e > t) throw Error("invalid window size, expected [" + n + ".." + t + "], got W=" + e);
}
function De(e, t) {
	let n = e * (4 * t + 128);
	if (n > we) throw Error("invalid window size: table would need ~" + Math.ceil(n / 2 ** 20) + " MiB, max " + we / 2 ** 20 + " MiB");
}
function Oe(e, t) {
	if (e !== void 0) {
		c(e, "randomBytes");
		try {
			let n = e(t);
			if (!T(n) || n.length !== t) return;
		} catch {
			return;
		}
		return e;
	}
}
function ke(e, t) {
	v(e, "points"), e.forEach((e, n) => {
		if (!(e instanceof t)) throw Error("invalid point at index " + n);
	});
}
function Ae(e, t, n) {
	if (!Array.isArray(e)) throw Error("array of scalars expected");
	e.forEach((e, r) => {
		if (!(n === void 0 ? t.isValid(e) : O(e) && e < n)) throw Error("invalid scalar at index " + r);
	});
}
var je = /* @__PURE__ */ new WeakMap();
function Me(e) {
	return je.get(e) || 1;
}
function Ne(e, t) {
	let n = e.double(), r = [e];
	for (let e = 1; e < t; e++) r.push(r[e - 1].add(n));
	return r;
}
function Pe(e, t) {
	let n = 2 ** t, r = n / 2, i = BigInt(n - 1), a = [];
	for (; e > H;) {
		let t = 0;
		e & U && (t = Number(e & i), t >= r && (t -= n), e -= BigInt(t)), a.push(t), e >>= U;
	}
	return a;
}
function Fe(e, t, n) {
	let r = 2 ** t, i = r / 2, a = BigInt(r - 1), o = BigInt(t), s = [];
	for (let t = 0; t < n; t++) {
		let t = Number(e & a);
		e >>= o, t > i && (t -= r, e += U), s.push(t);
	}
	if (e !== H) throw Error("invalid wnaf");
	return s;
}
function Ie(e, t, n) {
	let r = 0;
	for (let e of n) r = Math.max(r, e.length);
	let i = e;
	for (let e = r - 1; e >= 0; e--) {
		e !== r - 1 && (i = i.double());
		for (let r = 0; r < n.length; r++) {
			let a = n[r][e];
			if (a) {
				let e = t[r][Math.abs(a) - 1 >> 1];
				i = i.add(a < 0 ? e.negate() : e);
			}
		}
	}
	return i;
}
var Le = class {
	Point;
	BASE;
	ZERO;
	randomBytes;
	wnafPrecomputes = /* @__PURE__ */ new WeakMap();
	baseCanBeBlinded;
	bits;
	constructor(e, t) {
		W(e), this.randomBytes = Oe(t, xe), this.Point = e, this.BASE = e.BASE, this.ZERO = e.ZERO, this.bits = e.Fn.BITS;
	}
	buildWnafTable(e, t, n) {
		let r = Math.ceil(n / t) + 1, i = 2 ** (t - 1), a = [], o = e;
		for (let e = 0; e < r; e++) {
			let e = o;
			for (let t = 0; t < i; t++) a.push(e), e = e.add(o);
			o = a[a.length - 1].double();
		}
		return {
			W: t,
			bits: n,
			windows: r,
			comp: a
		};
	}
	wnafCachedCT(e, t) {
		let { W: n, windows: r, comp: i } = e, a = 2 ** (n - 1), o = Fe(t, n, r), s = this.ZERO, c = this.BASE;
		for (let e = 0; e < r; e++) {
			let t = o[e], n = e * a, r = Math.abs(t) - 1, l = i[n];
			for (let e = 1; e < a; e++) l = e === r ? i[n + e] : l;
			let u = l.negate();
			t === 0 ? c = c.add(i[n]) : s = s.add(t < 0 ? u : l);
		}
		return {
			p: s,
			f: c
		};
	}
	getWnafPrecomputes(e, t, n, r) {
		let i = this.wnafPrecomputes.get(t), a = i?.find((t) => t.W === e && t.bits === n);
		return a || (a = this.buildWnafTable(t, e, n), typeof r == "function" && (a = {
			...a,
			comp: r(a.comp)
		}), i || (i = [], this.wnafPrecomputes.set(t, i)), i.push(a)), a;
	}
	assertPoint(e) {
		if (!(e instanceof this.Point)) throw TypeError("\"point\" expected Point instance, got type=" + typeof e);
	}
	validateMulInput(e, t) {
		if (this.assertPoint(e), !s(t, U, this.Point.Fn.ORDER)) throw Error("invalid scalar");
	}
	runCT(e, t, n, r) {
		let i = Me(e);
		return i === 1 ? this.fixedWindowCT(e, t, n) : this.wnafCachedCT(this.getWnafPrecomputes(i, e, n, r), t);
	}
	mulCT(e, t, n) {
		return this.validateMulInput(e, t), this.runCT(e, t, this.bits, n);
	}
	mulCTBlinded(e, t, n) {
		if (this.validateMulInput(e, t), this.randomBytes === void 0) throw Error("randomBytes is required for scalar blinding");
		let r = this.Point.Fn.BITS + Se, i = this.randomBytes(xe);
		if (!T(i) || i.length !== xe) throw Error("randomBytes returned invalid byte array");
		i[0] = i[0] & 63 | 128;
		let a = t + f(i) * this.Point.Fn.ORDER;
		return this.runCT(e, a, r, n);
	}
	fixedWindowCT(e, t, n) {
		let r = Ce, i = w(r), a = Array(32);
		a[0] = this.ZERO;
		for (let t = 1; t < 32; t++) a[t] = a[t - 1].add(e);
		let o = Math.ceil(n / r), s = this.ZERO;
		for (let e = o - 1; e >= 0; e--) {
			if (e !== o - 1) for (let e = 0; e < r; e++) s = s.double();
			let n = Number(t >> BigInt(e * r) & i), c = a[0];
			for (let e = 1; e < 32; e++) c = e === n ? a[e] : c;
			s = s.add(c);
		}
		return {
			p: s,
			f: s
		};
	}
	shouldBlind(e, t) {
		return this.randomBytes === void 0 ? !1 : t === U || e === this.BASE && (this.baseCanBeBlinded === void 0 && (this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0()), this.baseCanBeBlinded);
	}
	mulSecret(e, t, n, r) {
		return this.shouldBlind(e, n) ? this.mulCTBlinded(e, t, r) : this.mulCT(e, t, r);
	}
	mulUnsafe(e, t, n) {
		if (this.assertPoint(e), !O(t)) throw Error("invalid scalar");
		let r = Me(e);
		if (r === 1 || t >= this.Point.Fn.ORDER) return Re(this.Point, [e], [t], !0);
		let i = this.getWnafPrecomputes(r, e, this.bits, n);
		return this.wnafCachedCT(i, t).p;
	}
	setWindowSize(e, t) {
		this.assertPoint(e), Ee(t, this.bits), De((Math.ceil((this.bits + Se) / t) + 1) * 2 ** (t - 1), this.Point.Fp.BYTES), je.set(e, t), this.wnafPrecomputes.delete(e);
	}
	hasWindowSize(e) {
		return Me(e) !== 1;
	}
};
function Re(e, t, n, r = !1) {
	if (W(e), ke(t, e), x(r, "allowOversized"), Ae(n, e.Fn, r ? e.Fn.ORDER ** be : void 0), t.length !== n.length) throw Error("arrays of points and scalars must have equal length");
	let i = t.map((e) => Ne(e, 4)), a = n.map((e) => Pe(e, 4));
	return Ie(e.ZERO, i, a);
}
function ze(e, t, n) {
	if (t) {
		if (t.ORDER !== e) throw Error("Field.ORDER must match order: Fp == p, Fn == n");
		return z(t), t;
	}
	return V(e, { isLE: n });
}
function Be(e, t, r = {}, i) {
	if (e !== "weierstrass" && e !== "edwards") throw Error("expected curve type \"weierstrass\" or \"edwards\"");
	if (i === void 0 && (i = e === "edwards"), !t || typeof t != "object") throw Error(`expected valid ${e} CURVE object`);
	n(r);
	for (let e of [
		"p",
		"n",
		"h"
	]) {
		let n = t[e];
		if (!(O(n) && n !== H)) throw Error(`CURVE.${e} must be positive bigint`);
	}
	let a = ze(t.p, r.Fp, i), o = ze(t.n, r.Fn, i), s = [
		"Gx",
		"Gy",
		"a",
		e === "weierstrass" ? "b" : "d"
	];
	for (let e of s) if (!a.isValid(t[e])) throw Error(`CURVE.${e} must be valid field element of CURVE.Fp`);
	return t = Object.freeze(Object.assign({}, t)), {
		CURVE: t,
		Fp: a,
		Fn: o
	};
}
function Ve(e, t) {
	return function(n) {
		let r = e(n);
		return {
			secretKey: r,
			publicKey: t(r)
		};
	};
}
// node_modules/@noble/curves/abstract/edwards.js
var G = /* @__PURE__ */ BigInt(0), K = /* @__PURE__ */ BigInt(1), q = /* @__PURE__ */ BigInt(2), He = /* @__PURE__ */ BigInt(4), Ue = /* @__PURE__ */ BigInt(8);
function We(e, t, n, r) {
	let i = e.sqr(n), a = e.sqr(r), o = e.add(e.mul(t.a, i), a), s = e.add(e.ONE, e.mul(t.d, e.mul(i, a)));
	return e.eql(o, s);
}
function Ge(e, t = {}) {
	n(t, {}, {}, "extraOpts");
	let r = t, i = Be("edwards", e, r, r.FpFnLE), { Fp: o, Fn: s } = i, c = i.CURVE, { h: l } = c;
	if (B(o, c.a) !== 1) throw Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
	if (B(o, c.d) !== -1) throw Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
	n(r, {}, {
		uvRatio: "function",
		randomBytes: "function"
	});
	let u = r.randomBytes === void 0 ? a : r.randomBytes, f = q << BigInt(o.BYTES * 8) - K;
	function g(e) {
		if (!o.isOdd) throw Error("Field does not have .isOdd()");
		return o.isOdd(e);
	}
	let _ = r.uvRatio === void 0 ? (e, t) => {
		try {
			return {
				isValid: !0,
				value: o.sqrt(o.div(e, t))
			};
		} catch {
			return {
				isValid: !1,
				value: G
			};
		}
	} : r.uvRatio;
	if (!We(o, c, c.Gx, c.Gy)) throw Error("bad curve params: generator point");
	let v = o.eql(c.a, o.neg(o.ONE)) ? (e) => o.neg(e) : o.eql(c.a, o.ONE) ? (e) => e : (e) => o.mul(c.a, e);
	function y(e, t, n = !1) {
		let r = n ? K : G;
		return C("coordinate " + e, t, r, f), t;
	}
	function S(e) {
		if (!(e instanceof w)) throw Error("EdwardsPoint expected");
	}
	class w {
		static BASE = new w(c.Gx, c.Gy, o.ONE, o.mul(c.Gx, c.Gy));
		static ZERO = new w(o.ZERO, o.ONE, o.ONE, o.ZERO);
		static Fp = o;
		static Fn = s;
		X;
		Y;
		Z;
		T;
		constructor(e, t, n, r) {
			this.X = y("x", e), this.Y = y("y", t), this.Z = y("z", n, !0), this.T = y("t", r), Object.freeze(this);
		}
		static CURVE() {
			return c;
		}
		static fromAffine(e) {
			if (e instanceof w) throw Error("extended point not allowed");
			let { x: t, y: n } = e || {};
			return y("x", t), y("y", n), new w(t, n, o.ONE, o.mul(t, n));
		}
		static fromBytes(e, t = !1) {
			let n = o.BYTES, { a: r, d: i } = c;
			e = m(h(e, n, "point")), x(t, "zip215");
			let a = m(e), s = e[n - 1];
			a[n - 1] = s & -129;
			let l = b(a), u = t ? f : o.ORDER;
			C("point.y", l, G, u);
			let d = o.sqr(l), p = o.sub(d, o.ONE), v = o.sub(o.mulN(i, d), r), { isValid: y, value: S } = _(p, v);
			if (!y) throw Error("bad point: invalid y coordinate");
			let T = g(S), E = !!(s & 128);
			if (!t && o.is0(S) && E) throw Error("bad point: x=0 and x_0=1");
			return E !== T && (S = o.neg(S)), w.fromAffine({
				x: S,
				y: l
			});
		}
		static fromHex(e, t = !1) {
			return w.fromBytes(p(e), t);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(e = 6, t = !0) {
			return E.setWindowSize(this, e), t || this.multiply(q), this;
		}
		assertValidity() {
			let e = this, { a: t, d: n } = c;
			if (e.is0()) throw Error("bad point: ZERO");
			let { X: r, Y: i, Z: a, T: s } = e, l = o.sqr(r), u = o.sqr(i), d = o.sqr(a), f = o.sqr(d), p = o.mul(l, t), m = o.mul(o.add(p, u), d), h = o.add(f, o.mul(n, o.mul(l, u)));
			if (!o.eql(m, h)) throw Error("bad point: equation left != right (1)");
			let g = o.mul(r, i), _ = o.mul(a, s);
			if (!o.eql(g, _)) throw Error("bad point: equation left != right (2)");
		}
		equals(e) {
			S(e);
			let { X: t, Y: n, Z: r } = this, { X: i, Y: a, Z: s } = e, c = o.mul(t, s), l = o.mul(i, r), u = o.mul(n, s), d = o.mul(a, r);
			return o.eql(c, l) && o.eql(u, d);
		}
		is0() {
			return this.equals(w.ZERO);
		}
		negate() {
			return new w(o.neg(this.X), this.Y, this.Z, o.neg(this.T));
		}
		double() {
			let { X: e, Y: t, Z: n } = this, r = o.sqr(e), i = o.sqr(t), a = o.mul(o.sqr(n), q), s = v(r), c = o.addN(e, t), l = o.sub(o.subN(o.sqr(c), r), i), u = o.addN(s, i), d = o.subN(u, a), f = o.subN(s, i), p = o.mul(l, d), m = o.mul(u, f), h = o.mul(l, f), g = o.mul(d, u);
			return new w(p, m, g, h);
		}
		add(e) {
			S(e);
			let { d: t } = c, { X: n, Y: r, Z: i, T: a } = this, { X: s, Y: l, Z: u, T: d } = e, f = o.mul(n, s), p = o.mul(r, l), m = o.mul(o.mulN(a, t), d), h = o.mul(i, u), g = o.sub(o.subN(o.mulN(o.addN(n, r), o.addN(s, l)), f), p), _ = o.subN(h, m), y = o.addN(h, m), b = o.sub(p, v(f)), x = o.mul(g, _), C = o.mul(y, b), T = o.mul(g, b), E = o.mul(_, y);
			return new w(x, C, E, T);
		}
		subtract(e) {
			return S(e), this.add(e.negate());
		}
		multiply(e) {
			if (!s.isValidNot0(e)) throw RangeError("invalid scalar: expected 1 <= sc < curve.n");
			let { p: t, f: n } = E.mulSecret(this, e, l, T);
			return T([t, n])[0];
		}
		multiplyUnsafe(e) {
			if (!s.isValid(e)) throw RangeError("invalid scalar: expected 0 <= sc < curve.n");
			return e === G ? w.ZERO : this.is0() || e === K ? this : E.mulUnsafe(this, e, T);
		}
		isSmallOrder() {
			return this.clearCofactor().is0();
		}
		isTorsionFree() {
			return E.mulUnsafe(this, c.n).is0();
		}
		toAffine(e) {
			let t = this, n = e;
			if (n != null && typeof n != "bigint") throw TypeError("\"invertedZ\" expected bigint, got type=" + typeof n);
			let { X: r, Y: i, Z: a } = t, s = t.is0();
			n ??= s ? o.create(Ue) : o.inv(a);
			let c = o.mul(r, n), l = o.mul(i, n), u = o.mul(a, n);
			if (s) return {
				x: o.ZERO,
				y: o.ONE
			};
			if (!o.eql(u, o.ONE)) throw Error("invZ was invalid");
			return {
				x: c,
				y: l
			};
		}
		clearCofactor() {
			return l === K ? this : l === q ? this.double() : l === He ? this.double().double() : l === Ue ? this.double().double().double() : this.multiplyUnsafe(l);
		}
		toBytes() {
			let { x: e, y: t } = this.toAffine(), n = o.toBytes(t);
			return n[n.length - 1] |= g(e) ? 128 : 0, n;
		}
		toHex() {
			return d(this.toBytes());
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	let T = (e) => Te(w, e), E = new Le(w, u);
	return E.bits >= 6 && w.BASE.precompute(6), Object.freeze(w.prototype), Object.freeze(w), w;
}
function Ke(e, t, r = {}) {
	if (W(e), typeof t != "function") throw Error("\"hash\" function param is required");
	let i = t, o = r;
	n(o, {}, {
		adjustScalarBytes: "function",
		randomBytes: "function",
		domain: "function",
		prehash: "function",
		zip215: "boolean",
		mapToCurve: "function",
		toMontgomery: "function",
		toMontgomerySecret: "function"
	});
	let { prehash: s } = o, { BASE: c, Fp: l, Fn: d } = e, f = i.outputLen, p = 2 * l.BYTES;
	if (f !== void 0 && (u(f, "hash.outputLen"), f !== p)) throw Error(`hash.outputLen must be ${p}, got ${f}`);
	let g = o.randomBytes === void 0 ? a : o.randomBytes, v = o.toMontgomery, y = o.toMontgomerySecret, S = o.adjustScalarBytes === void 0 ? (e) => e : o.adjustScalarBytes, C = o.domain === void 0 ? (e, t, n) => {
		if (x(n, "phflag"), t.length || n) throw Error("Contexts/pre-hash are not supported");
		return e;
	} : o.domain;
	function w(e) {
		return d.create(b(e));
	}
	function E(e) {
		let t = P.secretKey;
		h(e, P.secretKey, "secretKey");
		let n = h(i(e), 2 * t, "hashedSecretKey"), r = S(n.slice(0, t));
		return {
			head: r,
			prefix: n.slice(t, 2 * t),
			scalar: w(r)
		};
	}
	function D(e) {
		let { head: t, prefix: n, scalar: r } = E(e), i = c.multiply(r);
		return {
			head: t,
			prefix: n,
			scalar: r,
			point: i,
			pointBytes: i.toBytes()
		};
	}
	function O(e) {
		return D(e).pointBytes;
	}
	function k(e = Uint8Array.of(), ...t) {
		let n = _(...t);
		return w(i(C(n, h(e, void 0, "context"), !!s)));
	}
	function A(e, t, r = {}) {
		n(r, {}, {}, "options"), e = m(h(e, void 0, "message")), s && (e = s(e));
		let { prefix: i, scalar: a, pointBytes: o } = D(t), l = k(r.context, i, e), u = c.multiply(l).toBytes(), f = k(r.context, u, o, e), p = d.create(l + f * a);
		if (!d.isValid(p)) throw Error("sign failed: invalid s");
		let g = _(u, d.toBytes(p));
		return h(g, P.signature, "result");
	}
	let j = { zip215: o.zip215 };
	function M(t, r, i, a = j) {
		n(a);
		let { context: o } = a, l = a.zip215 === void 0 ? !!j.zip215 : a.zip215, u = P.signature;
		t = h(t, u, "signature"), r = h(r, void 0, "message"), i = h(i, P.publicKey, "publicKey"), l !== void 0 && x(l, "zip215"), s && (r = s(r));
		let d = u / 2, f = t.subarray(0, d), p = b(t.subarray(d, u)), m, g, _;
		try {
			m = e.fromBytes(i, l), g = e.fromBytes(f, l), _ = c.multiplyUnsafe(p);
		} catch {
			return !1;
		}
		if (!l && m.isSmallOrder()) return !1;
		let v = k(o, f, i, r);
		return g.add(m.multiplyUnsafe(v)).subtract(_).clearCofactor().is0();
	}
	let N = l.BYTES, P = {
		secretKey: N,
		publicKey: N,
		signature: 2 * N,
		seed: N
	};
	function F(e) {
		return e = e === void 0 ? g(P.seed) : e, h(e, P.seed, "seed");
	}
	function ee(e) {
		return T(e) && e.length === P.secretKey;
	}
	function te(t, n) {
		try {
			return !!e.fromBytes(t, n === void 0 ? j.zip215 : n);
		} catch {
			return !1;
		}
	}
	let I = {
		getExtendedPublicKey: D,
		randomSecretKey: F,
		isValidSecretKey: ee,
		isValidPublicKey: te,
		toMontgomery(t) {
			if (v === void 0) throw Error("Montgomery conversion is not supported for this curve");
			return v(e.fromBytes(t));
		},
		toMontgomerySecret(e) {
			if (y === void 0) throw Error("Montgomery conversion is not supported for this curve");
			return y(e);
		}
	};
	return Object.freeze(P), Object.freeze(I), Object.freeze({
		keygen: Ve(F, O),
		getPublicKey: O,
		sign: A,
		verify: M,
		utils: I,
		Point: e,
		lengths: P
	});
}
// node_modules/@noble/curves/ed25519.js
var J = /* @__PURE__ */ BigInt(1), qe = /* @__PURE__ */ BigInt(2), Je = /* @__PURE__ */ BigInt(5), Ye = /* @__PURE__ */ BigInt(8), Xe = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed"), Ze = {
	p: Xe,
	n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
	h: Ye,
	a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
	d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
	Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
	Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
};
function Qe(e) {
	let t = BigInt(10), n = BigInt(20), r = BigInt(40), i = BigInt(80), a = Xe, o = e * e % a * e % a, s = R(R(o, qe, a) * o % a, J, a) * e % a, c = R(s, Je, a) * s % a, l = R(c, t, a) * c % a, u = R(l, n, a) * l % a, d = R(u, r, a) * u % a;
	return {
		pow_p_5_8: R(R(R(R(d, i, a) * d % a, i, a) * d % a, t, a) * c % a, qe, a) * e % a,
		b2: o
	};
}
function $e(e) {
	return e[0] &= 248, e[31] &= 127, e[31] |= 64, e;
}
var et = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function tt(e, t) {
	let n = Xe, r = L(t * t * t, n), i = Qe(e * L(r * r * t, n)).pow_p_5_8, a = L(e * r * i, n), o = L(t * a * a, n), s = a, c = L(a * et, n), l = o === e, u = o === L(-e, n), d = o === L(-e * et, n);
	return l && (a = s), (u || d) && (a = c), me(a, n) && (a = L(-a, n)), {
		isValid: l || u,
		value: a
	};
}
var nt = /* @__PURE__ */ Ge(Ze, { uvRatio: tt }), rt = nt.Fp;
function it(e) {
	let { y: t } = e;
	return rt.toBytes(rt.div(J + t, J - t));
}
function at(t) {
	let n = nt.Fp.BYTES;
	return e(t, n), $e(r(t.subarray(0, n))).subarray(0, n);
}
function ot(e) {
	return Ke(nt, r, Object.assign({
		adjustScalarBytes: $e,
		toMontgomery: it,
		toMontgomerySecret: at,
		zip215: !0
	}, e));
}
var st = /* @__PURE__ */ ot({}), Y = (...e) => {
	let t = new Uint8Array(e.reduce((e, t) => e + t.length, 0)), n = 0;
	for (let r of e) t.set(r, n), n += r.length;
	return t;
};
function ct(e) {
	if (e < 0n) throw Error("negative integers are never encoded here");
	if (e < 128n) return new Uint8Array([Number(e)]);
	let t = (t, n) => {
		let r = new Uint8Array(1 + n);
		r[0] = t;
		for (let t = 0; t < n; t++) r[n - t] = Number(e >> BigInt(8 * t) & 255n);
		return r;
	};
	return e < 256n ? t(204, 1) : e < 65536n ? t(205, 2) : e < 4294967296n ? t(206, 4) : t(207, 8);
}
var lt = (e) => e === void 0 || e === 0 || e === 0n || e === "" || e instanceof Uint8Array && e.length === 0 || Array.isArray(e) && e.length === 0;
function X(e) {
	if (typeof e == "bigint" || typeof e == "number") return ct(BigInt(e));
	if (typeof e == "string") {
		let t = new TextEncoder().encode(e);
		if (t.length < 32) return Y(new Uint8Array([160 | t.length]), t);
		if (t.length < 256) return Y(new Uint8Array([217, t.length]), t);
		throw Error("string too long");
	}
	if (e instanceof Uint8Array) {
		if (e.length < 256) return Y(new Uint8Array([196, e.length]), e);
		if (e.length < 65536) return Y(new Uint8Array([
			197,
			e.length >> 8,
			e.length & 255
		]), e);
		throw Error("bytes too long");
	}
	if (Array.isArray(e)) {
		if (e.length >= 16) throw Error("array too long");
		return Y(new Uint8Array([144 | e.length]), ...e.map(X));
	}
	let t = Object.keys(e).filter((t) => !lt(e[t])).sort();
	if (t.length >= 16) throw Error("map too large");
	return Y(new Uint8Array([128 | t.length]), ...t.flatMap((t) => [X(t), X(e[t])]));
}
var ut = (e) => E.encode(Y(e, i(e).slice(-4)));
function Z(e) {
	let t = E.decode(e), n = t.slice(0, 32);
	if (t.length !== 36 || !i(n).slice(-4).every((e, n) => e === t[32 + n])) throw Error(`not an Algorand address: ${e}`);
	return n;
}
var dt = (e, t, n) => ({
	snd: Z(e),
	fee: t.fee,
	fv: t.firstValid,
	lv: t.lastValid,
	gen: t.genesisID,
	gh: t.genesisHash,
	note: n
}), ft = (e, t, n, r, i) => ({
	...dt(e, r, i),
	type: "pay",
	rcv: Z(t),
	amt: n
}), pt = (e, t, n, r, i, a) => ({
	...dt(e, i, a),
	type: "axfer",
	arcv: Z(t),
	xaid: BigInt(n),
	aamt: r
}), mt = (e) => X(e), Q = (e) => new TextEncoder().encode(e), ht = (e) => i(Y(Q("TX"), mt(e)));
function gt(e) {
	for (let t of e) delete t.grp;
	let t = i(Y(Q("TG"), X({ txlist: e.map(ht) })));
	for (let n of e) n.grp = t;
}
var _t = (e) => Y(Q("TX"), mt(e)), vt = (e, t) => X({
	sig: t,
	txn: e
}), yt = (e, t) => vt(e, st.sign(_t(e), t)), bt = (e, t, n) => {
	try {
		return st.verify(t, _t(e), Z(n));
	} catch {
		return !1;
	}
}, $ = "https://mainnet-api.4160.nodely.dev", xt = 250000n, St = "fairground:starter";
async function Ct(e, t = $, n = (...e) => fetch(...e)) {
	let r = await n(`${t}/v2/accounts/${e}?exclude=created-assets,created-apps,apps-local-state`);
	if (!r.ok) throw Error(`reading the wallet: the Algorand node said ${r.status}`);
	let i = await r.json(), a = (i.assets ?? []).find((e) => e["asset-id"] === k);
	return {
		address: e,
		algo: BigInt(Number(i.amount ?? 0)),
		minimum: BigInt(Number(i["min-balance"] ?? 1e5)),
		usdc: BigInt(a?.amount ?? 0),
		active: !!a && !a["is-frozen"]
	};
}
// src/wallet.ts
var wt = (...e) => fetch(...e);
async function Tt(e, t) {
	if (!e.ok) throw Error(`${t}: the Algorand node said ${e.status}${await e.text().then((e) => e ? ` (${e.slice(0, 200)})` : "", () => "")}`);
	return e.json();
}
async function Et(e = $, t = wt) {
	let n = await Tt(await t(`${e}/v2/transactions/params`), "reading network parameters"), r = BigInt(Number(n["min-fee"] ?? 1e3)), i = BigInt(Number(n["last-round"]));
	return {
		fee: r,
		minFee: r,
		firstValid: i,
		lastValid: i + 1000n,
		genesisID: String(n["genesis-id"]),
		genesisHash: o.decode(String(n["genesis-hash"]))
	};
}
async function Dt(e, t = $, n = wt) {
	let r = new Uint8Array(e.reduce((e, t) => e + t.length, 0)), i = 0;
	for (let t of e) r.set(t, i), i += t.length;
	let a = await Tt(await n(`${t}/v2/transactions`, {
		method: "POST",
		headers: { "Content-Type": "application/x-binary" },
		body: r
	}), "sending the payment");
	return String(a.txId);
}
async function Ot(e, t = $, n = wt, r = 20, i = 1e3) {
	for (let a = 0; a < r; a++) {
		let r = await Tt(await n(`${t}/v2/transactions/pending/${e}`), "checking the payment");
		if (Number(r["confirmed-round"]) > 0) return Number(r["confirmed-round"]);
		if (r["pool-error"]) throw Error(`The network rejected the payment: ${String(r["pool-error"])}`);
		await new Promise((e) => setTimeout(e, i));
	}
	throw Error("The payment wasn’t confirmed in time; check the wallet before trying again.");
}
var kt = (e) => `${St}:${e}`;
function At(e, t, n, r) {
	let i = ft(e, t, xt, {
		...r,
		fee: r.minFee * 2n
	}, new TextEncoder().encode(kt(n))), a = pt(t, t, k, 0n, {
		...r,
		fee: 0n
	});
	return gt([i, a]), [i, a];
}
function jt(e) {
	let n = t(e.key);
	if (n.length !== 32) throw Error("the starter key must be a 32-byte seed");
	let r = ut(st.getPublicKey(n)), i = e.algod ?? "https://mainnet-api.4160.nodely.dev", a = e.indexer ?? "https://mainnet-idx.4160.nodely.dev", s = e.fetch ?? ((...e) => fetch(...e)), c = e.dailyCap ?? 100;
	async function l(e, t) {
		let n = new URLSearchParams({
			"tx-type": "pay",
			"address-role": "sender",
			"note-prefix": o.encode(new TextEncoder().encode(e)),
			"after-time": (/* @__PURE__ */ new Date(t * 1e3)).toISOString(),
			limit: String(c + 1)
		}), i = await s(`${a}/v2/accounts/${r}/transactions?${n}`);
		if (!i.ok) throw Error(`indexer returned ${i.status}`);
		return ((await i.json()).transactions ?? []).length;
	}
	return {
		sponsor: r,
		async start(e, t) {
			let a, u, d;
			try {
				Z(t.address), a = BigInt(t.firstValid), u = BigInt(t.lastValid), d = o.decode(t.sig);
			} catch {
				return {
					status: 400,
					error: "malformed request"
				};
			}
			if (u <= a || u - a > 1000n || d.length !== 64) return {
				status: 400,
				error: "malformed request"
			};
			let f = await Et(i, s), [p, m] = At(r, t.address, e, {
				...f,
				firstValid: a,
				lastValid: u
			});
			if (!bt(m, d, t.address)) return {
				status: 400,
				error: "that isn’t the starter opt-in for this wallet"
			};
			let h = await Ct(t.address, i, s);
			if (h.active) return {
				status: 409,
				error: "this wallet is already started"
			};
			if (h.algo >= 200000n) return {
				status: 409,
				error: "this wallet already has enough ALGO to start itself"
			};
			if (await l(kt(e), 0) > 0) return {
				status: 409,
				error: "this account’s wallet was already started once"
			};
			if (await l("fairground:starter", Math.floor(Date.now() / 1e3) - 86400) >= c) return {
				status: 429,
				error: "too many new wallets today; try again tomorrow"
			};
			let g = await Dt([yt(p, n), vt(m, d)], i, s);
			return await Ot(g, i, s), { txid: g };
		}
	};
}
export { jt as createStarter };
