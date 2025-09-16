'use client'

import { useRouter } from 'next/navigation'

export default function AuthErrorPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl text-white">❌</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            There was a problem signing you in. Please try again.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-xl">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              The authentication process failed. This could be due to:
            </p>
            <ul className="text-left text-sm text-gray-600 space-y-1">
              <li>• Network connectivity issues</li>
              <li>• OAuth configuration problems</li>
              <li>• Cancelled authentication</li>
            </ul>
            
            <div className="pt-4 space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}