#!/bin/sh

# 设置 Git 安全目录
echo "Configuring git safe directory..."
git config --global --add safe.directory /workspace

# 设置 Git 作者信息 (如果 docker-compose.yml 中没有设置)
git config --global user.email "$GIT_AUTHOR_EMAIL"
git config --global user.name "$GIT_AUTHOR_NAME"

echo "Starting application..."
# 执行原始 CMD 命令，或者直接指定你的二进制
exec "$@" # 如果 CMD 是 ["./server"]，这里会执行 ./server
# 或者直接指定: exec ./server