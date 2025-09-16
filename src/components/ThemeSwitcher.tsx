'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useState } from 'react'

export const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = () => {
    setIsAnimating(true)
    toggleTheme()
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            theme === 'dark' ? 'bg-gradient-primary' : 'bg-gradient-accent'
          }`}>
            <span className="text-white text-lg">
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Theme Preference
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose between light and dark mode
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Options */}
          <div className="flex items-center space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => theme === 'dark' && handleToggle()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                theme === 'light'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>☀️</span>
              <span>Light</span>
            </button>
            <button
              onClick={() => theme === 'light' && handleToggle()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>🌙</span>
              <span>Dark</span>
            </button>
          </div>
          
          {/* Animated Toggle Switch */}
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              theme === 'dark' ? 'bg-primary' : 'bg-gray-300'
            } ${isAnimating ? 'scale-105' : ''}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-300 shadow-lg ${
                theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
              }`}
            >
              <span className="flex h-full w-full items-center justify-center text-xs">
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </span>
          </button>
        </div>
      </div>
      
      {/* Theme Preview Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="relative">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Light Mode</div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="w-full h-2 bg-gradient-primary rounded-full mb-2"></div>
            <div className="space-y-1">
              <div className="w-3/4 h-1.5 bg-gray-300 rounded"></div>
              <div className="w-1/2 h-1.5 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dark Mode</div>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-sm">
            <div className="w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-2"></div>
            <div className="space-y-1">
              <div className="w-3/4 h-1.5 bg-gray-600 rounded"></div>
              <div className="w-1/2 h-1.5 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* System Preference Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 dark:text-blue-400">💡</span>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Your preference is saved and will persist across browser sessions.
          </p>
        </div>
      </div>
    </div>
  )
}