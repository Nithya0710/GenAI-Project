import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMockQuiz } from '../api/apiService'
import ToolPageLayout from '../components/ToolPageLayout'
import { PenSquare, CheckCircle, XCircle, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useState } from 'react'

function MCQQuestion({ question, index }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-fuchsia-50 text-fuchsia-600
          text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <p className="text-sm font-semibold text-gray-800 leading-snug">{question.question}</p>
      </div>
      <div className="space-y-2 pl-10">
        {Object.entries(question.options || {}).map(([key, val]) => {
          const isCorrect = key === question.correct_answer
          const isSelected = selected === key
          let cls = 'border-gray-200 bg-gray-50 hover:border-gray-300'
          if (revealed) {
            if (isCorrect) cls = 'border-green-400 bg-green-50'
            else if (isSelected) cls = 'border-red-300 bg-red-50'
          } else if (isSelected) {
            cls = 'border-violet-400 bg-violet-50'
          }
          return (
            <button key={key} onClick={() => !revealed && setSelected(key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border
                text-left text-sm transition-all ${cls}
                ${revealed ? 'cursor-default' : 'cursor-pointer'}`}>
              <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                text-xs font-bold transition-all
                ${revealed && isCorrect ? 'border-green-500 text-green-600' :
                  revealed && isSelected ? 'border-red-400 text-red-500' :
                  isSelected ? 'border-violet-500 text-violet-600' : 'border-gray-300 text-gray-500'}`}>
                {key}
              </span>
              <span className="text-gray-700">{val}</span>
              {revealed && isCorrect && <CheckCircle className="ml-auto w-4 h-4 text-green-500 flex-shrink-0" />}
              {revealed && isSelected && !isCorrect && <XCircle className="ml-auto w-4 h-4 text-red-400 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      <div className="pl-10 flex items-center gap-3">
        <button onClick={() => setRevealed(r => !r)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? 'Hide answer' : 'Reveal answer'}
        </button>
        {revealed && question.explanation && (
          <p className="text-xs text-gray-500 italic">💡 {question.explanation}</p>
        )}
      </div>
    </div>
  )
}

function ShortQuestion({ question, index }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-fuchsia-50 text-fuchsia-600
          text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{question.question}</p>
          {question.marks && (
            <span className="text-xs text-gray-400 mt-1 block">[{question.marks} marks]</span>
          )}
        </div>
      </div>
      {revealed && (
        <div className="ml-10 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-700 mb-1">Model Answer</p>
          <p className="text-sm text-green-800 leading-relaxed">{question.model_answer}</p>
        </div>
      )}
      <div className="ml-10">
        <button onClick={() => setRevealed(r => !r)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? 'Hide answer' : 'Show model answer'}
        </button>
      </div>
    </div>
  )
}

function LongQuestion({ question, index }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-fuchsia-50 text-fuchsia-600
          text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{question.question}</p>
          {question.marks && (
            <span className="text-xs text-gray-400 mt-1 block">[{question.marks} marks — essay question]</span>
          )}
        </div>
      </div>
      {revealed && question.key_points?.length > 0 && (
        <div className="ml-10 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-700 mb-2">Key Points to Cover</p>
          <ul className="space-y-1">
            {question.key_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="ml-10">
        <button onClick={() => setRevealed(r => !r)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? 'Hide key points' : 'Show key points'}
        </button>
      </div>
    </div>
  )
}

export default function QuizPage() {
  const { notebookId } = useParams()
  const { state } = useLocation()
  const docId = state?.docId
  const docName = state?.docName
  const [questionType, setQuestionType] = useState('mcq')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('Intermediate')

  const query = useQuery({
    queryKey: ['quiz', docId, questionType, numQuestions, difficulty],
    queryFn: () => getMockQuiz(docId, difficulty, questionType, numQuestions).then(r => r.data),
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  })

  const questions = query.data?.questions || []

  const typeLabels = { mcq: 'Multiple Choice', short_answer: 'Short Answer', long_answer: 'Essay' }

  const headerRight = (
    <div className="flex items-center gap-3">
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {['Basic', 'Intermediate', 'Advanced'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
              ${difficulty === d ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'}`}>
            {d}
          </button>
        ))}
      </div>
      <select value={questionType} onChange={e => setQuestionType(e.target.value)}
        className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none
          focus:border-violet-300 text-gray-600 bg-white">
        <option value="mcq">MCQ</option>
        <option value="short_answer">Short Answer</option>
        <option value="long_answer">Essay</option>
      </select>
      <select value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}
        className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none
          focus:border-violet-300 text-gray-600 bg-white">
        {[3, 5, 8, 10, 15].map(n => (
          <option key={n} value={n}>{n} questions</option>
        ))}
      </select>
    </div>
  )

  return (
    <ToolPageLayout
      title="Mock Quiz"
      icon={PenSquare}
      iconColor="text-fuchsia-500"
      iconBg="bg-fuchsia-50"
      docName={docName}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      headerRight={headerRight}
    >
      {questions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">{questions.length} {typeLabels[questionType]} questions</p>
              <p className="text-xs text-gray-400 mt-0.5">Click "Reveal answer" on each question when ready</p>
            </div>
            <button onClick={() => query.refetch()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> New set
            </button>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => {
              if (q.type === 'mcq' || questionType === 'mcq')
                return <MCQQuestion key={i} question={q} index={i} />
              if (q.type === 'short_answer' || questionType === 'short_answer')
                return <ShortQuestion key={i} question={q} index={i} />
              return <LongQuestion key={i} question={q} index={i} />
            })}
          </div>
        </>
      )}
    </ToolPageLayout>
  )
}