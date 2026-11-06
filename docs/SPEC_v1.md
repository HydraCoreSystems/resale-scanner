# Resale Scanner: Version One Spec

Status: research complete, ready for a build brief. Written November 6, 2026.
Working name only. The real name is Phil's to coin, the way Skrybix was.

## What the product is, in plain words

A phone app for people who buy at thrift stores, estate sales, garage sales and flea markets and sell what they buy online. The shopper points the camera at an item, or scans its barcode, or photographs its price tag. The app names the item, looks up what that item actually sold for online in recent months, and answers three things on one screen: what it sold for, the honest range around that number, and a clear call on whether to buy it at the tag price in front of them. The shopper types the tag price, and the call accounts for selling fees and shipping, so the number on screen is the money they would actually keep.

The whole product is speed and trust. A shopper standing in an aisle will not do research. They will take one clear answer that shows the real sales behind it.

## Who it is for

Part time and full time resellers who source in person and sell mostly on eBay. That is the buyer every rival in this space is chasing, and the pricing in this spec is set against what those rivals charge today.

## Platform order, settled

Settled by Phil on November 6, 2026: version one ships on iPhone first. His reason: Apple asks for no testers, while Google Play production access requires 12 testers opted in for 14 days, and he cannot count on recruiting Google testers. Android follows later, once that tester gate can be met.

Rules that follow from this:

* Version one is built, tested and submitted for iPhone only.
* Payments in version one are Apple subscriptions only.
* Nothing in the version one design may depend on Android shipping at the same time. No Android only services, no design choices that only make sense with both stores live.
* The code base stays one Expo project, so the Android build later is a packaging and store step, not a rewrite.
* Testing runs through TestFlight on Phil's own phone.

## Version one scope

In scope:

1. Photo scan. One photo of the item, or of the item with its price tag.
2. Barcode scan for packaged goods that carry a printed code.
3. A confirm screen. The app shows its best guess at what the item is, plus two alternate guesses, and the shopper taps the right one or edits the words before any pricing happens. This screen exists because a wrong name is the largest source of wrong prices.
4. Sold price lookup on eBay sales from the last 90 days, with a longer look back when sales are thin.
5. The answer screen: item name, median sold price, the middle range of sold prices, how many sales back the number, the date of the most recent sale, and the list of actual sold listings behind the number, each with its price and date.
6. Tag price entry and the verdict: Buy, Close call, or Pass, with the fee and shipping math shown in plain numbers.
7. Scan history, saved to the account, so a shopper can find a scan again at the register or in the car.
8. Accounts and subscription handling through Apple.

Out of scope for version one:

* Listing items for sale, or any posting to any marketplace.
* Inventory, stock rooms, or profit books beyond the single scan verdict.
* Sold data from any marketplace other than eBay.
* Android.
* Any wording that calls the result an appraisal or a certified value. The app reports recorded sales. It never claims to value an item the way an appraiser does.
* Team accounts, shared accounts, or a web version.

## How one scan flows

1. The shopper photographs the item or scans its barcode.
2. The app sends the photo or the code to our server. Vendor keys live on the server and never inside the app.
3. The server names the item. A barcode goes to a barcode database for the product name. A photo goes to an image match service for its best matches.
4. The app shows the confirm screen. Nothing is priced until the shopper confirms the name.
5. The server searches recorded sales using the confirmed words, throws out rows that plainly name a different item, and computes the median, the middle range and the sale count.
6. The shopper types the tag price. The app subtracts the selling fee and a shipping estimate from the median sold price, compares what is left with the tag price, and gives the call.

The verdict rule, which is our own design and not a sourced fact: Buy when the expected keep clears the tag price by a margin the shopper sets, with a starting default of at least 10 dollars of expected profit and at least 40 percent over cost. Close call when the keep is above the tag price but under the margin. Pass when the keep is at or under the tag price. When fewer than 5 sales back the number, the app shows Not enough sales instead of a call. Testing will tune these defaults.

