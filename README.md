# 牌効率チェッカー（akochandaaaaa）

一人麻雀で牌効率を練習するサイト。打牌するたびに、最善の打牌に比べて失った期待値・和了率・聴牌率を出す。
https://sagisawa.0am.jp/akochandaaaaa/ （ログインなしの公開）

https://github.com/nekobean/mahjong-calculator を emscripten 対応し、牌効率チェッカー用に改変したもの。
emscripten 化のコードは https://github.com/Muratam/mahjong-cpp/ にある（`public/main.js`・`main.wasm`・`main.data` はそのビルドの成果物）。

## 動かす（手元）
Node.js ^20.19 / >=22.12。

```
npm ci
npm run dev      # 開発用サーバー（http://localhost:5173/akochandaaaaa/）
npm run build    # dist/ に出力（ベースパスは /akochandaaaaa/）
npm run lint
```

## ラボで動かす（sagisawa）
静的なファイルを nginx のコンテナ（`docker/nginx.conf`）で出す。compose のプロジェクト名は `akochandaaaaa`、ポートは 3130。

- 置き場所: ラボの `apps` の `/srv/akochandaaaaaa/`（このリポジトリ。master を読み取り専用のキーで pull する）
- デプロイ: `scripts/deploy-lab.sh`（`git pull --ff-only origin master` → ビルド → 入れ替え → ヘルスチェック。通らなければ前のイメージに戻す）
- bind 先は `.env` の `APP_BIND`（ラボは `10.44.135.10`。無ければ `deploy-lab.sh` が `.env.example` から作る。秘密の値は無い）
- ヘルスチェック: `GET /akochandaaaaa/api/health` → 200 `{"ok":true}`
- 手元で確かめる: `docker compose up -d --build` → `curl http://127.0.0.1:3130/akochandaaaaa/api/health`
