#!/usr/bin/env node
// Safe meta.yaml editor for apeia.eu galleries.
// Used by the add-gallery-photo skill so YAML surgery is reliable (validates,
// inserts in the right place even when an `object:` block follows `images:`,
// preserves the rest of the file, re-parses to confirm, and matches the
// house style: inline scalar arrays [a, b], block `|-` notes).
//
//   node gallery-image.mjs add    <meta.yaml> <entry.json>
//   node gallery-image.mjs create <meta.yaml> <gallery.json>
//
// entry.json   = { file, alt?, caption?, sizes?, tags?, added?, notes? }
// gallery.json = { title, name?, date, description?, tags?, images:[entry...], object? }
//
// Build the JSON from the agent side (no escaping headaches); this script owns
// the YAML formatting/validation.

import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';

const fail = (m) => {
  console.error('Error: ' + m);
  process.exit(1);
};

const [, , cmd, metaPath, jsonPath] = process.argv;
if (!cmd || !metaPath || !jsonPath) {
  fail('usage: gallery-image.mjs <add|create> <meta.yaml> <payload.json>');
}
let payload;
try {
  payload = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (e) {
  fail('could not read/parse payload JSON: ' + e.message);
}

const FIELD_ORDER = ['file', 'alt', 'caption', 'sizes', 'tags', 'added', 'notes'];

function pruneEntry(entry) {
  const out = {};
  for (const k of FIELD_ORDER) {
    const v = entry[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  if (!out.file) fail('entry is missing required "file"');
  return out;
}

const DUMP = { lineWidth: -1, quotingType: '"', forceQuotes: false, noRefs: true };

// Collapse block sequences of plain scalars (e.g. sizes/tags) onto one inline
// line `key: [a, b]`, matching the existing meta.yaml files. Mapping-valued
// sequences (the `images:` list, whose items start with `- file: ...`) contain
// a colon and are left as block style.
function inlineScalarArrays(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)([A-Za-z0-9_]+):\s*$/);
    if (m) {
      const [, indent, key] = m;
      const itemRe = new RegExp('^' + indent + '\\s+-\\s+(.*)$');
      const items = [];
      let j = i + 1;
      while (j < lines.length) {
        const im = lines[j].match(itemRe);
        if (!im) break;
        items.push(im[1]);
        j++;
      }
      if (items.length && items.every((v) => !/:\s/.test(v) && v.trim() !== '')) {
        out.push(`${indent}${key}: [${items.join(', ')}]`);
        i = j - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}

function entryBlock(entry) {
  const dumped = inlineScalarArrays(yaml.dump([pruneEntry(entry)], DUMP));
  return dumped
    .split('\n')
    .map((l) => (l.length ? '  ' + l : l))
    .join('\n')
    .replace(/\n+$/, '');
}

if (cmd === 'create') {
  const g = {};
  for (const k of ['title', 'name', 'date', 'description', 'cover', 'tags']) {
    if (payload[k] !== undefined) g[k] = payload[k];
  }
  if (!g.title) fail('create needs a "title"');
  if (!g.date) fail('create needs a "date"');
  g.images = (payload.images || []).map(pruneEntry);
  if (g.images.length === 0) fail('create needs at least one image');
  if (payload.object) g.object = payload.object;
  const out = inlineScalarArrays(yaml.dump(g, DUMP));
  writeFileSync(metaPath, out);
  yaml.load(out); // validate
  console.log(`Created ${metaPath} (${g.images.length} image[s]).`);
  process.exit(0);
}

if (cmd !== 'add') fail('unknown command "' + cmd + '" (use add|create)');

const raw = readFileSync(metaPath, 'utf8');
let parsed;
try {
  parsed = yaml.load(raw);
} catch (e) {
  fail('existing meta.yaml does not parse: ' + e.message);
}
if (!parsed || typeof parsed !== 'object') fail('meta.yaml is not a mapping');

const lines = raw.split('\n');
const imgIdx = lines.findIndex((l) => /^images:\s*$/.test(l));
if (imgIdx === -1) {
  fail('no block-style "images:" key found (inline [...] lists are not supported)');
}

// Images block ends at the next column-0 key, else EOF.
let end = lines.length;
for (let i = imgIdx + 1; i < lines.length; i++) {
  if (/^[A-Za-z_]/.test(lines[i])) {
    end = i;
    break;
  }
}
// Don't insert after trailing blank lines inside the block.
let insertAt = end;
while (insertAt > imgIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--;

const blockLines = entryBlock(payload).split('\n');
const newLines = [...lines.slice(0, insertAt), ...blockLines, ...lines.slice(insertAt)];
const result = newLines.join('\n');

let after;
try {
  after = yaml.load(result);
} catch (e) {
  fail('insertion produced invalid YAML (aborted, file untouched): ' + e.message);
}
const before = (parsed.images || []).length;
const now = (after.images || []).length;
if (now !== before + 1) {
  fail(`image count went ${before} -> ${now}, expected +1 (aborted, file untouched)`);
}
writeFileSync(metaPath, result.endsWith('\n') ? result : result + '\n');
console.log(`Added image to ${metaPath}; images: ${before} -> ${now}.`);
