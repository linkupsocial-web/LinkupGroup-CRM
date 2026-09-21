'use strict';

const fs = require('fs');
const mongoose = require('mongoose');

(async () => {
  const uri = fs.readFileSync('/run/secrets/source.uri', 'utf8').trim();
  const connection = mongoose.createConnection(uri, {
    dbName: process.env.COUNT_DB,
    serverSelectionTimeoutMS: 30_000,
  });

  try {
    await connection.asPromise();
    const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
    const names = collections
      .map(({ name }) => name)
      .filter((name) => !name.startsWith('system.'))
      .sort();

    for (const name of names) {
      const count = await connection.db.collection(name).countDocuments({});
      process.stdout.write(`${name}\t${count}\n`);
    }
  } finally {
    await connection.close();
  }
})().catch(() => process.exit(1));
