# Use Node.js 22 as base image
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Configure Chinese mirror for npm and pnpm
RUN npm config set registry https://registry.npmmirror.com/ && pnpm config set registry https://registry.npmmirror.com/

# Copy package files
COPY package*.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build application
RUN npx tsup --minify

# Use Node.js alpine as production base
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Configure Chinese mirror for npm and pnpm
RUN npm config set registry https://registry.npmmirror.com/ && pnpm config set registry https://registry.npmmirror.com/

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN pnpm install --production

# Copy built files from builder stage
COPY --from=builder /app/dist /app/dist

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]