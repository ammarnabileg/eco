#!/usr/bin/env node
/**
 * Laly MCP server: lets an AI assistant (Claude Code, Claude Desktop, ...)
 * manage the store through the Medusa admin API, with the same validation and
 * permissions as the admin panel. Runs over stdio.
 *
 * Env: MEDUSA_BACKEND_URL (default http://localhost:9000)
 *      MEDUSA_ADMIN_API_KEY (secret API key, sk_...)
 */
import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"

import { BACKEND_URL } from "./api.js"
import { registerCatalogContentTools } from "./tools/catalog-content.js"
import { registerCatalogTools } from "./tools/catalog.js"
import { registerContentTools } from "./tools/content.js"
import { registerOrderTools } from "./tools/orders.js"

function createServer(): McpServer {
  const server = new McpServer(
    { name: "laly-mcp-server", version: "0.1.0" },
    {
      instructions:
        "Tools for the Laly electronics store in Kuwait (prices in KWD, 3 decimals; Arabic is the primary language, English secondary). " +
        "Read before you write: call laly_get_store_content, laly_search_products or laly_list_offers to get IDs and current values. " +
        "Trust badges and offers are promises to customers: confirm wording, prices and dates with the user before creating or changing them. " +
        "Dates use ISO 8601 with the Kuwait offset +03:00. " +
        "Product specs come only from official manufacturer pages: call laly_get_product_catalog for the allowed fields first.",
    }
  )
  registerContentTools(server)
  registerCatalogTools(server)
  registerCatalogContentTools(server)
  registerOrderTools(server)
  return server
}

serveStdio(createServer)
console.error(`laly-mcp-server running on stdio (Medusa: ${BACKEND_URL})`)
