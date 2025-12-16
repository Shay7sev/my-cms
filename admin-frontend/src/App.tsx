import { useState } from "react"
import { Editor } from "@bytemd/react"
import gfm from "@bytemd/plugin-gfm"
import "bytemd/dist/index.css"

export default function App() {
  const [value, setValue] = useState("")
  const [title, setTitle] = useState("")

  // 保存文章 (调用 Rust API)
  const handleSave = async (isDraft: boolean) => {
    const payload = {
      title: title,
      content: value,
      draft: isDraft,
    }

    await fetch("http://localhost:5011/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    alert("保存成功！")
  }

  return (
    <div style={{ padding: 20 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="文章标题"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <div style={{ height: "600px" }}>
        <Editor value={value} plugins={[gfm()]} onChange={(v) => setValue(v)} />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => handleSave(true)}>保存草稿</button>
        <button onClick={() => handleSave(false)} style={{ marginLeft: 10 }}>
          发布
        </button>
        <button
          onClick={() =>
            fetch("http://localhost:5011/api/sync", { method: "POST" })
          }
          style={{ marginLeft: 10 }}
        >
          同步到 GitHub
        </button>
      </div>
    </div>
  )
}
