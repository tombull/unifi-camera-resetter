FROM node:lts-stretch AS builder
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn next telemetry disable
RUN yarn export

FROM fholzer/nginx-brotli:latest
RUN rm -rf /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/out ./
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types
