#!/usr/bin/env node
/**
 * limon-mcp — stdio MCP server wrapping the Limon Digital micro-APIs.
 *
 * Tools: clean_markdown, clean_json, csv_to_json, agent_config_audit,
 *        prompt_pack_info, list_catalogs
 *
 * The heavy micro-API versions of these run as paid x402 endpoints at
 * https://limon-x402.mkahya09.workers.dev (USDC on Base, $0.01/call).
 * This server ships the free local implementations so any MCP client
 * (Claude Desktop, Cursor, VS Code) can try the same transformations.
 */

import { readFileSync } from "node:fs";

// ─── Tool implementations ───

function cleanMarkdown(input) {
  const text = String(input?.text ?? "");
  if (!text.trim()) throw new Error("text is required and cannot be empty");
  return text
    .replace(/\r\n/g, "\n")                          // normalize line endings
    .replace(/[ \t]+$/gm, "")                        // trailing whitespace
    .replace(/\n{3,}/g, "\n\n")                      // collapse blank lines
    .replace(/^(\s*)[-*]\s+/gm, "$1- ")              // normalize bullets
    .replace(/`{4,}/g, "```")                        // collapse code fences
    .replace(/ {2,}(?=\S)/g, " ")                    // double spaces inline
    .trim();
}

function cleanJson(input) {
  const raw = String(input?.json ?? "");
  if (!raw.trim()) throw new Error("json is required and cannot be empty");
  const parsed = JSON.parse(raw); // throws on invalid — that IS the validation
  // sort object keys for deterministic output, keep array order
  const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => [k, sortKeys(val)]));
    }
    return v;
  };
  return JSON.stringify(sortKeys(parsed), null, 2);
}

function csvToJson(input) {
  const csv = String(input?.csv ?? "");
  if (!csv.trim()) throw new Error("csv is required and cannot be empty");
  const delimiter = input?.delimiter ?? ",";
  const lines = csv.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length);
  if (lines.length < 2) throw new Error("csv needs a header row plus at least one data row");
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      const v = cells[i] ?? "";
      // numeric coercion when the cell is a clean number
      row[h] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    });
    return row;
  });
  return JSON.stringify(rows, null, 2);
}

function agentConfigAudit(input) {
  const config = String(input?.config ?? "");
  if (!config.trim()) throw new Error("config is required and cannot be empty");
  const findings = [];
  const rules = [
    { re: /(sk|pk|gho|ghp|npm)_[A-Za-z0-9]{20,}/i, level: "critical", note: "potential API key/secret in config" },
    { re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i, level: "high", note: "bearer token literal in config" },
    { re: /password\s*[:=]\s*['"][^'"]{4,}/i, level: "high", note: "plaintext password in config" },
    { re: /http:\/\//i, level: "medium", note: "insecure http:// endpoint (use https)" },
    { re: /0\.0\.0\.0/, level: "medium", note: "binds to all interfaces — verify exposure" },
    { re: /--allow-unregistered|trust_all/i, level: "medium", note: "permissive trust flag" },
  ];
  for (const rule of rules) {
    const m = config.match(rule.re);
    if (m) findings.push({ level: rule.level, note: rule.note, sample: m[0].slice(0, 12) + "…" });
  }
  return JSON.stringify({
    audited: true,
    findings,
    verdict: findings.some((f) => f.level === "critical") ? "FAIL" : findings.length ? "WARN" : "PASS",
    rule_count: rules.length,
  }, null, 2);
}

// ─── MCP protocol (stdio JSON-RPC) ───

const TOOLS = [
  {
    name: "clean_markdown",
    description: "Clean messy Markdown: normalize line endings, collapse blank lines and code fences, trim trailing whitespace.",
    inputSchema: { type: "object", properties: { text: { type: "string", description: "markdown to clean" } }, required: ["text"] },
  },
  {
    name: "clean_json",
    description: "Validate and normalize JSON: parse (throws on invalid), sort object keys deterministically, pretty-print.",
    inputSchema: { type: "object", properties: { json: { type: "string", description: "JSON string to clean" } }, required: ["json"] },
  },
  {
    name: "csv_to_json",
    description: "Convert CSV to JSON with numeric coercion and trimmed headers. Handles multi-row files.",
    inputSchema: { type: "object", properties: { csv: { type: "string", description: "CSV text" }, delimiter: { type: "string", description: "delimiter, default ," } }, required: ["csv"] },
  },
  {
    name: "agent_config_audit",
    description: "Audit an agent/MCP config for secrets, insecure endpoints, and permissive trust flags. Returns verdict PASS/WARN/FAIL.",
    inputSchema: { type: "object", properties: { config: { type: "string", description: "config text to audit" } }, required: ["config"] },
  },
  {
    name: "prompt_pack_info",
    description: "Info about the 50+ ChatGPT work-prompt pack ($9.99 USDC, x402). Free info call — purchase is separate.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_catalogs",
    description: "List the classic-car spare-parts catalogs available ($4.99 USDC per catalog via x402). Free info call.",
    inputSchema: { type: "object", properties: {} },
  },
];

function dispatch(name, args) {
  switch (name) {
    case "clean_markdown": return { content: [{ type: "text", text: cleanMarkdown(args) }] };
    case "clean_json": return { content: [{ type: "text", text: cleanJson(args) }] };
    case "csv_to_json": return { content: [{ type: "text", text: csvToJson(args) }] };
    case "agent_config_audit": return { content: [{ type: "text", text: agentConfigAudit(args) }] };
    case "prompt_pack_info":
      return { content: [{ type: "text", text: JSON.stringify({ product: "50+ ChatGPT İş Prompt Paketi", price: "$9.99", currency: "USDC", network: "eip155:8453", endpoint: "https://limon-x402.mkahya09.workers.dev/api/prompt-pack", scheme: "x402 exact", human_store: "https://limoncum.sellix.cx/p/chatgpt-is-prompt-paketi" }, null, 2) }] };
    case "list_catalogs":
      return { content: [{ type: "text", text: JSON.stringify({ catalogs: ["vw_beetle", "anadol", "renault12", "peugeot404", "mercedes190"], price_per_catalog: "$4.99", currency: "USDC", endpoint_base: "https://limon-x402.mkahya09.workers.dev/api/catalog/", scheme: "x402 exact" }, null, 2) }] };
    default: throw new Error(`unknown tool: ${name}`);
  }
}

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const { id, method, params } = msg;
    let response;
    try {
      if (method === "initialize") {
        response = {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "limon-mcp", version: "1.0.0", title: "Limon Digital Tools" },
          instructions: "Free local implementations of the Limon Digital micro-APIs. The heavy paid versions run as x402 endpoints (USDC on Base) at https://limon-x402.mkahya09.workers.dev.",
        };
      } else if (method === "tools/list") {
        response = { tools: TOOLS };
      } else if (method === "tools/call") {
        response = dispatch(params.name, params.arguments ?? {});
      } else if (method === "ping") {
        response = {};
      } else if (method === "notifications/initialized") {
        continue; // notification — no response
      } else {
        throw new Error(`unknown method: ${method}`);
      }
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: response }) + "\n");
    } catch (e) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32603, message: e.message } }) + "\n");
    }
  }
});
