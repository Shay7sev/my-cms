#!/bin/sh
# 遇到错误立即退出
set -e

echo "=== Container Initialization ==="

# 1. 处理 SSH 密钥权限问题
# 如果挂载了 /tmp/ssh_mount，则将其复制到 /root/.ssh 并修复权限
if [ -d "/tmp/ssh_mount" ]; then
    echo "Found mounted SSH keys, configuring..."
    
    # 创建目录
    mkdir -p /root/.ssh
    
    # 复制文件 (使用 -L 处理可能的符号链接，虽通常不需要)
    cp -r /tmp/ssh_mount/* /root/.ssh/
    
    # 关键：修复权限
    # 目录必须是 700 (drwx------)
    chmod 700 /root/.ssh
    # 私钥和 config 文件必须是 600 (-rw-------)
    chmod 600 /root/.ssh/*
    # 确保所有者是 root
    chown -R root:root /root/.ssh
    
    echo "SSH permissions fixed."
else
    echo "No SSH volume mounted at /tmp/ssh_mount, skipping SSH setup."
fi

# 2. 解决 Git Dubious Ownership 问题
echo "Configuring git safe directory..."
git config --global --add safe.directory /workspace

# 3. (可选) 如果你希望也在 global config 里写入用户信息，防止某些 git 命令不读环境变量
if [ -n "$GIT_AUTHOR_EMAIL" ]; then
    git config --global user.email "$GIT_AUTHOR_EMAIL"
fi
if [ -n "$GIT_AUTHOR_NAME" ]; then
    git config --global user.name "$GIT_AUTHOR_NAME"
fi

echo "=== Starting Application ==="
# 执行原始 CMD 命令，或者直接指定你的二进制
exec "$@" # 如果 CMD 是 ["./server"]，这里会执行 ./server
# 或者直接指定: exec ./server