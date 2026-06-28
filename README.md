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

Data lives in the browser under `localStorage` key `hsse_permits_v1`. A demo permit is seeded on first launch.

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

## 4. Go multi-user — still 100% open source

The single-file app stores data **on one phone**. To share permits across a team, swap `localStorage` for a tiny self-hosted backend. Two open-source options:

### Option A — PocketBase (easiest, recommended)
One Go binary. Auth + database + file storage + REST API + admin UI. Runs on a $5/month VPS.

```bash
# download the binary for your OS from pocketbase.io, then:
./pocketbase serve
# admin UI at http://127.0.0.1:8090/_/  — create a "permits" collection
```

Suggested `permits` collection fields: `no` (text), `type` (text), `status` (select: draft/active/closed), `asset` (text), `location` (json), `risk` (json), `checks` (json), `signature` (file or text), `applicant` (text), `activatedAt` (date), `closedAt` (date). Turn on the built-in **users** collection for login, and set **API rules** so a worker sees only their site's permits (that's your role-based access).

Then replace the storage functions in `index.html`:

```js
const API = 'https://your-server/api/collections/permits/records';
const token = localStorage.getItem('pb_token'); // from the login call
const headers = { 'Content-Type':'application/json', 'Authorization': token };

async function load(){ const r = await fetch(API, {headers}); return (await r.json()).items; }
async function create(p){ await fetch(API, {method:'POST', headers, body:JSON.stringify(p)}); }
async function update(id,p){ await fetch(`${API}/${id}`, {method:'PATCH', headers, body:JSON.stringify(p)}); }
```

Keep `localStorage` as the **offline queue**: write locally first, then POST to PocketBase when `navigator.onLine` — that's your offline-sync.

### Option B — Supabase
Open-source Postgres + row-level security if you prefer SQL and want dashboards/SQL reporting. Same idea: a `permits` table, RLS policies per role, and the JS client (`@supabase/supabase-js`) instead of `fetch`.

---

## 5. Want real iOS / Android store apps later?

Rebuild the same screens in **Flutter** (open source, one codebase → both stores). Your existing design system (navy + amber/green/blue/red, monospace data) and checklist content port directly. Use the same PocketBase/Supabase backend. Do this only **after** a pilot proves value — the PWA above is enough to pilot on a real site this month.

---

## 6. Compliance notes (keep these as you grow)

- **Audit trail:** never hard-delete; mark records closed/superseded. Stamp every change with user + timestamp (+ GPS).
- **PDPA 2010 (Malaysia):** if you self-host for a client, keep their data in their tenant/VPS.
- **Standards traceability:** every checklist item already carries its clause — keep that mapping; it's what auditors and MAHB/PETRONAS procurement look for.

*Licence: do whatever you like with this starter. Built as a learning scaffold for C TWO Engineering.*
