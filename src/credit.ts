import type { Credit } from "./sheet.ts"

// What a licence asks of a map drawn from a sheet: nothing; a credit that
// names the source, says the shapes were changed and links the licence; or
// that credit and an offer of the changed data (ODbL 4.6).
type Duty = "None" | "Credit" | "Share"

interface Terms {
  readonly name: string
  // Without its scheme, so it reads in print as well as on screen.
  readonly url?: string
  readonly duty: Duty
}

const igo: Terms = {
  name: "CC BY 3.0 IGO",
  url: "creativecommons.org/licenses/by/3.0/igo",
  duty: "Credit",
}

// Each licence a credit can name, as its `license` writes it: one, or several
// joined by "; ".
export const licences = {
  "Public domain": { name: "Public domain", duty: "None" },
  CC0: { name: "CC0", duty: "None" },
  "CC BY 4.0": { name: "CC BY 4.0", url: "creativecommons.org/licenses/by/4.0", duty: "Credit" },
  "CC BY-IGO": igo,
  "CC BY 3.0 IGO": igo,
  "Open Government Licence v3.0": {
    name: "Open Government Licence v3.0",
    url: "nationalarchives.gov.uk/doc/open-government-licence/version/3",
    duty: "Credit",
  },
  "Open Licence 2.0": {
    name: "Licence Ouverte 2.0",
    url: "github.com/etalab/licence-ouverte/blob/master/LO.md",
    duty: "Credit",
  },
  "upstream KOGL Type 1": {
    name: "upstream KOGL Type 1",
    url: "www.kogl.or.kr/info/licenseType1.do",
    duty: "Credit",
  },
  "CBS attribution terms": { name: "CBS attribution terms", duty: "Credit" },
  "Free use with credit": { name: "Free use with credit", duty: "Credit" },
  "ODbL 1.0": { name: "ODbL 1.0", url: "opendatacommons.org/licenses/odbl/1-0", duty: "Share" },
} as const satisfies Record<string, Terms>

// Where the changed data of every sheet can be downloaded: this package.
const derived = "npmjs.com/package/@understudy-build/minimal-map-charts"

const isKnown = (name: string): name is keyof typeof licences => Object.hasOwn(licences, name)

// A licence this table does not know still gets a full credit.
export const terms = (credit: Credit): ReadonlyArray<Terms> =>
  credit.license
    .split("; ")
    .map((name): Terms => (isKnown(name) ? licences[name] : { name, duty: "Credit" }))

// The line a map prints for one source of its boundaries, as that source's
// licences require.
export const cite = (credit: Credit): string => {
  const each = terms(credit)
  const changed = each.some((term) => term.duty !== "None")
  const named = each.map((term) =>
    term.url === undefined ? term.name : `${term.name}: ${term.url}`,
  )

  return [
    `Boundaries: ${credit.publisher}, ${credit.vintage}${changed ? ", simplified and re-projected" : ""}.`,
    `${named.join("; ")}.`,
    ...(each.some((term) => term.duty === "Share") ? [`Derived data: ${derived}`] : []),
  ].join(" ")
}
