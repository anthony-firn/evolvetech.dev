import { _ as e, d as t, f as n, g as r, i, l as a, m as o, n as s, r as c, u as l } from "./pq-DdqIFRtl.js";
import { t as u } from "./pricing-dKU1SBIV.js";
// src/sponsorship.ts
function d(e) {
	if (e.kind !== o.offer) return;
	let [, r = "", i, a, s = ""] = t(e, "price") ?? [], c = n(e, "d"), l = n(e, "title"), d = n(e, "rail"), p = Number(n(e, "deadline"));
	if (c && l && d && a && i === "USD" && u(s) && /^[1-9]\d*$/.test(r) && Number.isSafeInteger(p)) return {
		event: e,
		advertiser: e.pubkey,
		slug: c,
		title: l,
		brief: e.content,
		price: {
			amount: BigInt(r),
			currency: i,
			index: a,
			basePeriod: s
		},
		rail: d,
		deadline: p,
		creator: n(e, "p"),
		terms: f(e)
	};
}
function f(e) {
	let r = n(e, "format");
	if (r !== "host-read" && r !== "post") return;
	let i = (t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), [, a, o] = t(e, "flight") ?? [];
	return {
		format: r,
		media: i("media").filter((e) => e === "audio" || e === "video"),
		slots: i("slot").filter((e) => m.includes(e)),
		flight: a && o && Number(o) > Number(a) ? {
			start: Number(a),
			end: Number(o)
		} : void 0,
		points: i("point"),
		avoid: i("avoid"),
		url: n(e, "r"),
		code: n(e, "code"),
		approval: n(e, "approval") === "read",
		campaign: n(e, "a")
	};
}
function p(e) {
	try {
		let t = JSON.parse(e.content);
		return t?.id === a(e, "offer") ? t : void 0;
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
}, _ = (e, t) => `${o.campaign}:${e}:${t}`;
function v(e, t) {
	if (t.end <= t.start) throw Error("a campaign must end after it starts");
	let n = [
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
	return t.offer && n.push(["offer", t.offer]), t.url && n.push(["r", t.url]), t.promo && n.push(["code", t.promo]), t.approval && n.push(["approval", "read"]), r({
		kind: o.campaign,
		created_at: t.created_at ?? l(),
		content: t.brief ?? "",
		tags: n
	}, e);
}
var y = (e, t) => e.tags.filter((e) => e[0] === t && e[1]).map((e) => e[1]), b = (e) => e && /^\d+$/.test(e) ? BigInt(e) : 0n;
function x(r) {
	let i = n(r, "d"), a = n(r, "title"), [, s, c] = t(r, "flight") ?? [], l = n(r, "objective");
	if (r.kind === o.campaign && i && a && s && c && e(r)) return {
		event: r,
		advertiser: r.pubkey,
		address: _(r.pubkey, i),
		slug: i,
		name: a,
		brief: r.content || void 0,
		objective: l === "awareness" || l === "consideration" ? l : "conversions",
		product: n(r, "product") ?? a,
		offer: n(r, "offer"),
		url: n(r, "r"),
		promo: n(r, "code"),
		points: y(r, "point"),
		avoid: y(r, "avoid"),
		formats: y(r, "format").filter((e) => e === "host-read" || e === "post"),
		media: y(r, "media").filter((e) => e === "audio" || e === "video"),
		slots: y(r, "slot").filter((e) => m.includes(e)),
		start: Number(s),
		end: Number(c),
		budget: b(n(r, "budget")),
		cpm: b(n(r, "cpm")),
		topics: y(r, "t"),
		regions: y(r, "region"),
		languages: y(r, "language"),
		exclude: y(r, "exclude"),
		approval: n(r, "approval") === "read"
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
var T = (e, t) => `${o.placement}:${e}:${t}`, E = (e) => [
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
function O(e, t, i) {
	if (t.end <= t.start) throw Error("a placement must end after it starts");
	if (!t.spots.length || !t.slots.length) throw Error("a placement needs a recording and at least one slot");
	if (!/sponsor|paid|\bad\b/i.test(t.label)) throw Error("the label must disclose the sponsorship, e.g. “Sponsored by …”");
	let a = [
		["d", t.acceptance.id],
		[
			"e",
			t.acceptance.id,
			"",
			"sponsorship"
		],
		["p", n(t.acceptance, "p") ?? ""],
		[
			"flight",
			String(t.start),
			String(t.end)
		],
		["label", t.label],
		...t.slots.map((e) => ["slot", e]),
		...t.shows.map((e) => ["a", e]),
		...t.spots.map(E),
		["t", "ad"]
	];
	t.video && a.push(["scope", "video"]), t.link && a.push(["r", t.link]), t.code && a.push(["code", t.code]);
	let c = {
		kind: o.placement,
		created_at: t.created_at ?? l(),
		content: t.script ?? "",
		tags: a
	};
	return i ? s(c, e, i) : r(c, e);
}
function k(e) {
	let r = a(e, "sponsorship"), [, i, s] = t(e, "flight") ?? [], c = n(e, "label"), l = n(e, "p");
	if (e.kind !== o.placement || !r || n(e, "d") !== r || !c || !l || !i || !s) return;
	let u = e.tags.filter((e) => e[0] === "spot").map(D).filter((e) => !!e), d = y(e, "slot").filter((e) => m.includes(e));
	if (u.length && d.length) return {
		event: e,
		creator: e.pubkey,
		advertiser: l,
		acceptanceId: r,
		address: T(e.pubkey, r),
		slots: d,
		start: Number(i),
		end: Number(s),
		shows: y(e, "a"),
		video: y(e, "scope").includes("video"),
		spots: u,
		label: c,
		link: n(e, "r"),
		code: n(e, "code"),
		script: e.content || void 0
	};
}
function A(t, n, r, a) {
	let o = k(t);
	if (!o || !e(t)) return "placement is malformed or badly signed";
	if (t.tags.some((e) => e[0] === "pq")) {
		let e = a(t.pubkey);
		if (!e || !i(t, e)) return "placement has an invalid post-quantum signature";
	}
	if (o.creator !== n.pubkey) return "placement is by someone other than the creator";
	if (o.acceptanceId !== n.id) return "placement doesn’t reference the acceptance";
	if (o.advertiser !== r.advertiser) return "placement names a different advertiser";
	if (t.created_at < n.created_at || t.created_at > r.deadline) return "placed outside the agreed window";
	let s = r.terms;
	if (s?.flight && (o.start < s.flight.start - 86400 || o.end > s.flight.end + 86400)) return "placement runs outside the campaign dates";
	if (s?.slots.length && !o.slots.every((e) => s.slots.includes(e))) return "placement uses slots the offer didn’t include";
}
function j(e, t, r, i, a = "", c = l()) {
	let u = [
		[
			"e",
			r.id,
			"",
			"placement"
		],
		["a", `${o.placement}:${r.pubkey}:${n(r, "d")}`],
		["p", r.pubkey],
		["status", i]
	];
	return s({
		kind: o.approval,
		created_at: c,
		content: a,
		tags: u
	}, e, t);
}
function M(e, t, r) {
	let i = r(e.advertiser), s = t.filter((t) => t.kind === o.approval && t.pubkey === e.advertiser && a(t, "placement") === e.event.id).filter((e) => i && c(e, i)).sort((e, t) => t.created_at - e.created_at), l = s[0] && n(s[0], "status");
	return l === "approved" || l === "changes" ? l : void 0;
}
var N = 3;
function P(e, t) {
	let n = t.now ?? l();
	if (n < e.start || n >= e.end) return !1;
	let r = t.acceptances.find((t) => t.id === e.acceptanceId && t.pubkey === e.creator && t.kind === o.acceptance), i = r && p(r), a = i && d(i);
	if (!a || a.advertiser !== e.advertiser) return !1;
	let s = M(e, t.approvals, t.pqKeyOf);
	return s === "changes" ? !1 : !a.terms?.approval || s === "approved";
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
