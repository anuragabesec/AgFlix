# Stage 1: Build compilation
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production execution
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

# Create uploads storage directories inside container
RUN mkdir -p uploads/videos uploads/posters uploads/thumbnails

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
