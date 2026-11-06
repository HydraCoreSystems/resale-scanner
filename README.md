# Resale Scanner (working name)

Phone app for thrift, estate sale and flea market shoppers. Photograph or scan an item, see what it recorded sold for on eBay, and get a Buy, Close call or Pass call at the tag price after fees and shipping. Version one is iPhone only. The full spec is in `docs/SPEC_v1.md`.

## Layout

* `packages/core` Shared logic: median and middle range, sold row cleaning, fee and shipping math, the verdict rule. Plain TypeScript, no vendor code.
* `packages/server` The small server. Holds every vendor key. Naming (SerpApi Lens), barcode (UPCitemdb) and sold data (CompSniper) each sit behind an interface in `src/providers`, with a mock for each. Also accounts, scan quotas, history, cache and purchases.
* `apps/mobile` Expo and React Native app, one project, iPhone target. No vendor keys inside, no scraping.

## Run it

```
npm install
npm test             # core and server tests
npm run typecheck    # core and server
npm run typecheck -w @rs/mobile
npm run dev -w @rs/server
npm run start -w @rs/mobile
```

With no keys set the server runs on sample data and every response and screen says so. Copy `packages/server/.env.example` to `.env` and fill in only the keys you have. A missing key falls back to the mock for that vendor alone.

## Swapping a vendor

Implement `SoldProvider`, `NamingProvider` or `BarcodeProvider` from `packages/server/src/providers/types.ts` and pick it in `src/index.ts`. Nothing else changes. The second named sold data vendor (SoldComps) is not written yet because its request format was not in the spec or reachable docs. See `docs/OPEN_QUESTIONS.md`.

## Rules the code follows

* iPhone first. Apple sign in and Apple purchases only. No Android specific service anywhere, and one Expo project so Android later is a packaging step.
* The free build carries every feature. The only limit is the scan count from the spec: 5 free, then 100 a month on the subscription, then packs of 25.
* Nothing is bought before the app earns. Every vendor runs inside its free tier or on mock data.
* Photos are held in memory for one scan and never written to disk or the database.
* The app reports recorded sales and an estimate of what you would keep. It never says appraisal or value.
