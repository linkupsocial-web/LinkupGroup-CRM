# Deploy Linkup Group CMS on a Hostinger KVM VPS

This deployment uses Nginx Proxy Manager (NPM), an Nginx-based reverse proxy
with a web dashboard. Run it only once on the VPS; it can route this CMS and
the three or four websites you plan to add later.

| Container | Responsibility | Host ports |
| --- | --- | --- |
| `frontend` | Next.js CMS admin | None |
| `backend` | Express/MongoDB API | None |
| `nginx-proxy-manager` | Nginx routing, HTTPS certificates, proxy dashboard | 80, 443, loopback-only 81 |

MongoDB is deliberately external to this VPS stack. Use MongoDB Atlas or
another managed MongoDB deployment for backups and safer recovery.

## Before deployment

1. Use Hostinger's Docker VPS template, or install Docker Engine and Docker
   Compose on the KVM VPS.
2. Create an `A` record such as `cms.example.com` pointing to the VPS public
   IPv4 address. If you use Cloudflare, keep it **DNS only** until the first
   Let’s Encrypt certificate is issued.
3. Open inbound TCP ports `80` and `443` in the Hostinger firewall. Do not
   publish ports `5000` or `4029`.
4. Clone this repository on the VPS.

## Configure the CMS and proxy

From the repository root on the VPS:

```bash
cp .env.hostinger.example .env
cp backend/.env.production.example backend/.env.production
```

Set these values in `.env`:

```dotenv
CMS_DOMAIN=cms.your-domain.com
NPM_ADMIN_EMAIL=your-real-email@example.com
NPM_ADMIN_PASSWORD=a-strong-separate-proxy-password
```

`NPM_ADMIN_EMAIL` is for the Nginx Proxy Manager dashboard, not your CMS user.
It can be a normal Gmail or Hostinger account email.

Set these required values in `backend/.env.production`:

- `MONGODB_URI`
- `JWT_SECRET` — use a long random value
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — CMS login credentials
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`

Cloudinary can technically be omitted, but uploads will then be stored as large
Base64 values in MongoDB, which is not recommended for production.

## Start the containers

```bash
docker compose -f docker-compose.hostinger.yml --env-file .env up -d --build
```

## Create the CMS proxy host and HTTPS certificate

The NPM dashboard is deliberately not exposed to the internet. Open it through
an SSH tunnel from your computer:

```bash
ssh -L 8181:127.0.0.1:81 root@YOUR_VPS_IP
```

Open `http://localhost:8181` in your browser and sign in with the NPM email and
password from `.env`. Create a **Proxy Host** with these values:

| Field | Value |
| --- | --- |
| Domain Names | `cms.your-domain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `frontend` |
| Forward Port | `4029` |
| Websockets Support | Enabled |

In the same Proxy Host, create a **Custom Location** for the backend:

| Field | Value |
| --- | --- |
| Location | `/api` |
| Scheme | `http` |
| Forward Hostname / IP | `backend` |
| Forward Port | `5000` |

In the **SSL** tab, request a new Let’s Encrypt certificate for the same
domain, agree to the terms, then enable **Force SSL** and **HTTP/2 Support**.
Use any real email address for the certificate account.

The CMS will then be available at:

```text
https://cms.your-domain.com/admin
```

The browser reaches the backend through the same origin at:

```text
https://cms.your-domain.com/api/health
```

## Add future websites

NPM owns ports 80 and 443, so no future application stack should publish those
ports. The `web_proxy` Docker network created by this Compose file is reusable.
In each future website’s Compose file, declare:

```yaml
networks:
  web_proxy:
    external: true
    name: web_proxy
```

Attach the web-facing service to that network. Then add another Proxy Host in
NPM using its Docker service name and internal port. NPM can issue a separate
certificate for every domain.

## Verify and update

```bash
docker compose -f docker-compose.hostinger.yml --env-file .env ps
docker compose -f docker-compose.hostinger.yml --env-file .env logs -f backend
curl -fsS https://cms.your-domain.com/api/health
```

To deploy new Git changes, pull them and run the same `up -d --build` command.
Stopping the stack preserves NPM’s proxy configuration and certificates:

```bash
docker compose -f docker-compose.hostinger.yml --env-file .env down
```

Hostinger documents Compose deployment in its [Docker Manager guide](https://www.hostinger.com/support/12040815-how-to-deploy-your-first-container-with-hostinger-docker-manager/) and the Docker-ready VPS image in its [Docker VPS template guide](https://support.hostinger.com/en/articles/8306612-how-to-use-the-docker-vps-template). The Nginx Proxy Manager Compose configuration and its private-network pattern follow its [official setup](https://nginxproxymanager.com/setup/) and [advanced configuration](https://develop.nginxproxymanager.com/advanced-config/) documentation.
