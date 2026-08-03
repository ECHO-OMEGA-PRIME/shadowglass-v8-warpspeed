# ShadowGlass v8 WarpSpeed

Private-cluster replacement for the rescued `shadowglass-v8-warpspeed` Cloudflare Worker. The active runtime is a loopback-only FastAPI service on FORGE with an isolated PostgreSQL schema, a leased PostgreSQL queue consumer, and an hourly systemd timer.

The repository also retains the pre-migration JavaScript and Wrangler files as historical evidence. They are not the deployment source of truth and must not be deployed.

## Runtime contract

- API: `127.0.0.1:8468`; staging: `127.0.0.1:8469`.
- Public route: none. The legacy workers.dev endpoint is disabled at cutover.
- Authentication: `/health` is public; all other routes require the read token, and mutations require the distinct write token.
- Service identities: separate non-login users for API, consumer, scheduler, and staging; only the consumer receives the scoped MinIO identity.
- Database: `cf_shadowglass_v8_warpspeed` schema with distinct least-privilege API, consumer, scheduler, and migration roles.
- Queue: leased claims, expiring-lease recovery, deterministic idempotency, bounded retry, and dead-letter state.
- Scheduler: `shadowglass-v8-warpspeed-scheduled.timer`, exactly at minute zero each UTC hour.
- Relay: loopback-only ShadowGlass Master, fixed paths, redirects denied, and DNS pinned per client lifetime. Validated L0 pages are retrieved directly over the same pinned public addresses when the Master has no private artifact.

The exact 17-route recovered contract is recorded in `evidence/route_contract.json` and implemented in `app.py`.

## Recovered state

The importers fail closed on pinned rescue hashes. Receipts contain table/key counts and deterministic digests, never record data or KV values.

- D1: six tables are imported into the isolated schema and re-read for count/digest equality. Redeploys verify every rescued immutable identity while permitting explicitly mutable operational columns and additional live rows.
- Endpoints: `endpoint_overrides.json` activates only seven current, official, live portals supported by the recovered PublicSearch/Tyler adapters. Eleven retired or unsupported county portals remain explicitly inactive.
- KV: only the two V8-owned key hashes recorded in `evidence/kv_owned_hashes.json` are accepted from the shared namespace; each rescued key/value pair is reverified independently of additional runtime keys.
- R2: no historical object archive was present. The 9,313 D1 references remain preserved and no HTTP route serves absent bytes. New page documents are persisted and round-trip verified in the isolated `shadowglass-v8-warpspeed` MinIO bucket.
- Queue: Cloudflare producers are disabled first, the legacy consumer remains attached through a sustained 15-minute zero-backlog/zero-oldest-message window, and only then is it removed.

## Local verification

```bash
python -m pytest -q tests
python -m ruff check .
python -m py_compile app.py core.py storage.py relay.py scraper.py object_store.py queue_worker.py consumer_canary.py scheduled_job.py import_d1.py import_kv.py apply_endpoint_overrides.py verify_endpoints.py service.py smoke_live.py
```

## Deployment gates

The deploy script runs as root on FORGE and accepts an explicit source directory and release ID through `SG_SOURCE_DIR` and `SG_RELEASE_ID`.

```bash
sudo --preserve-env=SG_SOURCE_DIR,SG_RELEASE_ID bash deploy_shadowglass_v8_warpspeed.sh --force-staging-failure
sudo --preserve-env=SG_SOURCE_DIR,SG_RELEASE_ID bash deploy_shadowglass_v8_warpspeed.sh --force-production-failure
sudo --preserve-env=SG_SOURCE_DIR,SG_RELEASE_ID bash deploy_shadowglass_v8_warpspeed.sh --deploy
sudo bash /home/forge/shadowglass-v8-warpspeed/current/finalize_shadowglass_v8_warpspeed.sh
```

Deployment accepts only a clean Git `HEAD`, extracts the candidate with `git archive`, and binds every receipt to the commit tree and deterministic source digest. Staging uses a disposable release-named PostgreSQL database, MinIO bucket, and credentials, all removed on exit. The forced staging rollback and forced production rollback receipts for those exact Git bytes are prerequisites for normal production provisioning.

Promotion then verifies the semantic provider contract for all seven active counties, exact rescued subsets, live API behavior, a targeted one-attempt queue-consumer/MinIO canary, and a read-only scheduler-role probe that proves exactly one eligible candidate without enqueuing it. Dedicated proof units exercise the exact production consumer and scheduler identities without starting the general consumer before cutover. A red production path restores the prior `current` target, exact unit files, and prior enabled/active states. Database/credential provisioning is deliberately monotonic and idempotent rather than destructively rolled back; an exact post-provision D1/KV/endpoint compatibility pass proves the prior and candidate layouts can coexist before promotion. Cloudflare Queue, cron, and workers.dev are changed only after production is green; restoration must converge or the deploy persists a root-only recovery marker and fails closed.

## Security boundaries

Runtime units receive only their required systemd credentials. The MinIO administrator identity is used only during root-run provisioning; the consumer can list/read/write the dedicated output bucket, delete only its acceptance-canary prefix, and read rescued ShadowGlass Master artifacts without modifying them. The API/scheduler receive no object-store credential. The root-run cutover tool obtains a Vault-held bearer token scoped to the single legacy Cloudflare account and only Queue/Worker read-write permissions; neither that token nor the sovereign key is available to the API, queue consumer, or timer. Its root-only recovery backup is accepted only when the queue, script, worker-consumer type, hourly cron, workers.dev state, and empty custom-domain set exactly match the recovered baseline. Operational logs and migration receipts exclude deed rows, KV names/values, credentials, source text, and relay destinations; authenticated search and record responses intentionally return their requested deed data.

Proprietary — ECHO OMEGA PRIME.
