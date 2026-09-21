FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-noto-cjk libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnss3 libpango-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/video/package.json apps/video/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/server apps/server
COPY apps/video apps/video
COPY docker/server-entrypoint.sh docker/server-entrypoint.sh

RUN npm run build -w packages/shared-types \
    && npm run prisma:generate -w apps/server \
    && npm run build -w apps/server \
    && npx remotion browser ensure \
    && chmod +x docker/server-entrypoint.sh \
    && mkdir -p apps/server/storage/audio apps/server/storage/video apps/server/storage/thumbnails

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["/app/docker/server-entrypoint.sh"]
