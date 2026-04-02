import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export const uploadDocument = (formData) => API.post('/api/upload', formData)

export const getSummary = (docId, difficulty = 'Intermediate') =>
  API.post('/api/summarize', { doc_id: docId, difficulty })

export const getFlashcards = (docId, difficulty = 'Intermediate', num_cards = 15) =>
  API.post('/api/flashcards', { doc_id: docId, difficulty, num_cards })

export const getFAQs = (docId, difficulty = 'Intermediate', num_faqs = 10) =>
  API.post('/api/faq', { doc_id: docId, difficulty, num_faqs })

export const getMockQuiz = (docId, difficulty = 'Intermediate', question_type = 'mcq', num_questions = 5) =>
  API.post('/api/mock-quiz', { doc_id: docId, difficulty, question_type, num_questions })

export const chatWithDocument = (docId, message, history = []) =>
  API.post('/api/chat', { doc_id: docId, message, history })