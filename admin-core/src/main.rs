use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Router,
};
use gray_matter::{engine::YAML, Matter};
use serde::{Deserialize, Serialize};
use std::{env, fs, path::PathBuf, process::Command};
use tower_http::{cors::CorsLayer, services::ServeDir};
use walkdir::WalkDir; // 解析 Frontmatter

// 配置你的博客内容路径 (根据实际情况修改)
// const BLOG_CONTENT_PATH: &str = "../blog/src/content/blog";

fn get_content_path() -> String {
    env::var("BLOG_CONTENT_PATH").unwrap_or_else(|_| "../blog/src/content/blog".to_string())
}

// 新增：获取项目根目录 (Git 执行的地方)
fn get_project_root() -> String {
    env::var("PROJECT_ROOT").unwrap_or_else(|_| "..".to_string()) // 本地开发回退到 ..
}

#[tokio::main]
async fn main() {
    let serve_dir = ServeDir::new("assets");
    // 允许跨域，方便你开发管理前端
    let app = Router::new()
        .route("/api/posts", get(list_posts).post(save_post))
        .route("/api/posts/:filename", get(get_post).delete(delete_post)) // 增加 Get 和 Delete
        .route("/api/sync", post(git_sync))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive());

    println!("Admin server running at http://localhost:5011");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:5011").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// 数据结构：文章
// 用于前端列表展示 (只返回元数据，不返回正文)
#[derive(Serialize)]
struct PostSummary {
    filename: String,
    title: String,
    draft: bool,
    date: String,
}

// 用于编辑和保存 (包含完整信息)
#[derive(Debug, Serialize, Deserialize)]
struct PostDetail {
    filename: Option<String>, // 保存时如果为空，则新建
    title: String,
    description: String, // [新增] 必填字段
    content: String,
    draft: bool,
    #[serde(default)]
    tags: Vec<String>, // [可选] 标签支持
}

#[derive(Debug, Serialize, Deserialize)]
struct Post {
    // 1. 改为 Option，允许前端不传这个字段（新建文章时）
    filename: Option<String>,
    title: String,
    content: String,
    // 2. 补上 draft 字段，之前漏了
    #[serde(default)] // 如果前端没传，默认 false
    draft: bool,
}

// 所有字段都设为 Option，这样即使 markdown 里缺了某个字段，也不会报错
#[derive(Deserialize, Default)] // 需要引入 Default
struct Frontmatter {
    title: Option<String>,
    draft: Option<bool>,
    pubDate: Option<String>,
    description: Option<String>,
}

// 1. 获取文章列表 (解析每个文件的 Frontmatter)
async fn list_posts() -> Json<Vec<PostSummary>> {
    let mut posts = Vec::new();
    let matter = Matter::<YAML>::new();

    for entry in WalkDir::new(get_content_path())
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().extension().map_or(false, |ext| ext == "md") {
            let filename = entry.file_name().to_str().unwrap().to_string();

            if let Ok(content) = fs::read_to_string(entry.path()) {
                let parsed = matter.parse(&content);

                // --- 修复开始 ---

                // 我们不再使用 parsed.data["draft"] 这种危险写法
                // 而是尝试将其转化为 Frontmatter 结构体
                let fm: Frontmatter = parsed
                    .data
                    .and_then(|data| data.deserialize().ok()) // 安全转化
                    .unwrap_or_default(); // 如果转化失败（比如没有 Frontmatter），使用默认空值

                // 现在可以安全地取值了，unwrap_or 处理 None 的情况
                let title = fm.title.unwrap_or(filename.clone());
                let draft = fm.draft.unwrap_or(false);
                let date = fm.pubDate.unwrap_or_else(|| "Unknown".to_string());

                // --- 修复结束 ---

                posts.push(PostSummary {
                    filename,
                    title,
                    draft,
                    date,
                });
            }
        }
    }
    // 按文件名排序
    posts.sort_by(|a, b| b.filename.cmp(&a.filename));
    Json(posts)
}

// 2. 获取单篇文章详情 (用于回显)
// 2. 获取单篇文章详情
async fn get_post(Path(filename): Path<String>) -> impl IntoResponse {
    let path = PathBuf::from(get_content_path()).join(&filename);
    let matter = Matter::<YAML>::new();

    match fs::read_to_string(path) {
        Ok(raw_content) => {
            let parsed = matter.parse(&raw_content);

            // --- 修复开始 ---
            let fm: Frontmatter = parsed
                .data
                .and_then(|data| data.deserialize().ok())
                .unwrap_or_default();

            let post = PostDetail {
                filename: Some(filename),
                title: fm.title.unwrap_or_default(),
                description: fm.description.unwrap_or_default(),
                draft: fm.draft.unwrap_or(false),
                tags: vec![],
                content: parsed.content,
            };
            // --- 修复结束 ---

            (StatusCode::OK, Json(post)).into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}

// 3. 保存文章 (新建或更新)
// 3. 保存文章 (新建或更新)
async fn save_post(Json(payload): Json<PostDetail>) -> StatusCode {
    // 确定文件名
    let filename = match payload.filename {
        Some(name) if !name.is_empty() => name,
        _ => {
            // 自动生成 slug
            let slug: String = payload
                .title
                .to_lowercase()
                .chars()
                .map(|c| if c.is_alphanumeric() { c } else { '-' })
                .collect();
            format!("{}.md", slug)
        }
    };

    let path = PathBuf::from(get_content_path()).join(&filename);

    // 构建 Frontmatter
    let file_content = format!(
        "---\ntitle: \"{}\"\ndescription: \"{}\"\npubDate: {}\ndraft: {}\n---\n\n{}",
        payload.title,
        payload.description,                     // [已修复] 写入 description
        chrono::Local::now().format("%Y-%m-%d"), // 这里简化处理，实际更新时最好保留原日期
        payload.draft,
        payload.content
    );

    match fs::write(path, file_content) {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            eprintln!("Save error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// 4. 删除文章
async fn delete_post(Path(filename): Path<String>) -> StatusCode {
    let path = PathBuf::from(get_content_path()).join(&filename);
    match fs::remove_file(path) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// 5. Git 同步功能 (核心需求)
#[derive(Deserialize)]
struct SyncRequest {
    message: String,
}

async fn git_sync(Json(payload): Json<SyncRequest>) -> Result<String, StatusCode> {
    let root_dir = get_project_root(); // 获取环境变量路径
                                       // 执行 git add .
    let add = Command::new("git")
        .arg("add")
        .arg(".")
        .current_dir(&root_dir) // 在根目录执行
        .output();

    if add.is_err() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    // 执行 git commit
    let commit = Command::new("git")
        .arg("commit")
        .arg("-m")
        .arg(&payload.message)
        .current_dir(&root_dir)
        .output();

    // 允许 commit 失败（比如没有变化时），但也需要处理

    // 执行 git push
    let push = Command::new("git")
        .arg("push")
        .current_dir(&root_dir)
        .output();

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