## The data plan

### Naming the item

Chosen route: the Google Lens API sold by SerpApi. SerpApi's own documentation describes a Lens search that takes either a public image address or an image uploaded through its Image API, and returns visual matches and exact matches carrying title, link, source and, where present, price and stock state. Uploaded images must be JPG, PNG or WebP and at most 500 KB, and an uploaded image id expires after 10 minutes, which is long enough for one scan. Each Lens call counts as one search on the SerpApi plan. SerpApi plan prices, as checked by pricing roundups in late October and early November 2026: a free plan with 250 searches a month, then 25 dollars a month for 1,000 searches, 75 dollars for 5,000, 150 dollars for 15,000, and 275 dollars for 30,000. That is 2.5 cents a search on the smallest paid plan, falling to about 1 cent a search at the 15,000 tier.

Why this route: Google sells no Lens API of its own, so a reseller of Lens results is the only way in. The match titles Lens returns double as the search words for the sold price lookup, which keeps the flow to one photo and one confirm tap.

Routes that do not work:

* Bing Visual Search is gone. Microsoft retired the whole Bing Search API family, Visual Search included, on August 11, 2025, per Microsoft Learn.
* eBay's own image search exists inside its Browse API as a method that takes a Base64 image and returns matching listings, per eBay's Browse API documentation. Two limits keep it out of version one: it returns items for sale now, meaning asking prices, not sold prices; and an eBay SDK reference describes the method as experimental and open only to developers approved by eBay business units. That gating is reported by the SDK document and not yet tested by us, so it is marked unverified in the list at the end of this spec. The Browse API stays useful later as a free source of current asking prices to show beside sold prices.

Known weakness of the chosen route: Lens is weakest exactly where thrift value hides, in vintage and handmade goods with no packaging and no twin anywhere online. The confirm screen and the alternate guesses are the guard. When Lens finds nothing solid, the app must say so plainly and offer typed words instead of inventing a name.

### What it sold for

The honest bottleneck, stated plainly: sold prices are the whole product, and eBay has closed every direct door to them.

* The old Finding API call that returned completed sales was decommissioned in February 2025, per CompSniper's developer guide and the eBay sold data roundups.
* eBay's own sold data API, Marketplace Insights, is a limited release. eBay's developers program page lists it as a limited release for approved partners, and independent guides report that eBay describes it as restricted and not open to new users. It returns about 90 days of sold history, searched by keyword, product number or category. We may apply. We may not plan on getting in.
* The Browse API is open and free with a developer account, but it returns current listings only. Asking prices are not sold prices, and eBay developer support says so outright, per the CompSniper guide.
* The research tool once called Terapeak is now called Product Research and lives inside eBay Seller Hub. Guides checked in October and November 2026 agree it is free to sellers with Seller Hub access and shows up to three years of sales. It is also a tool a human uses while signed in. It has no developer API and no export route an app can build on, so it cannot power this product. It matters to us as the ground truth checker in the test plan below.
* Since around the middle of 2026, eBay shows sold search results only to signed in users, per Scavio's October 2026 testing and CompsAPI's own write up. That change killed the free route of reading public sold pages and is the reason a market of paid sold data vendors exists at all.

