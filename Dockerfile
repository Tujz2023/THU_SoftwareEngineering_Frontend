# TODO Start: [Student] Complete Dockerfile
FROM docker.net9.org/library/node:22 AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm config set registry https://registry.npmmirror.com

RUN pnpm install

COPY . .

RUN pnpm build

FROM docker.net9.org/library/node:22

WORKDIR /app

COPY --from=build /app/.next/standalone .
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static

ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
# TODO End