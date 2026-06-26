import { Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Callback from './auth/Callback.jsx'
import LinkPage from './pages/LinkPage.jsx'
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx'
import ChatHome from './pages/dashboard/ChatHome.jsx'
import CataloguePage from './pages/dashboard/CataloguePage.jsx'
import VentesPage from './pages/dashboard/VentesPage.jsx'
import WalletPage from './pages/dashboard/WalletPage.jsx'
import SubscriptionPage from './pages/dashboard/SubscriptionPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminHome from './pages/admin/AdminHome.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminSubscriptions from './pages/admin/AdminSubscriptions.jsx'

export default function Root() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="/link" element={<LinkPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<ChatHome />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="ventes" element={<VentesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="abonnement" element={<SubscriptionPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
      </Route>
    </Routes>
  )
}