Chosen route: buy sold data from a small third party vendor, through our server, behind an interface our code can swap. First candidate is CompSniper, for these sourced reasons: its published prices are 100 free requests a month, then 9 dollars a month for 2,000 requests, 29 dollars for 10,000 and 79 dollars for 50,000; one request returns up to 240 sold rows with price, date, condition and shipping, plus a ready made summary with median and the 25th and 75th percentile; it carries up to three years of history and the accepted price on Best Offer sales; and it also covers Poshmark, Mercari, TCGplayer, Grailed and Depop on the same key, which leaves a door open after version one. In a blind accuracy test of 100 searches run on October 20, 2026, CompSniper returned 6.3 percent wrong item rows, the fewest of the five vendors tested, and its median landed 5.0 percent from the true median. That test was run and published by ebaysoldlistings.com, which sells a rival service, so treat its numbers as a lead to recheck in our own test basket, never as settled fact. The same test put CompsAPI at 28.8 percent wrong rows, which is why CompsAPI is not the first candidate despite similar prices: a free tier of 100 requests a month and paid plans from 9 dollars a month for 5,000 searches, with up to 1,095 days of history, per CompsAPI's own pages. SoldComps is the named second candidate, at the same headline prices as CompSniper (100 free requests a month, then 9, 29 and 79 dollars for 2,000, 10,000 and 50,000 requests), covering about 90 days across 8 eBay sites, per its own comparison page with prices verified in July 2026 and Scavio's check on October 27, 2026.

What this dependence means: these vendors keep supply by holding signed in eBay sessions, which is an operations cost and a fragility they carry and we inherit. If eBay blocks their route or a vendor closes, our prices stop. The design answers: all sold data calls pass through our server, the vendor sits behind one swappable module, results are cached so repeat scans of common items cost nothing, both named vendors get exercised in the test plan, and no contract runs longer than a month.

### The barcode route, and its limits

Chosen route: UPCitemdb. Its own API page lists a free Explorer tier with 100 combined requests a day and no signup, a Dev plan at 99 dollars a month for 20,000 lookups a day, and a Pro plan at 699 dollars a month. A lookup returns the product title, brand, model, description and merchant offers. A ShopSavvy comparison checked on October 12, 2026 notes its offers leave out Amazon and eBay, which is fine for us: we need the name, not its offers, because the name becomes the search words for sold data.

What a barcode can do: name a packaged retail product exactly and instantly, above all media, games, toys in boxes, small appliances and sealed goods. It skips the photo match and its errors.

What a barcode cannot do:

* Most thrift and estate goods have no barcode at all. Anything made before barcodes, handmade goods, loose items and most clothing carry no code to scan.
* One code names a product as packaged, not the exact variant. Size, color and edition can share one code while selling at very different prices.
* A thrift store sticker is a store code, not a product code, and price tag photos help the shopper, not the lookup.
* A code says nothing about condition, and condition moves used prices more than identity does. The confirm screen must ask condition in plain words when the spread of sold prices is wide.
* Codes miss databases often enough to plan for. One barcode vendor guide puts the not found rate between 8 and 30 percent depending on what is scanned. That figure is a vendor claim, marked as such, and our test basket will measure our own rate.

### Price math on our side

The vendor returns rows. Our server does the judging: drop rows whose titles plainly name another product, drop parts and accessories when the scan was a whole item, then compute the median and the middle range from what survives, and count the sales. The answer screen always shows the surviving sold listings themselves, because resellers trust a number they can audit and rivals' reviews show they punish one they cannot.

## What rivals charge and what users say

