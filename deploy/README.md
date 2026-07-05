# Incremental FTP deploy

The FTP host can't hash files, so `deploy/manifest.json` (committed) holds a
sha256 for every file in production. Deploy builds fresh, hashes `dist/`, diffs
against the manifest, and uploads/deletes only what changed. The manifest is our
server-side hash table kept locally - no full second copy of the site on disk.

## One-time setup

1. `npm install` (adds `basic-ftp`).
2. Copy `deploy/.env.example` to `deploy/.env` and fill in FTP credentials.
   `.env` is gitignored; never commit it.
3. The baseline `deploy/manifest.json` was generated from the `dist/` that
   equals current production.

## Everyday use

```
npm run build          # regenerate dist/
npm run deploy:plan    # show exactly what would upload/delete (no network)
npm run deploy         # push the diff (5s pause before uploading)
npm run deploy -- --verify   # push, then HTTP-check a sample of changed files
```

`npm run deploy` prints the plan and pauses before uploading; Ctrl-C aborts.
Pass `--yes` to skip the pause (e.g. from a skill).

## Regenerating the manifest

The manifest records what's on disk, not what's on the server - it trusts that
`dist/` equals production. Refresh it two ways:

- **`npm run deploy:init`** - re-hash `dist/` and overwrite the baseline. Only
  safe when `dist/` is known to match the server (right after a full, complete
  upload). Running it while the two differ bakes that drift into the baseline.
- **`npm run deploy:reset`** - recovery button. Force-uploads *every* file in
  `dist/` (ignoring "unchanged" status), deletes anything the old manifest
  tracked but `dist/` no longer has, then writes a fresh manifest. Use this when
  you suspect the manifest and server have drifted and want a guaranteed-clean
  resync.

## How it stays safe

- Files upload first; the manifest is rewritten only after (and even on partial
  failure it records exactly what reached the server, so a re-run resumes).
- Astro fingerprints assets, so adding one photo changes only that image plus
  the few HTML/asset files referencing it - the hash diff uploads just those.

## Commands (raw)

```
node deploy/deploy.mjs init    # write baseline manifest from dist/
node deploy/deploy.mjs plan    # dry-run diff
node deploy/deploy.mjs push    # deploy diff       [--yes] [--verify] [--dist <dir>]
node deploy/deploy.mjs reset   # force full resync [--yes] [--verify] [--dist <dir>]
```
