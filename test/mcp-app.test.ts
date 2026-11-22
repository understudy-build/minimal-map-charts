import { fileURLToPath } from "node:url"

import { Client, InMemoryTransport } from "@modelcontextprotocol/client"
import { build } from "vite"
import { beforeAll, describe, expect, it } from "vitest"

import { server } from "../examples/mcp-app/server.ts"
import { schema } from "../src/index.ts"

// A host connected to the example server in process, as a desktop host
// connects over stdio.
const connect = async () => {
  const [near, far] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "host", version: "0.0.0" })

  await Promise.all([server().connect(far), client.connect(near)])

  return client
}

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  Array.isArray(result.content)
    ? result.content.map((part) => (part.type === "text" ? part.text : "")).join("\n")
    : ""

describe("the MCP App example", () => {
  beforeAll(async () => {
    await build({
      configFile: fileURLToPath(new URL("../examples/mcp-app/vite.config.ts", import.meta.url)),
      logLevel: "silent",
    })
  }, 60_000)

  it("lists show_map with the spec's JSON Schema and its view", async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    const tool = tools.find((each) => each.name === "show_map")

    expect(tool?.inputSchema).toEqual(schema)
    expect(tool?._meta?.["ui"]).toEqual({ resourceUri: "ui://map/view.html" })
  })

  it("draws the map, a sentence for the model and the scene for the view", async () => {
    const client = await connect()
    const result = await client.callTool({
      name: "show_map",
      arguments: { title: "Members", fill: { kind: "highlight", countries: ["FRA", "DEU"] } },
    })

    expect(result.isError).not.toBe(true)
    expect(text(result)).toBe("Members. Map of Europe: France, Germany highlighted.")
    expect(result.structuredContent).toMatchObject({ sheet: "europe", title: "Members" })
  })

  it("draws one country's areas, says where an area belongs, and refuses one its sheet lacks", async () => {
    const client = await connect()
    const drawn = await client.callTool({
      name: "show_map",
      arguments: { fill: { kind: "highlight", areas: ["US-CA", "US-TX"] } },
    })
    const refused = await client.callTool({
      name: "show_map",
      arguments: { fill: { kind: "choropleth", values: [{ country: "US-CA", value: 39 }] } },
    })
    const undrawn = await client.callTool({
      name: "show_map",
      arguments: { fill: { kind: "highlight", areas: ["NO-11", "NO-30"] } },
    })

    expect(text(drawn)).toBe("Map of United States: California, Texas highlighted.")
    expect(drawn.structuredContent).toMatchObject({
      sheet: "USA",
      patches: [{ area: "US-CA" }, { area: "US-TX" }],
    })
    expect(text(refused)).toContain(
      'fill.values.0.country: expected a country code; give the subdivision "US-CA" in `area`.',
    )
    expect(undrawn.isError).toBe(true)
    expect(text(undrawn)).toBe('fill.areas.1: NO-30 has no area on the "NOR" sheet.')
  })

  it("tells the model how to fix a bad spec", async () => {
    const client = await connect()
    const result = await client.callTool({
      name: "show_map",
      arguments: { fill: { kind: "choropleth", values: [{ country: "France", value: 1 }] } },
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toContain(
      'fill.values.0.country: "France" is not a country code. Did you mean "FRA"?',
    )
  })

  it("serves the view as one self-contained MCP App document", async () => {
    const client = await connect()
    const { contents } = await client.readResource({ uri: "ui://map/view.html" })
    const [page] = contents
    const html = page !== undefined && "text" in page ? page.text : ""

    expect(page?.mimeType).toBe("text/html;profile=mcp-app")
    expect(html).toContain("<script")
    // Nothing loads from elsewhere, so the default CSP lets it run.
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=/)
  })
})
