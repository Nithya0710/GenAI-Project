import { createContext, useContext, useState, useEffect } from 'react'

const NotebookContext = createContext(null)

const STORAGE_KEY = 'srg_notebooks'

function loadNotebooks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveNotebooks(notebooks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks))
}

export function NotebookProvider({ children }) {
  const [notebooks, setNotebooks] = useState(loadNotebooks)

  useEffect(() => {
    saveNotebooks(notebooks)
  }, [notebooks])

  const createNotebook = (name = 'Untitled Notebook') => {
    const nb = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      documents: [],   // [{ doc_id, filename, word_count, char_count }]
    }
    setNotebooks(prev => [nb, ...prev])
    return nb
  }

  const addDocument = (notebookId, doc) => {
    setNotebooks(prev =>
      prev.map(nb =>
        nb.id === notebookId
          ? { ...nb, documents: [...nb.documents, doc] }
          : nb
      )
    )
  }

  const removeDocument = (notebookId, docId) => {
    setNotebooks(prev =>
      prev.map(nb =>
        nb.id === notebookId
          ? { ...nb, documents: nb.documents.filter(d => d.doc_id !== docId) }
          : nb
      )
    )
  }

  const renameNotebook = (notebookId, name) => {
    setNotebooks(prev =>
      prev.map(nb => nb.id === notebookId ? { ...nb, name } : nb)
    )
  }

  const deleteNotebook = (notebookId) => {
    setNotebooks(prev => prev.filter(nb => nb.id !== notebookId))
  }

  const getNotebook = (notebookId) =>
    notebooks.find(nb => nb.id === notebookId)

  return (
    <NotebookContext.Provider value={{
      notebooks,
      createNotebook,
      addDocument,
      removeDocument,
      renameNotebook,
      deleteNotebook,
      getNotebook,
    }}>
      {children}
    </NotebookContext.Provider>
  )
}

export function useNotebooks() {
  return useContext(NotebookContext)
}