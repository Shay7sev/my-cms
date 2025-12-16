import { useState, useEffect, type SetStateAction } from "react"
import { Editor } from "@bytemd/react"
import "bytemd/dist/index.css"
// 引入 Lucide 图标
import { FileText, Save, Trash2, Moon, Sun, Plus, Github } from "lucide-react"
// 引入 Shadcn 组件
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"
// 引入主题管理 (需要你自己配置好 ThemeProvider，或者手动切换 class)
import { useTheme } from "next-themes"

// 引入 github markdown 样式（基础排版）
import "github-markdown-css/github-markdown.css"
import "bytemd/dist/index.css"

// --- 2. 引入插件 ---
import gfm from "@bytemd/plugin-gfm"
import highlight from "@bytemd/plugin-highlight"
import mermaid from "@bytemd/plugin-mermaid"
import mediumZoom from "@bytemd/plugin-medium-zoom"
import gemoji from "@bytemd/plugin-gemoji"

// 定义插件列表
const plugins = [gfm(), highlight(), mermaid(), mediumZoom(), gemoji()]

// 定义类型接口
interface PostSummary {
  filename: string
  title: string
  draft: boolean
  date: string
}

export default function App() {
  // --- 状态管理 ---
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [currentFile, setCurrentFile] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [content, setContent] = useState("")
  const [draft, setDraft] = useState(false)

  // 主题控制
  const { setTheme, theme } = useTheme()

  // --- API 交互 ---

  // 获取列表 (移除 useCallback 依赖，避免死循环)
  const fetchPosts = async () => {
    try {
      const res = await fetch("http://localhost:5011/api/posts")
      if (!res.ok) throw new Error("Network response was not ok")
      const data = await res.json()
      setPosts(data)
    } catch (e) {
      toast.error("获取文章列表失败")
      console.error(e)
    }
  }

  // 初始化加载
  useEffect(() => {
    fetchPosts()
  }, [])

  // 加载单篇文章
  const loadPost = async (filename: string) => {
    try {
      const res = await fetch(`http://localhost:5011/api/posts/${filename}`)
      const data = await res.json()
      setCurrentFile(data.filename)
      setTitle(data.title)
      setDesc(data.description || "") // 增加空值保护
      setContent(data.content)
      setDraft(data.draft)
    } catch (e) {
      console.log(e)
      toast.error("加载文章失败")
    }
  }

  // 重置/新建
  const resetForm = () => {
    setCurrentFile(null)
    setTitle("")
    setDesc("")
    setContent("")
    setDraft(false)
    toast.info("已切换到新建模式")
  }

  // 保存
  const handleSave = async () => {
    if (!title.trim() || !desc.trim()) {
      toast.warning("标题和描述不能为空")
      return
    }

    const payload = {
      filename: currentFile,
      title,
      description: desc,
      content,
      draft,
    }

    try {
      const res = await fetch("http://localhost:5011/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(currentFile ? "文章更新成功" : "新文章已创建")
        fetchPosts()
        if (!currentFile) resetForm()
      } else {
        throw new Error("Save failed")
      }
    } catch (e) {
      console.log(e)
      toast.error("保存失败")
    }
  }

  // 删除
  const handleDelete = async () => {
    if (!currentFile) return
    // 使用原生 confirm 或者 shadcn 的 AlertDialog (这里为了简化用 confirm)
    if (!confirm(`确定要永久删除 "${title}" 吗?`)) return

    try {
      const res = await fetch(
        `http://localhost:5011/api/posts/${currentFile}`,
        {
          method: "DELETE",
        }
      )
      if (res.ok) {
        toast.success("删除成功")
        resetForm()
        fetchPosts()
      }
    } catch (e) {
      console.log(e)
      toast.error("删除失败")
    }
  }

  // 同步
  const handleSync = async () => {
    const promise = fetch("http://localhost:5011/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Sync from Admin Dashboard" }),
    })

    toast.promise(promise, {
      loading: "正在推送到 GitHub...",
      success: "同步成功！",
      error: "同步失败，请检查后端日志",
    })
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Toaster /> {/* Toast 弹窗容器 */}
      {/* --- 左侧侧边栏 --- */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Blog Admin
          </span>
          {/* 主题切换按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>

        <div className="p-4 pb-2">
          <Button onClick={resetForm} className="w-full gap-2">
            <Plus className="w-4 h-4" /> 新建文章
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 pt-0 space-y-2">
            {posts.map((post) => (
              <div
                key={post.filename}
                onClick={() => loadPost(post.filename)}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors border
                  ${
                    currentFile === post.filename
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent hover:text-accent-foreground bg-card border-border"
                  }
                `}>
                <div className="font-medium truncate">{post.title}</div>
                <div className="flex items-center justify-between mt-2 text-xs opacity-80">
                  <Badge
                    variant={post.draft ? "secondary" : "default"}
                    className="text-[10px] px-1 py-0 h-5">
                    {post.draft ? "草稿" : "发布"}
                  </Badge>
                  <span>{post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t text-xs text-center text-muted-foreground">
          {posts.length} 篇文章
        </div>
      </aside>
      {/* --- 右侧主编辑区 --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* 顶部工具栏 */}
        <header className="p-4 border-b flex items-center gap-4 bg-background z-10">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <Input
              value={title}
              onChange={(e: { target: { value: SetStateAction<string> } }) =>
                setTitle(e.target.value)
              }
              placeholder="输入文章标题..."
              className="font-bold text-lg h-10"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Draft:
              </span>
              <Checkbox
                checked={draft}
                onCheckedChange={(checked: boolean) => setDraft(checked)}
                id="draft-mode"
              />
              <span className="text-xs text-muted-foreground ml-auto truncate">
                {currentFile || "未保存的新文件"}
              </span>
            </div>
          </div>
        </header>

        {/* 描述区域 */}
        <div className="px-4 py-2 border-b bg-muted/10">
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="输入简短描述 (SEO Description)..."
            className="resize-none h-16 text-sm"
          />
        </div>

        {/* 编辑器核心区域 */}
        <div className="flex-1 overflow-hidden relative">
          {/* 
            注意：ByteMD 的高度由外层 CSS 类控制 (.bytemd)
            我们在 index.css 中设置了 .bytemd { height: 100% }
          */}
          <Editor
            value={content}
            plugins={plugins}
            onChange={(v) => setContent(v)}
          />
        </div>

        {/* 底部操作栏 */}
        <footer className="p-4 border-t bg-muted/20 flex items-center gap-3">
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> 保存 / 发布
          </Button>

          {currentFile && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2">
              <Trash2 className="w-4 h-4" /> 删除
            </Button>
          )}

          <div className="flex-1"></div>

          <Button
            variant="outline"
            onClick={handleSync}
            className="gap-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
            <Github className="w-4 h-4" /> 同步到 GitHub
          </Button>
        </footer>
      </main>
    </div>
  )
}
