# 引き継ぎメモ（akochandaaaaaa）

構成（事実）・デプロイ・残作業。作業の決まりは `CLAUDE.md`。サーバーの事実は `Muratam/sagisawa-admin` の `inventory.md`。事実は古くなるので、使う前に実物で確認する。

## 1. 全体像

| 項目 | 場所 |
|---|---|
| 公開 | https://sagisawa.0am.jp/akochandaaaaa/ （public: ログインなし） |
| リポジトリ | GitHub `Muratam/akochandaaaaaa`（既定のブランチ master）。管理者AI のワーキングコピーは `/home/claude/akochandaaaaaa` |
| push | 管理者AI はこのリポジトリ専用のデプロイキー（書き込み、ssh の Host `github-akochan`）。ラボの `apps` は読み取り専用のキー（同じ Host 名）で pull だけ |
| 動く場所 | ラボの `apps` の `/srv/akochandaaaaaa/`、compose のプロジェクト `akochandaaaaa`、`10.44.135.10:3130` |

## 2. アプリ
- **技術構成**: Vue 3 + Vite（`base: /akochandaaaaa/`）の静的サイト。麻雀の計算は emscripten の `public/main.js`・`main.wasm`・`main.data`（`window.Module.process_request`）。配信は nginx のコンテナ（`Dockerfile`・`docker/nginx.conf`。uid 10001、読み取り専用、大きいファイルはビルド時に gzip）。サーバー側の処理・DB・シークレットは無い。盤面のログはブラウザの localStorage だけ。
- **画面**: sagisawa のポータル（`Muratam/sagisawa` の `portal/src/app/globals.css`）と同じトークンのダークテーマ（`src/style.css`）。Bootstrap は使わない。手牌は上の帯のすぐ下に固定した台（視線を上の 1 か所にまとめる。以前は下に置いていた）。巡目・ドラ表示・場と自風・最善に対するゲージは、手牌を見ながら使うので台の中の手牌のすぐ下に置く（「巡目・ドラ表示・場と自風・ボタン」の段の下に「最善に対する」のゲージの段。PC もスマホと同じ 2 段〔T309〕。縦 500px 以下で幅 760px 以上の画面〔スマホの横など〕だけ 1 行）。河はその段のさらに下、台のいちばん下に置く（1 段分の高さを最初から取り、2 段目は下へ伸びるので手牌は動かない。2 段を超えたら枠の中でスクロールする）。画面は `100dvh` の縦の枠にちょうど収め、ページ全体はスクロールしない（伸びる中身は内側の枠でスクロールする。手牌の位置は 1 局の間動かない）。候補（前の一手の打牌の候補と評価）はトグルなしで常に表示する。捨てる前の手牌の段（`.prev-move`）は幅・高さとも 760px 以上の画面だけに出す（T141。1280×720 でも候補が 10 行見えるように）。台より下の高さは全部候補に充てる（1 列）。候補の表は 1 行 1 候補で、その欄の中だけでスクロールする（先頭が最善）。スマホ縦（390×844）・横（844×390）・PC（1440×900、1280×720）でページの縦が画面の高さ以下になること。ポータルの iframe（左にナビ）の中でもトップでも崩れないこと、スマホ（iPhone 13）と PC（1280）で、1 局を打ってスクロール量 0・手牌の座標が変わらないことを確認する。
- **テスト**: `npm run lint`・`npm test`（約 1.5 分。wasm を Node で動かし、固定の手で 5 局打って `test/golden.json` と照合する。golden は UI を作り直す前の版をブラウザで打った記録）・`npm run build`。
- **デプロイ**: master にマージしてから（PR）、ラボで `scripts/deploy-lab.sh`。`/akochandaaaaa/api/health` が 200 を返すことを確認する。
  - murata: `sudo incus exec --project user-1001 apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh`
  - 管理者AI: `incus exec apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh`
- **公開**: `sagisawa-expose add akochandaaaaa 10.44.135.10:3130 --kind public`（11-11 に切り替え済み。ホストの nginx に手で書いた `/akochandaaaaa/` の設定と、以前の配置場所 `/var/www/akochandaaaaa` は消した）。

## 3. 残作業
- なし（ラボへの初回のデプロイと公開の切り替えは 11-11 に済んだ。T99）。
