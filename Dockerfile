# syntax=docker/dockerfile:1
FROM node:16.14.2-alpine

WORKDIR /build

COPY . .

RUN npm install
RUN npm run verify
RUN npm run build
RUN rm -rf node_modules
RUN npm install --production

FROM node:16.14.2-alpine

WORKDIR /app

COPY --from=0 /build /app

CMD ["node", "dist/index.js"]

EXPOSE 3000