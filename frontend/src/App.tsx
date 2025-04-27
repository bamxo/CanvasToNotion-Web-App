import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Lookup from './components/Lookup'
import SignUp from './components/SignUp'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import LoginSuccess from './components/LoginSuccess'
import ResetPassword from './components/ResetPassword'
import Terms from './components/Terms'
import Privacy from './components/Privacy'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lookup" element={<Lookup />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </Router>
  )
}

export default App
