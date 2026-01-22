import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import EntryRoute from './pages/EntryRoute'
import YearPage from './pages/YearPage'
import GoalsPage from './pages/GoalsPage'
import BookMonthRoute from './pages/BookMonthRoute'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/LoginPage'
import { useAuth } from './state/AuthContext'

export default function App() {
  const { user } = useAuth()
  if (!user) {
    return <LoginPage />
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/year" element={<YearPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/book/month" element={<BookMonthRoute />} />
      <Route path="/new" element={<EntryRoute />} />
      <Route path="/entry/:id" element={<EntryRoute />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
