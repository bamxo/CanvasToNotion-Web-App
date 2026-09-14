import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LandingPage from './pages/landing/LandingPage'
import Contact from './pages/landing/Contact'
import AboutUs from './pages/landing/AboutUs'
import Terms from './pages/landing/Terms'
import Privacy from './pages/landing/Privacy'
import Lookup from './pages/auth/Lookup'
import SignUp from './pages/auth/SignUp'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import GetStarted from './pages/auth/GetStarted'
import ResetPassword from './pages/auth/ResetPassword'
import Settings from './pages/app/Settings'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
