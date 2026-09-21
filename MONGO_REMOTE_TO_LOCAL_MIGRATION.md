# Remote MongoDB to local Docker migration

This checkpoint is deliberately backup-only. It reads the remote `test` database, creates and verifies a timestamped directory-format backup, and then stops. It cannot delete the local Mongo volume or restore data.

> **Critical safety rule:** do not remove `linkup-crm_mongo_data` until this backup passes every verification and the operator separately types the exact confirmation phrase requested in the backup report.

## 1. Configure the remote source

Keep the remote URI only in the ignored, mode-`600` `.env.migration` file:

```dotenv
SOURCE_MONGODB_URI=mongodb+srv://REDACTED
SOURCE_MONGO_DB=test
TARGET_MONGO_DB=linkup_cms
```

Use a URI-encoded password and a remote account with read-only access to `test`. Never commit or print this file. The script writes the URI to temporary mode-`600` mounted files so it is not passed in a Docker command argument or container environment variable.

## 2. Create and verify the backup

```bash
bash scripts/migrate-remote-mongo-to-local.sh
```

Backups use native MongoDB directory format with gzip:

```text
.mongo-backups/remote-test-YYYYMMDD-HHMMSS/
  REMOTE_COUNTS.tsv
  SHA256SUMS
  test/
    admins.bson.gz
    admins.metadata.json.gz
    ...
```

The script performs only these operations:

1. Discovers non-system collections and records their remote document counts.
2. Runs `mongodump --db=test --out=/backup --gzip --numParallelCollections=1`.
3. Prints safe size progress every 30 seconds and declares a stall only after five continuous minutes without output growth.
4. If the full dump stalls or fails, preserves collections that `mongodump` reported complete and retries only incomplete collections.
5. Requires a non-empty BSON and metadata gzip for every discovered collection and checks gzip integrity.
6. Runs `mongorestore --dryRun --dir=/backup/test` against local configuration and requires every collection to appear in the dry-run namespace listing; this reads the dump but writes no local data.
7. Generates and verifies `SHA256SUMS` for every backup file.
8. Prints the backup report and stops.

If a dump completed but a later verification assertion needs to be rerun, reuse it without contacting the remote source or redumping data:

```bash
bash scripts/migrate-remote-mongo-to-local.sh --verify-existing .mongo-backups/remote-test-YYYYMMDD-HHMMSS
```

Only the remote application database `test` is dumped. The `admin`, `local`, `config`, and unrelated `sample_mflix` databases are excluded. The `test.admins` collection is application data and is included; MongoDB authentication users are not.

## 3. Destructive gate

After a verified report, the next phase requires the operator to type exactly:

```text
DELETE LOCAL MONGO
```

That confirmation is intentionally not accepted or acted upon by the backup script. Local deletion and restore require a separate, reviewed step after confirmation. Until then:

- do not run `docker compose down -v`;
- do not remove `linkup-crm_mongo_data`;
- do not restore into `linkup_cms`;
- do not run the seed command.

## 4. Credential hygiene

If a remote credential has appeared in any prior terminal or diagnostic output, rotate it after securing the verified backup. The backup script avoids process-argument and container-environment exposure, but rotation is still required for a credential that was already disclosed.
