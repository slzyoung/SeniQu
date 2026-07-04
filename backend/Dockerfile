# ============================================
# SENIQU BACKEND - Production Dockerfile
# Multi-stage build for Tencent Cloud deployment
# ============================================

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools for native modules (sharp, bcryptjs, etc.)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json tsconfig.json nest-cli.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies for sharp and other native modules
RUN apk add --no-cache vips tini ffmpeg \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled dist from builder stage
COPY --from=builder /app/dist ./dist
# Copy package.json for metadata
COPY package.json ./

# Set proper ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port (configurable via PORT env var, default 3001)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/api/v1/health || exit 1

# Use tini for proper PID 1 signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]
