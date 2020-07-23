FROM node:lts-stretch AS builder
WORKDIR /app
COPY website/package*.json ./
RUN npm ci
COPY website/. .
RUN npx next telemetry disable
RUN npm run export

FROM fholzer/nginx-brotli:latest
RUN rm -rf /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/out ./
COPY nginx.conf /etc/nginx/nginx.conf
COPY mime.types /etc/nginx/mime.types
