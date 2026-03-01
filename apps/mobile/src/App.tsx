import { HashRouter } from 'react-router-dom'
import { SplashGate } from './components/auth/SplashGate'

export default function App() {
  return (
    <HashRouter>
      <SplashGate />
    </HashRouter>
  )
}
