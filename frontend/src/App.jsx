import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotebooksListPage from './pages/NotebooksListPage'
import NotebookPage from './pages/NotebookPage'
import SummaryPage from './pages/SummaryPage'
import FlashcardsPage from './pages/FlashcardsPage'
import FAQPage from './pages/FAQPage'
import QuizPage from './pages/QuizPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/"                          element={<NotebooksListPage />} />
          <Route path="/notebook/:notebookId"      element={<NotebookPage />} />
          <Route path="/notebook/:notebookId/summary"    element={<SummaryPage />} />
          <Route path="/notebook/:notebookId/flashcards" element={<FlashcardsPage />} />
          <Route path="/notebook/:notebookId/faq"        element={<FAQPage />} />
          <Route path="/notebook/:notebookId/quiz"       element={<QuizPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}