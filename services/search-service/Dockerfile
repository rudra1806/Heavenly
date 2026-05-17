FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/search-service/package.json services/search-service/
RUN cd services/search-service && npm install --production
COPY shared/ shared/
COPY services/search-service/ services/search-service/
EXPOSE 3006
USER node
CMD ["node", "services/search-service/src/index.js"]
