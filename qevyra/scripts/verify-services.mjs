// QEVYRA service-line verification.
// Exercises every business type end-to-end over HTTP against a running dev
// server: website CTA wording (EN + NEP), track pages (EN + NEP), the homestay
// public-booking flow (no table token), worker (staff) ticket action, owner
// login, and the super-admin businesses list (emails + type visible).
//
// Usage:  node --env-file=.env scripts/verify-services.mjs
// Requires: next dev running on http://localhost:3000, DATABASE_URL in .env.

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SUPER_EMAIL = process.env.E2E_SUPER_EMAIL ?? "admin@qevyra.com";
const SUPER_PASSWORD = process.env.E2E_SUPER_PASSWORD ?? "Admin123!";
const NEW_PASSWORD = "Qevyra@123!";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

const results = [];

function cookieJar() { return new Map(); }
function jarCookie(jar) { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "); }
function storeCookies(jar, res) {
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1));
  }
}
async function req(method, path, { jar, json, query, raw } = {}) {
  const url = new URL(path, BASE);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const headers = { "Accept": "application/json" };
  if (jar && jar.size) headers["Cookie"] = jarCookie(jar);
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  const res = await fetch(url, { method, headers, body, redirect: "manual" });
  storeCookies(jar ?? cookieJar(), res);
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = null; }
  return { status: res.status, location: res.headers.get("location"), body: parsed, text, headers: res.headers };
}
async function login(email, password) {
  const jar = cookieJar();
  const csrf = await req("GET", "/api/auth/csrf", { jar });
  if (csrf.status !== 200) throw new Error(`csrf failed: ${csrf.status}`);
  const cb2 = await rawAuth(jar, email, password, csrf.body.csrfToken);
  const okJson = typeof cb2.body?.url === "string" && !String(cb2.body.url).includes("error=");
  const okRedirect = cb2.status >= 300 && cb2.status < 400 && !String(cb2.location ?? "").includes("error=");
  if (!okJson && !okRedirect) throw new Error(`credentials rejected (${cb2.status}): ${JSON.stringify(cb2.body)}`);
  const session = await req("GET", "/api/auth/session", { jar });
  return { jar, session: session.body };
}
async function rawAuth(jar, email, password, csrfToken) {
  const res = await fetch(new URL("/api/auth/callback/credentials", BASE), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jarCookie(jar),
    },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/admin` }).toString(),
    redirect: "manual",
  });
  storeCookies(jar, res);
  let parsed; try { parsed = await res.json(); } catch { parsed = null; }
  return { status: res.status, location: res.headers.get("location"), body: parsed };
}
function mark(ok, name, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  —  " + detail : ""}`);
}
async function step(name, fn) {
  try { mark(true, name, await fn()); return true; }
  catch (e) { mark(false, name, e?.message ?? String(e)); return false; }
}
async function expectPage(path, needles, opts = {}) {
  const r = await req("GET", path);
  if (r.status !== 200) throw new Error(`${path} returned ${r.status}${opts.allow ? "" : ""} (body: ${r.text.slice(0, 120)})`);
  const text = r.text;
  for (const n of needles) if (!text.includes(n)) throw new Error(`${path} missing "${n}"`);
  for (const n of opts.reject ?? []) if (text.includes(n)) throw new Error(`${path} should NOT contain "${n}"`);
  return `${path} ok`;
}
async function expectRedirect(path, jar, suffix) {
  const r = await req("GET", path, { jar });
  if (r.status < 300 || r.status >= 400) throw new Error(`${path} expected redirect, got ${r.status}`);
  const loc = r.location ?? "";
  if (!loc.endsWith(suffix)) throw new Error(`${path} redirected to ${loc}, expected …${suffix}`);
  return `${path} -> ${loc}`;
}

