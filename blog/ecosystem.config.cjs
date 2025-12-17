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
        "--watch",
        "src/content",
        "--ext",
        "md,mdx,json",
        "--delay",
        "2.5",
        "--exec",
        "./update.sh", // 监听到变化后，执行 update.sh
      ],
      interpreter: "none", // 不用 node 解析，直接运行 nodemon 命令
      watch: false, // PM2 不监听它，让 nodemon 自己监听
    },
  ],
};
