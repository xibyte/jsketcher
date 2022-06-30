FROM node:16-alpine3.15 AS build

WORKDIR /usr/src/app

COPY . .

RUN npm install

ENTRYPOINT npm start
