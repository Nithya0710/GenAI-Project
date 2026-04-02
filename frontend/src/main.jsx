import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NotebookProvider } from './context/NotebookContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NotebookProvider>
      <App />
    </NotebookProvider>
  </StrictMode>,
)