console.log("== Public websites (per-kind: menu vs track) ==");
// Track-kind websites: no booking CTA, just the live ticket-lookup box.
await step("dry-clean site shows track box", async () => expectPage("/b/kathmandu-dry-clean", ["Enter your ticket code", "Track"], { reject: ["Book"] }));
await step("garage site shows track box", async () => expectPage("/b/rapid-motor-garage", ["Enter your ticket code"], { reject: ["Book"] }));
await step("cleaning site shows track box", async () => expectPage("/b/sparkle-home-cleaning", ["Enter your ticket code"], { reject: ["Book"] }));
await step("repair site shows track box", async () => expectPage("/b/nepal-repair-hub", ["Enter your ticket code"], { reject: ["Book"] }));
await step("tailor site shows track box", async () => expectPage("/b/sitas-tailoring", ["Enter your ticket code"], { reject: ["Book"] }));
// Menu-kind websites: View Menu + Book, never ordering/tracking/QR.
await step("homestay site CTAs", async () => expectPage("/b/gorkha-homestay", ["Book a Room", "View Menu"], { reject: ["Order Now", "Track Service", "Print this QR"] }));
await step("restaurant site CTAs", async () => expectPage("/b/demo-restaurant", ["View Menu", "Book a Table"], { reject: ["Order Now", "Track Service", "Print this QR"] }));
await step("dry-clean site NEP track box", async () => expectPage("/b/kathmandu-dry-clean?lang=NEP", ["टिकट कोड"]));
await step("restaurant site NEP book", async () => expectPage("/b/demo-restaurant?lang=NEP", ["टेबल बुक गर्नुहोस्"]));
await step("menu page NEP", async () => expectPage("/r/demo-restaurant?lang=NEP", ["टेबलमा अर्डर उपलब्ध छ"]));
await step("track entry NEP", async () => expectPage("/track?lang=NEP", ["ट्र्याकिङ"]));

console.log("== Public track pages ==");
await step("track DRY-0001", async () => expectPage("/track/DRY-0001", ["DRY-0001", "In progress"]));
await step("track MOT-0001", async () => expectPage("/track/MOT-0001", ["MOT-0001"]));
await step("track SPK-0001", async () => expectPage("/track/SPK-0001", ["SPK-0001"]));
await step("track RPX-0001 (ready)", async () => expectPage("/track/RPX-0001", ["RPX-0001", "Ready"]));
await step("track FIT-0001 (tailor)", async () => expectPage("/track/FIT-0001", ["FIT-0001"]));
await step("track DRY-0001 NEP", async () => expectPage("/track/DRY-0001?lang=NEP", ["ट्र्याकिङ"]));

console.log("== Homestay public booking (no table token) ==");
const createdBookingIds = [];
await step("homestay book page SSR", async () => expectPage("/r/gorkha-homestay/book", ["Book Services", "Standard Room"]));
await step("availability by slug", async () => {
  const service = await prisma.bookableService.findFirst({ where: { restaurant: { slug: "gorkha-homestay" }, isActive: true } });
  if (!service) throw new Error("no homestay service");
  const date = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const r = await req("GET", "/api/customer/bookings/availability", { query: { slug: "gorkha-homestay", serviceId: service.id, date } });
  if (r.status !== 200) throw new Error(`expected 200 got ${r.status}: ${JSON.stringify(r.body)}`);
  if (!(r.body?.slots ?? []).length) throw new Error("no slots returned");
  return `slots=${r.body.slots.length} date=${date}`;
});
await step("create public booking", async () => {
  const postBooking = async (payload) => {
    let r = await req("POST", "/api/customer/bookings/public", { json: payload });
    if (r.status === 429) {
      console.log("   (public-booking rate-limit hit; waiting 61s)");
      await new Promise((res) => setTimeout(res, 61000));
      r = await req("POST", "/api/customer/bookings/public", { json: payload });
    }
    return r;
  };
  const service = await prisma.bookableService.findFirst({ where: { restaurant: { slug: "gorkha-homestay" }, isActive: true, venueCount: { gte: 1 } } });
  const date = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const slots = await (async () => {
    const r = await req("GET", "/api/customer/bookings/availability", { query: { slug: "gorkha-homestay", serviceId: service.id, date } });
    if (r.status !== 200) throw new Error(`availability ${r.status}`);
    return r.body?.slots ?? [];
  })();
  if (!slots.length) throw new Error("no free slot");
  const phone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
  const r = await postBooking({
    slug: "gorkha-homestay",
    serviceId: service.id,
    bookingDate: date,
    startMinutes: slots[0].startMinutes,
    durationMinutes: service.slotDurationMinutes,
    contactName: "Verify Guest",
    contactPhone: phone,
    guests: 2,
    note: "check-in around 14:00",
  });
  if (r.status !== 201 || !r.body?.id) throw new Error(`create failed ${r.status}: ${JSON.stringify(r.body)}`);
  createdBookingIds.push(r.body.id);
  return `id=${r.body.id} phone=${phone}`;
});
await step("my bookings by slug+phone", async () => {
  const service = await prisma.bookableService.findFirst({ where: { restaurant: { slug: "gorkha-homestay" } } });
  const phone = await prisma.booking.findUnique({ where: { id: createdBookingIds[0] } }).then((b) => b?.contactPhone);
  if (!phone) throw new Error("no booking");
  const r = await req("GET", "/api/customer/bookings/public", { query: { slug: "gorkha-homestay", phone } });
  if (r.status !== 200) throw new Error(`list failed ${r.status}`);
  if (!(r.body ?? []).some((b) => b.id === createdBookingIds[0])) throw new Error("created booking missing");
  return `found=${r.body.length}`;
});

