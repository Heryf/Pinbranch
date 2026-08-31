#!/usr/bin/env bash
# ============================================================
# Pinbranch Git 一键部署脚本（Linux 服务器）
#
# 用法:
#   ./deploy.sh [分支]                 # 默认 main
#   BRANCH=main PORT=3000 ./deploy.sh
#
# 流程: 本地改动暂存 → git pull → npm install
#       → prisma 迁移 + next build → 重启服务(pm2/systemd/nohup)
#       → HTTP 健康检查 → 恢复暂存
#
# 前置要求:
#   - 本脚本放在项目根目录（git 仓库内）执行
#   - 已安装 node ≥ 18 / npm
#   - 可选: pm2 (推荐) 或 systemd 服务
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${BRANCH:-${1:-main}}"
APP_NAME="pinbranch"
PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"   # 健康检查总超时(秒)

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[deploy] 失败:\033[0m %s\n' "$*" >&2; exit 1; }

# ---------- 1. 前置检查 ----------
cd "$APP_DIR"
git rev-parse --git-dir >/dev/null 2>&1 || die "当前目录不是 git 仓库: $APP_DIR"
command -v node >/dev/null || die "未找到 node，请先安装 Node.js ≥ 18"
command -v npm  >/dev/null || die "未找到 npm"
command -v curl >/dev/null || die "未找到 curl（健康检查需要）"

# ---------- 2. 本地改动保护 ----------
STASHED=0
if ! git diff --quiet --exit-code; then
  warn "检测到未提交的本地改动，自动 stash 暂存（部署完成后自动恢复）"
  git stash push -m "auto-stash before deploy $(date +%F-%T)" --include-untracked || true
  STASHED=1
fi

# ---------- 3. 拉取代码 ----------
log "拉取远程代码: origin/$BRANCH"
git fetch origin "$BRANCH" || die "git fetch 失败，请检查网络或远程仓库地址"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")
if [ "$LOCAL" = "$REMOTE" ]; then
  log "本地已是最新 ($(git rev-parse --short HEAD))，跳过 pull"
else
  git pull --ff-only origin "$BRANCH" || die "git pull 失败（可能有冲突），已中止部署"
fi
log "当前版本: $(git rev-parse --short HEAD) ($(git log -1 --format=%ci))"

# ---------- 4. 安装依赖 ----------
log "安装依赖 (npm install)"
npm install --no-audit --no-fund

# ---------- 5. 数据库迁移 + 构建 ----------
log "数据库迁移 + 构建 (npm run build)"
npm run build

# ---------- 6. 重启服务 ----------
restart_service() {
  if command -v pm2 >/dev/null 2>&1; then
    log "通过 pm2 重启 $APP_NAME"
    pm2 startOrRestart "$APP_DIR/ecosystem.config.cjs" --env production
    pm2 save >/dev/null 2>&1 || true
  elif systemctl list-units --type=service 2>/dev/null | grep -q "$APP_NAME"; then
    log "通过 systemd 重启 $APP_NAME"
    sudo systemctl restart "$APP_NAME"
  else
    log "未检测到 pm2/systemd，使用 nohup 后台启动 (端口 $PORT)"
    pkill -f "next start.*-p $PORT" 2>/dev/null || true
    sleep 1
    nohup npm run start -- -p "$PORT" > "$APP_DIR/.deploy.log" 2>&1 &
  fi
}
restart_service

# ---------- 7. 健康检查 ----------
log "健康检查: $HEALTH_URL （最长 ${HEALTH_TIMEOUT}s）"
start_ts=$(date +%s)
ok=0
while true; do
  now=$(date +%s)
  [ $((now - start_ts)) -ge "$HEALTH_TIMEOUT" ] && break
  if curl -fsS -o /dev/null --max-time 5 "$HEALTH_URL"; then ok=1; break; fi
  sleep 3
done

if [ "$ok" = 1 ]; then
  log "部署成功 ✅ 应用已就绪: $HEALTH_URL"
else
  warn "服务启动中但健康检查未通过，请查看日志:"
  warn "  pm2 logs $APP_NAME     （pm2 方式）"
  warn "  cat $APP_DIR/.deploy.log （nohup 方式）"
  exit 1
fi

# ---------- 8. 恢复本地暂存 ----------
if [ "$STASHED" = 1 ]; then
  warn "恢复部署前暂存的本地改动"
  git stash pop || warn "stash 恢复失败，改动仍在 stash 列表中（git stash list 查看）"
fi

log "全部完成 ✅"
