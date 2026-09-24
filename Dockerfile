# Stage 1: Build client and server using npm workspaces
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configurations
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies for building
RUN npm ci

# Copy sources
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN npm run build -w client
RUN npm run build -w server

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/quasselstrippe.db \
    CLIENT_DIST_PATH=/app/client/dist

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Create SQLite data volume mount point
RUN mkdir -p /data

EXPOSE 3000

VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
