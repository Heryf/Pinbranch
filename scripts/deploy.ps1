# ============================================================
# Pinbranch Git 一键部署脚本 (Windows 本地 / 服务器)
#
# 用法: .\scripts\deploy.ps1 [分支]      # 默认 main
#
# 流程: 本地改动暂存 → git pull → npm install
#       → prisma 迁移 + next build → 重启服务 → 健康检查
# 前置: 已安装 Node.js >= 18, npm, git
# ============================================================

param(
    [string]$Branch = "main",
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $AppDir

function Log($msg)  { Write-Host "[deploy] $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "[deploy] $msg" -ForegroundColor Yellow }

# ---------- 1. 前置检查 ----------
if (-not (Test-Path ".git")) { throw "当前目录不是 git 仓库: $AppDir" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "未找到 node，请先安装 Node.js >= 18" }
if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { throw "未找到 npm" }

# ---------- 2. 本地改动保护 ----------
$Stashed = $false
$Dirty = git status --porcelain
if ($Dirty) {
    Warn "检测到未提交的本地改动，自动 stash 暂存（部署完成后自动恢复）"
    git stash push -m "auto-stash before deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --include-untracked
    $Stashed = $true
}

# ---------- 3. 拉取代码 ----------
Log "拉取远程代码: origin/$Branch"
git fetch origin $Branch
if ($LASTEXITCODE -ne 0) { throw "git fetch 失败，请检查网络或远程仓库地址" }
$Local  = git rev-parse HEAD
$Remote = git rev-parse "origin/$Branch"
if ($Local -eq $Remote) {
    Log "本地已是最新 ($(git rev-parse --short HEAD))，跳过 pull"
} else {
    git pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "git pull 失败（可能有冲突），已中止部署" }
}
Log "当前版本: $(git rev-parse --short HEAD)"

# ---------- 4. 安装依赖 ----------
Log "安装依赖 (npm install)"
npm install --no-audit --no-fund

# ---------- 5. 数据库迁移 + 构建 ----------
Log "数据库迁移 + 构建 (npm run build)"
npm run build

# ---------- 6. 重启服务 ----------
$UsingPm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if ($UsingPm2) {
    Log "通过 pm2 重启 pinbranch"
    pm2 startOrRestart "$AppDir\scripts\ecosystem.config.cjs" --env production
    pm2 save
} else {
    Log "未检测到 pm2，终止旧进程并用 Start-Process 启动 (端口 $Port)"
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -match "next start" -and $_.CommandLine -match "-p $Port" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 1
    $env:NODE_ENV = "production"
    $env:PORT = "$Port"
    Start-Process -FilePath "npm" -ArgumentList "run start -- -p $Port" `
        -WorkingDirectory $AppDir -RedirectStandardOutput ".deploy.log" `
        -RedirectStandardError ".deploy.err.log" -WindowStyle Hidden
}

# ---------- 7. 健康检查 ----------
Log "健康检查: http://127.0.0.1:$Port （最长 60s）"
$Deadline = (Get-Date).AddSeconds(60)
$Ok = $false
while ((Get-Date) -lt $Deadline) {
    try {
        $Resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 5
        if ($Resp.StatusCode -eq 200) { $Ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
if ($Ok) {
    Log "部署成功 ✅ 应用已就绪: http://127.0.0.1:$Port"
} else {
    Warn "服务启动中但健康检查未通过，请查看日志: .deploy.log / .deploy.err.log"
    throw "部署失败"
}

# ---------- 8. 恢复本地暂存 ----------
if ($Stashed) {
    Warn "恢复部署前暂存的本地改动"
    git stash pop
}

Log "全部完成 ✅"
