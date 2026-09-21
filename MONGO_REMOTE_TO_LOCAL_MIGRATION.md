# Remote MongoDB to local Docker migration

This workflow makes a read-only dump of the remote application database, verifies the archive, deletes only the confirmed local Compose Mongo volume, recreates the local Mongo accounts, restores the application data, and compares collection counts.

> **Critical safety rule:** the script must never modify the remote database. It uses only `ping`, collection enumeration, document counts, and `mongodump` against the source. `mongorestore` is connected only to the local `mongo` service.

## 1. Configure the remote source

Create the ignored local migration environment from the template:

```bash
cp .env.migration.example .env.migration
chmod 600 .env.migration
```

Set the remote URI only in `.env.migration`:

```dotenv
SOURCE_MONGODB_URI=mongodb+srv://REDACTED
SOURCE_MONGO_DB=linkup_cms
TARGET_MONGO_DB=linkup_cms
```

Use a URI-encoded password when it contains reserved URI characters. Prefer a remote Mongo account that has read-only access to `SOURCE_MONGO_DB`. Never commit or print this file.

## 2. Create and verify a backup without deleting local data

```bash
bash scripts/migrate-remote-mongo-to-local.sh --backup-only
```

Archives are written as:

```text
.mongo-backups/remote-linkup_cms-YYYYMMDD-HHMMSS.archive.gz
```

The script requires a successful remote ping, records collection counts, runs `mongodump` only for `SOURCE_MONGO_DB`, verifies a non-empty archive and SHA-256 checksum, and performs a `mongorestore --dryRun` against local Mongo. Failure at any verification step prevents deletion.

The archive, checksum, and count manifests remain in the Git-ignored `.mongo-backups/` directory.

## 3. Run the complete migration

```bash
bash scripts/migrate-remote-mongo-to-local.sh
```

After the verified backup is complete, the script displays the exact labeled local volume. It continues only when an operator types exactly:

```text
DELETE LOCAL MONGO
```

This permanently destroys only the local `linkup-crm` Mongo data. It does not use `docker compose down -v`; it stops this Compose project and removes only the volume labeled as project `linkup-crm` and Compose volume `mongo_data`.

## 4. Fresh local users and restore

Starting the fresh `mongo` service reruns [docker/mongo/init-app-user.sh](docker/mongo/init-app-user.sh). Mongo recreates its local root account and the dedicated `readWrite` application account from `.env.docker`.

The restore then connects to `mongo:27017` using the local application account. It restores collections, documents, and indexes from the application database archive. It does not restore `admin`, `local`, or `config`, and does not import remote authentication users.

If source and target database names differ, the script uses `--nsFrom` and `--nsTo`. `TARGET_MONGO_DB` must match the local `MONGO_DB` setting.

The seed command is deliberately never run during this workflow.

## 5. Count and application validation

The script records sorted per-collection remote counts before the dump and local counts after restore. Any difference fails the migration before the application is started.

After a matching restore it starts all services, waits for their Docker health checks, requests `/api/health` and `/api/companies`, and runs:

```bash
bash scripts/docker-smoke-test.sh
```

Finally, sign in at <http://localhost:8080/admin> with the existing `.env.docker` CMS credentials and verify the active-company selector reflects the restored companies. CMS authentication remains environment/JWT based; Mongo users are not CMS login users.

## 6. Optional temporary MongoDB Compass access

Mongo stays private by default. For temporary GUI access, create an untracked Compose override containing:

```yaml
services:
  mongo:
    ports:
      - "127.0.0.1:27017:27017"
```

Apply it together with `compose.yaml`, connect Compass through `127.0.0.1`, and remove the override/recreate the service when finished. Never bind Mongo to `0.0.0.0`.

## 7. Repeating safely

1. Confirm `.env.migration` points to the intended read-only source.
2. Run `--backup-only` and retain the verified archive.
3. Review remote counts and the exact local volume name.
4. Run the full script and type the exact destructive confirmation only after reviewing the backup evidence.
5. Review count comparison, smoke-test output, and the CMS company selector.
6. Keep the archive until rollback and debugging are no longer required.

Never run `npm run seed` after restoring real server data unless that separate action is explicitly authorized.
