#!/bin/sh

echo "Detected content change. Starting atomic build..."

# 1. 构建到临时目录 (防止构建过程中 dist 被清空导致服务崩溃)
pnpm run build --outDir dist_temp

# 2. 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "Build successful. Swapping directories..."
    
    # 3. 原子替换目录 (mv 操作在同一文件系统下是瞬间完成的)
    # 先删除旧的备份(如果有)
    rm -rf dist_old 
    # 把当前正在用的移走
    if [ -d "dist" ]; then
        mv dist dist_old
    fi
    # 把新的移上位
    mv dist_temp dist
    
    # 4. 零停机重载服务
    echo "Reloading PM2 cluster..."
    pm2 reload blog-server
    
    echo "Update complete!"
else
    echo "Build failed! Keeping old version."
    rm -rf dist_temp
fi