* Underpriced AI is the closest rival: photo, barcode or screenshot in, an identification, recent eBay sold listings, fee and shipping math, and a buy or skip call. Its store listing, with data updated October 31, 2026 per AppBrain, prices 5 free checks, then a Reseller plan at 9.99 dollars a month for 75 checks, Pro at 14.99 dollars for 200 checks and Ultra at 24.99 dollars for 500 checks. Its own website lists different numbers (scan packs from 3 dollars for 5 scans and plans from 5 dollars a month for 30 scans), so its prices move around; both figures are reported here because neither could be called the one true price. A rival comparison published in April 2026 praises its sold data across six marketplaces as its strength and names its weakness plainly: monthly scan limits burn up in a single morning of heavy sourcing. That weakness is real for every per scan product, ours included, and it shapes the pricing model below.
* WorthPoint is the deep archive: hundreds of millions of sold records by reviewer counts, entry at 29.99 dollars a month on the web with a 7 day trial, or 26.99 dollars a month in the App Store, per the reviews cited at the end. Users and reviewers praise the depth for antiques and rare items. The complaints repeat across reviews: no free tier, no photo identification (the searcher must already know the words), a poorly rated app (2.1 stars on iPhone per one review), and billing and cancellation fights. WorthPoint proves buyers pay real money for sold data. It also leaves the fast in store scan wide open.
* PriceCharting owns the collectible aisles: video games, trading cards, comics, coins, LEGO and Funko, with free lookups, a Collector plan at 6 dollars a month, and a Legendary plan at 49 dollars a month that carries its API at one call a second. A plan summary notes its data is licensed for internal use and that showing it to third parties takes a commercial license and written permission, so it is not a data source we can build on. It is proof that narrow and deep wins in one aisle at a time.
* The free rivals set the bar: the eBay app itself scans and photographs items and shows sold results to a signed in user, and Google Lens names items for free. Neither gives the fee math, the verdict, or a saved sourcing history in one place. Our price has to be earned on speed and the call, not on data nobody else can reach.

## Our pricing model

* Free: 5 scans, no card. Enough to prove the answer screen in one store visit.
* Paid: 9.99 dollars a month with 100 scans included, then scan packs of 25 for 2.99 dollars. An annual plan at 79.99 dollars once the monthly plan proves itself.
* The cost check, which is our arithmetic on the vendor prices cited above: one scan costs one Lens search (2.5 cents on the smallest SerpApi plan, 1.5 cents on the 5,000 plan) plus one sold data request (about 0.3 cents at the 10,000 request tier, about 0.45 cents at the 2,000 tier). Call it 2 to 5 cents of data per scan at our expected scale. One hundred scans cost roughly 2 to 5 dollars of data against 9.99 dollars of price, before store fees. The allowance cap is what keeps a power user from breaking that math, and packs turn heavy mornings into revenue instead of loss.
* The selling fee default inside the verdict math needs one confirmed figure at build time. It is listed as unverified below rather than guessed here.

## Build shape

Same stack and same working pattern as Skrybix:

* Expo and React Native, one project, iPhone target first.
* Claude writes the code from a written brief. Lotus packages builds, runs the checks, verifies on Phil's real phone, and only then calls a build done.
* A small server holds every vendor key, runs Lens, the barcode lookup and the sold data calls, cleans the rows, computes the numbers and caches results by item name so repeat scans are fast and cheap.
* The app itself holds no vendor keys and does no scraping of anything.
* Subscriptions run through Apple. Scan counts are enforced on the server against the account.
* Photos go to the server only as part of a scan, are passed to the image service, and are not kept after the scan completes.

## Risks

* Vendor dependence is the founding risk. Sold data comes from small companies whose supply rests on signed in eBay sessions. Mitigations live in the data plan above: swappable module, two vendors tested, caching, monthly terms only.
* eBay can tighten again. It moved sold results behind a login in the middle of 2026 with no announcement, per the vendor write ups cited above. Any further tightening lands on our vendors first and on us second, and there is no version of this product that escapes that.
* Wrong names and wrong rows. Lens can name the wrong item, above all vintage goods, and even the best tested sold data vendor returned some wrong rows. The confirm screen, the cleaning rules, showing the listings behind the number, and refusing to call thin data are the product's honesty features, not polish.
* Cost creep from heavy users. Answered by allowances and packs, enforced on the server.
* Store review. Apple will read the claims we make. The app reports recorded sales and estimates a keep after fees. It must never promise values, returns or appraisals.
* Incumbents. Underpriced AI already does much of this and WorthPoint owns depth. Our ground is a lower price, a faster aisle flow, and a verdict a shopper can act on in seconds.

## First test plan, with real items

Run before any store submission, on Phil's iPhone, in two thrift stores and at one estate sale. Buy nothing for the test beyond what Phil would buy anyway.

