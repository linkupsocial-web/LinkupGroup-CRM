FROM node:22-bookworm-slim AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json index.js seed.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node models ./models
COPY --chown=node:node routes ./routes
COPY --chown=node:node utils ./utils

USER node
EXPOSE 5000
CMD ["node", "index.js"]
