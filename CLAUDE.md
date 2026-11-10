# akochandaaaaaa で作業するときの決まり

牌効率チェッカー（一人麻雀の練習サイト、`/akochandaaaaa/`）のリポジトリ。ここにはこのアプリに特有の決まりだけを書く。

**先に読む**: 共通の決まり（禁止事項・作業の流れ・守ること）は `Muratam/sagisawa` の `CLAUDE.md`。サーバーの管理者AI は `/home/claude/sagisawa/CLAUDE.md` を、ほかの環境では GitHub か手元の clone を読む。
構成・デプロイ・テストのコマンドは `HANDOFF.md`。

## このアプリに特有のこと
- 既定のブランチは **master**（main ではない）。PR の `--base` も master。
- リポジトリ名は a が 6 つ（`akochandaaaaaa`）、URL のパスは a が 5 つ（`/akochandaaaaa/`）。パスは変えない（共有された盤面の URL `?q=<シード>` が生きている）。
- 計算の中身（`public/main.*` の wasm、`src/mahjong.js`、`src/components/Calculator.vue` の結果のまとめと採点）と、入力の意味・結果を変えるときは、先に murata に聞く。
