use axum::{
    extract::{Json, Path},
    http::StatusCode,
    routing::{get, get_service, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, process::Command};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir; // 需要添加 tower-http features=["fs"]
use walkdir::WalkDir;

// 配置你的博客内容路径 (根据实际情况修改)
const BLOG_CONTENT_PATH: &str = "../blog/src/content/blog";

#[tokio::main]
async fn main() {
    let serve_dir = ServeDir::new("assets");
    // 允许跨域，方便你开发管理前端
    let app = Router::new()
        .route("/api/posts", get(list_posts).post(create_post))
        .route("/api/sync", post(git_sync))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive());

    println!("Admin server running at http://localhost:5011");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:5011").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// 数据结构：文章
#[derive(Debug, Serialize, Deserialize)]
struct Post {
    filename: String,
    title: String,
    content: String,
    // 其他 frontmatter 字段...
}

// 1. 获取文章列表
async fn list_posts() -> Json<Vec<String>> {
    let mut posts = Vec::new();
    for entry in WalkDir::new(BLOG_CONTENT_PATH)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().extension().map_or(false, |ext| ext == "md") {
            if let Some(name) = entry.file_name().to_str() {
                posts.push(name.to_string());
            }
        }
    }
    Json(posts)
}

// 2. 创建或更新文章 (简化版)
async fn create_post(Json(payload): Json<Post>) -> StatusCode {
    let file_path = PathBuf::from(BLOG_CONTENT_PATH).join(&payload.filename);

    // 构建 Markdown 内容 (含 Frontmatter)
    let file_content = format!(
        "---\ntitle: \"{}\"\npubDate: {}\n---\n\n{}",
        payload.title,
        chrono::Local::now().format("%Y-%m-%d"),
        payload.content
    );

    match fs::write(file_path, file_content) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// 3. Git 同步功能 (核心需求)
#[derive(Deserialize)]
struct SyncRequest {
    message: String,
}

async fn git_sync(Json(payload): Json<SyncRequest>) -> Result<String, StatusCode> {
    // 执行 git add .
    let add = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir("..") // 在根目录执行
        .output();

    if add.is_err() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // 执行 git commit
    let commit = Command::new("git")
        .arg("commit")
        .arg("-m")
        .arg(&payload.message)
        .current_dir("..")
        .output();

    // 允许 commit 失败（比如没有变化时），但也需要处理

    // 执行 git push
    let push = Command::new("git").arg("push").current_dir("..").output();

    match push {
        Ok(output) => {
            if output.status.success() {
                Ok("Sync successful!".to_string())
            } else {
                let err_msg = String::from_utf8_lossy(&output.stderr);
                println!("Git Push Error: {}", err_msg);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
