import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSummary } from '../api/apiService'
import ToolPageLayout from '../components/ToolPageLayout'
import ReactMarkdown from 'react-markdown'
import { AlignLeft, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

export default function SummaryPage() {
  const { notebookId } = useParams()
  const { state } = useLocation()
  const docId = state?.docId
  const docName = state?.docName
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [copied, setCopied] = useState(false)

  const query = useQuery({
    queryKey: ['summary', docId, difficulty],
    queryFn: () => getSummary(docId, difficulty).then(r => r.data),
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  })

  const handleCopy = () => {
    if (query.data?.summary) {
      navigator.clipboard.writeText(query.data.summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const headerRight = (
    <div className="flex items-center gap-3">
      {/* Difficulty selector */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {['Basic', 'Intermediate', 'Advanced'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
              ${difficulty === d ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {d}
          </button>
        ))}
      </div>
      {/* Copy button */}
      {query.data?.summary && (
        <button onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500
            transition-colors px-3 py-1.5 rounded-xl border border-gray-200 hover:border-violet-300">
          {copied
            ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" /> Copy</>
          }
        </button>
      )}
    </div>
  )

  return (
    <ToolPageLayout
      title="Summary"
      icon={AlignLeft}
      iconColor="text-indigo-500"
      iconBg="bg-indigo-50"
      docName={docName}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      headerRight={headerRight}
    >
      {query.data?.summary && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 prose prose-sm max-w-none
            prose-headings:text-indigo-900 prose-headings:font-bold
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-li:text-gray-600 prose-strong:text-gray-800
            prose-ul:space-y-1 prose-ol:space-y-1">
            <ReactMarkdown>{query.data.summary}</ReactMarkdown>
          </div>
        </div>
      )}
    </ToolPageLayout>
  )
}