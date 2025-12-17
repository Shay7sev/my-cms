# ===========================
# 阶段 1: 编译构建 (Builder)
# ===========================
FROM rust:1.83-slim-bookworm AS builder

WORKDIR /usr/src/app

# 【修正关键点】：直接写入到 $CARGO_HOME/config.toml
# 官方 Rust 镜像中 CARGO_HOME = /usr/local/cargo
RUN echo '[source.crates-io]' > $CARGO_HOME/config.toml \
    && echo 'replace-with = "rsproxy-sparse"' >> $CARGO_HOME/config.toml \
    && echo '[source.rsproxy]' >> $CARGO_HOME/config.toml \
    && echo 'registry = "https://rsproxy.cn/crates.io-index"' >> $CARGO_HOME/config.toml \
    && echo '[source.rsproxy-sparse]' >> $CARGO_HOME/config.toml \
    && echo 'registry = "sparse+https://rsproxy.cn/index/"' >> $CARGO_HOME/config.toml \
    && echo '[registries.rsproxy]' >> $CARGO_HOME/config.toml \
    && echo 'index = "https://rsproxy.cn/crates.io-index"' >> $CARGO_HOME/config.toml

# 验证一下文件是否真的存在（构建时会在 log 打印出来，让你放心）
RUN cat $CARGO_HOME/config.toml

# 1. 缓存依赖
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# 2. 编译真正源码
COPY src ./src
RUN touch src/main.rs
RUN cargo build --release

# ===========================
# 阶段 2: 运行环境 (Runtime)
# ===========================
FROM debian:bookworm-slim

# 【优化2】修改 Debian 软件源为阿里云镜像（解决 apt-get 慢/失败）
# Debian 12 (Bookworm) 使用的是 debian.sources 文件，而不是老式的 sources.list
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 现在安装软件就会飞快
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app/bin

# 拷贝二进制
COPY --from=builder /usr/src/app/target/release/admin-core ./server

EXPOSE 5011

CMD ["./server"]