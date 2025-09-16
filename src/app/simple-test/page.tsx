export default function SimpleTest() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">🛡️ Brand Guard</h1>
        <p className="text-gray-700">Simple test page - if you can see this, Next.js is working!</p>
        <div className="mt-8 space-y-2">
          <p className="text-sm text-gray-500">Environment: {process.env.NODE_ENV}</p>
          <p className="text-sm text-gray-500">Time: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}