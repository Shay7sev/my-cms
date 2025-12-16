import { useState } from "react"
import { Editor } from "@bytemd/react"
import gfm from "@bytemd/plugin-gfm"
import "bytemd/dist/index.css"

export default function App() {
  const [value, setValue] = useState("")
  const [title, setTitle] = useState("")
  // 新增：记录当前编辑的文件名。如果是新建，它就是 null
  const [currentFilename, setCurrentFilename] = useState("")

  // 保存文章 (调用 Rust API)
  const handleSave = async (isDraft: boolean) => {
    // 简单的校验
    if (!title) {
      alert("请输入标题")
      return
    }

    const payload = {
      // 如果 currentFilename 是 null，Rust 后端会自动生成
      filename: currentFilename,
      title: title,
      content: value,
      draft: isDraft,
    }

    try {
      const res = await fetch("http://localhost:5011/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        alert("保存成功！")
        // 保存成功后，最好清空或者获取生成的文件名（这里简化处理，暂不回填）
      } else {
        alert("保存失败，请检查后端控制台")
      }
    } catch (e) {
      console.error(e)
      alert("请求错误")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="文章标题"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />
      <input
        value={currentFilename}
        onChange={(e) => setCurrentFilename(e.target.value)}
        placeholder="文件名"
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
            fetch("http://localhost:5011/api/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: "同步到 GitHub",
              }),
            })
          }
          style={{ marginLeft: 10 }}
        >
          同步到 GitHub
        </button>
      </div>
    </div>
  )
}
