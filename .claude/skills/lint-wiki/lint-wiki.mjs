#!/usr/bin/env node
// Mechanical checks on docs/wiki. Rules: docs/CLAUDE.md, section "Wiki pages".
// Usage (from the repo root): node .claude/skills/lint-wiki/lint-wiki.mjs
// Exit code 1 if there are errors; warnings alone exit 0.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const DOCS = resolve("docs");
const WIKI = join(DOCS, "wiki");
const TYPES = ["info", "decisione"];
const STATES = ["aperta", "in analisi", "presa", "superata"];
const RADAR_STATES = ["aperta", "in analisi"];
const MAX_PAGES_PER_FOLDER = 12;

const errors = [];
const warnings = [];
const rel = (p) => relative(DOCS, p).split(sep).join("/");
const error = (file, msg) => errors.push(`${rel(file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${rel(file)}: ${msg}`);

if (!existsSync(WIKI)) {
  console.error("docs/wiki not found: run from the repo root.");
  process.exit(2);
}

// --- collect folders and pages ---------------------------------------------

const folders = [];
const pages = [];
(function walk(dir) {
  folders.push(dir);
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".md") && name !== "index.md") pages.push(p);
  }
})(WIKI);

// --- helpers ----------------------------------------------------------------

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const value = raw.replace(/\s+#.*$/, "").trim();
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean);
      listKey = null;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return data;
}

function unquote(s) {
  return s.replace(/^["'](.*)["']$/, "$1");
}

// Relative markdown links: [text](target), skipping code blocks and inline code.
function links(text) {
  const body = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const out = [];
  for (const m of body.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
    out.push(decodeURI(target.split("#")[0]));
  }
  return out;
}

function linkedFiles(file) {
  const text = readFileSync(file, "utf8");
  return new Set(links(text).map((t) => resolve(dirname(file), t)));
}

// --- checks -----------------------------------------------------------------

// 1. Every folder has an index.md, linked from the parent folder's index.md.
for (const dir of folders) {
  const index = join(dir, "index.md");
  if (!existsSync(index)) {
    error(dir, "folder without index.md");
    continue;
  }
  if (dir !== WIKI) {
    const parentIndex = join(dirname(dir), "index.md");
    if (existsSync(parentIndex) && !linkedFiles(parentIndex).has(index)) {
      error(parentIndex, `does not link the sub-index ${rel(index)}`);
    }
  }
  const count = readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "index.md").length;
  if (count > MAX_PAGES_PER_FOLDER) {
    warn(dir, `${count} pages (> ${MAX_PAGES_PER_FOLDER}): consider sub-folders`);
  }
}

// 2. Every page is listed in its folder's index.md.
for (const page of pages) {
  const index = join(dirname(page), "index.md");
  if (existsSync(index) && !linkedFiles(index).has(page)) {
    error(index, `does not list ${rel(page)}`);
  }
}

// 3. Every relative link in the wiki resolves.
for (const file of [...pages, ...folders.map((d) => join(d, "index.md")).filter(existsSync)]) {
  for (const target of links(readFileSync(file, "utf8"))) {
    if (!existsSync(resolve(dirname(file), target))) error(file, `broken link: ${target}`);
  }
}

// 4. Frontmatter of every page.
const radar = [];
for (const page of pages) {
  const fm = parseFrontmatter(readFileSync(page, "utf8"));
  if (!fm) {
    error(page, "missing frontmatter");
    continue;
  }
  if (!TYPES.includes(fm.tipo)) error(page, `tipo must be one of: ${TYPES.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.aggiornato ?? "")) error(page, "aggiornato must be YYYY-MM-DD");

  const fonti = Array.isArray(fm.fonti) ? fm.fonti : null;
  const isTechnical = rel(page).startsWith("wiki/tecnico/");
  if (!fonti) error(page, "fonti must be a list");
  else if (fonti.length === 0 && !isTechnical) error(page, "fonti is empty");
  for (const f of fonti ?? []) {
    if (!f.startsWith("raw/compiled/")) error(page, `fonte outside raw/compiled/: ${f}`);
    else if (!existsSync(join(DOCS, f))) error(page, `fonte not found: ${f}`);
  }

  if (fm.tipo === "decisione") {
    if (!STATES.includes(fm.stato)) error(page, `stato must be one of: ${STATES.join(", ")}`);
    if (fm.stato === "superata") {
      if (!fm.sostituita_da) error(page, "superata without sostituita_da");
      else if (!existsSync(resolve(dirname(page), fm.sostituita_da))) {
        error(page, `sostituita_da not found: ${fm.sostituita_da}`);
      }
    }
    if (RADAR_STATES.includes(fm.stato)) radar.push(page);
  } else if (fm.stato !== undefined) {
    error(page, "stato is only for tipo: decisione");
  }
}

// 5. The root index lists every decision still to take (radar).
const rootIndex = join(WIKI, "index.md");
if (existsSync(rootIndex)) {
  const linked = linkedFiles(rootIndex);
  for (const page of radar) {
    if (!linked.has(page)) error(rootIndex, `radar does not list the open decision ${rel(page)}`);
  }
}

// --- report -----------------------------------------------------------------

for (const e of errors) console.log(`ERROR  ${e}`);
for (const w of warnings) console.log(`WARN   ${w}`);
console.log(`\n${pages.length} pages, ${folders.length} folders: ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
