import { a as e, c as t, d as n, f as r, i, l as a, n as o, o as s, r as c, s as l } from "./pq-BbiwCKUY.js";
import { t as u } from "./pricing-ehjRYWD6.js";
import "./algorand-C7lP2Qb4.js";
// src/sponsorship.ts
function d(e) {
	if (e.kind !== a.offer) return;
	let [, n = "", r, i, o = ""] = l(e, "price") ?? [], s = t(e, "d"), c = t(e, "title"), d = t(e, "rail"), p = Number(t(e, "deadline"));
	if (s && c && d && i && r === "USD" && u(o) && /^[1-9]\d*$/.test(n) && Number.isSafeInteger(p)) return {
		event: e,
		advertiser: e.pubkey,
		slug: s,
		title: c,
		brief: e.content,
		price: {
			amount: BigInt(n),
			currency: r,
			index: i,
			basePeriod: o
		},
		rail: d,
		deadline: p,
		creator: t(e, "p"),
		terms: f(e)
	};
}
function f(e) {
	let n = t(e, "format");
	if (n !== "host-read" && n !== "post") return;
	let r = (t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), [, i, a] = l(e, "flight") ?? [];
	return {
		format: n,
		media: r("media").filter((e) => e === "audio" || e === "video"),
		slots: r("slot").filter((e) => m.includes(e)),
		flight: i && a && Number(a) > Number(i) ? {
			start: Number(i),
			end: Number(a)
		} : void 0,
		points: r("point"),
		avoid: r("avoid"),
		url: t(e, "r"),
		code: t(e, "code"),
		approval: t(e, "approval") === "read",
		campaign: t(e, "a")
	};
}
function p(t) {
	try {
		let n = JSON.parse(t.content);
		return n?.id === e(t, "offer") ? n : void 0;
	} catch {
		return;
	}
}
// src/ads.ts
var m = [
	"pre",
	"mid",
	"post"
], h = {
	adult: "Adult and explicit content",
	violence: "Violence, weapons and crime",
	drugs: "Drugs, alcohol and tobacco",
	politics: "Politics and elections",
	religion: "Religion",
	tragedy: "Death, injury and tragedy",
	profanity: "Strong language",
	gambling: "Gambling"
}, g = {
	low: 15,
	typical: 25,
	high: 50
}, _ = (e, t) => `${a.campaign}:${e}:${t}`;
function v(e, t) {
	if (t.end <= t.start) throw Error("a campaign must end after it starts");
	let r = [
		["d", t.slug],
		["title", t.name],
		["objective", t.objective],
		["product", t.product],
		[
			"flight",
			String(t.start),
			String(t.end)
		],
		["budget", t.budget.toString()],
		["cpm", t.cpm.toString()],
		...t.formats.map((e) => ["format", e]),
		...t.media.map((e) => ["media", e]),
		...t.slots.map((e) => ["slot", e]),
		...t.points.map((e) => ["point", e]),
		...t.avoid.map((e) => ["avoid", e]),
		...t.topics.map((e) => ["t", e.toLowerCase()]),
		...t.regions.map((e) => ["region", e]),
		...t.languages.map((e) => ["language", e]),
		...t.exclude.map((e) => ["exclude", e])
	];
	return t.offer && r.push(["offer", t.offer]), t.url && r.push(["r", t.url]), t.promo && r.push(["code", t.promo]), t.approval && r.push(["approval", "read"]), n({
		kind: a.campaign,
		created_at: t.created_at ?? s(),
		content: t.brief ?? "",
		tags: r
	}, e);
}
var y = (e, t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), b = (e) => e && /^\d+$/.test(e) ? BigInt(e) : 0n;
function x(e) {
	let n = t(e, "d"), i = t(e, "title"), [, o, s] = l(e, "flight") ?? [], c = t(e, "objective");
	if (e.kind === a.campaign && n && i && o && s && r(e)) return {
		event: e,
		advertiser: e.pubkey,
		address: _(e.pubkey, n),
		slug: n,
		name: i,
		brief: e.content || void 0,
		objective: c === "awareness" || c === "consideration" ? c : "conversions",
		product: t(e, "product") ?? i,
		offer: t(e, "offer"),
		url: t(e, "r"),
		promo: t(e, "code"),
		points: y(e, "point"),
		avoid: y(e, "avoid"),
		formats: y(e, "format").filter((e) => e === "host-read" || e === "post"),
		media: y(e, "media").filter((e) => e === "audio" || e === "video"),
		slots: y(e, "slot").filter((e) => m.includes(e)),
		start: Number(o),
		end: Number(s),
		budget: b(t(e, "budget")),
		cpm: b(t(e, "cpm")),
		topics: y(e, "t"),
		regions: y(e, "region"),
		languages: y(e, "language"),
		exclude: y(e, "exclude"),
		approval: t(e, "approval") === "read"
	};
}
function S(e, t) {
	let n = t.normalize("NFKD").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "FG";
	return `${e.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}${n}`;
}
function C(e, t, n) {
	let r = new URL(e);
	return r.searchParams.set("utm_source", "fairground"), r.searchParams.set("utm_medium", "host-read"), r.searchParams.set("utm_campaign", t), r.searchParams.set("utm_content", n.slice(0, 12)), r.toString();
}
function w(e, t, n) {
	let r = t > 0n ? Number(e * 1000n / t) : 0, i = n > 0 ? e / BigInt(n) : e, a;
	return n > 0 && n < 3 ? a = "Spread a test across at least three creators, so one show’s fit doesn’t decide the result." : r < 1e4 && (a = "This buys fewer than 10,000 listens; results may be too small to read."), {
		impressions: r,
		perCreator: i,
		warning: a
	};
}
var T = (e, t) => `${a.placement}:${e}:${t}`, E = (e) => [
	"spot",
	e.url,
	e.type,
	e.duration ? e.duration.toFixed(3) : "",
	...e.mp3 ? [
		String(e.mp3.version),
		String(e.mp3.sampleRate),
		String(e.mp3.channels),
		String(e.mp3.audioStart),
		String(e.mp3.audioEnd)
	] : []
];
function D(e) {
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
function O(e, r, i) {
	if (r.end <= r.start) throw Error("a placement must end after it starts");
	if (!r.spots.length || !r.slots.length) throw Error("a placement needs a recording and at least one slot");
	if (!/sponsor|paid|\bad\b/i.test(r.label)) throw Error("the label must disclose the sponsorship, e.g. “Sponsored by …”");
	let c = [
		["d", r.acceptance.id],
		[
			"e",
			r.acceptance.id,
			"",
			"sponsorship"
		],
		["p", t(r.acceptance, "p") ?? ""],
		[
			"flight",
			String(r.start),
			String(r.end)
		],
		["label", r.label],
		...r.slots.map((e) => ["slot", e]),
		...r.shows.map((e) => ["a", e]),
		...r.spots.map(E),
		["t", "ad"]
	];
	r.video && c.push(["scope", "video"]), r.link && c.push(["r", r.link]), r.code && c.push(["code", r.code]);
	let l = {
		kind: a.placement,
		created_at: r.created_at ?? s(),
		content: r.script ?? "",
		tags: c
	};
	return i ? o(l, e, i) : n(l, e);
}
function k(n) {
	let r = e(n, "sponsorship"), [, i, o] = l(n, "flight") ?? [], s = t(n, "label"), c = t(n, "p");
	if (n.kind !== a.placement || !r || t(n, "d") !== r || !s || !c || !i || !o) return;
	let u = n.tags.filter((e) => e[0] === "spot").map(D).filter((e) => !!e), d = y(n, "slot").filter((e) => m.includes(e));
	if (u.length && d.length) return {
		event: n,
		creator: n.pubkey,
		advertiser: c,
		acceptanceId: r,
		address: T(n.pubkey, r),
		slots: d,
		start: Number(i),
		end: Number(o),
		shows: y(n, "a"),
		video: y(n, "scope").includes("video"),
		spots: u,
		label: s,
		link: t(n, "r"),
		code: t(n, "code"),
		script: n.content || void 0
	};
}
function A(e, t, n, a) {
	let o = k(e);
	if (!o || !r(e)) return "placement is malformed or badly signed";
	if (e.tags.some((e) => e[0] === "pq")) {
		let t = a(e.pubkey);
		if (!t || !i(e, t)) return "placement has an invalid post-quantum signature";
	}
	if (o.creator !== t.pubkey) return "placement is by someone other than the creator";
	if (o.acceptanceId !== t.id) return "placement doesn’t reference the acceptance";
	if (o.advertiser !== n.advertiser) return "placement names a different advertiser";
	if (e.created_at < t.created_at || e.created_at > n.deadline) return "placed outside the agreed window";
	let s = n.terms;
	if (s?.flight && (o.start < s.flight.start - 86400 || o.end > s.flight.end + 86400)) return "placement runs outside the campaign dates";
	if (s?.slots.length && !o.slots.every((e) => s.slots.includes(e))) return "placement uses slots the offer didn’t include";
}
function j(e, n, r, i, c = "", l = s()) {
	let u = [
		[
			"e",
			r.id,
			"",
			"placement"
		],
		["a", `${a.placement}:${r.pubkey}:${t(r, "d")}`],
		["p", r.pubkey],
		["status", i]
	];
	return o({
		kind: a.approval,
		created_at: l,
		content: c,
		tags: u
	}, e, n);
}
function M(n, r, i) {
	let o = i(n.advertiser), s = r.filter((t) => t.kind === a.approval && t.pubkey === n.advertiser && e(t, "placement") === n.event.id).filter((e) => o && c(e, o)).sort((e, t) => t.created_at - e.created_at), l = s[0] && t(s[0], "status");
	return l === "approved" || l === "changes" ? l : void 0;
}
var N = 3;
function P(e, t) {
	let n = t.now ?? s();
	if (n < e.start || n >= e.end) return !1;
	let r = t.acceptances.find((t) => t.id === e.acceptanceId && t.pubkey === e.creator && t.kind === a.acceptance), i = r && p(r), o = i && d(i);
	if (!o || o.advertiser !== e.advertiser) return !1;
	let c = M(e, t.approvals, t.pqKeyOf);
	return c === "changes" ? !1 : !o.terms?.approval || c === "approved";
}
function F(e, t, n) {
	let r = t.filter((t) => t.creator === e.creator && P(t, n)).filter((t) => e.kind === "video" ? t.video : !t.shows.length || e.show !== void 0 && t.shows.includes(e.show)).sort((e, t) => e.start - t.start || (e.event.id < t.event.id ? -1 : 1)), i = (t) => e.kind === "video" ? t.spots.find((e) => e.type.startsWith("video/")) ?? t.spots.find((e) => e.type.startsWith("audio/")) : t.spots.find((e) => e.type.startsWith("audio/")), a = (e) => r.filter((t) => t.slots.includes(e) && i(t)).slice(0, 3).map((e) => ({
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
export { h as BRAND_SAFETY, g as CPM_GUIDE, N as MAX_ADS_PER_BREAK, m as SLOTS, M as approvalOf, F as breaksFor, _ as campaignAddress, j as createApproval, v as createCampaign, O as createPlacement, P as isLive, x as parseCampaign, k as parsePlacement, T as placementAddress, A as placementProblem, w as planBudget, S as promoCodeFor, C as trackedUrl };
