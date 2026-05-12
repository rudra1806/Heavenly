FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/review-service/package.json services/review-service/
RUN cd services/review-service && npm install --production
COPY shared/ shared/
COPY services/review-service/ services/review-service/
EXPOSE 3003
CMD ["node", "services/review-service/src/index.js"]
