# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies (using npm install since project uses bun.lockb, not package-lock.json)
RUN npm install --include=dev

# Copy source code
COPY . .

# Clear Supabase env vars so self-hosted mode is detected at runtime
RUN rm -f .env

# Build with placeholder URL — replaced at container startup by docker-entrypoint-nginx.sh
# This allows the Supabase client to initialize without crashing, and nginx
# proxies /rest/v1/ requests to the local backend's PostgREST-compatible layer.
ENV VITE_SUPABASE_URL="__LIFEOS_URL_PLACEHOLDER__"
ENV VITE_SUPABASE_PUBLISHABLE_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.ZopqoUt20nEV9cklpv9e3yw3PVyZLmKs5qLD6nGL1SI"

# Build the application
RUN ./node_modules/.bin/vite build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy runtime entrypoint script
COPY docker/docker-entrypoint-nginx.sh /docker-entrypoint-nginx.sh
RUN chmod +x /docker-entrypoint-nginx.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Use custom entrypoint that injects runtime URL
ENTRYPOINT ["/docker-entrypoint-nginx.sh"]
