import { useState, useEffect, useCallback } from "react"
import { Editor } from "@bytemd/react"
import gfm from "@bytemd/plugin-gfm"
import "bytemd/dist/index.css"

// 简单的样式组件
const containerStyle = {
  display: "flex",
  height: "100vh",
  fontFamily: "sans-serif",
}
const inputStyle = {
  width: "100%",
  padding: "8px",
  marginBottom: "10px",
  border: "1px solid #ccc",
  borderRadius: "4px",
}
const listItemStyle = (active: boolean) => ({
  padding: "10px",
  cursor: "pointer",
  borderBottom: "1px solid #eee",
  background: active ? "#e6f7ff" : "transparent",
  color: active ? "#1890ff" : "#333",
})

export default function App() {
  const [posts, setPosts] = useState<
    Array<{
      filename: string
      title: string
      draft: boolean
      date: string
    }>
  >([])
  const [currentFile, setCurrentFile] = useState(null) // 当前选中的文件名 (null 代表新建)

  // 表单状态
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("") // [新增] description
  const [content, setContent] = useState("")
  const [draft, setDraft] = useState(false)

  // 1. 加载文章列表
  // 使用 useCallback 包裹 fetchPosts
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5011/api/posts")
      const data = await res.json()
      setPosts(data)
    } catch (e) {
      console.error("Failed to fetch posts:", e)
    }
  }, []) // 依赖数组为空，因为 fetch 不依赖组件内的其他变量

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // 2. 加载单篇文章详情
  const loadPost = async (filename: string) => {
    const res = await fetch(`http://localhost:5011/api/posts/${filename}`)
    const data = await res.json()
    setCurrentFile(data.filename)
    setTitle(data.title)
    setDesc(data.description)
    setContent(data.content)
    setDraft(data.draft)
  }

  // 3. 重置表单 (点击新建时)
  const resetForm = () => {
    setCurrentFile(null)
    setTitle("")
    setDesc("")
    setContent("")
    setDraft(false)
  }

  // 4. 保存文章
  const handleSave = async () => {
    if (!title || !desc) {
      alert("标题和描述必填！")
      return
    }

    const payload = {
      filename: currentFile, // 如果是 null，后端会新建
      title,
      description: desc,
      content,
      draft,
    }

    const res = await fetch("http://localhost:5011/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      alert("保存成功")
      fetchPosts() // 刷新列表
      if (!currentFile) {
        // 如果是新建，这里简单重置，实际项目可以根据后端返回的新文件名自动选中
        resetForm()
      }
    }
  }

  // 5. 删除文章
  const handleDelete = async () => {
    if (!currentFile || !confirm(`确定删除 ${currentFile} 吗?`)) return

    const res = await fetch(`http://localhost:5011/api/posts/${currentFile}`, {
      method: "DELETE",
    })
    if (res.ok) {
      alert("删除成功")
      resetForm()
      fetchPosts()
    }
  }

  const handleSync = async () => {
    const res = await fetch("http://localhost:5011/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "同步 Github",
      }),
    }) // 注意 body
    if (res.ok) alert("同步成功")
    else alert("同步失败")
  }

  return (
    <div style={containerStyle}>
      {/* 左侧侧边栏 */}
      <div
        style={{
          width: "250px",
          borderRight: "1px solid #ddd",
          padding: "10px",
          background: "#f9f9f9",
          overflowY: "auto",
        }}
      >
        <button
          onClick={resetForm}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            cursor: "pointer",
          }}
        >
          + 新建文章
        </button>
        {posts.map((post) => (
          <div
            key={post.filename}
            style={listItemStyle(currentFile === post.filename)}
            onClick={() => loadPost(post.filename)}
          >
            <div style={{ fontWeight: "bold" }}>{post.title}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              {post.draft ? "📝 草稿" : "✅ 发布"} - {post.date}
            </div>
          </div>
        ))}
      </div>

      {/* 右侧编辑区 */}
      <div
        style={{
          flex: 1,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="简短描述 (Description)"
            style={{ ...inputStyle, flex: 2 }}
          />
        </div>

        <div
          style={{
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
            />{" "}
            设为草稿
          </label>
          {currentFile && (
            <span style={{ fontSize: "12px", color: "#999" }}>
              当前编辑: {currentFile}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <Editor
            value={content}
            plugins={[gfm()]}
            onChange={(v) => setContent(v)}
          />
        </div>

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              background: "#1890ff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            保存 / 发布
          </button>

          {currentFile && (
            <button
              onClick={handleDelete}
              style={{
                padding: "10px 20px",
                background: "#ff4d4f",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              删除
            </button>
          )}

          <div style={{ flex: 1 }}></div>

          <button
            onClick={handleSync}
            style={{
              padding: "10px 20px",
              background: "#52c41a",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            同步到 GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
