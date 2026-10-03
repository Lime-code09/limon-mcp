# limon-mcp — Limon Digital Tools

Official MCP Registry listing: `io.github.Lime-code09/limon-mcp` (active).

Free local implementations of the Limon Digital micro-APIs:

| Tool | What it does |
|---|---|
| `clean_markdown` | Normalize line endings, collapse blank lines/code fences, trim |
| `clean_json` | Parse (throws on invalid), sort keys deterministically, pretty-print |
| `csv_to_json` | CSV→JSON with numeric coercion, trimmed headers, multi-row |
| `agent_config_audit` | Secret/insecure-endpoint/trust-flag audit — verdict PASS/WARN/FAIL |
| `prompt_pack_info` | Info on the 50+ ChatGPT work-prompt pack ($9.99 USDC, x402) |
| `list_catalogs` | Info on classic-car catalogs ($4.99 USDC each, x402) |

The heavy paid versions run as **x402 pay-per-call endpoints** (USDC on Base, $0.01/call) at [limon-x402.mkahya09.workers.dev](https://limon-x402.mkahya09.workers.dev).

## Install (Claude Desktop / Cursor / any MCP client)

```json
{
  "mcpServers": {
    "limon-mcp": {
      "command": "npx",
      "args": ["-y", "github:Lime-code09/limon-mcp"]
    }
  }
}
```

## Test

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node server.mjs
```

## License

MIT
PR capability test Sat Oct  3 10:35:51 +03 2026
