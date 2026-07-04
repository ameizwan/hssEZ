# HSSE e-PTW — open-source DIY starter

A working, installable **Progressive Web App (PWA)** for digital Permit-to-Work.
It implements the **full process flowchart**, end to end, for **6 permit types**
(Working at Height, Hot Work, Confined Space, LOTO, Excavation, Lifting):

**Login → Dashboard → Pick permit type → Capture (GPS, asset, risk, controls) → Compliance check (pass / gaps) → Approval chain (Supervisor → HSSE Officer → Area Authority) → Active permit (QR, validity timer, pre-work checklist gate, SIMOPS) → Start work → Site-inspection closeout → Reports / audit.**

Everything is **vanilla HTML/CSS/JS — no build tools, no frameworks, no paid services, no internet required to run.** Every checklist item is mapped to an OSHA/ISO/NFPA/ANSI clause. Data is stored on the device; each stage **gates** the next (compliance must pass before approval; all approvals before issue; pre-work checklist before work starts; inspection before close).

---

## 1. Run it — NO coding needed (5 minutes)

The easiest way (no command line, no install):

1. **Unzip** this folder onto your computer.
2. Open a browser and go to **app.netlify.com/drop**
3. **Drag the whole `hsse-ptw-app` folder** onto that page.
4. In ~20 seconds you get a live web link like `https://your-name.netlify.app` — that's your app, online.
5. Open that link **on your phone**, then **Add to Home Screen** (Android: ⋮ menu → Add to Home screen · iPhone: Share → Add to Home Screen).

You now have an app icon that opens full-screen, works offline, and saves permits on the phone. See **GUIDE_Launch_Your_App.pdf** for the same steps with more detail.

*(Developer option: `python3 -m http.server 8099` inside the folder, then open `http://localhost:8099`.)*

---

## 2. What's inside

| File | Purpose |
|------|---------|
| `index.html` | The whole app — UI + logic (≈1 file you can read top to bottom) |
| `sw.js` | Service worker → offline caching (the "works with no signal" part) |
| `manifest.json` | Makes it installable to the home screen |
| `icon-192/512.png` | App icons |
| `schema.sql` | Cloudflare D1 (SQLite) table definition |
| `functions/api/permits.js` | Pages Function — REST API backed by D1 |
| `functions/api/health.js` | Pages Function — D1 connectivity check |
| `wrangler.toml` | Cloudflare Pages + D1 binding config |

Data lives in the browser under `localStorage` key `hsse_permits_v3`, and — once deployed (see §4) — is also synced to a shared Cloudflare D1 database so multiple devices see the same permits. A demo permit is seeded on first launch.

---

## Safety controls (built in)

- **Revoke a permit (HSSE / Area Authority).** Open a permit, tap **Revoke permit (HSSE)**, and enter a mandatory reason. Status becomes `Revoked`, work stops, and the who/when/why is stored and printed on the PDF. Only users who logged in as **HSSE Officer**, **Area Authority** or **Admin** see this — pick that role at login.
- **Report unsafe condition.** Anyone on a permit can tap **Report unsafe condition** (e.g. when the applicant's declaration doesn't match site). It records the description + severity, immediately **flags the permit (STOP banner)**, sets SIMOPS to *clash*, and blocks work until a safety officer **Resolves** it or **Revokes** the permit. Every report is kept in the permit's unsafe-condition log and on the PDF.
- **Scan site QR.** The **Scan** tab opens the camera (Android Chrome uses the built-in BarcodeDetector — no library). Scanning a placard/permit QR opens that permit; scanning a site/asset code shows all permits at that site and lets you start a new one pre-tagged to it. A manual code box is provided for iPhone/desktop. *(The on-screen permit QR is currently decorative; to make it itself scannable, drop in `qrcode.min.js` (MIT) and replace `fauxQR()` — one function.)*

## 3. How to extend it yourself

- **Add a permit type:** copy the `WAH_CHECKS` array, make e.g. `HOTWORK_CHECKS`, and branch on `p.type`. The checklist content for Hot Work / Confined Space / LOTO / Excavation / Lifting is already written in your `ePTW_PreWork_Checklists.pdf` — paste the items straight in.
- **Add the compliance engine:** a simple function that returns missing items per type, shown as a red "gaps" screen before submit.
- **Add approval routing:** add a `status: 'submitted'` step and an approver signature before `active`.
- **Real QR:** drop in `qrcode-generator` (MIT, ~4 KB) and render the permit number to a canvas.

---

## 4. Go multi-user — Cloudflare Pages + D1 (built in)

The app now ships with a working multi-device backend: **Cloudflare D1** (Cloudflare's managed SQLite) plus a small **Pages Function** API, deployed together with the static site as one Cloudflare Pages project. No separate server to run.

**How it works:**
- `schema.sql` — the D1 table. Each permit is stored as a JSON blob (`data`) plus indexed `id/no/type/status` columns.
- `functions/api/permits.js` — `GET /api/permits` returns all permits; `POST /api/permits` upserts a batch (last-write-wins by `updatedAt`, checked server-side so a stale device can't clobber a newer edit).
- `functions/api/health.js` — `GET /api/health` sanity-checks the D1 binding.
- In `index.html`, `save()` still writes to `localStorage` first (instant, fully offline), then debounces a background push to `/api/permits`. On load and on `online`, the app pulls from D1 and merges anything newer than what's cached locally. If D1 isn't deployed yet, or the phone has no signal, everything just keeps working from `localStorage` — the sync calls fail silently and retry later.

**Deploy it:**

```bash
npm install -g wrangler        # Cloudflare's CLI
wrangler login                 # opens a browser to authorize your Cloudflare account

npm run db:create              # creates the D1 database — copy the printed database_id
# paste that database_id into wrangler.toml ([[d1_databases]] block)

npm run db:migrate:remote       # creates the `permits` table in the live D1 database
npm run deploy                  # publishes the static app + API as a Cloudflare Pages project
```

`wrangler pages deploy` prints your live `https://hsse-eptw.pages.dev` URL — open that on your phone and **Add to Home Screen** as before. Every device that installs it now reads/writes the same D1 database.

For local development with a local D1 copy: `npm run db:migrate:local` then `npm run dev` (serves the app + functions at `http://localhost:8788`).

**Known limitation:** the API has no authentication yet — anyone who can reach the deployed URL can read/write permits (matching the app's current client-side-only role picker, which is also not real auth). Before using this for anything beyond a pilot, put the Pages project behind **Cloudflare Access** (Zero Trust) or add a shared API key checked in the Pages Functions, and revisit the role-based access rules mentioned above.

---

## 5. Want real iOS / Android store apps later?

Rebuild the same screens in **Flutter** (open source, one codebase → both stores). Your existing design system (navy + amber/green/blue/red, monospace data) and checklist content port directly. Use the same PocketBase/Supabase backend. Do this only **after** a pilot proves value — the PWA above is enough to pilot on a real site this month.

---

## 6. Compliance notes (keep these as you grow)

- **Audit trail:** never hard-delete; mark records closed/superseded. Stamp every change with user + timestamp (+ GPS).
- **PDPA 2010 (Malaysia):** if you self-host for a client, keep their data in their tenant/VPS.
- **Standards traceability:** every checklist item already carries its clause — keep that mapping; it's what auditors and MAHB/PETRONAS procurement look for.

*Licence: do whatever you like with this starter. Built as a learning scaffold for C TWO Engineering.*
