# 使用轻量级 Node 镜像
FROM node:20-slim

WORKDIR /app

# 1. 配置国内镜像源 (npm 和 pnpm)
RUN npm config set registry https://registry.npmmirror.com

# 2. 全局安装 pnpm 和 nodemon
RUN npm install -g pnpm nodemon pm2

# 3. 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 4. 【关键】安装所有依赖 (包括 devDependencies)
# 因为我们需要运行 'astro build'，它依赖 typescript, astro 等开发包
RUN pnpm install --frozen-lockfile

# 5. 复制源代码
COPY . .

# 给脚本加权限 (防止宿主机没加)
RUN chmod +x update.sh

# 6. 执行一次初始构建 (保证容器启动时有 dist 目录)
RUN pnpm run build

# 7. 设置环境变量
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

# 8. 【核心逻辑】启动命令
# --watch src/content: 只监听内容目录的变化
# --ext md,mdx,json: 只关注这些后缀的文件
# --delay 2.5: (可选) 延迟重启，防止短时间内连续保存导致频繁构建
# --exec "...": 检测到变化时执行的命令
# 命令逻辑: "重新构建 && 启动服务"
# CMD ["nodemon", \
#      "--watch", "src/content", \
#      "--ext", "md,mdx,json", \
#      "--delay", "2.5", \
#      "--exec", "pnpm run build && node ./dist/server/entry.mjs"]

# 【关键修改】使用 PM2 启动所有服务
# pm2-runtime 是专门为 Docker 设计的命令，它会保持容器前台运行
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]