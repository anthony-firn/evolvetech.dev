import { a as e, c as t } from "./pq-DdqIFRtl.js";
// src/rails/algorand.ts
var n = (e) => t(e).slice(-4);
function r(t) {
	if (!/^[A-Z2-7]{58}$/.test(t)) return !1;
	try {
		let r = e.decode(t), i = n(r.slice(0, 32));
		return r.length === 36 && i.every((e, t) => e === r[32 + t]);
	} catch {
		return !1;
	}
}
var i = 1000000n, a = (e) => /^\d{4}-(0[1-9]|1[0-2])$/.test(e);
function o(e) {
	let t = /^(\d+)(?:\.(\d{1,6}))?$/.exec(e.trim());
	if (!t) throw Error(`not a dollar amount: ${e}`);
	return BigInt(t[1]) * i + BigInt((t[2] ?? "").padEnd(6, "0"));
}
export { o as n, r, a as t };
