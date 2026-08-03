#!/bin/sh
# vercel-build.sh - 智能迁移处理脚本
# 处理 Vercel 部署时的 Prisma 迁移问题
# 包括 P3009 (迁移失败)、P3017 (迁移冲突) 等错误

set -e

echo "=========================================="
echo "  Pintree Vercel Build Script"
echo "=========================================="
echo ""

echo "[1/5] Generating Prisma Client..."
npx prisma generate

echo ""
echo "[2/5] Attempting to deploy migrations..."
set +e
npx prisma migrate deploy 2>&1
MIGRATE_EXIT=$?
set -e

if [ $MIGRATE_EXIT -eq 0 ]; then
    echo "   Migrations deployed successfully."
else
    echo "   Migration deploy failed (exit code: $MIGRATE_EXIT)."
    echo "   Trying to resolve migration state..."
    set +e
    npx prisma migrate resolve --applied 20260101000000_init 2>&1
    RESOLVE_EXIT=$?
    set -e
    
    if [ $RESOLVE_EXIT -eq 0 ]; then
        echo "   Migration resolved. Re-running deploy..."
        npx prisma migrate deploy 2>&1 || {
            echo "   Migration deploy still failing."
            echo "   Falling back to prisma db push..."
            npx prisma db push --accept-data-loss --skip-generate 2>&1
        }
    else
        echo "   Resolve failed (exit code: $RESOLVE_EXIT)."
        echo "   Falling back to prisma db push..."
        npx prisma db push --accept-data-loss --skip-generate 2>&1
    fi
fi

echo ""
echo "[3/5] Building Next.js application..."
npx next build

echo ""
echo "=========================================="
echo "  Build completed successfully!"
echo "=========================================="
