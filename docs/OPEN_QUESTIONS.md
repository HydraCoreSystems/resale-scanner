# Open questions for Lotus

Nothing here blocks the build. Each item says what the code does now.

## Needed before real data flows

1. **Where will the server run?** The app needs a hosted address in `EXPO_PUBLIC_API_URL`. A phone cannot reach localhost. Until then the app points at localhost and only works in the simulator.
2. **Free vendor accounts.** Per the rules I opened none. Keys needed: `SERPAPI_KEY`, `COMPSNIPER_KEY`. UPCitemdb works with no key on its free tier. Until keys exist, naming and sold data run on mock data and every screen shows a "Sample data" banner.
3. **Apple setup.** A real bundle id (the app uses `com.placeholder.resalescanner`), Sign in with Apple, and three in app products created with these ids: `scanner.monthly`, `scanner.annual`, `scanner.pack25`. Set `APPLE_BUNDLE_ID` on the server to switch from dev sign in to real Apple token checks.
4. **Real purchase verification.** `UnconfiguredPurchaseVerifier` refuses every receipt on purpose. A real check needs Apple's signed transaction chain verification with Apple's root certificate. I did not write security code I cannot test against real Apple data. On the phone, `UnwiredStoreKitClient` throws a plain message. A StoreKit 2 library has to be chosen and tested against this SDK on a real device.
5. **Terms and privacy links.** Apple expects both on the subscription screen. Add the addresses when they exist.
6. **App icon and splash.** `apps/mobile/assets` is empty.

## Vendor details I could not confirm from public docs

These are marked UNVERIFIED in the code comments. The first free tier call settles each one.

* SerpApi: the Lens parameter that accepts an uploaded `image_id`. The upload call itself (POST https://serpapi.com/image, field `image`, returns `image_id`, 500 KB, 10 minutes) is confirmed from their Image API page.
* UPCitemdb: API host, the `upc` query parameter name, and the response field names.
* CompSniper: that `/v1/research/sold` takes the same parameters as `/v1/scrape`, and the exact types of the price fields. The server calculates its own median and range, so the vendor summary is not used.
* SoldComps, the named second vendor: no request format found. Not written. Spec says to exercise both in the test basket, so one more provider file is needed once its docs are in hand.

## Defaults I chose

* **Selling fee 13.6%** and per order fee **$0.30 up to $10, else $0.40.** Read from eBay's selling fees page on Nov 6, 2026. The spec asked for this to be confirmed at build time. Both are shopper editable.
* **Shipping estimate $7.00 flat.** The spec says "a shipping estimate" with no figure. This is a placeholder, editable by the shopper. Better would be a per category guess. Needs a decision.
* eBay charges its fee on the total including shipping and sales tax. The code applies it to the median sold price only. That slightly understates fees on items where buyers pay shipping. Flagged, not changed.
* Verdict thresholds (10 dollars, 40 percent, 5 sales) and pricing (5 free, 9.99 with 100 scans, packs of 25 for 2.99, 79.99 yearly) are straight from the spec.

## Behavior decisions worth a look

* **One scan is charged when naming succeeds.** A vendor failure or a barcode not in the database refunds it. Typed words with no photo cost one scan too. Re pricing the same scan costs nothing, capped at 4 tries per scan.
* **Condition question.** The spec says to ask condition when the spread of sold prices is wide. The spread is only known after pricing, so the question appears on the answer screen as New or sealed / Used chips that narrow the sales and recompute. It is not on the confirm screen.
* **Look back.** 90 days first. If fewer than 5 clean sales, it retries at 365 days.
* **History opens saved results** without re pricing, so reopening a scan at the register costs nothing and needs no signal to the vendors.
* **No rate limiting beyond scan counts** and no abuse controls yet. Fine for TestFlight on one phone. Needed before launch.
* **Storage** is a JSON file behind a `Store` interface. A real database should replace it before real users.
