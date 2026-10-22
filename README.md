# HDB Flat Mix

A small static website that shows how many of each flat type (1-room to Executive, Multi-generation, Studio and rental) are in any HDB block in Singapore, and which flat models (e.g. 3NG, 4A, EA) and floor areas each block has. You can look up one block at a time, or a whole estate at once in a table you can sort, filter, map and download.

It uses only free public data and has no backend. All data is bundled as JSON files in `public/data/`.

## Data sources

| Dataset | What it gives | Link |
|---|---|---|
| HDB Property Information | Flat-type counts, year completed and max floor level for each block (block no. + street, no postal codes) | [data.gov.sg](https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view) |
| HDB Existing Building | Postal code, street code and building outline for each block | [data.gov.sg](https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view) |
| Resale Flat Prices (5 datasets, 1990 onwards) | Flat model and floor area of every resold flat, used to show each block's models | [data.gov.sg](https://data.gov.sg/collections/189/view) |
| OneMap search API | Turns each street code into a street name; finds new blocks missing from the outlines | [onemap.gov.sg](https://www.onemap.gov.sg/apidocs/) |
| OneMap base map | Map tiles | [onemap.gov.sg](https://www.onemap.gov.sg/) |

### How the two HDB datasets are joined

The building dataset labels streets with codes (for example `MAD07G`), not names. The refresh script looks up one postal code per street code on OneMap to get the street name ("MARSILING DRIVE"). It then converts that name to HDB's abbreviations ("MARSILING DR") and joins the datasets on block + street. Blocks that are missing from the building outlines (usually ones completed after the outlines were last updated) are looked up on OneMap by address.

Each run prints the match rate and writes `reports/join-report.md` and `reports/unmatched-blocks.csv`. The current run matched **10,817 of 10,817 residential blocks (100%)**: 10,766 via the building outlines and 51 brand-new 2026 blocks via OneMap.

### Flat models and floor plans

HDB's block dataset only gives counts per flat type. Flat models (Improved, New Generation, Model A and so on) and floor areas come from HDB's resale records since 1990: about 989,000 sales, 98% of which match a current block. They cover about 88% of sold flat types (about 91% of units). They show which models a block has, not how many units of each, and blocks that have never been resold have none.

The app does not include floor plans. HDB sells the plan of any flat through its [Purchase of Residential Floor Plan e-service](https://services2.hdb.gov.sg/webapp/BC31ISOP2/BC31SMain) (about S$5, Singpass needed), and each block card links to it. Those plans are HDB copyright, so keep purchased plans for your own study and don't add them to this repository, which is public.

If a refresh prints "new model names to add to src/lib/flatModels.ts", HDB has introduced a new model; it still shows in the app under its raw name, and adding it to that file gives it a tidy name and code.

## Run it on your computer

You need [Node.js](https://nodejs.org/) 20 or newer (choose the "LTS" installer).

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## Refresh the data

When HDB updates its datasets, run:

```bash
npm run fetch-data
```

This downloads all the datasets again (about 150 MB in total) and rebuilds `public/data/`. It takes about 5 minutes. Street-code lookups are cached in `scripts/cache/`, so only new street codes or new blocks are looked up on OneMap. Then commit and push the changed files, and the site redeploys itself.

Optional settings, only needed if a service starts refusing requests:

- `DATAGOV_API_KEY`: a free data.gov.sg API key for higher rate limits.
- `ONEMAP_TOKEN`: a free OneMap API token. OneMap currently answers without one, but its responses warn that a token is expected.

## Tests

```bash
npm test
```

These cover the street-name normaliser, the join, search and CSV export. They also sanity-check the bundled data (for example, that known Marsiling blocks resolve and that every block lies inside Singapore).

## Deploy for free

The build output is a plain folder of files (`dist/`), so any static host works. Both options below are free.

### Step 1 — Put the project on GitHub (needed for both options)

1. Create a free account at [github.com](https://github.com/).
2. Install [GitHub Desktop](https://desktop.github.com/) and sign in.
3. In GitHub Desktop choose **File → Add local repository**, pick this `hdb-flat-mix` folder, and click **create a repository** when it offers. Keep the name `hdb-flat-mix` and click **Create repository**.
4. Click **Publish repository**. You can untick "Keep this code private" if you want the code public, but either works.

### Option A — Vercel (easiest)

1. Go to [vercel.com](https://vercel.com/), click **Sign Up**, and choose **Continue with GitHub**.
2. Click **Add New… → Project**, find `hdb-flat-mix` in the list, and click **Import**.
3. Vercel detects Vite automatically. Leave Build Command as `npm run build` and Output Directory as `dist`, then click **Deploy**.
4. After about a minute you get a link like `https://hdb-flat-mix.vercel.app`. Every later push to GitHub redeploys automatically.

### Option B — GitHub Pages

1. On your repository page on github.com, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push any change (or open the **Actions** tab, choose **Deploy to GitHub Pages**, and click **Run workflow**).
4. When the run turns green, the site is live at `https://<your-username>.github.io/hdb-flat-mix/`.

The included workflow (`.github/workflows/deploy.yml`) runs the tests before each deploy, so a broken data refresh won't go live.

### Updating the live site after a data refresh

1. Run `npm run fetch-data`.
2. In GitHub Desktop, write a short summary (for example "Refresh HDB data"), click **Commit to main**, then **Push origin**.
3. Vercel or GitHub Pages rebuilds the site within a minute or two.

## Caveats (also shown in the app)

- Shows the **number** of each flat type per block, **not** unit floor plans or layouts.
- Covers HDB residential blocks only.
- Counts follow HDB's published dataset, which may lag recent completions and redevelopment.

## Project layout

```
scripts/fetch-data.ts    data refresh (npm run fetch-data)
scripts/lib/             data.gov.sg + OneMap clients, join logic
scripts/cache/           cached OneMap lookups (commit these)
public/data/             bundled data the site loads
reports/                 join report and unmatched blocks from the last refresh
src/lib/                 street normaliser, search, CSV, shared types
src/components/          UI
```
