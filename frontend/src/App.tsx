import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import RepoNavigator from './components/RepoNavigator'
import IssueDashboard from './components/IssueDashboard'
import { Toaster } from '@/components/ui/toaster'
import ThemeToggle from './components/ThemeToggle'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Github Issue Automation</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Devin</p>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/repos" replace />} />
              <Route path="/repos" element={<RepoNavigator />} />
              <Route path="/repos/:owner/:name/issues" element={<IssueDashboard />} />
            </Routes>
          </main>
          
          <Toaster />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
