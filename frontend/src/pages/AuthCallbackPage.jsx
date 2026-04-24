import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'

// handles the callback from google oauth login flow
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      loginWithToken(token)
      navigate('/', { replace: true })
    } else {
      setError('Authentication failed. No token received from Google.')
    }
  }, [searchParams, loginWithToken, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Login Failed</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })}
            className="px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold
              hover:bg-violet-600 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-900/40
          flex items-center justify-center mx-auto">
          <BookOpen className="w-6 h-6 text-violet-500" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
          Signing you in...
        </div>
      </div>
    </div>
  )
}