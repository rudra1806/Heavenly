FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/media-service/package.json services/media-service/
RUN cd services/media-service && npm install --production
COPY shared/ shared/
COPY services/media-service/ services/media-service/
EXPOSE 3005
USER node
CMD ["node", "services/media-service/src/index.js"]
