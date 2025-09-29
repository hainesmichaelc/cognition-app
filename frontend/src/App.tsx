import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import RepoNavigator from './components/RepoNavigator'
import IssueDashboard from './components/IssueDashboard'
import { Toaster } from '@/components/ui/toaster'
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="bg-white dark:bg-zinc-900 shadow-sm border-b dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Github Issue Automation</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Powered by Devin</p>
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
  )
}

export default App