console.log("== Worker (staff) flows ==");
const staffAccounts = [
  { email: "staff@dryclean.com", ticketCode: "DRY-0001", advance: true, type: "DRY_CLEANING" },
  { email: "staff@motorgarage.com", ticketCode: "MOT-0001", advance: true, type: "GARAGE" },
  { email: "staff@cleaning.com", ticketCode: "SPK-0001", advance: true, type: "CLEANING" },
  { email: "staff@repairhub.com", ticketCode: "RPX-0001", advance: false, type: "REPAIR" },
  { email: "staff@homestay.com", advance: false, type: "HOMESTAY" },
];
for (const s of staffAccounts) {
  await step(`worker login ${s.email}`, async () => {
    const r = await login(s.email, NEW_PASSWORD);
    if (r.session?.user?.role !== "RESTAURANT_ADMIN") throw new Error("not RESTAURANT_ADMIN");
    if (r.session?.user?.businessType !== s.type) throw new Error(`businessType ${r.session?.user?.businessType}`);
    return `${r.session.user.email} (${r.session.user.businessType})`;
  });
  if (s.type !== "HOMESTAY") {
    // Track-SaaS workers land on /track-admin, not the menu /admin.
    await step(`track worker routed to /track-admin ${s.email}`, async () =>
      expectRedirect("/admin", (await login(s.email, NEW_PASSWORD)).jar, "/track-admin"));
    await step(`track admin dashboard ${s.email}`, async () => {
      const jar = (await login(s.email, NEW_PASSWORD)).jar;
      const r = await req("GET", "/track-admin", { jar });
      if (r.status !== 200) throw new Error(`dashboard ${r.status}`);
      return "200";
    });
    await step(`track admin tickets page ${s.email}`, async () => {
      const jar = (await login(s.email, NEW_PASSWORD)).jar;
      const r = await req("GET", "/track-admin/tickets", { jar });
      if (r.status !== 200) throw new Error(`tickets ${r.status}`);
      if (!r.text.includes("Workflows")) throw new Error("tickets page missing Workflows link");
      return "200";
    });
  }
await step(`worker sees own tickets ${s.email}`, async () => {
      const jar = (await login(s.email, NEW_PASSWORD)).jar;
      const r = await req("GET", "/api/admin/track/tickets", { jar });
      if (r.status !== 200) throw new Error(`list ${r.status}: ${JSON.stringify(r.body)}`);
      const tickets = r.body?.tickets ?? [];
      if (s.ticketCode && !tickets.some((t) => t.trackingCode === s.ticketCode)) throw new Error(`${s.ticketCode} not listed`);
      return `count=${tickets.length}`;
    });
  if (s.advance) {
    await step(`worker advances ${s.ticketCode}`, async () => {
      const jar = (await login(s.email, NEW_PASSWORD)).jar;
      const list = await req("GET", "/api/admin/track/tickets", { jar });
      const tickets = list.body?.tickets ?? [];
      const ticket = tickets.find((t) => t.trackingCode === s.ticketCode);
      if (!ticket) throw new Error("ticket not found");
      if (["READY", "COMPLETED", "CANCELLED"].includes(ticket.status)) {
        return `already ${ticket.status}, skip`;
      }
      const r = await req("PATCH", `/api/admin/track/tickets/${ticket.id}`, { jar, json: { action: "advance" } });
      if (r.status !== 200 && r.status !== 201) throw new Error(`advance ${r.status}: ${JSON.stringify(r.body)}`);
      return `status=${r.body?.ticket?.status ?? r.body?.status ?? "ok"}`;
    });
  }
}
await step("worker cannot reach super-admin (403)", async () => {
  const jar = (await login("staff@dryclean.com", NEW_PASSWORD)).jar;
  const r = await req("GET", "/api/super-admin/activity", { jar });
  if (r.status !== 403) throw new Error(`expected 403 got ${r.status}`);
  return "403";
});

