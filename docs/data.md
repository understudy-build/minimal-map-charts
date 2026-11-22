# Map data

## Borders

Natural Earth draws who holds land, and each national publisher draws its own government's view. Every sheet and layout follows one rule instead, set in `scripts/build-maps/borders.ts`:

1. Land goes to the World Bank economy the UN recognises as its sovereign: Crimea and Sevastopol to Ukraine, the Golan Heights to Syria, Northern Cyprus to Cyprus, Somaliland to Somalia, Abkhazia and South Ossetia to Georgia, Transnistria to Moldova, Baikonur to Kazakhstan. Kosovo and West Bank and Gaza are economies of their own.
2. Land two economies dispute goes to the one that administers it. Kashmir splits along the Line of Control. Siachen and Arunachal Pradesh go to India, Aksai Chin and the Shaksgam valley to China, Hala'ib to Egypt, Kafia Kingi to Sudan, the Ilemi triangle to Kenya and the southern Kuril Islands to Russia.
3. Land no economy holds or administers is drawn as land of no country: Western Sahara, Taiwan, the Falklands, Abyei and Bir Tawil.

Some national sheets leave out land their country holds: India's has no Siachen, and Russia's and Japan's have no southern Kurils. Cyprus, Georgia and Moldova draw the land their government does not control in boxes beside the map. `pnpm audit:borders` lists any land two sheets give to different countries.

## Where the geometry comes from

1. Sheets: `pnpm build:maps` writes every `src/data/*.gen.ts` except `globe.gen.ts`. It projects Natural Earth's countries (v4.1.0, via `world-atlas`) for the world and regions, and 212 source snapshots for countries' subdivisions. It simplifies on shared arcs at 1 sheet unit (mapshaper, Douglas-Peucker), so neighbours' borders stay aligned.
2. Snapshots: the sources weigh 129 MB, so they live in the [`sources-6c2d279`](https://github.com/nicolastoulemont/minimal-map-charts/releases/tag/sources-6c2d279) release, not in Git. The build downloads missing ones into `.archive/` and checks each SHA-256. While the repository is private, run `GITHUB_TOKEN=$(gh auth token) pnpm build:maps`. Snapshots are refreshed from their publishers in civicdata's `packages/maps` (commit `6c2d279`).
3. Area codes: an area's `code` is the ISO 3166-2 code `scripts/build-maps/mapped.ts` gives it after review, or its source's code when Debian's [iso-codes](https://salsa.debian.org/iso-codes-team/iso-codes) v4.20.1 lists it for that country and no other area on the sheet uses it. Other areas keep their source's code and are listed in `scripts/build-maps/uncoded.gen.ts`.
4. Layouts: `scripts/globe.ts` writes `src/data/globe.gen.ts`, each country's box and area, from Natural Earth's 1:50m countries, v5.1.2.
5. Places: `pnpm build:maps` writes `src/data/places/` from Natural Earth's 1:10m populated places, v5.1.2. A place belongs to the country that holds it under the [borders](#borders) rule, so Simferopol is in Ukraine, and 74 places on land of no country, such as Taipei, are left out. `scripts/build-maps/places.ts` adds former English names, such as Bangalore.
6. Disputed land: `scripts/build-maps/disputed.ts` extracts the outlines the borders rule needs from Natural Earth's 1:10m disputed areas, v5.1.2.

The code is MIT. Each sheet keeps its source's licence: see [LICENSE.md](../LICENSE.md).
