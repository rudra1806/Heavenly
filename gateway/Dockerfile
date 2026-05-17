# =====================
# Gateway Dockerfile
# =====================
# Multi-stage build: install dependencies, then run
FROM node:20-alpine

WORKDIR /app

# Copy shared package first (dependency of gateway)
COPY shared/package.json shared/
RUN cd shared && npm install --production

# Copy gateway package and install
COPY gateway/package.json gateway/
RUN cd gateway && npm install --production

# Copy source code
COPY shared/ shared/
COPY gateway/ gateway/

# Expose gateway port
EXPOSE 3000

USER node

# Start the gateway
CMD ["node", "gateway/src/index.js"]
