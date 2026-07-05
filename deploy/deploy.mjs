#!/usr/bin/env node
// Incremental FTP deploy for apeia.eu
// ------------------------------------
// The FTP server can't hash files, so we keep a LOCAL manifest of sha256 hashes
// that represents the known state of production. We build fresh into dist/, hash
// everything, diff against the manifest, and upload/delete only what changed.
// The manifest is committed to the repo; it IS our server-side hash table.
//
// Subcommands:
//   init          Hash current dist/ and write it as the trusted baseline manifest.
//                 Use once, when dist/ is known to equal production.
//   plan          Build the diff and print what WOULD be uploaded/deleted. No network.
//   push          Do the deploy: upload added/changed, delete removed, update manifest.
//                 Add --verify to re-fetch a sample of changed files over HTTPS.
//   reset         Force-upload EVERY file in dist/ (ignore the manifest's "unchanged"
//                 status), delete anything the old manifest tracked but dist/ no longer
//                 has, then write a fresh manifest. Use to recover from suspected drift.
//
// Flags:
//   --dist <dir>     Override dist directory (default: ../dist relative to this file)
//   --yes            Skip the safety pause before pushing
//   --verify         After push, HTTP-check a sample of changed files
//
// Credentials come from deploy/.env (gitignored). See deploy/.env.example.

import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Client } from 'basic-ftp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '..');
const MANIFEST_PATH = path.join(HERE, 'manifest.json');

// ---- tiny .env loader (avoids a dotenv dependency) ------------------------
async function loadEnv() {
  const envPath = path.join(HERE, '.env');
  let raw = '';
  try {
    raw = await readFile(envPath, 'utf8');
  } catch {
    // fall through to process.env (e.g. CI secrets)
  }
  const env = { ...process.env };
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

// ---- hashing --------------------------------------------------------------
function hashFile(absPath) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = createReadStream(absPath);
    s.on('error', reject);
    s.on('data', (chunk) => h.update(chunk));
    s.on('end', () => resolve(h.digest('hex')));
  });
}

// Recursively list files under a dir, returning POSIX-style relative paths.
async function walk(dir, base = dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(abs, base)));
    } else if (e.isFile()) {
      const rel = path.relative(base, abs).split(path.sep).join('/');
      out.push(rel);
    }
  }
  return out;
}

async function hashTree(distDir) {
  const rels = await walk(distDir);
  const files = {};
  // Hash with limited concurrency to keep memory/IO sane on a big tree.
  const CONC = 16;
  let i = 0;
  async function worker() {
    while (i < rels.length) {
      const rel = rels[i++];
      const abs = path.join(distDir, rel);
      const [sha256, st] = await Promise.all([hashFile(abs), stat(abs)]);
      files[rel] = { sha256, size: st.size };
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  return files;
}

async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.files || {};
  } catch {
    return null; // no manifest yet
  }
}

