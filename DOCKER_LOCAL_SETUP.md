# Local production-like Docker setup

This stack keeps only Nginx reachable from the Mac. Nginx sends browser pages to Next.js and preserves `/api/...` paths when proxying API requests to Express. Express alone can reach MongoDB.

```text
Browser -> 127.0.0.1:8080 Nginx -> frontend:4029
                                  -> backend:5000 -> mongo:27017
```

## 1. Configure the environment

Copy the example and replace all placeholders with local values. Keep Mongo usernames and passwords URI-safe (hexadecimal values are safe). Reuse the application's current admin, JWT, and Cloudinary values; do not invent new admin credentials.

```bash
cp .env.docker.example .env.docker
```

`.env.docker` is ignored by Git. Never commit it. `NEXT_PUBLIC_API_URL=/api` is a non-secret and is compiled into the frontend image by Compose.

The Mongo app-user initialization script runs only when `mongo_data` is empty. Changing Mongo credentials later does not recreate the user in an existing volume; update the user deliberately or initialize a new local volume after making an explicit backup decision.

## 2. Validate, build, and start

```bash
docker compose --env-file .env.docker config
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
```

Open <http://localhost:8080/admin/login>.

## 3. Logs and operations

```bash
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker logs -f frontend
docker compose --env-file .env.docker logs -f backend
docker compose --env-file .env.docker logs -f mongo
docker compose --env-file .env.docker logs -f nginx
docker compose --env-file .env.docker restart
```

Stop the stack while keeping Mongo data:

```bash
docker compose --env-file .env.docker down
```

> **Destructive:** `docker compose --env-file .env.docker down -v` permanently deletes the local MongoDB Docker volume. Do not run it unless losing that data is intentional.

## 4. Smoke test

```bash
bash scripts/docker-smoke-test.sh
```

The script checks Nginx, frontend, backend, the public companies API, container health, backend-to-Mongo connectivity, security headers, and host port isolation. It does not log in or mutate application data.

## 5. Access Mongo without publishing it

Start an authenticated shell as the root database operator without putting port 27017 on the host:

```bash
docker compose --env-file .env.docker exec mongo sh -lc 'mongosh --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin "$MONGO_DB"'
```

Docker DNS resolves service names only inside the Compose networks:

```text
backend -> mongo:27017
nginx   -> backend:5000
nginx   -> frontend:4029
```

The `db` network is internal and includes only Mongo and the backend. The `edge` network includes Nginx, frontend, and backend. Nginx and frontend cannot reach Mongo directly.

## 6. VPS notes

Before an Ubuntu VPS deployment, replace local public URLs, add tested TLS termination and domain configuration, store secrets using the chosen server secret-management mechanism, define backup/restore and monitoring, and review resource limits using measured production load. Keep Mongo unexposed.
