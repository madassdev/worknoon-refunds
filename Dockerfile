FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS frontend-build
COPY . .
RUN pnpm build

FROM dependencies AS backend
ENV NODE_ENV=production
COPY server ./server
COPY shared ./shared
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 4311
CMD ["pnpm", "start"]

FROM nginx:stable-alpine AS frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
EXPOSE 80
