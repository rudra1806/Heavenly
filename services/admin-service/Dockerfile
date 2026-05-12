FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/admin-service/package.json services/admin-service/
RUN cd services/admin-service && npm install --production
COPY shared/ shared/
COPY services/admin-service/ services/admin-service/
EXPOSE 3007
CMD ["node", "services/admin-service/src/index.js"]
