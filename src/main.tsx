import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { EntriesProvider } from './state/EntriesContext'
import { GoalsProvider } from './state/GoalsContext'
import { AuthProvider } from './state/AuthContext'
import { SupabaseSyncProvider } from './state/SupabaseSyncProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EntriesProvider>
          <GoalsProvider>
            <SupabaseSyncProvider>
              <App />
            </SupabaseSyncProvider>
          </GoalsProvider>
        </EntriesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
