import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotebooks } from '../context/NotebookContext'
import { BookOpen, Plus, Trash2, Clock, FileText, Edit2, Check, X } from 'lucide-react'

function NotebookCard({ notebook, onOpen, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(notebook.name)

  const confirmRename = () => {
    if (name.trim()) onRename(notebook.id, name.trim())
    setEditing(false)
  }

  const timeAgo = (ts) => {
    const diff = Date.now() - ts
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="group relative bg-white border border-gray-200 rounded-2xl p-6
      hover:border-violet-300 hover:shadow-lg hover:shadow-violet-50
      transition-all duration-200 cursor-pointer"
      onClick={() => !editing && onOpen(notebook.id)}
    >
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r
        from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
          <BookOpen className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(notebook.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 mb-3" onClick={e => e.stopPropagation()}>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmRename()}
            className="flex-1 text-sm font-semibold border border-violet-300 rounded-lg px-2 py-1
              outline-none focus:ring-2 focus:ring-violet-200"
            autoFocus />
          <button onClick={confirmRename} className="text-green-500 hover:text-green-600">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setName(notebook.name); setEditing(false) }}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <h3 className="font-semibold text-gray-800 mb-1 text-sm leading-snug line-clamp-2">
          {notebook.name}
        </h3>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {notebook.documents.length} source{notebook.documents.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(notebook.createdAt)}
        </span>
      </div>
    </div>
  )
}

export default function NotebooksListPage() {
  const { notebooks, createNotebook, deleteNotebook, renameNotebook } = useNotebooks()
  const navigate = useNavigate()

  const handleNew = () => {
    const nb = createNotebook()
    navigate(`/notebook/${nb.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
            flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">StudyOS</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Notebooks</h1>
          <p className="text-gray-500">Upload documents, chat with your sources, and generate study materials.</p>
        </div>

        {/* New notebook card + existing notebooks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create new */}
          <button onClick={handleNew}
            className="flex flex-col items-center justify-center gap-3 p-6
              border-2 border-dashed border-violet-200 rounded-2xl
              hover:border-violet-400 hover:bg-violet-50
              transition-all duration-200 text-violet-500 hover:text-violet-600
              min-h-[160px] group">
            <div className="p-3 rounded-xl bg-violet-50 group-hover:bg-violet-100 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">New Notebook</span>
          </button>

          {notebooks.map(nb => (
            <NotebookCard
              key={nb.id}
              notebook={nb}
              onOpen={(id) => navigate(`/notebook/${id}`)}
              onDelete={deleteNotebook}
              onRename={renameNotebook}
            />
          ))}
        </div>

        {notebooks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Create your first notebook to get started →</p>
          </div>
        )}
      </main>
    </div>
  )
}