import { _ as e, d as t, f as n, m as r, o as i, p as a, s as o, u as s, v as c, y as l } from "./pq-DdqIFRtl.js";
import { n as u, r as d } from "./pricing-dKU1SBIV.js";
// node_modules/nostr-tools/node_modules/@scure/base/index.js
function f(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function p(e, t) {
	return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((e) => typeof e == "string") : t.every((e) => Number.isSafeInteger(e)) : !1;
}
function m(e) {
	if (typeof e != "function") throw Error("function expected");
	return !0;
}
function h(e, t) {
	if (typeof t != "string") throw Error(`${e}: string expected`);
	return !0;
}
function g(e) {
	if (!Number.isSafeInteger(e)) throw Error(`invalid integer: ${e}`);
}
function _(e) {
	if (!Array.isArray(e)) throw Error("array expected");
}
function v(e, t) {
	if (!p(!0, t)) throw Error(`${e}: array of strings expected`);
}
function y(e, t) {
	if (!p(!1, t)) throw Error(`${e}: array of numbers expected`);
}
function b(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
function x(e) {
	let t = typeof e == "string" ? e.split("") : e, n = t.length;
	v("alphabet", t);
	let r = new Map(t.map((e, t) => [e, t]));
	return {
		encode: (r) => (_(r), r.map((r) => {
			if (!Number.isSafeInteger(r) || r < 0 || r >= n) throw Error(`alphabet.encode: digit index outside alphabet "${r}". Allowed: ${e}`);
			return t[r];
		})),
		decode: (t) => (_(t), t.map((t) => {
			h("alphabet.decode", t);
			let n = r.get(t);
			if (n === void 0) throw Error(`Unknown letter: "${t}". Allowed: ${e}`);
			return n;
		}))
	};
}
function S(e = "") {
	return h("join", e), {
		encode: (t) => (v("join.decode", t), t.join(e)),
		decode: (t) => (h("join.decode", t), t.split(e))
	};
}
function C(e, t = "=") {
	return g(e), h("padding", t), {
		encode(n) {
			for (v("padding.encode", n); n.length * e % 8;) n.push(t);
			return n;
		},
		decode(n) {
			v("padding.decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid, string should have whole number of bytes");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: invalid, string has too much padding");
			return n.slice(0, r);
		}
	};
}
function w(e) {
	return m(e), {
		encode: (e) => e,
		decode: (t) => e(t)
	};
}
var T = (e, t) => t === 0 ? e : T(t, e % t), E = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - T(e, t)), D = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})();
function O(e, t, n, r) {
	if (_(e), t <= 0 || t > 32) throw Error(`convertRadix2: wrong from=${t}`);
	if (n <= 0 || n > 32) throw Error(`convertRadix2: wrong to=${n}`);
	if (/* @__PURE__ */ E(t, n) > 32) throw Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ E(t, n)}`);
	let i = 0, a = 0, o = D[t], s = D[n] - 1, c = [];
	for (let r of e) {
		if (g(r), r >= o) throw Error(`convertRadix2: invalid data word=${r} from=${t}`);
		if (i = i << t | r, a + t > 32) throw Error(`convertRadix2: carry overflow pos=${a} from=${t}`);
		for (a += t; a >= n; a -= n) c.push((i >> a - n & s) >>> 0);
		let e = D[a];
		if (e === void 0) throw Error("invalid carry");
		i &= e - 1;
	}
	if (i = i << n - a & s, !r && a >= t) throw Error("Excess padding");
	if (!r && i > 0) throw Error(`Non-zero padding: ${i}`);
	return r && a > 0 && c.push(i >>> 0), c;
}
function k(e, t = !1) {
	if (g(e), e <= 0 || e > 32) throw Error("radix2: bits should be in (0..32]");
	if (/* @__PURE__ */ E(8, e) > 32 || /* @__PURE__ */ E(e, 8) > 32) throw Error("radix2: carry overflow");
	return {
		encode: (n) => {
			if (!f(n)) throw Error("radix2.encode input should be Uint8Array");
			return O(Array.from(n), 8, e, !t);
		},
		decode: (n) => (y("radix2.decode", n), Uint8Array.from(O(n, e, 8, t)))
	};
}
function A(e) {
	return m(e), function(...t) {
		try {
			return e.apply(null, t);
		} catch {}
	};
}
b(k(4), x("0123456789ABCDEF"), S("")), b(k(5), x("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), C(5), S("")), b(k(5), x("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), S("")), b(k(5), x("0123456789ABCDEFGHIJKLMNOPQRSTUV"), C(5), S("")), b(k(5), x("0123456789ABCDEFGHIJKLMNOPQRSTUV"), S("")), b(k(5), x("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), S(""), w((e) => e.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1")));
var ee = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function";
ee || b(k(6), x("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), C(6), S("")), b(k(6), x("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), S("")), ee || b(k(6), x("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), C(6), S("")), b(k(6), x("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), S(""));
var j = b(x("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), S("")), te = [
	996825010,
	642813549,
	513874426,
	1027748829,
	705979059
];
function M(e) {
	let t = e >> 25, n = (e & 33554431) << 5;
	for (let e = 0; e < te.length; e++) (t >> e & 1) == 1 && (n ^= te[e]);
	return n;
}
function N(e, t, n = 1) {
	let r = e.length, i = 1;
	for (let t = 0; t < r; t++) {
		let n = e.charCodeAt(t);
		if (n < 33 || n > 126) throw Error(`Invalid prefix (${e})`);
		i = M(i) ^ n >> 5;
	}
	i = M(i);
	for (let t = 0; t < r; t++) i = M(i) ^ e.charCodeAt(t) & 31;
	for (let e of t) i = M(i) ^ e;
	for (let e = 0; e < 6; e++) i = M(i);
	return i ^= n, j.encode(O([i % D[30]], 30, 5, !1));
}
function ne(e) {
	let t = e === "bech32" ? 1 : 734539939, n = k(5), r = n.decode, i = n.encode, a = A(r);
	function o(e, n, r = 90) {
		h("bech32.encode prefix", e), f(n) && (n = Array.from(n)), y("bech32.encode", n);
		let i = e.length;
		if (i === 0) throw TypeError(`Invalid prefix length ${i}`);
		let a = i + 7 + n.length;
		if (r !== !1 && a > r) throw TypeError(`Length ${a} exceeds limit ${r}`);
		let o = e.toLowerCase(), s = N(o, n, t);
		return `${o}1${j.encode(n)}${s}`;
	}
	function s(e, n = 90) {
		h("bech32.decode input", e);
		let r = e.length;
		if (r < 8 || n !== !1 && r > n) throw TypeError(`invalid string length: ${r} (${e}). Expected (8..${n})`);
		let i = e.toLowerCase();
		if (e !== i && e !== e.toUpperCase()) throw Error("String must be lowercase or uppercase");
		let a = i.lastIndexOf("1");
		if (a === 0 || a === -1) throw Error("Letter \"1\" must be present between prefix and data only");
		let o = i.slice(0, a), s = i.slice(a + 1);
		if (s.length < 6) throw Error("Data must be at least 6 characters long");
		let c = j.decode(s).slice(0, -6), l = N(o, c, t);
		if (!s.endsWith(l)) throw Error(`Invalid checksum in ${e}: expected "${l}"`);
		return {
			prefix: o,
			words: c
		};
	}
	let c = A(s);
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
var P = ne("bech32");
ne("bech32m"), typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function" || b(k(4), x("0123456789abcdef"), S(""), w((e) => {
	if (typeof e != "string" || e.length % 2 != 0) throw TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
	return e.toLowerCase();
}));
// node_modules/nostr-tools/lib/esm/nip19.js
var F = new TextDecoder("utf-8");
new TextEncoder();
var I = 5e3;
function re(e) {
	let { prefix: t, words: n } = P.decode(e, I), r = new Uint8Array(P.fromWords(n));
	switch (t) {
		case "nprofile": {
			let e = L(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nprofile");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			return {
				type: "nprofile",
				data: {
					pubkey: c(e[0][0]),
					relays: e[1] ? e[1].map((e) => F.decode(e)) : []
				}
			};
		}
		case "nevent": {
			let e = L(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nevent");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			if (e[2] && e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (e[3] && e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "nevent",
				data: {
					id: c(e[0][0]),
					relays: e[1] ? e[1].map((e) => F.decode(e)) : [],
					author: e[2]?.[0] ? c(e[2][0]) : void 0,
					kind: e[3]?.[0] ? parseInt(c(e[3][0]), 16) : void 0
				}
			};
		}
		case "naddr": {
			let e = L(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for naddr");
			if (!e[2]?.[0]) throw Error("missing TLV 2 for naddr");
			if (e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (!e[3]?.[0]) throw Error("missing TLV 3 for naddr");
			if (e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "naddr",
				data: {
					identifier: F.decode(e[0][0]),
					pubkey: c(e[2][0]),
					kind: parseInt(c(e[3][0]), 16),
					relays: e[1] ? e[1].map((e) => F.decode(e)) : []
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
			data: c(r)
		};
		default: throw Error(`unknown prefix ${t}`);
	}
}
function L(e) {
	let t = {}, n = e;
	for (; n.length > 0;) {
		if (n.length < 2) throw Error("not enough data to read TLV");
		let e = n[0], r = n[1], i = n.slice(2, 2 + r);
		if (n = n.slice(2 + r), i.length < r) throw Error(`not enough data to read on TLV ${e}`);
		t[e] = t[e] || [], t[e].push(i);
	}
	return t;
}
function R(e) {
	return ae("npub", l(e));
}
function ie(e, t) {
	let n = P.toWords(t);
	return P.encode(e, n, I);
}
function ae(e, t) {
	return ie(e, t);
}
// src/mp3.ts
var oe = (e, t) => e.version === t.version && e.sampleRate === t.sampleRate && e.channels === t.channels, z = (e, t) => `${r.show}:${e}:${t}`;
function se(e) {
	let i = n(e, "d"), a = n(e, "title"), o = n(e, "image"), [, s, c] = t(e, "category") ?? [], l = n(e, "guid");
	if (e.kind !== r.show || !i || !a || !o || !s || !l) return;
	let [, u, d] = t(e, "owner") ?? [], f = n(e, "type");
	return {
		event: e,
		creator: e.pubkey,
		address: z(e.pubkey, i),
		slug: i,
		title: a,
		description: e.content,
		image: o,
		author: n(e, "author") ?? a,
		category: s,
		subcategory: c || void 0,
		explicit: n(e, "explicit") === "true",
		language: n(e, "language") ?? "en",
		type: f === "serial" ? "serial" : "episodic",
		ownerName: u || void 0,
		ownerEmail: d || void 0,
		link: n(e, "r"),
		copyright: n(e, "copyright"),
		guid: l
	};
}
function ce(e) {
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
function le(e) {
	return e.tags.filter((e) => e[0] === "break").map((e) => ({
		at: Number(e[1]),
		byteOffset: e[2] === void 0 ? void 0 : Number(e[2])
	})).filter((e) => Number.isFinite(e.at) && e.at > 0 && (e.byteOffset === void 0 || Number.isSafeInteger(e.byteOffset))).sort((e, t) => e.at - t.at);
}
var B = (e) => e && /^\d+(\.\d+)?$/.test(e) && Number(e) > 0 ? Number(e) : void 0;
function ue(e) {
	let i = n(e, "a"), a = n(e, "guid"), o = n(e, "title"), [, s, c = "audio/mpeg"] = t(e, "audio") ?? [];
	if (e.kind !== 54 || !i?.startsWith(`${r.show}:${e.pubkey}:`) || !a || !o || !s?.startsWith("https://")) return;
	let [, l, u] = t(e, "transcript") ?? [], d = n(e, "episode_type");
	return {
		event: e,
		creator: e.pubkey,
		published: e.created_at,
		show: i,
		guid: a,
		title: o,
		description: e.content || n(e, "description") || "",
		audio: {
			url: s,
			type: c,
			size: B(n(e, "size")),
			duration: B(n(e, "duration"))
		},
		image: n(e, "image"),
		episode: B(n(e, "episode")),
		season: B(n(e, "season")),
		episodeType: d === "trailer" || d === "bonus" ? d : "full",
		explicit: n(e, "explicit") === "true",
		hls: n(e, "hls"),
		transcript: l ? {
			url: l,
			type: u ?? "text/plain"
		} : void 0,
		breaks: le(e),
		mp3: ce(t(e, "mp3"))
	};
}
function de(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = ue(r);
		if (!e || e.show !== t) continue;
		let i = n.get(e.guid);
		(!i || r.created_at > i.event.created_at) && n.set(e.guid, e);
	}
	return [...n.values()].sort((e, t) => t.published - e.published);
}
var V = (e) => e.replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
})[e]), H = (e, t) => t === void 0 || t === "" ? "" : `<${e}>${V(String(t))}</${e}>`, fe = (e) => e.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "");
function pe(e, t, n) {
	let r = (e) => (/* @__PURE__ */ new Date(e * 1e3)).toUTCString(), i = e.subcategory ? `<itunes:category text="${V(e.category)}"><itunes:category text="${V(e.subcategory)}"/></itunes:category>` : `<itunes:category text="${V(e.category)}"/>`, a = e.ownerEmail ? `<itunes:owner>${H("itunes:name", e.ownerName ?? e.author)}${H("itunes:email", e.ownerEmail)}</itunes:owner>` : "", o = t.map((t) => [
		"<item>",
		H("title", t.title),
		H("description", t.description),
		H("link", n.pageUrl(t)),
		`<guid isPermaLink="false">${V(t.guid)}</guid>`,
		H("pubDate", r(t.published)),
		`<enclosure url="${V(n.enclosureUrl(t))}" length="${t.audio.size ?? 0}" type="${V(t.audio.type)}"/>`,
		H("itunes:duration", t.audio.duration ? Math.round(t.audio.duration) : void 0),
		H("itunes:episode", t.episode),
		H("itunes:season", t.season),
		H("itunes:episodeType", t.episodeType ?? "full"),
		H("itunes:explicit", t.explicit || e.explicit ? "true" : "false"),
		t.image ? `<itunes:image href="${V(t.image)}"/>` : "",
		t.transcript ? `<podcast:transcript url="${V(t.transcript.url)}" type="${V(t.transcript.type)}"/>` : "",
		t.hls ? `<podcast:alternateEnclosure type="application/x-mpegURL"><podcast:source uri="${V(t.hls)}"/></podcast:alternateEnclosure>` : "",
		"</item>"
	].join(""));
	return fe([
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<rss version=\"2.0\" xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" xmlns:podcast=\"https://podcastindex.org/namespace/1.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
		"<channel>",
		`<atom:link href="${V(n.feedUrl)}" rel="self" type="application/rss+xml"/>`,
		H("title", e.title),
		H("link", e.link ?? n.pageUrl()),
		H("language", e.language),
		H("description", e.description),
		H("itunes:author", e.author),
		`<itunes:image href="${V(e.image)}"/>`,
		`<image>${H("url", e.image)}${H("title", e.title)}${H("link", e.link ?? n.pageUrl())}</image>`,
		i,
		H("itunes:explicit", e.explicit ? "true" : "false"),
		H("itunes:type", e.type ?? "episodic"),
		a,
		H("copyright", e.copyright),
		H("podcast:guid", e.guid),
		e.ownerEmail ? `<podcast:locked owner="${V(e.ownerEmail)}">yes</podcast:locked>` : "",
		H("generator", "Fairground"),
		H("lastBuildDate", r(n.generatedAt ?? s())),
		...o,
		"</channel>",
		"</rss>"
	].join("\n"));
}
var me = (e) => a(o(new TextEncoder().encode(e)));
function he(t, n, r, a = "", o = Math.floor(Date.now() / 1e3)) {
	if (!t?.startsWith("Nostr ")) return { error: "missing Nostr authorization" };
	let s;
	try {
		s = JSON.parse(new TextDecoder().decode(i.decode(t.slice(6).trim())));
	} catch {
		return { error: "malformed authorization" };
	}
	let c = (e) => s.tags?.find((t) => t[0] === e)?.[1];
	return s.kind !== 27235 || !e(s) ? { error: "authorization is not a valid signed request" } : Math.abs(o - s.created_at) > 60 ? { error: "authorization has expired" } : c("u") !== n || c("method") !== r.toUpperCase() ? { error: "authorization is for another request" } : a && c("payload") !== me(a) ? { error: "authorization doesn’t match the request body" } : { pubkey: s.pubkey };
}
// src/network.ts
var ge = 2604, _e = (e) => e.kind === r.pqBinding && n(e, "alg") === "ml-dsa-65" && n(e, "key")?.length === ge;
function U(e) {
	return new Set(e.filter(_e).map((e) => e.pubkey));
}
// src/ramp.ts
var W = {
	sandbox: "https://api-sb.meld.io",
	production: "https://api.meld.io"
}, G = /^[A-Za-z0-9_-]{6,128}$/, K = (e) => `fairground-${e}-`, q = (e) => e && typeof e == "object" && !Array.isArray(e) ? e : {}, J = (e) => typeof e == "string" ? e : "";
function ve(e) {
	if (!W[e.environment]) throw Error("invalid Meld environment");
	for (let t of [
		e.buyProvider,
		e.sellProvider,
		e.algoCurrencyCode,
		e.usdcCurrencyCode,
		e.sellPaymentMethod
	]) if (!/^[A-Z0-9_:-]+$/.test(t)) throw Error("configure the approved Meld suppliers, payment method and Algorand currency IDs");
	if (e.algoCurrencyCode === e.usdcCurrencyCode) throw Error("ALGO and Algorand USDC need distinct Meld currency IDs");
	let t = e.fetch ?? ((...e) => fetch(...e)), n = e.checkoutOrigins ?? ["https://meldcrypto.com"], r = /* @__PURE__ */ new Map();
	async function i(n, r) {
		let i = await t(W[e.environment] + n, {
			method: r === void 0 ? "GET" : "POST",
			headers: {
				Authorization: `BASIC ${e.apiKey}`,
				"Meld-Version": "2026-02-03",
				Accept: "application/json",
				...r === void 0 ? {} : { "Content-Type": "application/json" }
			},
			...r === void 0 ? {} : { body: JSON.stringify(r) },
			redirect: "error",
			signal: AbortSignal.timeout(2e4)
		});
		if (!i.ok) {
			let e = q(await i.json().catch(() => ({}))), t = /^[A-Z0-9_]{1,100}$/.test(J(e.code)) ? `: ${e.code}` : "", n = /^[A-Za-z0-9_-]{1,100}$/.test(J(e.requestId)) ? ` (reference ${e.requestId})` : "";
			throw Error(`Meld could not complete this request (${i.status}${t})${n}`);
		}
		return q(await i.json());
	}
	async function a(e, t, n) {
		let a = e.side === "BUY" ? "CRYPTO_ONRAMP" : "CRYPTO_OFFRAMP", o = new URLSearchParams({
			category: a,
			country: e.countryCode,
			type: "CRYPTO",
			partner: n
		}), s = `${o}:${t}`;
		if ((r.get(s) ?? 0) > Date.now()) return;
		let c = await i(`/network-partner/supported/currencies?${o}`), l = (Array.isArray(c.currencies) ? c.currencies : []).map(q).filter((e) => e.currencyCode === t);
		if (!l.length || l.some((t) => !["ALGO", "ALGORAND"].includes(J(t.chainCode).toUpperCase()) || (e.asset === "USDC" ? String(t.contract) !== "31566704" : !!t.contract))) throw Error("Meld currency metadata does not uniquely identify the requested native Algorand asset");
		r.set(s, Date.now() + 3e5);
	}
	return {
		async session(t) {
			if (!d(t.walletAddress) || !Number.isFinite(t.amount) || t.amount <= 0 || t.amount > 1e6 || !/^[A-Z]{2}$/.test(t.countryCode)) throw Error("invalid checkout request");
			try {
				if (u(String(t.amount)) <= 0n) throw Error();
			} catch {
				throw Error("invalid checkout amount");
			}
			let r = t.side === "BUY";
			if (!r && t.asset !== "USDC") throw Error("cash out USDC on Algorand only");
			let o = t.asset === "ALGO" ? e.algoCurrencyCode : e.usdcCurrencyCode, s = r ? e.buyProvider : e.sellProvider;
			await a(t, o, s);
			let c = r ? "CREDIT_DEBIT_CARD" : e.sellPaymentMethod, l = {
				sourceCurrencyCode: r ? "USD" : o,
				destinationCurrencyCode: r ? o : "USD"
			}, f = await i("/payments/crypto/quote", {
				...l,
				countryCode: t.countryCode,
				...t.subdivision ? { subdivision: t.subdivision } : {},
				sourceAmount: t.amount,
				paymentMethodType: c,
				walletAddress: t.walletAddress,
				externalCustomerId: t.customer,
				serviceProviders: [s]
			});
			if (!(Array.isArray(f.quotes) ? f.quotes : []).map(q).find((e) => e.serviceProvider === s && e.transactionType === (r ? "CRYPTO_PURCHASE" : "CRYPTO_SELL") && e.sourceCurrencyCode === l.sourceCurrencyCode && e.destinationCurrencyCode === l.destinationCurrencyCode && e.paymentMethodType === c && Number(e.destinationAmount) > 0)) throw Error("No eligible Meld quote for this amount, location and Algorand asset. Try a different amount or contact support.");
			let p = K(t.customer) + crypto.randomUUID(), m = await i("/crypto/session/widget", {
				sessionType: t.side,
				externalCustomerId: t.customer,
				externalSessionId: p,
				sessionData: {
					...l,
					countryCode: t.countryCode,
					sourceAmount: String(t.amount),
					paymentMethodType: c,
					serviceProvider: s,
					walletAddress: t.walletAddress,
					clientIpAddress: t.userIp,
					redirectUrl: t.redirectURL,
					lockFields: [
						"walletAddress",
						"sourceCurrencyCode",
						"destinationCurrencyCode",
						"sourceAmount",
						"paymentMethodType"
					],
					...r ? {} : { redirectFlow: !0 }
				}
			}), h = new URL(J(m.widgetUrl));
			if (h.protocol !== "https:" || h.username || h.password || !n.includes(h.origin)) throw Error("Meld returned an unexpected checkout origin");
			if (!G.test(J(m.id)) || m.externalSessionId !== p || m.externalCustomerId !== t.customer) throw Error("Meld returned a different checkout session");
			return {
				id: J(m.id),
				externalSessionId: p,
				url: h.href,
				environment: e.environment
			};
		},
		async order(t) {
			if (!G.test(t)) throw Error("not a Meld session id");
			let n = q((await i(`/payments/transactions/sessions/${encodeURIComponent(t)}`)).transaction), r = q(n.cryptoDetails);
			if (!J(n.id) || n.sessionId !== t) throw Error("Meld returned a different transaction session");
			let a = n.transactionType === "CRYPTO_SELL" ? "SELL" : n.transactionType === "CRYPTO_PURCHASE" ? "BUY" : "UNKNOWN", o = a === "SELL" ? n.sourceCurrencyCode : n.destinationCurrencyCode;
			return {
				id: J(n.id),
				sessionId: t,
				externalSessionId: J(n.externalSessionId),
				status: J(n.status),
				side: a,
				cryptoCurrency: o === e.usdcCurrencyCode ? "USDC" : o === e.algoCurrencyCode ? "ALGO" : J(o),
				network: o === e.usdcCurrencyCode || o === e.algoCurrencyCode ? "algorand" : "",
				cryptoAmount: String((a === "SELL" ? n.sourceAmount : n.destinationAmount) ?? ""),
				fiatAmount: Number(a === "SELL" ? n.destinationAmount : n.sourceAmount),
				fiatCurrency: J(a === "SELL" ? n.destinationCurrencyCode : n.sourceCurrencyCode),
				walletAddress: J(r.destinationWalletAddress),
				sourceWalletAddress: J(r.sourceWalletAddress),
				customer: J(n.externalCustomerId),
				provider: J(n.serviceProvider),
				environment: e.environment
			};
		},
		sellProvider: e.sellProvider
	};
}
function ye(e, t) {
	if (e.side !== "SELL") return "that isn’t a cash-out order";
	if (e.customer !== t || !e.externalSessionId.startsWith(K(t))) return "that order belongs to someone else or has no verified owner";
	if (e.cryptoCurrency !== "USDC" || e.network !== "algorand" || e.fiatCurrency !== "USD") return "that order isn’t for USDC on Algorand to USD";
	if (e.status !== "PENDING") return `that order isn’t waiting for payment (${e.status.toLowerCase().replace(/_/g, " ")})`;
	if (!d(e.walletAddress) || !d(e.sourceWalletAddress) || e.walletAddress === e.sourceWalletAddress) return "that order has no valid provider deposit address";
	try {
		if (u(e.cryptoAmount) <= 0n) return "that order has no valid crypto amount";
	} catch {
		return "that order has no valid crypto amount";
	}
	if (!Number.isFinite(e.fiatAmount) || e.fiatAmount <= 0) return "that order has no fiat payout";
}
// src/safety.ts
var Y = (e) => [
	e.content,
	...e.tags.filter((e) => [
		"title",
		"summary",
		"description",
		"alt"
	].includes(e[0])).map((e) => e[1] ?? ""),
	...e.tags.filter((e) => e[0] === "imeta").flatMap((e) => e.filter((e) => e.startsWith("alt ")).map((e) => e.slice(4)))
].join(" ").trim(), X = (e) => `${Y(e)} ${e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`).join(" ")}`.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, ""), Z = /\b(teen(s|age|ager|agers)?|young(er)?|underage|minors?|child(ren)?|kids?|kiddies|pre-?teens?|infants?|babies|toddlers?|lolita|schoolgirls?|schoolboys?|schoolthot|pyt|(1[0-7]|[1-9]) ?(yo|y\/o|years? old))\b/, be = /\b(sex|sexy|nudes?|naked|porn\w*|xxx|nsfw|horny|blowjobs?|cum|dicks?|cocks?|pussy|tits?|boobs?|nipples?|lewd|rape\w*|cnc\w*|fetish\w*|onlyfans|explicit|erotic\w*|incest|bestiality|snapleak|nolimit|taboo|momson)\b/, xe = /\b(pthc|child ?porn\w*|csam|jailbait|loli|shota)\b/, Se = /(t\.me\/|telegram|dm me|\bcontents?\b|\bleaks?\b)/, Ce = /\b(porn\w*|xxx|nsfw|nudes?|naked|horny|blowjobs?|onlyfans|lewd|erotic\w*|cum|dicks?|cocks?|pussy|tits|boobs|nipples?|fetish\w*)\b/, we = /\b(bestiality|zoophil\w*)\b/, Te = /\b(revenge ?porn|hidden ?cams?|spy ?cams?|upskirts?|creepshots?|leaked ?nudes|deepfake ?(porn|nudes?))\b/, Ee = /\b(fag(got)?s?|homos|n[i1y]gg(a|as|er|ers|ah)|kikes?|retards?|trann(y|ies)|chinks?|spics?|wetbacks?|kys)\b|you('| ha)ve been warned|i('| wi)ll kill you|kill yourself/;
function De(e) {
	let t = X(e);
	return !!(xe.test(t) || Z.test(t) && be.test(t) || /\b(cp|pedo\w*)\b/.test(t) && (be.test(t) || Z.test(t) || Se.test(t)));
}
function Oe(e) {
	if (De(e)) return !0;
	let t = X(e);
	return we.test(t) || Te.test(t);
}
var ke = (e) => new Set([...e.content.matchAll(/#[\p{L}\p{N}_]+/gu)].map((e) => e[0].toLowerCase()).concat(e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`))).size;
function Ae(e) {
	let t = e.trim();
	if (!/^[{[]/.test(t)) return !1;
	try {
		return JSON.parse(t), !0;
	} catch {
		return !1;
	}
}
function Q(e, t) {
	if (Oe(e)) return { block: !0 };
	let n = X(e);
	return e.tags.some((e) => e[0] === "content-warning") || Ce.test(n) ? {
		block: !1,
		hide: "sexual"
	} : Ee.test(n) ? {
		block: !1,
		hide: "hate"
	} : ke(e) > 10 ? {
		block: !1,
		hide: "spam"
	} : Ae(e.content) || Y(e).length < 2 ? {
		block: !1,
		hide: "junk"
	} : t?.bot ? {
		block: !1,
		hide: "bot"
	} : { block: !1 };
}
// src/gateway.ts
var je = () => import("./ads-CZzZT2tk.js"), Me = () => import("./pq-DdqIFRtl.js").then((e) => e.t);
async function $(t, n, r = WebSocket, i = 4e3) {
	let a = /* @__PURE__ */ new Map();
	return await Promise.all(t.map((t) => new Promise((o) => {
		let s, c = Math.random().toString(36).slice(2, 10), l = () => {
			clearTimeout(u);
			try {
				s.close();
			} catch {}
			o();
		}, u = setTimeout(l, i);
		try {
			s = new r(t);
		} catch {
			clearTimeout(u), o();
			return;
		}
		s.onopen = () => s.send(JSON.stringify([
			"REQ",
			c,
			n
		])), s.onerror = l, s.onclose = l, s.onmessage = (t) => {
			let n;
			try {
				n = JSON.parse(String(t.data));
			} catch {
				return;
			}
			Array.isArray(n) && n[1] === c && (n[0] === "EOSE" || n[0] === "CLOSED" ? l() : n[0] === "EVENT" && !a.has(n[2]?.id) && e(n[2]) && a.set(n[2].id, n[2]));
		};
	}))), [...a.values()];
}
function Ne(e, t) {
	let n = e.mp3;
	if (!n) return;
	let r = e.audio.url, i = (e) => e.ads.map((e) => e.spot.mp3 && oe(e.spot.mp3, n) ? {
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
function Pe(e, t) {
	let n = /^bytes=(\d*)-(\d*)$/.exec((e ?? "").split(",")[0].trim());
	if (!n || !n[1] && !n[2]) return;
	let r, i;
	return n[1] ? (r = Number(n[1]), i = n[2] ? Math.min(Number(n[2]), t - 1) : t - 1) : (r = Math.max(0, t - Number(n[2])), i = t - 1), r > i || r >= t ? "unsatisfiable" : [r, i];
}
function Fe(e, t, n, r) {
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
async function Ie(e) {
	let t = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(e)));
	return `"${[...new Uint8Array(t)].slice(0, 12).map((e) => e.toString(16).padStart(2, "0")).join("")}"`;
}
var Le = (e) => /mpeg|mp3/.test(e) ? "mp3" : /mp4|m4a|aac/.test(e) ? "m4a" : "audio";
function Re(e) {
	let t = e.base.replace(/\/+$/, ""), n = e.fetch ?? ((...e) => fetch(...e)), i = e.WebSocket ?? WebSocket, a = e.now ?? (() => Math.floor(Date.now() / 1e3)), o = (e.cacheSeconds ?? 120) * 1e3, s = /* @__PURE__ */ new Map(), c = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag"
	}, l = (t) => $(e.relays, t, i);
	async function u(e, t) {
		let n = z(e, t), [i, a, o, s] = await Promise.all([
			l({
				kinds: [r.show],
				authors: [e],
				"#d": [t]
			}),
			l({
				kinds: [54],
				authors: [e],
				"#a": [n],
				limit: 1e3
			}),
			l({
				kinds: [r.placement],
				authors: [e],
				limit: 500
			}),
			l({
				kinds: [r.pqBinding],
				authors: [e]
			})
		]);
		if (!U(s).has(e)) return;
		let c = i.map(se).filter((e) => !!e).sort((e, t) => t.event.created_at - e.event.created_at)[0];
		if (!c || Q(c.event).block) return;
		let u = de(a.filter((e) => !Q(e).block), n);
		!c.explicit && [c.event, ...u.map((e) => e.event)].some((e) => {
			let t = Q(e);
			return !t.block && t.hide === "sexual";
		}) && (c.explicit = !0);
		let d = o.length ? o.map((await je()).parsePlacement).filter((e) => !!e) : [], [f, p, m] = d.length ? await Promise.all([
			l({ ids: [...new Set(d.map((e) => e.acceptanceId))] }),
			l({
				kinds: [r.approval],
				"#e": d.map((e) => e.event.id)
			}),
			l({
				kinds: [r.pqBinding],
				authors: [...new Set(d.map((e) => e.advertiser))]
			})
		]) : [
			[],
			[],
			[]
		];
		return {
			show: c,
			episodes: u,
			placements: d,
			acceptances: f,
			approvals: p,
			bindings: m
		};
	}
	function d(e, t) {
		let n = `${e}:${t}`, r = s.get(n);
		if (r && Date.now() - r.at < o) return r.data;
		let i = u(e, t).catch(() => void 0);
		return s.set(n, {
			at: Date.now(),
			data: i
		}), s.size > 500 && s.delete(s.keys().next().value), i;
	}
	let f = (e) => new Response(`${e} not found\n`, {
		status: 404,
		headers: {
			...c,
			"Content-Type": "text/plain"
		}
	}), p = e.ramp && ve({
		fetch: n,
		...e.ramp
	}), m = (e, t = 200) => Response.json(e, {
		status: t,
		headers: {
			...c,
			"Cache-Control": "no-store"
		}
	});
	async function h(t, n = "") {
		let i = he(t.headers.get("Authorization"), t.url, t.method, n);
		return "error" in i ? m({ error: i.error }, 401) : U(await l({
			kinds: [r.pqBinding],
			authors: [i.pubkey]
		})).has(i.pubkey) ? e.blocked?.includes(i.pubkey) ? m({ error: "this account can’t use this gateway" }, 403) : i.pubkey : m({ error: "not a Fairground account" }, 403);
	}
	async function g(t, n, r) {
		if (n === "/wallet/config" && t.method === "GET") return m({
			ramp: !!p,
			...e.ramp ? {
				provider: "meld",
				environment: e.ramp.environment
			} : {}
		});
		if (n === "/ramp/session" && t.method === "POST") {
			if (!p) return m({ error: "buying and selling aren’t set up on this gateway yet" }, 503);
			let n = await t.text(), i = await h(t, n);
			if (i instanceof Response) return i;
			let a;
			try {
				a = JSON.parse(n || "{}");
			} catch {
				return m({ error: "bad request" }, 400);
			}
			if (!a || typeof a != "object" || a.asset !== void 0 && a.asset !== "ALGO" && a.asset !== "USDC" || !/^[A-Z]{2}$/.test(a.countryCode ?? "") || a.subdivision !== void 0 && !/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(a.subdivision) || a.side !== "BUY" && a.side !== "SELL" || !/^[A-Z2-7]{58}$/.test(a.walletAddress ?? "") || !/^(https:\/\/|http:\/\/localhost[:/])/.test(a.redirectURL ?? "")) return m({ error: "bad request" }, 400);
			let o;
			try {
				o = new URL(a.redirectURL);
			} catch {
				return m({ error: "bad return URL" }, 400);
			}
			let s = new URL(e.appUrl);
			if (o.origin !== s.origin || o.pathname !== s.pathname) return m({ error: "return to this app only" }, 400);
			if (!r.ip || r.ip === "0.0.0.0") return m({ error: "the gateway could not determine your IP address" }, 503);
			if (typeof a.amount != "number" || !Number.isFinite(a.amount) || a.amount <= 0 || a.amount > 1e6) return m({ error: "enter a valid amount" }, 400);
			let c = a.amount;
			try {
				let e = await p.session({
					side: a.side,
					walletAddress: a.walletAddress,
					customer: i,
					redirectURL: a.redirectURL,
					userIp: r.ip,
					asset: a.asset === "ALGO" ? "ALGO" : "USDC",
					amount: c,
					countryCode: a.countryCode,
					subdivision: a.subdivision
				});
				return m(e);
			} catch (e) {
				return m({ error: e.message }, 502);
			}
		}
		let i = /^\/ramp\/order\/([A-Za-z0-9_-]{6,128})$/.exec(n);
		if (i && t.method === "GET") {
			if (!p) return m({ error: "buying and selling aren’t set up on this gateway yet" }, 503);
			let e = await h(t);
			if (e instanceof Response) return e;
			try {
				let t = await p.order(i[1]);
				return t.customer === e ? t.side === "SELL" && t.provider !== p.sellProvider ? m({ error: "cash-out supplier changed" }, 409) : m({
					order: t,
					problem: t.side === "SELL" ? ye(t, e) ?? null : null
				}) : m({ error: "that order belongs to someone else" }, 403);
			} catch (e) {
				return m({ error: e.message }, 502);
			}
		}
	}
	return async function(o, s = {}) {
		let l = new URL(o.url), u = l.pathname.startsWith(t) ? l.pathname.slice(t.length) : l.pathname;
		if (u.startsWith("/wallet/") || u.startsWith("/ramp/")) {
			let t = e.walletOrigins ?? [new URL(e.appUrl).origin], n = o.headers.get("Origin");
			if (n && !t.includes(n)) return Response.json({ error: "origin not allowed" }, {
				status: 403,
				headers: {
					"Cache-Control": "no-store",
					Vary: "Origin"
				}
			});
			let r = o.method === "OPTIONS" ? new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Headers": "Authorization, Content-Type",
					"Access-Control-Allow-Methods": "GET, POST"
				}
			}) : await g(o, u, s) ?? f("page");
			return r.headers.set("Access-Control-Allow-Origin", n ?? t[0]), r.headers.set("Vary", "Origin"), r.headers.set("Cache-Control", "no-store"), r;
		}
		if (o.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers: {
				...c,
				"Access-Control-Allow-Headers": "Range, Authorization, Content-Type",
				"Access-Control-Allow-Methods": "GET, HEAD, POST"
			}
		});
		if (o.method !== "GET" && o.method !== "HEAD") return new Response("method not allowed\n", {
			status: 405,
			headers: c
		});
		if (u === "/health") {
			let t = await Promise.all(e.relays.map(async (e) => {
				let t = Date.now();
				return {
					relay: e,
					ok: (await $([e], {
						kinds: [r.pqBinding],
						limit: 1
					}, i, 3e3)).length > 0,
					ms: Date.now() - t
				};
			}));
			return Response.json({
				gateway: "fairground",
				relays: t
			}, {
				status: t.some((e) => e.ok) ? 200 : 503,
				headers: {
					...c,
					"Cache-Control": "no-store"
				}
			});
		}
		let p = /^\/podcast\/(npub1[02-9ac-hj-np-z]+)\/([A-Za-z0-9_-]{1,64})(?:\.xml|\/([^/]{1,200})\.(mp3|m4a|audio))$/.exec(u);
		if (!p) return f("page");
		let m;
		try {
			let e = re(p[1]);
			if (e.type !== "npub") return f("show");
			m = e.data;
		} catch {
			return f("show");
		}
		let h = p[2];
		if (e.blocked?.includes(m)) return f("show");
		let _ = await d(m, h);
		if (!_) return f("show");
		let v = `${`${l.protocol}//${l.host}`}${t}/podcast/${R(m)}/${h}`;
		if (!p[3]) {
			let t = pe(_.show, _.episodes, {
				feedUrl: `${v}.xml`,
				enclosureUrl: (e) => `${v}/${encodeURIComponent(e.guid)}.${Le(e.audio.type)}`,
				pageUrl: (t) => t ? `${e.appUrl}#/media/${t.event.id}` : `${e.appUrl}#/show/${R(m)}/${h}`,
				generatedAt: a()
			});
			return new Response(o.method === "HEAD" ? null : t, { headers: {
				...c,
				"Content-Type": "application/rss+xml; charset=utf-8",
				"Cache-Control": "public, max-age=300",
				...e.feedHeaders
			} });
		}
		let y = decodeURIComponent(p[3]), b = _.episodes.find((e) => e.guid === y);
		if (!b) return f("episode");
		let x = _.placements.length ? (await je()).breaksFor({
			creator: m,
			kind: "audio",
			show: _.show.address,
			duration: b.audio.duration,
			marks: b.breaks ?? []
		}, _.placements, {
			now: a(),
			acceptances: _.acceptances,
			approvals: _.approvals,
			pqKeyOf: (await Me()).keyLookup(_.bindings)
		}) : [], S = Ne(b, x);
		if (!S) return new Response(null, {
			status: 302,
			headers: {
				...c,
				Location: b.audio.url,
				"Cache-Control": "public, max-age=300"
			}
		});
		let C = S.reduce((e, t) => e + t.end - t.start, 0), w = await Ie(S), T = {
			...c,
			"Content-Type": "audio/mpeg",
			"Accept-Ranges": "bytes",
			ETag: w,
			"Cache-Control": "private, max-age=0",
			"X-Fairground-Ads": String(x.reduce((e, t) => e + t.ads.length, 0))
		}, E = o.headers.get("If-Range"), D = E && E !== w ? void 0 : Pe(o.headers.get("Range"), C);
		if (D === "unsatisfiable") return new Response(null, {
			status: 416,
			headers: {
				...T,
				"Content-Range": `bytes */${C}`
			}
		});
		let [O, k] = D ?? [0, C - 1], A = D ? 206 : 200;
		return D && (T["Content-Range"] = `bytes ${O}-${k}/${C}`), T["Content-Length"] = String(k - O + 1), o.method === "HEAD" ? new Response(null, {
			status: A,
			headers: T
		}) : new Response(Fe(S, O, k, n), {
			status: A,
			headers: T
		});
	};
}
// src/defaults.ts
var ze = [
	"wss://relay.damus.io",
	"wss://nos.lol",
	"wss://relay.primal.net",
	"wss://offchain.pub"
];
export { ze as DEFAULT_RELAYS, Re as createGateway, $ as queryRelays };
