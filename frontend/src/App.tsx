import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import RepoNavigator from './components/RepoNavigator'
import IssueDashboard from './components/IssueDashboard'
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Cognition App</h1>
              <div className="text-sm text-gray-500">
                GitHub Issue Automation with Devin
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/repos" replace />} />
            <Route path="/repos" element={<RepoNavigator />} />
            <Route path="/repos/:repoId/issues" element={<IssueDashboard />} />
          </Routes>
        </main>
        
        <Toaster />
      </div>
    </Router>
  )
}

export default App
