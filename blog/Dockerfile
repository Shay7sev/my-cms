# 使用轻量级 Node 镜像
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 1. 【国内加速】配置 npm 镜像源为淘宝/npmmirror
RUN npm config set registry https://registry.npmmirror.com

# 2. 全局安装 pnpm (使用国内源)
RUN npm install -g pnpm

# 3. 复制依赖定义文件
# 这是一个 Docker 缓存技巧：只要 package.json 没变，这层缓存就不会失效，不用重新下载依赖
COPY package.json pnpm-lock.yaml ./

# 4. 【国内加速】使用 pnpm 安装依赖
# --frozen-lockfile: 严格按照 lock 文件安装，防止版本漂移
RUN pnpm install --frozen-lockfile

# 5. 复制项目所有文件
COPY . .

# 6. 暴露 Astro 默认端口
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

# 7. 【关键】使用开发模式启动
# --host: 允许局域网/Docker外部访问
# 这个模式下，Astro 会实时监听 src/content 的变化，无需手动重启
CMD ["pnpm", "run", "dev"]