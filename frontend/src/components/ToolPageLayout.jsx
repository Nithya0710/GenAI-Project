import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Loader2, RefreshCw } from 'lucide-react'

export default function ToolPageLayout({
  title,
  icon: Icon,
  iconColor = 'text-violet-500',
  iconBg = 'bg-violet-50',
  docName,
  isLoading,
  isError,
  onRetry,
  children,
  headerRight,
}) {
  const navigate = useNavigate()
  const { notebookId } = useParams()

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <div className={`p-1.5 rounded-lg ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800">{title}</h1>
          {docName && <p className="text-xs text-gray-400 truncate max-w-xs">{docName}</p>}
        </div>
        <div className="flex-1" />
        {headerRight}
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Icon className={`w-7 h-7 ${iconColor}`} />
              </div>
              <Loader2 className="absolute -top-1 -right-1 w-5 h-5 text-violet-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Generating {title}...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
            </div>
            <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full
                animate-[loading_2s_ease-in-out_infinite]" style={{
                  animation: 'loading 1.5s ease-in-out infinite',
                  backgroundSize: '200% 100%',
                }} />
            </div>
            <style>{`
              @keyframes loading {
                0% { width: 0%; margin-left: 0% }
                50% { width: 70%; margin-left: 15% }
                100% { width: 0%; margin-left: 100% }
              }
            `}</style>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <Icon className="w-7 h-7 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Something went wrong</p>
              <p className="text-xs text-gray-400 mt-1">Make sure the backend is running and try again.</p>
            </div>
            {onRetry && (
              <button onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white
                  text-sm font-semibold rounded-xl hover:bg-violet-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && children}
      </main>
    </div>
  )
}