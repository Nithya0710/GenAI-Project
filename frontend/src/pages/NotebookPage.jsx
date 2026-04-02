import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useNotebooks } from '../context/NotebookContext'
import { uploadDocument } from '../api/apiService'
import axios from 'axios'
import {
  BookOpen, Plus, Trash2, Send, ChevronLeft, FileText, Loader2,
  Sparkles, MessageSquare, Layers, HelpCircle, PenSquare,
  Upload, X, CheckCircle, AlignLeft, Bot, User
} from 'lucide-react'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

// ── Left Panel: Resources ─────────────────────────────────────────────────
function ResourcePanel({ notebook, onAddDoc, onRemoveDoc, selectedDocId, onSelectDoc }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx', 'pptx'].includes(ext)) {
      alert('Only PDF, DOCX, PPTX files are supported.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await uploadDocument(fd)
      onAddDoc({
        doc_id: res.data.doc_id,
        filename: res.data.filename,
        word_count: res.data.word_count,
        char_count: res.data.char_count,
        preview: res.data.preview,
      })
    } catch (e) {
      alert('Upload failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sources</h2>
        <p className="text-xs text-gray-400">{notebook?.documents?.length || 0} document{notebook?.documents?.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto py-2">
        {notebook?.documents?.map(doc => (
          <div key={doc.doc_id}
            onClick={() => onSelectDoc(doc.doc_id)}
            className={`group mx-2 mb-1 px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-start gap-2
              ${selectedDocId === doc.doc_id
                ? 'bg-violet-50 border border-violet-200'
                : 'hover:bg-gray-50 border border-transparent'
              }`}>
            <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedDocId === doc.doc_id ? 'text-violet-500' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{doc.filename}</p>
              <p className="text-xs text-gray-400">{(doc.word_count || 0).toLocaleString()} words</p>
            </div>
            <button onClick={e => { e.stopPropagation(); onRemoveDoc(doc.doc_id) }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 text-gray-300 transition-opacity flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!notebook?.documents?.length && !uploading && (
          <div className="px-4 py-6 text-center">
            <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No sources yet</p>
            <p className="text-xs text-gray-300 mt-1">Upload a PDF, DOCX, or PPTX</p>
          </div>
        )}

        {uploading && (
          <div className="mx-2 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-200 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
            <span className="text-xs text-violet-600">Uploading...</span>
          </div>
        )}
      </div>

      {/* Upload area */}
      <div className="p-3 border-t border-gray-100">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'}`}>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.pptx" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Drop file or click</p>
          <p className="text-xs text-gray-300 mt-0.5">PDF · DOCX · PPTX</p>
        </div>
      </div>
    </div>
  )
}

// ── Centre Panel: Chat ────────────────────────────────────────────────────
function ChatPanel({ docId, docName }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: docId
        ? `I've loaded **${docName}**. Ask me anything about it!`
        : 'Select or upload a source document on the left to start chatting.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset chat when doc changes
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: docId
        ? `I've loaded **${docName}**. Ask me anything about it!`
        : 'Select or upload a source document on the left to start chatting.'
    }])
  }, [docId])

  const send = async () => {
    if (!input.trim() || !docId || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const res = await API.post('/api/chat', {
        doc_id: docId,
        message: userMsg.content,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${e.response?.data?.detail || 'Something went wrong. Is the backend running?'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <MessageSquare className="w-4 h-4 text-violet-500" />
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Chat</h2>
          {docId && <p className="text-xs text-gray-400 truncate max-w-xs">{docName}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
              ${msg.role === 'user' ? 'bg-violet-500' : 'bg-white border border-gray-200'}`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-violet-500" />
              }
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-violet-500 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm shadow-sm'
              }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200
              flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className={`flex gap-2 bg-gray-50 rounded-2xl border transition-colors px-4 py-2
          ${docId ? 'border-gray-200 focus-within:border-violet-300 focus-within:bg-white' : 'border-gray-100 opacity-60'}`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={docId ? 'Ask anything about this document...' : 'Select a document first'}
            disabled={!docId || loading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400
              outline-none resize-none leading-relaxed py-1"
          />
          <button onClick={send} disabled={!input.trim() || !docId || loading}
            className={`self-end mb-0.5 p-1.5 rounded-xl transition-all
              ${input.trim() && docId && !loading
                ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// ── Right Panel: Tools ────────────────────────────────────────────────────
function ToolsPanel({ notebookId, docId, docName }) {
  const navigate = useNavigate()

  const tools = [
    {
      id: 'summary',
      label: 'Summary',
      desc: 'Key concepts & takeaways',
      icon: AlignLeft,
      color: 'indigo',
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      desc: 'Terms & definitions',
      icon: Layers,
      color: 'violet',
    },
    {
      id: 'faq',
      label: 'FAQ',
      desc: 'Common questions answered',
      icon: HelpCircle,
      color: 'purple',
    },
    {
      id: 'quiz',
      label: 'Mock Quiz',
      desc: 'MCQ, short & long answers',
      icon: PenSquare,
      color: 'fuchsia',
    },
  ]

  const colorMap = {
    indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-500',  border: 'border-indigo-200',  hover: 'hover:border-indigo-300 hover:bg-indigo-50' },
    violet:  { bg: 'bg-violet-50',  icon: 'text-violet-500',  border: 'border-violet-200',  hover: 'hover:border-violet-300 hover:bg-violet-50' },
    purple:  { bg: 'bg-purple-50',  icon: 'text-purple-500',  border: 'border-purple-200',  hover: 'hover:border-purple-300 hover:bg-purple-50' },
    fuchsia: { bg: 'bg-fuchsia-50', icon: 'text-fuchsia-500', border: 'border-fuchsia-200', hover: 'hover:border-fuchsia-300 hover:bg-fuchsia-50' },
  }

  const handleTool = (toolId) => {
    if (!docId) { alert('Please select a source document first.'); return }
    navigate(`/notebook/${notebookId}/${toolId}`, { state: { docId, docName } })
  }

  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Study Tools</h2>
        <p className="text-xs text-gray-400">Generate from selected source</p>
      </div>

      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tools.map(({ id, label, desc, icon: Icon, color }) => {
          const c = colorMap[color]
          return (
            <button key={id} onClick={() => handleTool(id)}
              className={`w-full text-left border rounded-xl p-4 transition-all duration-150
                ${docId ? `border-gray-200 ${c.hover} bg-white hover:shadow-sm` : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}
              `}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {!docId && (
        <div className="p-4 border-t border-gray-100">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">
              Select a source document to enable study tools
            </p>
          </div>
        </div>
      )}

      {docId && (
        <div className="p-4 border-t border-gray-100">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-violet-700 font-medium">Source selected</p>
                <p className="text-xs text-violet-500 truncate mt-0.5">{docName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main NotebookPage ─────────────────────────────────────────────────────
export default function NotebookPage() {
  const { notebookId } = useParams()
  const { getNotebook, addDocument, removeDocument } = useNotebooks()
  const navigate = useNavigate()
  const notebook = getNotebook(notebookId)

  const [selectedDocId, setSelectedDocId] = useState(null)

  // If notebook doesn't exist, go home
  if (!notebook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Notebook not found.</p>
          <button onClick={() => navigate('/')} className="text-violet-500 text-sm font-medium">
            ← Back to home
          </button>
        </div>
      </div>
    )
  }

  const selectedDoc = notebook.documents.find(d => d.doc_id === selectedDocId)

  const handleAddDoc = (doc) => {
    addDocument(notebookId, doc)
    setSelectedDocId(doc.doc_id)
  }

  const handleRemoveDoc = (docId) => {
    removeDocument(notebookId, docId)
    if (selectedDocId === docId) setSelectedDocId(null)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <Link to="/" className="flex items-center gap-1.5 text-gray-400 hover:text-violet-500
          text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <BookOpen className="w-4 h-4" />
        </Link>
        <div className="w-px h-4 bg-gray-200" />
        <h1 className="text-sm font-semibold text-gray-800 truncate">{notebook.name}</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>AI-powered study assistant</span>
        </div>
      </header>

      {/* 3-panel body */}
      <div className="flex-1 flex overflow-hidden">
        <ResourcePanel
          notebook={notebook}
          onAddDoc={handleAddDoc}
          onRemoveDoc={handleRemoveDoc}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
        />
        <ChatPanel
          docId={selectedDocId}
          docName={selectedDoc?.filename}
        />
        <ToolsPanel
          notebookId={notebookId}
          docId={selectedDocId}
          docName={selectedDoc?.filename}
        />
      </div>
    </div>
  )
}