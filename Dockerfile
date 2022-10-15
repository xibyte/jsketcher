FROM node:16-alpine3.15 AS build

WORKDIR /usr/src/app

COPY package.json .

RUN npm install

FROM node:16-alpine3.15

WORKDIR /usr/src/app

COPY . .

COPY --from=build /usr/src/app /usr/src/app

ENTRYPOINT npm start