async function saveManifest(files) {
  const payload = {
    generatedAt: new Date().toISOString(),
    fileCount: Object.keys(files).length,
    files: sortObject(files),
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function sortObject(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

// ---- diff -----------------------------------------------------------------
function diff(oldFiles, newFiles) {
  const added = [];
  const changed = [];
  const deleted = [];
  for (const rel of Object.keys(newFiles)) {
    if (!oldFiles[rel]) added.push(rel);
    else if (oldFiles[rel].sha256 !== newFiles[rel].sha256) changed.push(rel);
  }
  for (const rel of Object.keys(oldFiles)) {
    if (!newFiles[rel]) deleted.push(rel);
  }
  added.sort();
  changed.sort();
  deleted.sort();
  return { added, changed, deleted };
}

function humanSize(bytes) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function printPlan({ added, changed, deleted }, newFiles) {
  const list = (label, arr) => {
    if (!arr.length) return;
    console.log(`\n${label} (${arr.length}):`);
    for (const rel of arr.slice(0, 200)) {
      const sz = newFiles[rel] ? `  ${humanSize(newFiles[rel].size)}` : '';
      console.log(`  ${rel}${sz}`);
    }
    if (arr.length > 200) console.log(`  ... and ${arr.length - 200} more`);
  };
  list('ADD', added);
  list('CHANGE', changed);
  list('DELETE', deleted);
  const uploadBytes = [...added, ...changed].reduce(
    (a, rel) => a + (newFiles[rel]?.size || 0),
    0
  );
  console.log(
    `\nSummary: +${added.length} add, ~${changed.length} change, -${deleted.length} delete` +
      `  (upload ${humanSize(uploadBytes)})`
  );
  return uploadBytes;
}

// ---- ftp ------------------------------------------------------------------
function joinRemote(root, rel) {
  const r = root.replace(/\/+$/, '');
  return `${r}/${rel}`;
}

async function push(env, distDir, { added, changed, deleted }, newFiles, oldFiles, opts) {
  const host = env.FTP_HOST;
  const user = env.FTP_USER;
  const password = env.FTP_PASSWORD;
  const remoteRoot = env.FTP_REMOTE_ROOT || '/';
  const secure = /^(1|true|yes)$/i.test(env.FTP_SECURE || '');
  if (!host || !user || !password) {
    throw new Error(
      'Missing FTP_HOST / FTP_USER / FTP_PASSWORD. Create deploy/.env (see deploy/.env.example).'
    );
  }

  // Deployed-state starts as a copy of the old manifest and is updated as each
  // operation succeeds, so an interrupted run leaves an accurate manifest and
  // the next run resumes cleanly.
  const deployed = { ...(oldFiles || {}) };
  const ensuredDirs = new Set();

  const client = new Client(30_000);
  client.ftp.verbose = false;
  try {
    await client.access({ host, user, password, secure });
    console.log(`Connected to ${host} (root: ${remoteRoot})`);

    const uploads = [...added, ...changed];
    let done = 0;
    for (const rel of uploads) {
      const remote = joinRemote(remoteRoot, rel);
      const remoteDir = remote.slice(0, remote.lastIndexOf('/')) || '/';
      if (!ensuredDirs.has(remoteDir)) {
        await client.ensureDir(remoteDir); // idempotent; cds into it
        ensuredDirs.add(remoteDir);
      }
      // ensureDir leaves us in remoteDir; upload by basename to avoid re-cd.
      const base = remote.slice(remote.lastIndexOf('/') + 1);
      await client.uploadFrom(path.join(distDir, rel), base);
      deployed[rel] = newFiles[rel];
      done++;
      if (done % 10 === 0 || done === uploads.length) {
        process.stdout.write(`\r  uploaded ${done}/${uploads.length}   `);
      }
    }
    if (uploads.length) process.stdout.write('\n');

    for (const rel of deleted) {
      const remote = joinRemote(remoteRoot, rel);
      try {
        await client.remove(remote);
      } catch (e) {
        console.warn(`  warn: could not delete ${rel}: ${e.message}`);
      }
      delete deployed[rel];
    }
    if (deleted.length) console.log(`  deleted ${deleted.length} file(s)`);
  } finally {
    client.close();
    // Persist whatever state we reached, success or failure.
    await saveManifest(deployed);
    console.log('Manifest updated.');
  }

  if (opts.verify) {
    await verify(env, [...added, ...changed], newFiles);
  }
}

// ---- verify ---------------------------------------------------------------
async function verify(env, uploaded, newFiles) {
  const site = (env.SITE_URL || 'https://apeia.eu').replace(/\/+$/, '');
  // Sample: prefer .html files (visible pages), else first few of anything.
  const html = uploaded.filter((r) => r.endsWith('.html'));
  const sample = (html.length ? html : uploaded).slice(0, 5);
  if (!sample.length) return;
  console.log('\nVerifying sample over HTTPS:');
  for (const rel of sample) {
    const url = `${site}/${rel}`;
    try {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const got = createHash('sha256').update(buf).digest('hex');
      const ok = res.ok && got === newFiles[rel].sha256;
      console.log(`  ${ok ? 'OK ' : 'BAD'} ${res.status}  ${rel}`);
    } catch (e) {
      console.log(`  ERR      ${rel}  (${e.message})`);
    }
  }
}

// ---- cli ------------------------------------------------------------------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dist') args.dist = argv[++i];
    else if (a === '--yes') args.yes = true;
    else if (a === '--verify') args.verify = true;
    else args._.push(a);
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'plan';
  const distDir = path.resolve(args.dist || path.join(PROJECT_ROOT, 'dist'));

  try {
    await stat(distDir);
  } catch {
    console.error(`dist directory not found: ${distDir}\nRun \`npm run build\` first.`);
    process.exit(1);
  }

  if (cmd === 'init') {
    console.log(`Hashing ${distDir} as trusted baseline...`);
    const files = await hashTree(distDir);
    await saveManifest(files);
    console.log(`Wrote baseline manifest: ${Object.keys(files).length} files.`);
    return;
  }

  let oldFiles = await loadManifest();
  if (oldFiles === null) {
    if (cmd === 'reset') {
      oldFiles = {}; // reset doesn't need a prior baseline
    } else {
      console.error(
        'No manifest found. Run `node deploy/deploy.mjs init` when dist/ equals production.'
      );
      process.exit(1);
    }
  }

  console.log(`Hashing ${distDir}...`);
  const newFiles = await hashTree(distDir);

  // reset = force-upload every file regardless of hash match; still delete
  // anything the old manifest tracked that's no longer in dist/.
  const d =
    cmd === 'reset'
      ? {
          added: Object.keys(newFiles).sort(),
          changed: [],
          deleted: Object.keys(oldFiles)
            .filter((r) => !newFiles[r])
            .sort(),
        }
      : diff(oldFiles, newFiles);

  if (cmd === 'plan') {
    if (!d.added.length && !d.changed.length && !d.deleted.length) {
      console.log('No changes. dist/ matches the manifest.');
      return;
    }
    printPlan(d, newFiles);
    console.log('\n(plan only - run `push` to deploy)');
    return;
  }

  if (cmd === 'push' || cmd === 'reset') {
    const env = await loadEnv();
    if (!d.added.length && !d.changed.length && !d.deleted.length) {
      console.log('No changes to deploy.');
      return;
    }
    if (cmd === 'reset') {
      console.log(
        `RESET: re-uploading ALL ${d.added.length} file(s) in dist/, ignoring unchanged status.`
      );
    }
    printPlan(d, newFiles);
    if (!args.yes) {
      const secs = cmd === 'reset' ? 8 : 5;
      console.log(
        `\nStarting in ${secs}s... (Ctrl-C to abort, or pass --yes to skip)`
      );
      await sleep(secs * 1000);
    }
    await push(env, distDir, d, newFiles, oldFiles, { verify: args.verify });
    console.log('Done.');
    return;
  }

  console.error(`Unknown command: ${cmd}\nUse one of: init | plan | push | reset`);
  process.exit(1);
}

main().catch((e) => {
  console.error('\nDeploy failed:', e.message);
  process.exit(1);
});
