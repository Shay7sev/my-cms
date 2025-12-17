---
title: "PM2"
description: "PM2 Cluster Mode（集群模式） 配合 原子化构建（Atomic Build） 策略"
pubDate: 2025-12-17
draft: false
---

要实现 **“构建期间旧服务可用，构建完成后无缝切换新服务”**（即零停机部署），单纯靠 `node` 命令是不够的，我们需要引入 Node.js 的生产级进程管理工具 —— **PM2**。

你需要采用 **PM2 Cluster Mode（集群模式）** 配合 **原子化构建（Atomic Build）** 策略。

### 核心原理

1.  **PM2 Cluster Mode**: PM2 可以启动多个 Node 实例（例如 2 个）。当你发出“重载”指令时，它会先重启实例 A（此时实例 B 继续服务），等实例 A 启动好了，再重启实例 B。这样用户永远不会遇到 502。
2.  **原子化构建**: 默认的 `astro build` 会先清空 `dist` 目录。如果在清空瞬间有请求进来，服务会崩。我们需要先构建到 `dist_temp`，构建完后瞬间替换 `dist` 目录。

以下是具体实现步骤：

---

### 第一步：在 `blog` 根目录新建 `ecosystem.config.cjs`

这是 PM2 的配置文件。我们配置两个服务：一个是博客主服务（集群模式），一个是监听文件的 Watcher（单例模式）。

```javascript
module.exports = {
  apps: [
    {
      name: "blog-server",
      script: "./dist/server/entry.mjs",
      instances: 2, // 启动 2 个实例实现轮替重启 (或者设为 'max')
      exec_mode: "cluster", // 集群模式，实现零停机
      env: {
        HOST: "0.0.0.0",
        PORT: 4321,
      },
    },
    {
      name: "content-watcher",
      // 这是一个简单的监听脚本，利用 nodemon 监听文件变化并触发更新脚本
      script: "nodemon",
      args: [
        "--watch", "src/content",
        "--ext", "md,mdx,json",
        "--delay", "1",
        "--exec", "./update.sh" // 监听到变化后，执行 update.sh
      ],
      interpreter: "none", // 不用 node 解析，直接运行 nodemon 命令
      watch: false, // PM2 不监听它，让 nodemon 自己监听
    },
  ],
};
```

---

### 第二步：在 `blog` 根目录新建 `update.sh`

这个脚本负责“原子构建”和“触发 PM2 重载”。

```bash
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
```

**重要：** 给脚本赋予执行权限。
在你的宿主机执行：
```bash
chmod +x blog/update.sh
```

---

### 第三步：修改 `blog/Dockerfile`

我们需要安装 PM2，并把启动命令改为 PM2。

```dockerfile
FROM node:20-slim

WORKDIR /app

# 配置国内源
RUN npm config set registry https://registry.npmmirror.com

# 1. 安装 pnpm, nodemon 和 pm2
RUN npm install -g pnpm nodemon pm2

# 复制依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 给脚本加权限 (防止宿主机没加)
RUN chmod +x update.sh

# 初始构建
RUN pnpm run build

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

# 【关键修改】使用 PM2 启动所有服务
# pm2-runtime 是专门为 Docker 设计的命令，它会保持容器前台运行
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
```

---

### 第四步：修改 `blog/package.json` (可选但推荐)

确保 `pnpm run build` 命令本身没有硬编码输出目录，以便我们可以在 `update.sh` 里覆盖它。

如果你的 package.json 是：
```json
"build": "astro build"
```
那就没问题，因为 `update.sh` 里用的是 `pnpm run build --outDir dist_temp`，Astro 会识别这个参数。

---

### 总结

现在你的 Docker 容器工作流如下：

1.  **启动时**：`pm2-runtime` 启动。
2.  **Process 1 (blog-server)**：启动 2 个 Node 实例监听 4321 端口。如果一个挂了，另一个还在。
3.  **Process 2 (content-watcher)**：启动 Nodemon 监听 `src/content`。
4.  **文件变化时**：
    *   Nodemon 触发 `update.sh`。
    *   `update.sh` 在后台构建到 `dist_temp`（此时 Process 1 依然用旧的 `dist` 提供服务，**用户访问正常**）。
    *   构建完成后，`mv` 命令瞬间替换目录。
    *   `pm2 reload blog-server` 触发滚动更新：先重启实例 1，再重启实例 2。
    *   **结果**：全程无 502，用户无感知更新。