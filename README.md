# YaadDrive

A peer-to-peer car rental app. Choose Renter or Host at sign-up, then switch modes anytime from Profile. Your cars, trips, and profile stay on the same account.

- **Server:** Node.js 20+, Express 5, PostgreSQL (`/server`)
- **Client:** Angular 20, standalone components + signals (`/client`)
- **Installable web app:** Angular service worker and PWA manifest/icons (`/client`)

## Features

| Area | What it does |
| --- | --- |
| App layout | Public welcome screen with YaadDrive branding, Sign in, and Create account. Signed-in users can open Explore, a full-screen map with price pins, search, and a nearby-cars sheet. |
| Accounts | Every member has one active role: Renter or Host. Hosts own/list cars; Renters are connected to cars through bookings. Members can switch modes from Profile. The active role is enforced by the API. Edit your contact details and Jamaican parish from Profile. Sign-in uses bcrypt-hashed passwords and JWT sessions. Driver's licence and national ID details are not collected in the sign-up form. |
| Listings | "List your car" bottom sheet: up to 8 photos, make, model, year, plate (owner-only), price stepper, weekends on/off, map pin, plus gearbox, fuel, seats, range and description. |
| Saved cars | Heart any car; saved cars appear on the Profile tab. |
| Search | Explore uses your GPS to show cars within 25 miles, nearest first by default. If location access is unavailable, choose a search area; the app does not show unfiltered cars. Filter by dates (only shows cars free for those dates), gearbox, fuel, seats, and max price; sort by price or rating. |
| Booking | Renter requests dates, Host accepts or declines, Renter pays, Host marks the trip complete. Either side can cancel before the trip starts. |
| No double-booking | Enforced by the database itself (a PostgreSQL exclusion constraint), so two renters can never get the same car on overlapping dates. |
| Payments | **Simulated** checkout: validates the card (Luhn, expiry), stores only brand + last 4 digits, never the full number or CVC. Cancelling a paid trip marks it refunded. |
| Reviews | After a completed trip, the Renter reviews the vehicle/Host and the Host reviews the Renter. One review each per trip. |
| Host dashboard | Earnings this month with change vs. last month, 6-month bar chart, pending requests with Approve / Decline, My cars with Listed / Booked / Unlisted status and an on-off switch, plus completed/declined/cancelled booking history. |

## Run it locally

You need Node 20+ and a PostgreSQL database.

```bash
# 1. Database (example using Docker; or use any Postgres you have)
docker run -d --name driveshare-db -p 5432:5432 \
  -e POSTGRES_USER=driveshare -e POSTGRES_PASSWORD=driveshare -e POSTGRES_DB=driveshare postgres:16

# 2. API
cd server
cp .env.example .env        # set JWT_SECRET to something long and random
npm install
npm run seed                # creates tables + demo data (optional)
npm run dev                 # http://localhost:3000

# 3. Web app (new terminal)
cd client
npm install
npm start                   # http://localhost:4200
```

Tables are created automatically on API start (`src/schema.sql` is idempotent). `npm run seed` **wipes** all data and loads demo users and vehicles, so don't run it against real data.

### Install as an app

The client is configured as an installable Progressive Web App (PWA). Build and deploy the production client to a host that serves it over **HTTPS**. See the deployment steps below for the Vercel and Render configuration.

- **iPhone/iPad:** Open the HTTPS site in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** Open the HTTPS site in Chrome and choose **Install app** / **Add to Home screen** when offered.
- **Desktop:** Use the browser's install icon or menu where supported.

The service worker caches the app shell and static assets; account, search, booking, and other API operations still require a network connection. A PWA install is separate from App Store / Play Store distribution.

## Native iOS and Android apps

The Angular client uses Capacitor to package the same app as native iOS and Android projects. Install Xcode for iOS and Android Studio (including the Android SDK) for Android.

```bash
cd client
npm install
npm run cap:ios       # build web assets, sync, and open the iOS project in Xcode
npm run cap:android   # build web assets, sync, and open the Android project in Android Studio
```

For an Android emulator, the API defaults to `http://10.0.2.2:3000`; for an iOS simulator it defaults to `http://localhost:3000`. Local HTTP is allowed only for those development hosts. A packaged native app needs an API URL reachable from the device over HTTPS. After changing the URL or web code, run `npm run cap:sync` before building in Xcode or Android Studio. App Store and Play Store distribution also require platform signing and store setup.

**Demo logins** (password `Password123!`): `marcus@example.com`, `keisha@example.com`, `devon@example.com`.

### Try the demo flow

1. Sign in as `devon@example.com` (Renter), open a car (e.g. the Honda CR-V), and request dates starting **today**.
2. Sign out, sign in as `marcus@example.com` → **Host** → **Accept** the request.
3. Back as Devon → **My trips** → **Pay now** with the demo card `4242 4242 4242 4242`, any future expiry, any CVC. This is simulated checkout only; do not enter a real payment card.
4. As Marcus → **Mark trip completed** (available once the trip has started), then both sides can leave a review.

## Configuration

- `server/.env`: `DATABASE_URL`, `JWT_SECRET` (required in production), `CLIENT_ORIGIN` (CORS), `PORT`.
- `client/src/app/core/util.ts`: `API_URL` and `CURRENCY`. Change `API_URL` to your HTTPS API when you deploy native apps.
- Demo seed data uses Jamaican locations and USD prices, and gives each demo account completed booking history; edit `server/src/seed.js` to taste.

