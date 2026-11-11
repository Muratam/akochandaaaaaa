# 牌効率チェッカー（akochandaaaaa）

一人麻雀で牌効率を練習するサイト。打牌するたびに、最善の打牌と比較して、失った期待値・和了率・聴牌率を表示する。
https://sagisawa.0am.jp/akochandaaaaa/ （ログインなしの公開）

https://github.com/nekobean/mahjong-calculator を emscripten 対応し、牌効率チェッカー用に改変したもの。
emscripten 化のコードは https://github.com/Muratam/mahjong-cpp/ にある（`public/main.js`・`main.wasm`・`main.data` はそのビルドの成果物）。

## 手元で動かす
Node.js ^20.19 / >=22.12。

```
npm ci
npm run dev      # 開発用サーバー（http://localhost:5173/akochandaaaaa/）
npm run build    # dist/ に出力（ベースパスは /akochandaaaaa/）
npm run lint
npm test         # 計算結果が前の版と同じかを確認する（wasm を Node で動かす。約 1.5 分）
```

画面は sagisawa のポータルと同じダークテーマのトークン（`src/style.css`）。手牌は画面下部の台に常に表示し、片手で打てるようにしてある。

## ラボで動かす（sagisawa）
静的なファイルを nginx のコンテナ（`docker/nginx.conf`）で配信する。compose のプロジェクト名は `akochandaaaaa`、ポートは 3130。

- 置き場所: ラボの `apps` の `/srv/akochandaaaaaa/`（このリポジトリ。master を読み取り専用のキーで pull する）
- デプロイ: `scripts/deploy-lab.sh`（`git pull --ff-only origin master` → ビルド → 入れ替え → ヘルスチェック。通らなければ前のイメージにロールバックする）
- bind 先は `.env` の `APP_BIND`（ラボは `10.44.135.10`。無ければ `deploy-lab.sh` が `.env.example` から作る。シークレットの値は無い）
- ヘルスチェック: `GET /akochandaaaaa/api/health` → 200 `{"ok":true}`
- 手元で確認する: `docker compose up -d --build` → `curl http://127.0.0.1:3130/akochandaaaaa/api/health`
