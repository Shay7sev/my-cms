import { useState, useEffect, type SetStateAction } from "react"
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

import { normalizeNodeId, type Value } from "platejs"
import { EditorKit } from "./components/editor/editor-kit"
import { Plate, usePlateEditor } from "platejs/react"
import { Editor, EditorContainer } from "./components/ui/editor"
import { SettingsDialog } from "./components/editor/settings-dialog"

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
  //   const [content, setContent] = useState("")
  const [draft, setDraft] = useState(false)

  // 编辑器值状态
  const [value, setValue] = useState<Value>(
    normalizeNodeId([
      {
        children: [{ text: "Welcome to the Plate Playground!" }],
        type: "h1",
      },
      {
        children: [
          { text: "Experience a modern rich-text editor built with " },
          {
            children: [{ text: "Slate" }],
            type: "a",
            url: "https://slatejs.org",
          },
          { text: " and " },
          {
            children: [{ text: "React" }],
            type: "a",
            url: "https://reactjs.org",
          },
          {
            text: ". This playground showcases just a part of Plate's capabilities. ",
          },
          {
            children: [{ text: "Explore the documentation" }],
            type: "a",
            url: "/docs",
          },
          { text: " to discover more." },
        ],
        type: "p",
      },
      // Suggestions & Comments Section
      {
        children: [{ text: "Collaborative Editing" }],
        type: "h2",
      },
      {
        children: [
          { text: "Review and refine content seamlessly. Use " },
          {
            children: [
              {
                suggestion: true,
                suggestion_playground1: {
                  id: "playground1",
                  createdAt: Date.now(),
                  type: "insert",
                  userId: "alice",
                },
                text: "suggestions",
              },
            ],
            type: "a",
            url: "/docs/suggestion",
          },
          {
            suggestion: true,
            suggestion_playground1: {
              id: "playground1",
              createdAt: Date.now(),
              type: "insert",
              userId: "alice",
            },
            text: " ",
          },
          {
            suggestion: true,
            suggestion_playground1: {
              id: "playground1",
              createdAt: Date.now(),
              type: "insert",
              userId: "alice",
            },
            text: "like this added text",
          },
          { text: " or to " },
          {
            suggestion: true,
            suggestion_playground2: {
              id: "playground2",
              createdAt: Date.now(),
              type: "remove",
              userId: "bob",
            },
            text: "mark text for removal",
          },
          { text: ". Discuss changes using " },
          {
            children: [
              { comment: true, comment_discussion1: true, text: "comments" },
            ],
            type: "a",
            url: "/docs/comment",
          },
          {
            comment: true,
            comment_discussion1: true,
            text: " on many text segments",
          },
          { text: ". You can even have " },
          {
            comment: true,
            comment_discussion2: true,
            suggestion: true,
            suggestion_playground3: {
              id: "playground3",
              createdAt: Date.now(),
              type: "insert",
              userId: "charlie",
            },
            text: "overlapping",
          },
          { text: " annotations!" },
        ],
        type: "p",
      },
      // {
      //   children: [
      //     {
      //       text: 'Block-level suggestions are also supported for broader feedback.',
      //     },
      //   ],
      //   suggestion: {
      //     suggestionId: 'suggestionBlock1',
      //     type: 'block',
      //     userId: 'charlie',
      //   },
      //   type: 'p',
      // },
      // AI Section
      {
        children: [{ text: "AI-Powered Editing" }],
        type: "h2",
      },
      {
        children: [
          { text: "Boost your productivity with integrated " },
          {
            children: [{ text: "AI SDK" }],
            type: "a",
            url: "/docs/ai",
          },
          { text: ". Press " },
          { kbd: true, text: "⌘+J" },
          { text: " or " },
          { kbd: true, text: "Space" },
          { text: " in an empty line to:" },
        ],
        type: "p",
      },
      {
        children: [
          { text: "Generate content (continue writing, summarize, explain)" },
        ],
        indent: 1,
        listStyleType: "disc",
        type: "p",
      },
      {
        children: [
          { text: "Edit existing text (improve, fix grammar, change tone)" },
        ],
        indent: 1,
        listStyleType: "disc",
        type: "p",
      },
      // Core Features Section (Combined)
      {
        children: [{ text: "Rich Content Editing" }],
        type: "h2",
      },
      {
        children: [
          { text: "Structure your content with " },
          {
            children: [{ text: "headings" }],
            type: "a",
            url: "/docs/heading",
          },
          { text: ", " },
          {
            children: [{ text: "lists" }],
            type: "a",
            url: "/docs/list",
          },
          { text: ", and " },
          {
            children: [{ text: "quotes" }],
            type: "a",
            url: "/docs/blockquote",
          },
          { text: ". Apply " },
          {
            children: [{ text: "marks" }],
            type: "a",
            url: "/docs/basic-marks",
          },
          { text: " like " },
          { bold: true, text: "bold" },
          { text: ", " },
          { italic: true, text: "italic" },
          { text: ", " },
          { text: "underline", underline: true },
          { text: ", " },
          { strikethrough: true, text: "strikethrough" },
          { text: ", and " },
          { code: true, text: "code" },
          { text: ". Use " },
          {
            children: [{ text: "autoformatting" }],
            type: "a",
            url: "/docs/autoformat",
          },
          { text: " for " },
          {
            children: [{ text: "Markdown" }],
            type: "a",
            url: "/docs/markdown",
          },
          { text: "-like shortcuts (e.g., " },
          { kbd: true, text: "* " },
          { text: " for lists, " },
          { kbd: true, text: "# " },
          { text: " for H1)." },
        ],
        type: "p",
      },
      {
        children: [
          {
            children: [
              {
                text: "Blockquotes are great for highlighting important information.",
              },
            ],
            type: "p",
          },
        ],
        type: "blockquote",
      },
      {
        children: [
          { children: [{ text: "function hello() {" }], type: "code_line" },
          {
            children: [
              { text: "  console.info('Code blocks are supported!');" },
            ],
            type: "code_line",
          },
          { children: [{ text: "}" }], type: "code_line" },
        ],
        lang: "javascript",
        type: "code_block",
      },
      {
        children: [
          { text: "Create " },
          {
            children: [{ text: "links" }],
            type: "a",
            url: "/docs/link",
          },
          { text: ", " },
          {
            children: [{ text: "@mention" }],
            type: "a",
            url: "/docs/mention",
          },
          { text: " users like " },
          { children: [{ text: "" }], type: "mention", value: "Alice" },
          { text: ", or insert " },
          {
            children: [{ text: "emojis" }],
            type: "a",
            url: "/docs/emoji",
          },
          { text: " ✨. Use the " },
          {
            children: [{ text: "slash command" }],
            type: "a",
            url: "/docs/slash-command",
          },
          { text: " (/) for quick access to elements." },
        ],
        type: "p",
      },
      // Table Section
      {
        children: [{ text: "How Plate Compares" }],
        type: "h3",
      },
      {
        children: [
          {
            text: "Plate offers many features out-of-the-box as free, open-source plugins.",
          },
        ],
        type: "p",
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  { children: [{ bold: true, text: "Feature" }], type: "p" },
                ],
                type: "th",
              },
              {
                children: [
                  {
                    children: [{ bold: true, text: "Plate (Free & OSS)" }],
                    type: "p",
                  },
                ],
                type: "th",
              },
              {
                children: [
                  { children: [{ bold: true, text: "Tiptap" }], type: "p" },
                ],
                type: "th",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [{ children: [{ text: "AI" }], type: "p" }],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid Extension" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [{ children: [{ text: "Comments" }], type: "p" }],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid Extension" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [{ children: [{ text: "Suggestions" }], type: "p" }],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid (Comments Pro)" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [{ children: [{ text: "Emoji Picker" }], type: "p" }],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid Extension" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [
                  { children: [{ text: "Table of Contents" }], type: "p" },
                ],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid Extension" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [{ children: [{ text: "Drag Handle" }], type: "p" }],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Paid Extension" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
          {
            children: [
              {
                children: [
                  { children: [{ text: "Collaboration (Yjs)" }], type: "p" },
                ],
                type: "td",
              },
              {
                children: [
                  {
                    attributes: { align: "center" },
                    children: [{ text: "✅" }],
                    type: "p",
                  },
                ],
                type: "td",
              },
              {
                children: [
                  { children: [{ text: "Hocuspocus (OSS/Paid)" }], type: "p" },
                ],
                type: "td",
              },
            ],
            type: "tr",
          },
        ],
        type: "table",
      },
      // Media Section
      {
        children: [{ text: "Images and Media" }],
        type: "h3",
      },
      {
        children: [
          {
            text: "Embed rich media like images directly in your content. Supports ",
          },
          {
            children: [{ text: "Media uploads" }],
            type: "a",
            url: "/docs/media",
          },
          {
            text: " and ",
          },
          {
            children: [{ text: "drag & drop" }],
            type: "a",
            url: "/docs/dnd",
          },
          {
            text: " for a smooth experience.",
          },
        ],
        type: "p",
      },
      {
        attributes: { align: "center" },
        caption: [
          {
            children: [{ text: "Images with captions provide context." }],
            type: "p",
          },
        ],
        children: [{ text: "" }],
        type: "img",
        url: "https://images.unsplash.com/photo-1712688930249-98e1963af7bd?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        width: "75%",
      },
      {
        children: [{ text: "" }],
        isUpload: true,
        name: "sample.pdf",
        type: "file",
        url: "https://s26.q4cdn.com/900411403/files/doc_downloads/test.pdf",
      },
      {
        children: [{ text: "" }],
        type: "audio",
        url: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
      },
      {
        children: [{ text: "Table of Contents" }],
        type: "h3",
      },
      {
        children: [{ text: "" }],
        type: "toc",
      },
      {
        children: [{ text: "" }],
        type: "p",
      },
    ])
  )

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: value,
  })

  // 主题控制
  const { setTheme, theme } = useTheme()

  // --- API 交互 ---

  // 获取列表 (移除 useCallback 依赖，避免死循环)
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`)
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/posts/${filename}`
      )
      const data = await res.json()
      setCurrentFile(data.filename)
      setTitle(data.title)
      setDesc(data.description || "") // 增加空值保护
      //   setContent(data.content)
      setDraft(data.draft)

      // --- 4. 关键：Markdown -> Plate JSON (新版 API) ---
      if (data.content && editor) {
        // 使用 editor.api.markdown.deserialize
        const parsedValue = editor.api.markdown.deserialize(
          data.content
        ) as Value
        setValue(parsedValue)
        // 强制重置编辑器内部状态到新的值
        editor.tf.setValue(parsedValue)
      } else {
        const emptyValue = [{ type: "p", children: [{ text: "" }] }] as Value
        setValue(emptyValue)
        editor?.tf.setValue(emptyValue)
      }
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
    // setContent("")
    setDraft(false)

    const emptyValue = [{ type: "p", children: [{ text: "" }] }] as Value
    setValue(emptyValue)
    editor?.tf.setValue(emptyValue)

    toast.info("已切换到新建模式")
  }

  // 保存
  const handleSave = async () => {
    if (!title.trim() || !desc.trim()) {
      toast.warning("标题和描述不能为空")
      return
    }

    // --- 5. 关键：Plate JSON -> Markdown (新版 API) ---
    // 使用 editor.api.markdown.serialize() 直接获取字符串
    const markdownContent = editor.api.markdown.serialize()

    const payload = {
      filename: currentFile,
      title,
      description: desc,
      content: markdownContent,
      draft,
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`, {
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
        `${import.meta.env.VITE_API_URL}/api/posts/${currentFile}`,
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
    const promise = fetch(`${import.meta.env.VITE_API_URL}/api/sync`, {
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

        <ScrollArea className="h-[calc(100vh-180px)]">
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
          <Plate editor={editor}>
            <EditorContainer>
              <Editor variant="demo" />
            </EditorContainer>

            <SettingsDialog />
          </Plate>
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
