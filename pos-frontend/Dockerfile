FROM node:22-alpine3.23 AS builder

WORKDIR /app

# Copy package info and lock files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . .

# Build the Next.js app
RUN npm run build

# Production image
FROM node:22-alpine3.23 AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Copy the standalone output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]