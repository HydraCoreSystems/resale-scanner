# Browser preview for design review

Renders the real app screens in Chromium at iPhone size with a fake camera and the mock data server. It is a review aid only. Phone builds do not use anything in this folder.

1. Start the server with no vendor keys: `PORT=8787 USE_MOCK_BARCODE=1 npm run dev -w @rs/server`
2. Export the web build: `RS_WEB_PREVIEW=1 EXPO_PUBLIC_API_URL=http://localhost:8081 npx expo export --platform web --dev --output-dir <dir>` from `apps/mobile`
3. Serve it: `node tools/web-preview/serve.mjs <dir> 8081 http://localhost:8787`
4. Run `node tools/web-preview/shoot-walkthrough.cjs <outdir>` (needs Playwright).

The barcode frame needs a production export (drop `--dev`, use port 8082) because the browser camera loads its barcode scanner lazily. `shoot-barcode.cjs` does that shot.
Screenshots from the Nov 7 design pass are in `docs/design-pass`.
