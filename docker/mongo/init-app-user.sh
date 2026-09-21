#!/usr/bin/env bash
set -euo pipefail

: "${MONGO_INITDB_ROOT_USERNAME:?MONGO_INITDB_ROOT_USERNAME is required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?MONGO_INITDB_ROOT_PASSWORD is required}"
: "${MONGO_APP_USERNAME:?MONGO_APP_USERNAME is required}"
: "${MONGO_APP_PASSWORD:?MONGO_APP_PASSWORD is required}"
: "${MONGO_DB:?MONGO_DB is required}"

mongosh --quiet \
  --host 127.0.0.1 \
  --port 27017 \
  --username "${MONGO_INITDB_ROOT_USERNAME}" \
  --password "${MONGO_INITDB_ROOT_PASSWORD}" \
  --authenticationDatabase admin \
  --eval '
    const appDb = db.getSiblingDB(process.env.MONGO_DB);
    const username = process.env.MONGO_APP_USERNAME;
    const password = process.env.MONGO_APP_PASSWORD;
    const roles = [{ role: "readWrite", db: process.env.MONGO_DB }];

    if (appDb.getUser(username) === null) {
      appDb.createUser({ user: username, pwd: password, roles });
    } else {
      appDb.updateUser(username, { pwd: password, roles });
    }
  '
