# =====================
# Auth Service Dockerfile
# =====================
FROM node:20-alpine

WORKDIR /app

# Copy shared package first (dependency)
COPY shared/package.json shared/
RUN cd shared && npm install --production

# Copy service package and install
COPY services/auth-service/package.json services/auth-service/
RUN cd services/auth-service && npm install --production

# Copy source code
COPY shared/ shared/
COPY services/auth-service/ services/auth-service/

EXPOSE 3001

CMD ["node", "services/auth-service/src/index.js"]