console.log("== Owner flows ==");
const ownerAccounts = [
  { email: "owner@dryclean.com", admin: "/track-admin" },
  { email: "owner@motorgarage.com", admin: "/track-admin" },
  { email: "owner@cleaning.com", admin: "/track-admin" },
  { email: "owner@repairhub.com", admin: "/track-admin" },
  { email: "owner@homestay.com", admin: "/admin" },
];
for (const o of ownerAccounts) {
  await step(`owner login + admin shell ${o.email}`, async () => {
    const r = await login(o.email, NEW_PASSWORD);
    if (r.session?.user?.role !== "RESTAURANT_ADMIN") throw new Error("bad role");
    const page = await req("GET", o.admin, { jar: r.jar });
    if (page.status !== 200) throw new Error(`admin shell ${o.admin} returned ${page.status}`);
    return r.session.user.email;
  });
}
await step("homestay owner is menu-kind (routed to /track-admin would be wrong)", async () =>
  expectRedirect("/track-admin", (await login("owner@homestay.com", NEW_PASSWORD)).jar, "/admin"));
await step("track owner website editor", async () => {
  const jar = (await login("owner@dryclean.com", NEW_PASSWORD)).jar;
  const r = await req("GET", "/track-admin/website", { jar });
  if (r.status !== 200) throw new Error(`website editor ${r.status}`);
  if (!r.text.includes("Google review link")) throw new Error("review field missing");
  return "editor with review field";
});

console.log("== Super-admin overview ==");
await step("super-admin login", async () => {
  const r = await login(SUPER_EMAIL, SUPER_PASSWORD);
  if (r.session?.user?.role !== "SUPER_ADMIN") throw new Error("not SUPER_ADMIN");
  return r.session.user.email;
});
await step("super-admin businesses page shows emails + types", async () => {
  const jar = (await login(SUPER_EMAIL, SUPER_PASSWORD)).jar;
  const r = await req("GET", "/super-admin/restaurants", { jar });
  if (r.status !== 200) throw new Error(`page ${r.status}`);
  for (const n of [
    "Gorkha Hills Homestay", "owner@homestay.com", "Kathmandu Laundry &amp; Dry Clean", "owner@dryclean.com",
    "Rapid Motor Garage &amp; Showroom", "owner@motorgarage.com", "Sparkle Home Cleaning", "owner@cleaning.com",
    "NEP Repair Hub", "owner@repairhub.com", "Sita's Tailoring",
  ]) {
    if (!r.text.includes(n)) throw new Error(`missing "${n}"`);
  }
  return "all businesses + emails present";
});
await step("super-admin dashboard shows breakdown", async () => {
  const jar = (await login(SUPER_EMAIL, SUPER_PASSWORD)).jar;
  const r = await req("GET", "/super-admin", { jar });
  if (r.status !== 200) throw new Error(`page ${r.status}`);
  for (const n of ["Homestay", "Dry cleaning", "Garage / showroom", "Repair service"]) {
    if (!r.text.includes(n)) throw new Error(`missing "${n}"`);
  }
  return "type breakdown present";
});

console.log("== Cleanup ==");
try {
  if (createdBookingIds.length) await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
  console.log("CLEANUP  removed test bookings");
} catch (e) {
  console.log("CLEANUP  WARNING: " + e.message);
} finally {
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.ok);
console.log("");
console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("Failed:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}