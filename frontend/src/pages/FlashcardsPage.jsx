import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getFlashcards } from '../api/apiService'
import ToolPageLayout from '../components/ToolPageLayout'
import { Layers, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

function FlipCard({ front, back, topic }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="cursor-pointer select-none" style={{ perspective: '1000px', height: '200px' }}
      onClick={() => setFlipped(f => !f)}>
      <div className="relative w-full h-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        {/* Front */}
        <div className="absolute inset-0 bg-white rounded-2xl border border-gray-200 shadow-sm
          flex flex-col items-center justify-center p-6 text-center"
          style={{ backfaceVisibility: 'hidden' }}>
          {topic && (
            <span className="absolute top-3 right-3 text-xs bg-violet-50 text-violet-500
              px-2 py-0.5 rounded-full font-medium">{topic}</span>
          )}
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Term</p>
          <p className="text-base font-semibold text-gray-800 leading-snug">{front}</p>
          <p className="absolute bottom-3 text-xs text-gray-300">click to flip</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-sm
          flex flex-col items-center justify-center p-6 text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-3">Definition</p>
          <p className="text-sm text-white leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  )
}

export default function FlashcardsPage() {
  const { notebookId } = useParams()
  const { state } = useLocation()
  const docId = state?.docId
  const docName = state?.docName
  const [numCards, setNumCards] = useState(15)
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [view, setView] = useState('grid')   // 'grid' | 'single'
  const [current, setCurrent] = useState(0)

  const query = useQuery({
    queryKey: ['flashcards', docId, numCards, difficulty],
    queryFn: () => import('../api/apiService').then(m =>
      m.getFlashcards(docId, difficulty, numCards).then(r => r.data)
    ),
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  })

  const cards = query.data?.flashcards || []

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
      <select value={numCards} onChange={e => setNumCards(Number(e.target.value))}
        className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none
          focus:border-violet-300 text-gray-600 bg-white">
        {[10, 15, 20, 25, 30].map(n => (
          <option key={n} value={n}>{n} cards</option>
        ))}
      </select>
      {cards.length > 0 && (
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setView('grid')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
              ${view === 'grid' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'}`}>
            Grid
          </button>
          <button onClick={() => setView('single')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
              ${view === 'single' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500'}`}>
            One by one
          </button>
        </div>
      )}
    </div>
  )

  return (
    <ToolPageLayout
      title="Flashcards"
      icon={Layers}
      iconColor="text-violet-500"
      iconBg="bg-violet-50"
      docName={docName}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      headerRight={headerRight}
    >
      {cards.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">{cards.length} cards · click any card to reveal definition</p>
            <button onClick={() => { query.refetch(); setCurrent(0) }}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Regenerate
            </button>
          </div>

          {view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, i) => (
                <FlipCard key={i}
                  front={card.front || card.term}
                  back={card.back || card.definition}
                  topic={card.topic}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              <div className="mb-4 text-center text-sm text-gray-400">
                Card {current + 1} of {cards.length}
              </div>
              <div style={{ height: '260px' }}>
                <FlipCard
                  front={cards[current]?.front || cards[current]?.term}
                  back={cards[current]?.back || cards[current]?.definition}
                  topic={cards[current]?.topic}
                />
              </div>
              <div className="flex items-center justify-center gap-4 mt-6">
                <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="p-2 rounded-xl border border-gray-200 hover:border-violet-300
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="flex gap-1">
                  {cards.map((_, i) => (
                    <button key={i} onClick={() => setCurrent(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all
                        ${i === current ? 'bg-violet-500 w-4' : 'bg-gray-300'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrent(c => Math.min(cards.length - 1, c + 1))}
                  disabled={current === cards.length - 1}
                  className="p-2 rounded-xl border border-gray-200 hover:border-violet-300
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ToolPageLayout>
  )
}