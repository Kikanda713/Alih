import { Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import DashboardHome from './pages/dashboard/DashboardHome.jsx'
import CataloguePage from './pages/dashboard/CataloguePage.jsx'
import VentesPage from './pages/dashboard/VentesPage.jsx'

export default function Root() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="ventes" element={<VentesPage />} />
      </Route>
    </Routes>
  )
}