## API overview

All under `/api`. 🔒 = requires `Authorization: Bearer <token>`.

```
POST /auth/register            POST /auth/login            GET /auth/me 🔒
GET  /vehicles                 (requires location or lat/lng; GPS searches use a 25-mile radius; filters: q, location, lat, lng, radiusMiles, start, end, minPrice, maxPrice, transmission, fuel, seats, sort)
GET  /vehicles/:id             GET /vehicles/mine 🔒
POST /vehicles 🔒              PUT /vehicles/:id 🔒        PATCH /vehicles/:id/status 🔒   DELETE /vehicles/:id 🔒  (unlists)
GET  /favorites 🔒             GET /favorites/ids 🔒       PUT|DELETE /favorites/:vehicleId 🔒
POST /uploads 🔒               (multipart field "image", JPEG/PNG/WebP ≤ 5 MB)
POST /bookings 🔒              GET /bookings/mine 🔒       GET /bookings/incoming 🔒
POST /bookings/:id/respond 🔒  { action: "accept" | "decline" }   (owner)
POST /bookings/:id/pay 🔒      POST /bookings/:id/cancel 🔒       POST /bookings/:id/complete 🔒
POST /reviews 🔒               GET /dashboard/owner 🔒
```

## Booking lifecycle

```
pending ──accept──▶ confirmed ──pay──▶ (paid) ──complete──▶ completed ──▶ reviews
   │                    │
   └─decline─▶ declined └─cancel─▶ cancelled (refunded if paid)
```

A booking holds `[start, end)`: the car is returned on the end date, so the next trip can start that same day.

## Map

The map uses Leaflet loaded from a CDN in `client/src/index.html` and OpenStreetMap tiles. OSM's tile servers are for light use only; before launch, switch the tile URL in `client/src/app/shared/vehicle-map.component.ts` to a hosted provider (MapTiler, Mapbox, Stadia, etc.). A car appears on the map once its owner has dropped a pin ("Use my location" in the listing sheet); cars without a pin still show in the list.

## Status of this build

The Angular production build and PWA artifacts have been verified. The API's location search and booking flows have been exercised locally. Hosting accounts still need to be configured; real payment processing and operational/legal review are also needed before accepting real rentals.

The demo car photos are bundled under `client/public/assets/demo-cars`; account avatars use initials.

### Deploy web app (Vercel + Render + Neon + R2)

The database is already part of the application: `server/src/schema.sql` defines PostgreSQL tables, `server/src/migrate.js` creates/updates them, and `server/src/db.js` connects using `DATABASE_URL`. Locally it uses the PostgreSQL instance on your computer. A remote host cannot access that local database, so production needs a hosted PostgreSQL service.

1. Create a PostgreSQL project on [Neon](https://neon.tech/) and copy its pooled connection string.
2. In [Render](https://render.com/), create a Blueprint from this repository and use the root `render.yaml`. Set `DATABASE_URL` to the Neon connection string and `CLIENT_ORIGIN` to your Vercel production URL (for example `https://yaadrive.vercel.app`). Render's first start applies the schema automatically. Keep the generated `JWT_SECRET`.
3. Create a private bucket named `yaadrive-vehicle-photos` in [Cloudflare R2](https://developers.cloudflare.com/r2/). Deploy the photo-storage Worker in `server/r2-worker` with `npx wrangler deploy`, then set its deployment URL as `R2_PROXY_URL` in Render and set the matching `R2_PROXY_TOKEN` secret there. The Worker writes to the private bucket; app-server filesystems are temporary.
4. In [Vercel](https://vercel.com/), import the repository, set the project Root Directory to `client`, and deploy. `client/vercel.json` builds Angular and proxies `/api` and `/uploads` to `https://yaadrive-api.onrender.com`. If Render assigns a different service URL, update both rewrite destinations.
5. Test `https://yaadrive-api.onrender.com/api/health`, then try sign-up and car search on Vercel. Render's free service may take a little while to wake up.

Do not commit credentials. Put database, JWT, and photo-storage tokens only in Render's environment settings. The free Render service may sleep when idle, and Neon free-tier limits apply; upgrade hosting for dependable real-user service.

## Before going to production

- Provision managed PostgreSQL and persistent object storage, deploy the client and API over HTTPS, and keep production secrets in the hosting provider's secret manager.
- Replace simulated checkout with a payment provider that supports your operating country, marketplace payments, identity checks, and Host payouts. Use the provider's hosted checkout/tokenization so raw card numbers and CVCs never touch this server.
- Add email/SMS notifications for new requests and status changes.
- Complete privacy, identity/driver eligibility, insurance, tax, consumer-protection, and marketplace terms review for the countries where YaadDrive will operate.
- Add image resizing for photos uploaded to Cloudflare R2.
- Add identity and driver's-licence verification, vehicle insurance details and a damage/deposit policy. These are the real-world risks in peer-to-peer rental.
- Add automated tests (Node's built-in test runner works well with the Express app exported from `src/index.js`).
- Put the API behind HTTPS and set `NODE_ENV=production`.
