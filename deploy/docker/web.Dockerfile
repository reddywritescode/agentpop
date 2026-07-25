FROM node:20-alpine AS build

RUN corepack enable
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY packages/ui packages/ui
ARG VITE_API_URL=/
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @agentpop/ui build && pnpm --filter @agentpop/web build

FROM nginx:1.27-alpine
COPY deploy/docker/web.nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/apps/web/dist /usr/share/nginx/html
COPY api/openapi.yaml /usr/share/nginx/html/openapi.yaml
EXPOSE 80
