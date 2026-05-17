FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/listing-service/package.json services/listing-service/
RUN cd services/listing-service && npm install --production
COPY shared/ shared/
COPY services/listing-service/ services/listing-service/
EXPOSE 3002
USER node
CMD ["node", "services/listing-service/src/index.js"]
