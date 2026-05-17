FROM node:20-alpine
WORKDIR /app
COPY shared/package.json shared/
RUN cd shared && npm install --production
COPY bff/package.json bff/
RUN cd bff && npm install --production
COPY shared/ shared/
COPY bff/ bff/
EXPOSE 8080
USER node
CMD ["node", "bff/src/index.js"]
