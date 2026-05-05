FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY services/booking-service/package.json services/booking-service/
RUN cd services/booking-service && npm install --production
COPY shared/ shared/
COPY services/booking-service/ services/booking-service/
EXPOSE 3004
CMD ["node", "services/booking-service/src/index.js"]
