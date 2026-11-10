#!/bin/sh
# ラボ（Incus の apps）の中で動かすデプロイ: origin/master の最新を取り出してビルドし、入れ替える。
# ヘルスチェックに通らなければ、前のイメージに戻す。
#   ホストの murata: sudo incus exec --project user-1001 apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh
#   管理者AI（claude）: incus exec apps -- /srv/akochandaaaaaa/scripts/deploy-lab.sh
set -eu
cd "$(dirname "$0")/.."
git pull -q --ff-only origin master
# .env は bind 先（APP_BIND）だけで秘密は無い。無ければ見本から作る
[ -f .env ] || cp .env.example .env
prev=$(docker image inspect -f '{{.Id}}' akochandaaaaa-app:latest 2>/dev/null || true)
[ -n "$prev" ] && docker tag "$prev" akochandaaaaa-app:prev
docker compose build -q app
docker compose up -d app || echo "deploy-lab: app の起動に失敗" >&2
status() { docker inspect -f '{{.State.Health.Status}}' akochandaaaaa-app-1 2>/dev/null || echo missing; }
i=0
while [ "$(status)" != healthy ] && [ $i -lt 40 ]; do i=$((i + 1)); sleep 3; done
if [ "$(status)" != healthy ]; then
  echo "deploy-lab: ヘルスチェックに失敗 → 前のイメージに戻す" >&2
  if [ -n "$prev" ]; then docker tag akochandaaaaa-app:prev akochandaaaaa-app:latest; docker compose up -d --no-build app; fi
  exit 1
fi
echo "deploy-lab: $(git log --oneline -1)"
