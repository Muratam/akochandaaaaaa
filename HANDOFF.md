# 引き継ぎメモ（akochandaaaaaa）

構成（事実）・デプロイ・残っていること。作業の決まりは `CLAUDE.md`。サーバーの事実は `Muratam/sagisawa-admin` の `inventory.md`。事実は古くなるので、使う前に実物を確かめる。

## 1. 全体像

| もの | 場所 |
|---|---|
| 公開 | https://sagisawa.0am.jp/akochandaaaaa/ （public: ログインなし） |
| リポジトリ | GitHub `Muratam/akochandaaaaaa`（既定のブランチ master）。管理者AI のワーキングコピーは `/home/claude/akochandaaaaaa` |
| push | 管理者AI はこのリポジトリ専用のデプロイキー（書き込み、ssh の Host `github-akochan`）。ラボの `apps` は読み取り専用のキー（同じ Host 名）で pull だけ |
| 動く場所 | ラボの `apps` の `/srv/akochandaaaaaa/`、compose のプロジェクト `akochandaaaaa`、`10.44.135.10:3130` |

## 2. アプリ
- **技術構成**: Vue 3 + Vite（`base: /akochandaaaaa/`）の静的サイト。麻雀の計算は emscripten の `public/main.js`・`main.wasm`・`main.data`（`window.Module.process_request`）。配るのは nginx のコンテナ（`Dockerfile`・`docker/nginx.conf`。uid 10001、読み取り専用、大きいファイルはビルド時に gzip）。サーバー側の処理・DB・秘密は無い。盤面のログはブラウザの localStorage だけ。
- **テスト**: `npm run lint`・`npm test`（約 1.5 分。wasm を Node で動かし、決まった手で 5 局打って `test/golden.json` と突き合わせる。golden は UI を作り直す前の版をブラウザで打った記録）・`npm run build`。
- **デプロイ**: master に入れてから（PR）、ラボで `scripts/deploy-lab.sh`。`/akochandaaaaa/api/health` が 200 を返すことを確かめる。
  - murata: `sudo incus exec --project user-1001 apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh`
  - 管理者AI: `incus exec apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh`
- **公開**: `sagisawa-expose add akochandaaaaa 10.44.135.10:3130 --kind public`（ホストの手書きの `/akochandaaaaa/` を外してから。`/var/www/akochandaaaaa` は前の置き場所）。

## 3. 残っていること
- ラボへの初回のデプロイと、公開の切り替え（管理者AI と murata）。
