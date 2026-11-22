// The source snapshots the maps are drawn from: 212 files, 126 MB, too large
// for Git. They are assets of one GitHub release of this repository.
// `restore` downloads the ones missing from the ignored .archive/ folder and
// checks each against the size and SHA-256 GitHub records for it, so a full
// cache needs no network. A changed source shows up as a diff in the
// committed src/data.
//
// A public repository serves the assets to anyone. While it is private,
// set GITHUB_TOKEN (e.g. `GITHUB_TOKEN=$(gh auth token) pnpm build:maps`).
import { createHash } from "node:crypto"
import { access, mkdir, rename, writeFile } from "node:fs/promises"

import { Schema } from "effect"

const repository = "nicolastoulemont/minimal-map-charts"
const tag = "sources-6c2d279"

const cache = new URL("../../.archive/", import.meta.url)

// Downloads at a time: enough to fill the line, few enough for GitHub.
const parallel = 8

const Release = Schema.Struct({
  assets: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      size: Schema.Int,
      digest: Schema.String.check(Schema.isPattern(/^sha256:[a-f0-9]{64}$/)),
      url: Schema.String,
      browser_download_url: Schema.String,
    }),
  ),
})

type Asset = (typeof Release.Type)["assets"][number]

const download = async (url: string, headers: Record<string, string>) => {
  const response = await fetch(url, { headers })

  if (!response.ok) {
    const hint = headers["Authorization"] === undefined ? "; set GITHUB_TOKEN if it is private" : ""

    throw new Error(`HTTP ${response.status} from ${url}${hint}`)
  }

  return response
}

const present = (path: string) =>
  access(new URL(path, cache)).then(
    () => true,
    () => false,
  )

// Downloads every snapshot in `paths` missing from the cache, writing each
// one whole, so an interrupted run leaves no partial file.
export const restore = async (paths: ReadonlyArray<string>) => {
  const found = await Promise.all(paths.map(present))
  const missing = paths.filter((_, index) => !found[index])

  if (missing.length === 0) return

  const token = process.env["GITHUB_TOKEN"]
  const auth: Record<string, string> =
    token === undefined ? {} : { Authorization: `Bearer ${token}` }
  const api = { ...auth, "X-GitHub-Api-Version": "2022-11-28" }

  const { assets } = Schema.decodeUnknownSync(Release)(
    await (
      await download(`https://api.github.com/repos/${repository}/releases/tags/${tag}`, api)
    ).json(),
  )

  const byName = new Map(assets.map((asset) => [asset.name, asset]))

  // A private repository serves its assets only through the API.
  const fetchAsset = (asset: Asset) =>
    token === undefined
      ? download(asset.browser_download_url, {})
      : download(asset.url, { ...api, Accept: "application/octet-stream" })

  const save = async (path: string) => {
    const asset = byName.get(path)

    if (asset === undefined) throw new Error(`${path} is not an asset of ${tag}`)
    const bytes = new Uint8Array(await (await fetchAsset(asset)).arrayBuffer())
    const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`

    if (bytes.length !== asset.size || digest !== asset.digest)
      throw new Error(`${path}: download does not match its release asset`)

    const temporary = new URL(`${path}.${process.pid}.tmp`, cache)

    await writeFile(temporary, bytes)
    await rename(temporary, new URL(path, cache))
  }

  const queue = [...missing]

  // Each worker takes the next snapshot until none is left.
  const worker = async (): Promise<void> => {
    const next = queue.shift()

    if (next === undefined) return

    await save(next)

    return worker()
  }

  await mkdir(cache, { recursive: true })
  await Promise.all(Array.from({ length: parallel }, worker))
  console.info(`Restored ${missing.length} of ${paths.length} snapshots into .archive/`)
}

// A restored snapshot's location, to read it from.
export const snapshot = (path: string) => new URL(path, cache)
