import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Compliance } from './pages/Compliance'
import { CLIReference } from './pages/CLIReference'
import { Audit } from './pages/Audit'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/cli" element={<CLIReference />} />
        <Route path="/audit" element={<Audit />} />
      </Routes>
    </Layout>
  )
}

export default App
