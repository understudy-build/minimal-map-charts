// An MCP server with one tool, `show_map`, that draws its map in an MCP App:
// the host shows the tool's view in a sandboxed frame beside the chat. The
// server draws, so the view loads no sheets and needs no network: the default
// CSP of an MCP App blocks both. The view only paints the scene, in the
// host's light or dark theme.
//
// Run it over stdio for a desktop host: `pnpm mcp`. Point the host at
// `node examples/mcp-app/server.ts` after `pnpm mcp:build` has built the view.
import { readFile } from "node:fs/promises"

import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server"
import { McpServer } from "@modelcontextprotocol/server"
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio"

import { draw, Spec } from "../../src/index.ts"

const view = "ui://map/view.html"

export const server = () => {
  const mcp = new McpServer({ name: "minimal-map-charts", version: "0.0.0" })

  // `Spec` is the tool's input schema as it is: the SDK lists its JSON Schema
  // to the model, and refuses a bad call with `parse`'s issues, which the
  // model reads and fixes on its next turn.
  registerAppTool(
    mcp,
    "show_map",
    {
      title: "Show a map",
      description:
        "Draw a map of countries: a choropleth with one number per country, or a highlight of some countries. Leave out `sheet` and the map frames the countries in the fill.",
      inputSchema: Spec,
      _meta: { ui: { resourceUri: view } },
    },
    async (spec) => {
      const scene = await draw(spec)

      // The model reads the sentence; the view paints the scene.
      return {
        content: [{ type: "text", text: scene.description }],
        structuredContent: { ...scene },
      }
    },
  )

  registerAppResource(mcp, "Map", view, { description: "A map of countries." }, async () => ({
    contents: [
      {
        uri: view,
        mimeType: RESOURCE_MIME_TYPE,
        text: await readFile(new URL("dist/view.html", import.meta.url), "utf8"),
      },
    ],
  }))

  return mcp
}

if (import.meta.main) await server().connect(new StdioServerTransport())
