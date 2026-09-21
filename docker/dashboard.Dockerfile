FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/video/package.json apps/video/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/dashboard apps/dashboard
RUN npm run build -w packages/shared-types && npm run build -w apps/dashboard

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