The basket: 25 items fixed in advance across these groups, with tag prices written down before scanning: 3 video games (one with a barcode, one loose disc or cartridge, one complete in box), 3 small kitchen appliances, 2 pairs of brand name shoes, 2 board games, 3 vinyl records, 1 branded handbag, 2 power tools, 3 pieces of vintage ceramics or glass with no barcode, 2 items of clothing with tags, 2 consumer electronics with model numbers, 1 grow light with a barcode, 1 plant related item with no barcode.

For each item: photograph it under store light, scan the barcode if one exists, record what the app names it, whether the confirm screen's first guess was right, the median and range the app returns, the sale count, and the time from opening the camera to the answer screen.

Ground truth, built by hand the same week for the same 25 items: eBay sold search while signed in, and Product Research inside Seller Hub, with the hand median and sale count recorded.

Pass bars, set now so the test cannot grade itself kindly:

* First guess identification right on at least 20 of 25 items, counting a barcode scan as its own track.
* App median within 15 percent of the hand median on at least 18 of the correctly named items.
* Verdict agrees with the hand math on at least 20 of 25 items at their real tag prices.
* Not enough sales shown, honestly, on every item where the hand check also finds thin sales.
* A full scan, photo to answer, under 30 seconds on store signal for at least 20 of 25 items. This is a target we set, not a measured fact.

Run the same 25 items through the second sold data vendor for at least 10 of them, and through Underpriced AI's free checks and the eBay app for 10 of them, and record where each stands on the same bars. Vendor choice for launch follows this basket, not the rival published test.

Free tiers make this test cheap: SerpApi gives 250 searches a month free, CompSniper and SoldComps each give 100 requests a month free, and UPCitemdb gives 100 requests a day free, per the vendor pages cited above. No accounts were opened and nothing was signed up for during this research. Opening the free vendor accounts is a build phase step for Phil to approve, since it is his name on the accounts.

## Sources read for this spec

All read on November 6, 2026 unless a different check date is named.

* SerpApi documentation: the Google Lens API pages and library guides, for how a Lens search takes an image address or an uploaded image id, what the matches carry, the 500 KB limit and the 10 minute image id life.
  https://serpapi.com/google-lens-visual-matches-api
* SerpApi plan prices as checked by PrismCrawl on November 2, 2026 and by Katteb on October 16, 2026, and listed by ToolRadar on November 1, 2026: free 250 searches, then 25, 75, 150 and 275 dollars by tier.
  https://www.prismcrawl.com/blog/serpapi-pricing
* Microsoft Learn, Bing Search Services documentation: the public Bing Search and Custom Search APIs, Visual Search among them, were retired on August 11, 2025.
  https://learn.microsoft.com/en-us/previous-versions/bing/search-apis/
* eBay Browse API documentation: search by keyword, product number, category and image (the search by image method takes a Base64 image), returning listings for sale now.
  https://developer.ebay.com/api-docs/buy/static/api-browse.html
* eBay Developers Program, get started on a buying application: the Marketplace Insights API retrieves the sales history of items sold on eBay and is a limited release intended for approved partners.
  https://www.edp.ebay.com/develop/get-started/get-started-on-a-buying-application
* CompSniper developer guides and its Python package page: no public eBay sold API, the Finding API decommissioned on February 4, 2025, Marketplace Insights restricted and not open to new users, CompSniper prices, row counts, summary fields and marketplace coverage.
  https://compsniper.com/pricing
* ebaysoldlistings.com, the 9 best eBay sold listings APIs, tested October 20, 2026: the blind accuracy test figures and the price checks for CompSniper, SoldComps, CompsAPI and the eBay Sold Listings API. A rival vendor's publication; used as a lead, not as proof.
  https://ebaysoldlistings.com/blog/best-ebay-sold-listings-api
* SoldComps comparison page, prices verified July 2026, and Scavio's eBay price data comparison checked October 27, 2026: SoldComps tiers and 90 day coverage, and the finding that a sold search on eBay now demands a signed in user.
  https://sold-comps.com/alternatives
