# Stage 1: Base (install dependencies)
FROM node:20-alpine AS base
WORKDIR /app

# Enable Corepack to use pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./
# Generate lockfile inside container since it's gitignored
RUN pnpm install

# Stage 2: Development
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host"]

# Stage 3: Build
FROM base AS build
COPY . .
RUN pnpm run build

# Stage 4: Production
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
