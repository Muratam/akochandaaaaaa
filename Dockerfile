# syntax=docker/dockerfile:1
# ビルドは Node、配信は nginx だけ（実行時に Node は要らない）。
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# 大きいもの（main.data・main.wasm・JS）は先に圧縮しておく（nginx の gzip_static）
RUN npm run build \
  && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.wasm' -o -name '*.data' -o -name '*.ico' \) \
     -size +1k -exec gzip -9 -k {} +

FROM nginx:1.30.6-alpine-slim
# uid/gid はホストのどのユーザーとも重ならない値にする（Muratam/sagisawa の portal と同じ。ホストの claude は 1001）
RUN addgroup -S -g 10001 web && adduser -S -u 10001 -G web web
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html/akochandaaaaa
USER web
EXPOSE 3130
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3130/akochandaaaaa/api/health >/dev/null || exit 1
# 公式イメージのエントリーポイントのスクリプト（設定を書き換える）は使わない
ENTRYPOINT ["nginx", "-g", "daemon off;"]