* CompsAPI blog and product pages: free tier, paid plans from 9 dollars a month, up to 1,095 days of history, and its account of the login wall on sold results.
  https://compsapi.com/blog/scraping-ebay-sold-listings-python
* Product Research (the tool once called Terapeak) guides by easync and super ds, checked in October and November 2026: free inside Seller Hub, up to three years of sales, no separate subscription, no developer route.
  https://easync.io/articles/how-to-use-terapeak/
* UPCitemdb API page: Explorer free at 100 combined requests a day, Dev at 99 dollars a month for 20,000 lookups a day, Pro at 699 dollars a month, and what a lookup returns.
  https://upcitemdb.com/api
* ShopSavvy product data API comparison, checked October 12, 2026: UPCitemdb offers leave out Amazon and eBay.
  https://shopsavvy.com/compare/product-data-apis
* PackSnap barcode data guide: not found rates for barcode lookups between 8 and 30 percent, stated there as a general figure. A vendor claim.
  https://packsnap.opron.ai/blog/barcode-product-data-api-comparison-2026
* AppBrain listing for Underpriced: Thrift Scanner AI, data updated October 31, 2026: what the app does and its store prices for check allowances.
  https://www.appbrain.com/app/underpriced-thrift-scanner-ai/com.underpriced.app
* Underpriced AI's own site: its scan pack and plan prices, which differ from its store listing, and how it describes its sold data sources.
  https://underpricedai.com/reseller-app
* Profit Prophet comparison of reselling apps, April 2026: praise for Underpriced AI's six marketplace sold data and the complaint that scan limits burn in one morning.
  https://www.profitprophet.co.uk/blog/best-ai-reselling-apps-compared
* WorthPoint reviews by bestantiqueapps and valueidentifier.app, checked October 2026: prices, the 7 day trial, no free tier, no photo identification, app ratings and billing complaints.
  https://bestantiqueapps.com/worthpoint-review-price-database/
* PriceCharting premium page and the Freedom251 plan summary read October 15, 2026: Collector at 6 dollars a month, Legendary at 49 dollars a month with API access at one call a second, and the internal use license limit on its data.
  https://www.pricecharting.com/pricecharting-pro

## Claims marked unverified

* Whether eBay's Browse API image search method is gated to approved developers in production. An eBay SDK reference calls it experimental and approval bound; eBay's public Browse documentation presents it as a normal method. Only a developer account test settles it. Not load bearing for version one either way.
* The exact selling fee percentage to use as the verdict default for eBay sales. To be confirmed from eBay's current fee pages at build time and stored as a setting the shopper can change.
* Underpriced AI's current prices. Its store listing and its own website disagree, and both are reported above.
* The rival accuracy test figures for sold data vendors. Published by a competing vendor; the test basket in this spec is our check.
* WorthPoint's record count and whether it offers any developer data access. Reviewer counts differ (730 million and 900 million both appear), and no public developer API was found in this research. Absence in search results is not proof none exists.
* The barcode not found rate of 8 to 30 percent. A vendor guide's general figure, to be replaced by our measured rate from the test basket.
* SerpApi plan prices are taken from three recent pricing roundups that agree with each other, not from a checkout page read during this research. Confirm the live prices before the first paid month.

## Owner ruling, November 6, 2026: the app pays for itself

Phil ruled the same evening the spec landed: anything this app has to buy (the photo naming lookups, the sold price data, the barcode data) gets bought only after the app starts making money. If it cannot pay for itself, it is not worth having. Consequences for the build: the test plan and the first launch run inside the free tiers named in the data plan; paid tiers are unlocked by subscription income, in step with it; and the pricing model must keep the data cost per scan far enough under the subscription price that the first subscribers carry the data bill. This ruling sits on top of the data plan above wherever the two differ.
