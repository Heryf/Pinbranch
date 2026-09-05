#!/bin/sh
# vercel-build.sh - Vercel 构建脚本（精简版）
#
# 关键修复：Vercel Hobby 构建环境（iad1）与 Neon pooler（us-east-2）网络不通，
#          prisma migrate deploy / db push 必然 P1001 失败。
# 解决方案：构建时**不触碰数据库**，只生成 client + next build。
#          数据库迁移改为本地手动执行（脚本见 docs/MIGRATION.md）。
#
# 流程：
#   [1/3] prisma generate   （无需数据库连接）
#   [2/3] prisma format      （无副作用，仅格式化校验）
#   [3/3] next build         （生成生产产物）

set -e

echo "=========================================="
echo "  Pinbranch Vercel Build Script"
echo "=========================================="
echo ""

echo "[1/3] Generating Prisma Client..."
npx prisma generate

echo ""
echo "[2/3] Validating Prisma schema..."
npx prisma format

echo ""
echo "[3/3] Building Next.js application..."
npx next build

echo ""
echo "=========================================="
echo "  Build completed successfully!"
echo "=========================================="