import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getFAQs } from '../api/apiService'
import ToolPageLayout from '../components/ToolPageLayout'
import { HelpCircle, ChevronDown, RotateCcw } from 'lucide-react'
import { useState } from 'react'

function FAQItem({ faq, index, isOpen, onToggle }) {
  const categoryColors = {
    conceptual:   'bg-blue-50 text-blue-600',
    application:  'bg-green-50 text-green-600',
    clarification:'bg-amber-50 text-amber-600',
  }
  const c = categoryColors[faq.category] || 'bg-gray-50 text-gray-500'

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200
      ${isOpen ? 'border-violet-200 shadow-sm' : 'border-gray-200'}`}>
      <button onClick={onToggle}
        className={`w-full flex items-start gap-4 px-6 py-4 text-left
          transition-colors ${isOpen ? 'bg-violet-50/50' : 'bg-white hover:bg-gray-50'}`}>
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-600
          text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug">{faq.question}</p>
          {faq.category && (
            <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${c}`}>
              {faq.category}
            </span>
          )}
        </div>
        <ChevronDown className={`flex-shrink-0 w-4 h-4 text-gray-400 mt-0.5 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 pt-1 bg-white border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed pl-10">{faq.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const { notebookId } = useParams()
  const { state } = useLocation()
  const docId = state?.docId
  const docName = state?.docName
  const [numFaqs, setNumFaqs] = useState(10)
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [openIndex, setOpenIndex] = useState(null)

  const query = useQuery({
    queryKey: ['faqs', docId, numFaqs, difficulty],
    queryFn: () => getFAQs(docId, difficulty, numFaqs).then(r => r.data),
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  })

  const faqs = query.data?.faqs || []

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
      <select value={numFaqs} onChange={e => setNumFaqs(Number(e.target.value))}
        className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none
          focus:border-violet-300 text-gray-600 bg-white">
        {[5, 8, 10, 15, 20].map(n => (
          <option key={n} value={n}>{n} FAQs</option>
        ))}
      </select>
    </div>
  )

  return (
    <ToolPageLayout
      title="FAQ"
      icon={HelpCircle}
      iconColor="text-purple-500"
      iconBg="bg-purple-50"
      docName={docName}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      headerRight={headerRight}
    >
      {faqs.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">{faqs.length} questions</p>
            <button onClick={() => query.refetch()}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i} faq={faq} index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </>
      )}
    </ToolPageLayout>
  )
}