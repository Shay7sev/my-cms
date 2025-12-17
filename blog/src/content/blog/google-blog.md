---
title: "google blog"
description: "Rust 后端修正"
pubDate: 2025-12-17
draft: false
---

抱歉，这是我的疏忽。

问题在于：我在 Rust 的 `struct Post` 中定义了 `filename` 是**必须字段**，但在 React 前端代码中，我们只发送了 `title` 和 `content`，没有自动生成文件名，导致后端解析 JSON 失败。

要解决这个问题，最好的做法是**由后端自动根据标题生成文件名**（如果没有提供文件名的话）。

下面是修正后的方案，分为 **Rust 后端修正** 和 **React 前端修正**。

### 1. 修正 Rust 后端 (`admin-core/src/main.rs`)

我们需要做两件事：

1.  把 `filename` 改为 `Option<String>`（可选字段）。
2.  如果没有文件名，就根据标题自动生成（比如 "My First Post" -> "my-first-post.md"）。

请更新 `main.rs` 中的 `Post` 结构体和 `create_post` 函数：

```rust
// ... 之前的引用保持不变

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

async fn create_post(Json(payload): Json<Post>) -> StatusCode {
    // 3. 核心逻辑：如果有 filename 就用，没有就根据 title 生成
    let actual_filename = match payload.filename {
        Some(name) => name,
        None => {
            // 简单的 slug 生成逻辑：转小写，空格变横杠，只保留安全字符
            let slug: String = payload.title
                .to_lowercase()
                .chars()
                .map(|c| if c.is_alphanumeric() { c } else { '-' })
                .collect();
            // 处理连续的横杠（可选优化），并加上后缀
            format!("{}.md", slug)
        }
    };

    let file_path = PathBuf::from(BLOG_CONTENT_PATH).join(&actual_filename);

    // 4. 构建 Markdown 内容 (处理 draft)
    let file_content = format!(
        "---\ntitle: \"{}\"\npubDate: {}\ndraft: {}\n---\n\n{}",
        payload.title,
        chrono::Local::now().format("%Y-%m-%d"),
        payload.draft,
        payload.content
    );

    match fs::write(file_path, file_content) {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            eprintln!("Failed to write file: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        },
    }
}
```

---

### 2. 优化 React 前端 (`admin-frontend/src/App.jsx`)

虽然上面 Rust 的改动已经可以修复报错，但为了支持**“编辑旧文章”**（而不总是创建新文件），我们需要在前端做一点状态管理：区分是“新建”还是“更新”。

但为了先跑通流程，你可以保持之前的代码不变，或者使用下面这个**更完善的版本**：

```jsx
import { useState } from "react";
import { Editor } from "@bytemd/react";
import gfm from "@bytemd/plugin-gfm";
import "bytemd/dist/index.css";

export default function App() {
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  // 新增：记录当前编辑的文件名。如果是新建，它就是 null
  const [currentFilename, setCurrentFilename] = useState(null);

  const handleSave = async (isDraft) => {
    // 简单的校验
    if (!title) {
      alert("请输入标题");
      return;
    }

    const payload = {
      // 如果 currentFilename 是 null，Rust 后端会自动生成
      filename: currentFilename,
      title: title,
      content: value,
      draft: isDraft,
    };

    try {
      const res = await fetch("http://localhost:8080/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("保存成功！");
        // 保存成功后，最好清空或者获取生成的文件名（这里简化处理，暂不回填）
      } else {
        alert("保存失败，请检查后端控制台");
      }
    } catch (e) {
      console.error(e);
      alert("请求错误");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Blog Admin</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题 (例如: Hello World)"
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "18px",
            marginBottom: "10px",
          }}
        />

        {/* 如果你想手动指定文件名，可以在这里加一个 input 修改 currentFilename */}
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Editor
          value={value}
          plugins={[gfm()]}
          onChange={(v) => setValue(v)}
          editorConfig={{ minHeight: "400px" }}
        />
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button
          onClick={() => handleSave(true)}
          style={{ padding: "10px 20px" }}
        >
          保存为草稿
        </button>
        <button
          onClick={() => handleSave(false)}
          style={{ padding: "10px 20px", background: "black", color: "white" }}
        >
          直接发布
        </button>

        <div style={{ flex: 1 }}></div>

        <button
          onClick={() =>
            fetch("http://localhost:8080/api/sync", { method: "POST" })
          }
          style={{
            padding: "10px 20px",
            background: "#28a745",
            color: "white",
          }}
        >
          同步到 GitHub
        </button>
      </div>
    </div>
  );
}
```

### 总结变化点

1.  **Rust `struct Post`**: `filename` 变成了 `Option<String>`。
2.  **Rust 逻辑**: 增加了 `match payload.filename`，如果为 `None` 则从 `title` 生成类似 `hello-world.md` 的文件名。
3.  **Rust 逻辑**: 显式处理了 `draft` 字段。

现在，你只需输入标题和内容，点击保存，Rust 就会自动帮你创建 Markdown 文件了。