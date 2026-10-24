import { c as e, f as t, l as n, m as r, o as i, p as a, s as o } from "./pq-BbiwCKUY.js";
import { E as s, F as c, T as l } from "./utils-Bw_p9nq9.js";
import "./pricing-ehjRYWD6.js";
// node_modules/nostr-tools/node_modules/@scure/base/index.js
function u(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function d(e, t) {
	return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((e) => typeof e == "string") : t.every((e) => Number.isSafeInteger(e)) : !1;
}
function f(e) {
	if (typeof e != "function") throw Error("function expected");
	return !0;
}
function p(e, t) {
	if (typeof t != "string") throw Error(`${e}: string expected`);
	return !0;
}
function m(e) {
	if (!Number.isSafeInteger(e)) throw Error(`invalid integer: ${e}`);
}
function h(e) {
	if (!Array.isArray(e)) throw Error("array expected");
}
function g(e, t) {
	if (!d(!0, t)) throw Error(`${e}: array of strings expected`);
}
function _(e, t) {
	if (!d(!1, t)) throw Error(`${e}: array of numbers expected`);
}
function v(...e) {
	let t = (e) => e, n = (e, t) => (n) => e(t(n));
	return {
		encode: e.map((e) => e.encode).reduceRight(n, t),
		decode: e.map((e) => e.decode).reduce(n, t)
	};
}
function y(e) {
	let t = typeof e == "string" ? e.split("") : e, n = t.length;
	g("alphabet", t);
	let r = new Map(t.map((e, t) => [e, t]));
	return {
		encode: (r) => (h(r), r.map((r) => {
			if (!Number.isSafeInteger(r) || r < 0 || r >= n) throw Error(`alphabet.encode: digit index outside alphabet "${r}". Allowed: ${e}`);
			return t[r];
		})),
		decode: (t) => (h(t), t.map((t) => {
			p("alphabet.decode", t);
			let n = r.get(t);
			if (n === void 0) throw Error(`Unknown letter: "${t}". Allowed: ${e}`);
			return n;
		}))
	};
}
function b(e = "") {
	return p("join", e), {
		encode: (t) => (g("join.decode", t), t.join(e)),
		decode: (t) => (p("join.decode", t), t.split(e))
	};
}
function x(e, t = "=") {
	return m(e), p("padding", t), {
		encode(n) {
			for (g("padding.encode", n); n.length * e % 8;) n.push(t);
			return n;
		},
		decode(n) {
			g("padding.decode", n);
			let r = n.length;
			if (r * e % 8) throw Error("padding: invalid, string should have whole number of bytes");
			for (; r > 0 && n[r - 1] === t; r--) if ((r - 1) * e % 8 == 0) throw Error("padding: invalid, string has too much padding");
			return n.slice(0, r);
		}
	};
}
function S(e) {
	return f(e), {
		encode: (e) => e,
		decode: (t) => e(t)
	};
}
var C = (e, t) => t === 0 ? e : C(t, e % t), w = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - C(e, t)), T = /* @__PURE__ */ (() => {
	let e = [];
	for (let t = 0; t < 40; t++) e.push(2 ** t);
	return e;
})();
function E(e, t, n, r) {
	if (h(e), t <= 0 || t > 32) throw Error(`convertRadix2: wrong from=${t}`);
	if (n <= 0 || n > 32) throw Error(`convertRadix2: wrong to=${n}`);
	if (/* @__PURE__ */ w(t, n) > 32) throw Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ w(t, n)}`);
	let i = 0, a = 0, o = T[t], s = T[n] - 1, c = [];
	for (let r of e) {
		if (m(r), r >= o) throw Error(`convertRadix2: invalid data word=${r} from=${t}`);
		if (i = i << t | r, a + t > 32) throw Error(`convertRadix2: carry overflow pos=${a} from=${t}`);
		for (a += t; a >= n; a -= n) c.push((i >> a - n & s) >>> 0);
		let e = T[a];
		if (e === void 0) throw Error("invalid carry");
		i &= e - 1;
	}
	if (i = i << n - a & s, !r && a >= t) throw Error("Excess padding");
	if (!r && i > 0) throw Error(`Non-zero padding: ${i}`);
	return r && a > 0 && c.push(i >>> 0), c;
}
function D(e, t = !1) {
	if (m(e), e <= 0 || e > 32) throw Error("radix2: bits should be in (0..32]");
	if (/* @__PURE__ */ w(8, e) > 32 || /* @__PURE__ */ w(e, 8) > 32) throw Error("radix2: carry overflow");
	return {
		encode: (n) => {
			if (!u(n)) throw Error("radix2.encode input should be Uint8Array");
			return E(Array.from(n), 8, e, !t);
		},
		decode: (n) => (_("radix2.decode", n), Uint8Array.from(E(n, e, 8, t)))
	};
}
function O(e) {
	return f(e), function(...t) {
		try {
			return e.apply(null, t);
		} catch {}
	};
}
v(D(4), y("0123456789ABCDEF"), b("")), v(D(5), y("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), x(5), b("")), v(D(5), y("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"), b("")), v(D(5), y("0123456789ABCDEFGHIJKLMNOPQRSTUV"), x(5), b("")), v(D(5), y("0123456789ABCDEFGHIJKLMNOPQRSTUV"), b("")), v(D(5), y("0123456789ABCDEFGHJKMNPQRSTVWXYZ"), b(""), S((e) => e.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1")));
var k = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function";
k || v(D(6), y("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), x(6), b("")), v(D(6), y("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), b("")), k || v(D(6), y("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), x(6), b("")), v(D(6), y("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"), b(""));
var A = v(y("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), b("")), j = [
	996825010,
	642813549,
	513874426,
	1027748829,
	705979059
];
function M(e) {
	let t = e >> 25, n = (e & 33554431) << 5;
	for (let e = 0; e < j.length; e++) (t >> e & 1) == 1 && (n ^= j[e]);
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
	return i ^= n, A.encode(E([i % T[30]], 30, 5, !1));
}
function P(e) {
	let t = e === "bech32" ? 1 : 734539939, n = D(5), r = n.decode, i = n.encode, a = O(r);
	function o(e, n, r = 90) {
		p("bech32.encode prefix", e), u(n) && (n = Array.from(n)), _("bech32.encode", n);
		let i = e.length;
		if (i === 0) throw TypeError(`Invalid prefix length ${i}`);
		let a = i + 7 + n.length;
		if (r !== !1 && a > r) throw TypeError(`Length ${a} exceeds limit ${r}`);
		let o = e.toLowerCase(), s = N(o, n, t);
		return `${o}1${A.encode(n)}${s}`;
	}
	function s(e, n = 90) {
		p("bech32.decode input", e);
		let r = e.length;
		if (r < 8 || n !== !1 && r > n) throw TypeError(`invalid string length: ${r} (${e}). Expected (8..${n})`);
		let i = e.toLowerCase();
		if (e !== i && e !== e.toUpperCase()) throw Error("String must be lowercase or uppercase");
		let a = i.lastIndexOf("1");
		if (a === 0 || a === -1) throw Error("Letter \"1\" must be present between prefix and data only");
		let o = i.slice(0, a), s = i.slice(a + 1);
		if (s.length < 6) throw Error("Data must be at least 6 characters long");
		let c = A.decode(s).slice(0, -6), l = N(o, c, t);
		if (!s.endsWith(l)) throw Error(`Invalid checksum in ${e}: expected "${l}"`);
		return {
			prefix: o,
			words: c
		};
	}
	let c = O(s);
	function l(e) {
		let { prefix: t, words: n } = s(e, !1);
		return {
			prefix: t,
			words: n,
			bytes: r(n)
		};
	}
	function d(e, t) {
		return o(e, i(t));
	}
	return {
		encode: o,
		decode: s,
		encodeFromBytes: d,
		decodeToBytes: l,
		decodeUnsafe: c,
		fromWords: r,
		fromWordsUnsafe: a,
		toWords: i
	};
}
var F = P("bech32");
P("bech32m"), typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function" || v(D(4), y("0123456789abcdef"), b(""), S((e) => {
	if (typeof e != "string" || e.length % 2 != 0) throw TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
	return e.toLowerCase();
}));
// node_modules/nostr-tools/lib/esm/nip19.js
var I = new TextDecoder("utf-8");
new TextEncoder();
var L = 5e3;
function ee(e) {
	let { prefix: t, words: n } = F.decode(e, L), r = new Uint8Array(F.fromWords(n));
	switch (t) {
		case "nprofile": {
			let e = R(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nprofile");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			return {
				type: "nprofile",
				data: {
					pubkey: a(e[0][0]),
					relays: e[1] ? e[1].map((e) => I.decode(e)) : []
				}
			};
		}
		case "nevent": {
			let e = R(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for nevent");
			if (e[0][0].length !== 32) throw Error("TLV 0 should be 32 bytes");
			if (e[2] && e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (e[3] && e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "nevent",
				data: {
					id: a(e[0][0]),
					relays: e[1] ? e[1].map((e) => I.decode(e)) : [],
					author: e[2]?.[0] ? a(e[2][0]) : void 0,
					kind: e[3]?.[0] ? parseInt(a(e[3][0]), 16) : void 0
				}
			};
		}
		case "naddr": {
			let e = R(r);
			if (!e[0]?.[0]) throw Error("missing TLV 0 for naddr");
			if (!e[2]?.[0]) throw Error("missing TLV 2 for naddr");
			if (e[2][0].length !== 32) throw Error("TLV 2 should be 32 bytes");
			if (!e[3]?.[0]) throw Error("missing TLV 3 for naddr");
			if (e[3][0].length !== 4) throw Error("TLV 3 should be 4 bytes");
			return {
				type: "naddr",
				data: {
					identifier: I.decode(e[0][0]),
					pubkey: a(e[2][0]),
					kind: parseInt(a(e[3][0]), 16),
					relays: e[1] ? e[1].map((e) => I.decode(e)) : []
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
			data: a(r)
		};
		default: throw Error(`unknown prefix ${t}`);
	}
}
function R(e) {
	let t = {}, n = e;
	for (; n.length > 0;) {
		if (n.length < 2) throw Error("not enough data to read TLV");
		let e = n[0], r = n[1], i = n.slice(2, 2 + r);
		if (n = n.slice(2 + r), i.length < r) throw Error(`not enough data to read on TLV ${e}`);
		t[e] = t[e] || [], t[e].push(i);
	}
	return t;
}
function z(e) {
	return ne("npub", r(e));
}
function te(e, t) {
	let n = F.toWords(t);
	return F.encode(e, n, L);
}
function ne(e, t) {
	return te(e, t);
}
// src/mp3.ts
var re = (e, t) => e.version === t.version && e.sampleRate === t.sampleRate && e.channels === t.channels, B = (e, t) => `${n.show}:${e}:${t}`;
function ie(t) {
	let r = e(t, "d"), i = e(t, "title"), a = e(t, "image"), [, s, c] = o(t, "category") ?? [], l = e(t, "guid");
	if (t.kind !== n.show || !r || !i || !a || !s || !l) return;
	let [, u, d] = o(t, "owner") ?? [], f = e(t, "type");
	return {
		event: t,
		creator: t.pubkey,
		address: B(t.pubkey, r),
		slug: r,
		title: i,
		description: t.content,
		image: a,
		author: e(t, "author") ?? i,
		category: s,
		subcategory: c || void 0,
		explicit: e(t, "explicit") === "true",
		language: e(t, "language") ?? "en",
		type: f === "serial" ? "serial" : "episodic",
		ownerName: u || void 0,
		ownerEmail: d || void 0,
		link: e(t, "r"),
		copyright: e(t, "copyright"),
		guid: l
	};
}
function ae(e) {
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
function oe(e) {
	return e.tags.filter((e) => e[0] === "break").map((e) => ({
		at: Number(e[1]),
		byteOffset: e[2] === void 0 ? void 0 : Number(e[2])
	})).filter((e) => Number.isFinite(e.at) && e.at > 0 && (e.byteOffset === void 0 || Number.isSafeInteger(e.byteOffset))).sort((e, t) => e.at - t.at);
}
var V = (e) => e && /^\d+(\.\d+)?$/.test(e) && Number(e) > 0 ? Number(e) : void 0;
function se(t) {
	let r = e(t, "a"), i = e(t, "guid"), a = e(t, "title"), [, s, c = "audio/mpeg"] = o(t, "audio") ?? [];
	if (t.kind !== 54 || !r?.startsWith(`${n.show}:${t.pubkey}:`) || !i || !a || !s?.startsWith("https://")) return;
	let [, l, u] = o(t, "transcript") ?? [], d = e(t, "episode_type");
	return {
		event: t,
		creator: t.pubkey,
		published: t.created_at,
		show: r,
		guid: i,
		title: a,
		description: t.content || e(t, "description") || "",
		audio: {
			url: s,
			type: c,
			size: V(e(t, "size")),
			duration: V(e(t, "duration"))
		},
		image: e(t, "image"),
		episode: V(e(t, "episode")),
		season: V(e(t, "season")),
		episodeType: d === "trailer" || d === "bonus" ? d : "full",
		explicit: e(t, "explicit") === "true",
		hls: e(t, "hls"),
		transcript: l ? {
			url: l,
			type: u ?? "text/plain"
		} : void 0,
		breaks: oe(t),
		mp3: ae(o(t, "mp3"))
	};
}
function ce(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = se(r);
		if (!e || e.show !== t) continue;
		let i = n.get(e.guid);
		(!i || r.created_at > i.event.created_at) && n.set(e.guid, e);
	}
	return [...n.values()].sort((e, t) => t.published - e.published);
}
var H = (e) => e.replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
})[e]), U = (e, t) => t === void 0 || t === "" ? "" : `<${e}>${H(String(t))}</${e}>`, le = (e) => e.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "");
function W(e, t, n) {
	let r = (e) => (/* @__PURE__ */ new Date(e * 1e3)).toUTCString(), a = e.subcategory ? `<itunes:category text="${H(e.category)}"><itunes:category text="${H(e.subcategory)}"/></itunes:category>` : `<itunes:category text="${H(e.category)}"/>`, o = e.ownerEmail ? `<itunes:owner>${U("itunes:name", e.ownerName ?? e.author)}${U("itunes:email", e.ownerEmail)}</itunes:owner>` : "", s = t.map((t) => [
		"<item>",
		U("title", t.title),
		U("description", t.description),
		U("link", n.pageUrl(t)),
		`<guid isPermaLink="false">${H(t.guid)}</guid>`,
		U("pubDate", r(t.published)),
		`<enclosure url="${H(n.enclosureUrl(t))}" length="${t.audio.size ?? 0}" type="${H(t.audio.type)}"/>`,
		U("itunes:duration", t.audio.duration ? Math.round(t.audio.duration) : void 0),
		U("itunes:episode", t.episode),
		U("itunes:season", t.season),
		U("itunes:episodeType", t.episodeType ?? "full"),
		U("itunes:explicit", t.explicit || e.explicit ? "true" : "false"),
		t.image ? `<itunes:image href="${H(t.image)}"/>` : "",
		t.transcript ? `<podcast:transcript url="${H(t.transcript.url)}" type="${H(t.transcript.type)}"/>` : "",
		t.hls ? `<podcast:alternateEnclosure type="application/x-mpegURL"><podcast:source uri="${H(t.hls)}"/></podcast:alternateEnclosure>` : "",
		"</item>"
	].join(""));
	return le([
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<rss version=\"2.0\" xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" xmlns:podcast=\"https://podcastindex.org/namespace/1.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">",
		"<channel>",
		`<atom:link href="${H(n.feedUrl)}" rel="self" type="application/rss+xml"/>`,
		U("title", e.title),
		U("link", e.link ?? n.pageUrl()),
		U("language", e.language),
		U("description", e.description),
		U("itunes:author", e.author),
		`<itunes:image href="${H(e.image)}"/>`,
		`<image>${U("url", e.image)}${U("title", e.title)}${U("link", e.link ?? n.pageUrl())}</image>`,
		a,
		U("itunes:explicit", e.explicit ? "true" : "false"),
		U("itunes:type", e.type ?? "episodic"),
		o,
		U("copyright", e.copyright),
		U("podcast:guid", e.guid),
		e.ownerEmail ? `<podcast:locked owner="${H(e.ownerEmail)}">yes</podcast:locked>` : "",
		U("generator", "Fairground"),
		U("lastBuildDate", r(n.generatedAt ?? i())),
		...s,
		"</channel>",
		"</rss>"
	].join("\n"));
}
var ue = (e) => c(s(new TextEncoder().encode(e)));
function de(e, n, r, i = "", a = Math.floor(Date.now() / 1e3)) {
	if (!e?.startsWith("Nostr ")) return { error: "missing Nostr authorization" };
	let o;
	try {
		o = JSON.parse(new TextDecoder().decode(l.decode(e.slice(6).trim())));
	} catch {
		return { error: "malformed authorization" };
	}
	let s = (e) => o.tags?.find((t) => t[0] === e)?.[1];
	return o.kind !== 27235 || !t(o) ? { error: "authorization is not a valid signed request" } : Math.abs(a - o.created_at) > 60 ? { error: "authorization has expired" } : s("u") !== n || s("method") !== r.toUpperCase() ? { error: "authorization is for another request" } : i && s("payload") !== ue(i) ? { error: "authorization doesn’t match the request body" } : { pubkey: o.pubkey };
}
// src/network.ts
var fe = 2604, pe = (t) => t.kind === n.pqBinding && e(t, "alg") === "ml-dsa-65" && e(t, "key")?.length === fe;
function G(e) {
	return new Set(e.filter(pe).map((e) => e.pubkey));
}
// src/ramp.ts
var me = {
	staging: {
		api: "https://api-stg.transak.com",
		gateway: "https://api-gateway-stg.transak.com"
	},
	production: {
		api: "https://api.transak.com",
		gateway: "https://api-gateway.transak.com"
	}
}, he = ["AWAITING_PAYMENT_FROM_USER", "PROCESSING"];
function K(e) {
	let t = me[e.environment], n = e.fetch ?? ((...e) => fetch(...e)), r;
	async function i() {
		if (r && r.expires > Date.now() / 1e3 + 300) return r.value;
		let i = await n(`${t.api}/partners/api/v2/refresh-token`, {
			method: "POST",
			headers: {
				"x-api-key": e.apiKey,
				"api-secret": e.apiSecret,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ apiKey: e.apiKey })
		});
		if (!i.ok) throw Error(`Transak refused the partner credentials (${i.status})`);
		let a = await i.json(), o = a.data?.accessToken ?? a.accessToken;
		if (!o) throw Error("Transak returned no access token");
		return r = {
			value: o,
			expires: a.data?.expiresAt ?? a.expiresAt ?? Date.now() / 1e3 + 86400
		}, o;
	}
	return {
		async session(r) {
			let a = {
				apiKey: e.apiKey,
				referrerDomain: e.referrerDomain,
				productsAvailed: r.side,
				network: "algorand",
				cryptoCurrencyCode: "USDC",
				fiatCurrency: "USD",
				partnerCustomerId: r.customer,
				redirectURL: r.redirectURL,
				hideMenu: !0,
				themeColor: "d9480f"
			};
			r.side === "BUY" ? Object.assign(a, {
				walletAddress: r.walletAddress,
				disableWalletAddressForm: !0,
				...r.fiatAmount ? { fiatAmount: r.fiatAmount } : {}
			}) : Object.assign(a, {
				walletRedirection: !0,
				...r.cryptoAmount ? { cryptoAmount: r.cryptoAmount } : {}
			}), r.email && (a.email = r.email);
			let o = await n(`${t.gateway}/api/v2/auth/session`, {
				method: "POST",
				headers: {
					"x-api-key": e.apiKey,
					"access-token": await i(),
					"x-user-ip": r.userIp,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ widgetParams: a })
			});
			if (!o.ok) throw Error(`Transak couldn’t start a session (${o.status})`);
			let s = (await o.json()).data?.widgetUrl;
			if (!s?.startsWith("https://")) throw Error("Transak returned no widget link");
			return s;
		},
		async order(r) {
			if (!/^[A-Za-z0-9-]{6,80}$/.test(r)) throw Error("not an order id");
			let a = await n(`${t.api}/partners/api/v2/order/${r}`, { headers: {
				"x-api-key": e.apiKey,
				"access-token": await i()
			} });
			if (!a.ok) throw Error(`Transak couldn’t find the order (${a.status})`);
			let o = (await a.json()).data ?? {};
			return {
				id: r,
				status: String(o.status ?? ""),
				side: o.isBuyOrSell === "SELL" ? "SELL" : "BUY",
				cryptoCurrency: String(o.cryptoCurrency ?? ""),
				network: String(o.network ?? ""),
				cryptoAmount: Number(o.cryptoAmount ?? 0),
				fiatAmount: Number(o.fiatAmount ?? 0),
				fiatCurrency: String(o.fiatCurrency ?? ""),
				walletAddress: String(o.walletAddress ?? ""),
				customer: typeof o.partnerCustomerId == "string" ? o.partnerCustomerId : void 0
			};
		}
	};
}
function ge(e, t) {
	if (e.side !== "SELL") return "that isn’t a cash-out order";
	if (e.customer && e.customer !== t) return "that order belongs to someone else";
	if (e.cryptoCurrency.toUpperCase() !== "USDC" || e.network.toLowerCase() !== "algorand") return "that order isn’t for USDC on Algorand";
	if (!he.includes(e.status)) return `that order isn’t waiting for payment (${e.status.toLowerCase().replace(/_/g, " ")})`;
	if (!(e.cryptoAmount > 0) || !e.walletAddress) return "that order has no amount or address";
}
// src/safety.ts
var q = (e) => [
	e.content,
	...e.tags.filter((e) => [
		"title",
		"summary",
		"description",
		"alt"
	].includes(e[0])).map((e) => e[1] ?? ""),
	...e.tags.filter((e) => e[0] === "imeta").flatMap((e) => e.filter((e) => e.startsWith("alt ")).map((e) => e.slice(4)))
].join(" ").trim(), J = (e) => `${q(e)} ${e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`).join(" ")}`.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, ""), Y = /\b(teen(s|age|ager|agers)?|young(er)?|underage|minors?|child(ren)?|kids?|kiddies|pre-?teens?|infants?|babies|toddlers?|lolita|schoolgirls?|schoolboys?|schoolthot|pyt|(1[0-7]|[1-9]) ?(yo|y\/o|years? old))\b/, X = /\b(sex|sexy|nudes?|naked|porn\w*|xxx|nsfw|horny|blowjobs?|cum|dicks?|cocks?|pussy|tits?|boobs?|nipples?|lewd|rape\w*|cnc\w*|fetish\w*|onlyfans|explicit|erotic\w*|incest|bestiality|snapleak|nolimit|taboo|momson)\b/, _e = /\b(pthc|child ?porn\w*|csam|jailbait|loli|shota)\b/, ve = /(t\.me\/|telegram|dm me|\bcontents?\b|\bleaks?\b)/, ye = /\b(porn\w*|xxx|nsfw|nudes?|naked|horny|blowjobs?|onlyfans|lewd|erotic\w*|cum|dicks?|cocks?|pussy|tits|boobs|nipples?|fetish\w*)\b/, be = /\b(bestiality|zoophil\w*)\b/, xe = /\b(revenge ?porn|hidden ?cams?|spy ?cams?|upskirts?|creepshots?|leaked ?nudes|deepfake ?(porn|nudes?))\b/, Se = /\b(fag(got)?s?|homos|n[i1y]gg(a|as|er|ers|ah)|kikes?|retards?|trann(y|ies)|chinks?|spics?|wetbacks?|kys)\b|you('| ha)ve been warned|i('| wi)ll kill you|kill yourself/;
function Ce(e) {
	let t = J(e);
	return !!(_e.test(t) || Y.test(t) && X.test(t) || /\b(cp|pedo\w*)\b/.test(t) && (X.test(t) || Y.test(t) || ve.test(t)));
}
function we(e) {
	if (Ce(e)) return !0;
	let t = J(e);
	return be.test(t) || xe.test(t);
}
var Te = (e) => new Set([...e.content.matchAll(/#[\p{L}\p{N}_]+/gu)].map((e) => e[0].toLowerCase()).concat(e.tags.filter((e) => e[0] === "t").map((e) => `#${e[1]}`))).size;
function Ee(e) {
	let t = e.trim();
	if (!/^[{[]/.test(t)) return !1;
	try {
		return JSON.parse(t), !0;
	} catch {
		return !1;
	}
}
function Z(e, t) {
	if (we(e)) return { block: !0 };
	let n = J(e);
	return e.tags.some((e) => e[0] === "content-warning") || ye.test(n) ? {
		block: !1,
		hide: "sexual"
	} : Se.test(n) ? {
		block: !1,
		hide: "hate"
	} : Te(e) > 10 ? {
		block: !1,
		hide: "spam"
	} : Ee(e.content) || q(e).length < 2 ? {
		block: !1,
		hide: "junk"
	} : t?.bot ? {
		block: !1,
		hide: "bot"
	} : { block: !1 };
}
// src/gateway.ts
var Q = () => import("./ads-Di2z4O4w.js"), De = () => import("./pq-BbiwCKUY.js").then((e) => e.t);
async function $(e, n, r = WebSocket, i = 4e3) {
	let a = /* @__PURE__ */ new Map();
	return await Promise.all(e.map((e) => new Promise((o) => {
		let s, c = Math.random().toString(36).slice(2, 10), l = () => {
			clearTimeout(u);
			try {
				s.close();
			} catch {}
			o();
		}, u = setTimeout(l, i);
		try {
			s = new r(e);
		} catch {
			clearTimeout(u), o();
			return;
		}
		s.onopen = () => s.send(JSON.stringify([
			"REQ",
			c,
			n
		])), s.onerror = l, s.onclose = l, s.onmessage = (e) => {
			let n;
			try {
				n = JSON.parse(String(e.data));
			} catch {
				return;
			}
			Array.isArray(n) && n[1] === c && (n[0] === "EOSE" || n[0] === "CLOSED" ? l() : n[0] === "EVENT" && !a.has(n[2]?.id) && t(n[2]) && a.set(n[2].id, n[2]));
		};
	}))), [...a.values()];
}
function Oe(e, t) {
	let n = e.mp3;
	if (!n) return;
	let r = e.audio.url, i = (e) => e.ads.map((e) => e.spot.mp3 && re(e.spot.mp3, n) ? {
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
function ke(e, t) {
	let n = /^bytes=(\d*)-(\d*)$/.exec((e ?? "").split(",")[0].trim());
	if (!n || !n[1] && !n[2]) return;
	let r, i;
	return n[1] ? (r = Number(n[1]), i = n[2] ? Math.min(Number(n[2]), t - 1) : t - 1) : (r = Math.max(0, t - Number(n[2])), i = t - 1), r > i || r >= t ? "unsatisfiable" : [r, i];
}
function Ae(e, t, n, r) {
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
async function je(e) {
	let t = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(e)));
	return `"${[...new Uint8Array(t)].slice(0, 12).map((e) => e.toString(16).padStart(2, "0")).join("")}"`;
}
var Me = (e) => /mpeg|mp3/.test(e) ? "mp3" : /mp4|m4a|aac/.test(e) ? "m4a" : "audio";
function Ne(e) {
	let t = e.base.replace(/\/+$/, ""), r = e.fetch ?? ((...e) => fetch(...e)), i = e.WebSocket ?? WebSocket, a = e.now ?? (() => Math.floor(Date.now() / 1e3)), o = (e.cacheSeconds ?? 120) * 1e3, s = /* @__PURE__ */ new Map(), c = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag"
	}, l = (t) => $(e.relays, t, i);
	async function u(e, t) {
		let r = B(e, t), [i, a, o, s] = await Promise.all([
			l({
				kinds: [n.show],
				authors: [e],
				"#d": [t]
			}),
			l({
				kinds: [54],
				authors: [e],
				"#a": [r],
				limit: 1e3
			}),
			l({
				kinds: [n.placement],
				authors: [e],
				limit: 500
			}),
			l({
				kinds: [n.pqBinding],
				authors: [e]
			})
		]);
		if (!G(s).has(e)) return;
		let c = i.map(ie).filter((e) => !!e).sort((e, t) => t.event.created_at - e.event.created_at)[0];
		if (!c || Z(c.event).block) return;
		let u = ce(a.filter((e) => !Z(e).block), r);
		!c.explicit && [c.event, ...u.map((e) => e.event)].some((e) => {
			let t = Z(e);
			return !t.block && t.hide === "sexual";
		}) && (c.explicit = !0);
		let d = o.length ? o.map((await Q()).parsePlacement).filter((e) => !!e) : [], [f, p, m] = d.length ? await Promise.all([
			l({ ids: [...new Set(d.map((e) => e.acceptanceId))] }),
			l({
				kinds: [n.approval],
				"#e": d.map((e) => e.event.id)
			}),
			l({
				kinds: [n.pqBinding],
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
	}), p, m = () => e.starter ? p ??= import("./starter--ZveX1R5.js").then((t) => t.createStarter({
		fetch: r,
		...e.starter
	})) : void 0, h = e.ramp && K({
		fetch: r,
		...e.ramp
	}), g = (e, t = 200) => Response.json(e, {
		status: t,
		headers: {
			...c,
			"Cache-Control": "no-store"
		}
	});
	async function _(t, r = "") {
		let i = de(t.headers.get("Authorization"), t.url, t.method, r);
		return "error" in i ? g({ error: i.error }, 401) : G(await l({
			kinds: [n.pqBinding],
			authors: [i.pubkey]
		})).has(i.pubkey) ? e.blocked?.includes(i.pubkey) ? g({ error: "this account can’t use this gateway" }, 403) : i.pubkey : g({ error: "not a Fairground account" }, 403);
	}
	async function v(e, t, n) {
		if (t === "/wallet/config" && e.method === "GET") return g({
			starter: (await m())?.sponsor ?? null,
			ramp: !!h
		});
		if (t === "/wallet/start" && e.method === "POST") {
			let t = await m();
			if (!t) return g({ error: "this gateway doesn’t start wallets" }, 503);
			let n = await e.text(), r = await _(e, n);
			if (r instanceof Response) return r;
			let i = await t.start(r, JSON.parse(n || "{}")).catch((e) => ({
				status: 502,
				error: e.message
			}));
			return "txid" in i ? g(i) : g({ error: i.error }, i.status);
		}
		if (t === "/ramp/session" && e.method === "POST") {
			if (!h) return g({ error: "buying and selling aren’t set up on this gateway yet" }, 503);
			let t = await e.text(), r = await _(e, t);
			if (r instanceof Response) return r;
			let i = JSON.parse(t || "{}");
			if (i.side !== "BUY" && i.side !== "SELL" || !/^[A-Z2-7]{58}$/.test(i.walletAddress ?? "") || !/^(https:\/\/|http:\/\/localhost[:/])/.test(i.redirectURL ?? "")) return g({ error: "bad request" }, 400);
			let a = Number(i.amount) > 0 ? Number(i.amount) : void 0;
			try {
				let e = await h.session({
					side: i.side,
					walletAddress: i.walletAddress,
					customer: r,
					redirectURL: i.redirectURL,
					userIp: n.ip ?? "0.0.0.0",
					...i.side === "BUY" ? { fiatAmount: a } : { cryptoAmount: a }
				});
				return g({ url: e });
			} catch (e) {
				return g({ error: e.message }, 502);
			}
		}
		let r = /^\/ramp\/order\/([A-Za-z0-9-]{6,80})$/.exec(t);
		if (r && e.method === "GET") {
			if (!h) return g({ error: "buying and selling aren’t set up on this gateway yet" }, 503);
			let t = await _(e);
			if (t instanceof Response) return t;
			try {
				let e = await h.order(r[1]);
				return e.customer && e.customer !== t ? g({ error: "that order belongs to someone else" }, 403) : g({
					order: e,
					problem: e.side === "SELL" ? ge(e, t) ?? null : null
				});
			} catch (e) {
				return g({ error: e.message }, 502);
			}
		}
	}
	return async function(o, s = {}) {
		if (o.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers: {
				...c,
				"Access-Control-Allow-Headers": "Range, Authorization, Content-Type",
				"Access-Control-Allow-Methods": "GET, HEAD, POST"
			}
		});
		let l = new URL(o.url), u = l.pathname.startsWith(t) ? l.pathname.slice(t.length) : l.pathname;
		if (u.startsWith("/wallet/") || u.startsWith("/ramp/")) return await v(o, u, s) ?? f("page");
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
						kinds: [n.pqBinding],
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
			let e = ee(p[1]);
			if (e.type !== "npub") return f("show");
			m = e.data;
		} catch {
			return f("show");
		}
		let h = p[2];
		if (e.blocked?.includes(m)) return f("show");
		let g = await d(m, h);
		if (!g) return f("show");
		let _ = `${`${l.protocol}//${l.host}`}${t}/podcast/${z(m)}/${h}`;
		if (!p[3]) {
			let t = W(g.show, g.episodes, {
				feedUrl: `${_}.xml`,
				enclosureUrl: (e) => `${_}/${encodeURIComponent(e.guid)}.${Me(e.audio.type)}`,
				pageUrl: (t) => t ? `${e.appUrl}#/media/${t.event.id}` : `${e.appUrl}#/show/${z(m)}/${h}`,
				generatedAt: a()
			});
			return new Response(o.method === "HEAD" ? null : t, { headers: {
				...c,
				"Content-Type": "application/rss+xml; charset=utf-8",
				"Cache-Control": "public, max-age=300",
				...e.feedHeaders
			} });
		}
		let y = decodeURIComponent(p[3]), b = g.episodes.find((e) => e.guid === y);
		if (!b) return f("episode");
		let x = g.placements.length ? (await Q()).breaksFor({
			creator: m,
			kind: "audio",
			show: g.show.address,
			duration: b.audio.duration,
			marks: b.breaks ?? []
		}, g.placements, {
			now: a(),
			acceptances: g.acceptances,
			approvals: g.approvals,
			pqKeyOf: (await De()).keyLookup(g.bindings)
		}) : [], S = Oe(b, x);
		if (!S) return new Response(null, {
			status: 302,
			headers: {
				...c,
				Location: b.audio.url,
				"Cache-Control": "public, max-age=300"
			}
		});
		let C = S.reduce((e, t) => e + t.end - t.start, 0), w = await je(S), T = {
			...c,
			"Content-Type": "audio/mpeg",
			"Accept-Ranges": "bytes",
			ETag: w,
			"Cache-Control": "private, max-age=0",
			"X-Fairground-Ads": String(x.reduce((e, t) => e + t.ads.length, 0))
		}, E = o.headers.get("If-Range"), D = E && E !== w ? void 0 : ke(o.headers.get("Range"), C);
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
		}) : new Response(Ae(S, O, k, r), {
			status: A,
			headers: T
		});
	};
}
// src/defaults.ts
var Pe = [
	"wss://relay.damus.io",
	"wss://nos.lol",
	"wss://relay.primal.net",
	"wss://offchain.pub"
];
export { Pe as DEFAULT_RELAYS, Ne as createGateway, $ as queryRelays };
