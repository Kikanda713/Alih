import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import { Spinner } from "./components/ui.jsx";
import App from "./App.jsx";
import Callback from "./auth/Callback.jsx";
const LinkPage = lazy(() => import("./pages/LinkPage.jsx"));
const VerifyPage = lazy(() => import("./pages/VerifyPage.jsx"));
const PayPage = lazy(() => import("./pages/PayPage.jsx"));
const StepUpPage = lazy(() => import("./pages/StepUpPage.jsx"));
import MarketLayout from "./market/MarketLayout.jsx";
import ExplorePage from "./market/pages/ExplorePage.jsx";
import ListingPage from "./market/pages/ListingPage.jsx";
import ShopPage from "./market/pages/ShopPage.jsx";
import CartPage from "./market/pages/CartPage.jsx";
import HubsPage from "./market/pages/HubsPage.jsx";
import HubPage from "./market/pages/HubPage.jsx";
import SellPage from "./market/pages/SellPage.jsx";
import OnboardingPage from "./market/pages/OnboardingPage.jsx";
import BataPage from "./market/pages/BataPage.jsx";
import SelectionPage from "./market/pages/SelectionPage.jsx";
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout.jsx"));
const ChatHome = lazy(() => import("./pages/dashboard/ChatHome.jsx"));
const CataloguePage = lazy(() => import("./pages/dashboard/CataloguePage.jsx"));
const BoutiquePage = lazy(() => import("./pages/dashboard/BoutiquePage.jsx"));
const VentesPage = lazy(() => import("./pages/dashboard/VentesPage.jsx"));
const WalletPage = lazy(() => import("./pages/dashboard/WalletPage.jsx"));
const SubscriptionPage = lazy(() => import("./pages/dashboard/SubscriptionPage.jsx"));
const ProCertificatePage = lazy(() => import("./pages/dashboard/ProCertificatePage.jsx"));
const ShopCertificatePage = lazy(() => import("./pages/dashboard/ShopCertificatePage.jsx"));
const DashBataPage = lazy(() => import("./pages/dashboard/BataDashPage.jsx"));
const InfluencerPage = lazy(() => import("./pages/dashboard/InfluencerPage.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions.jsx"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions.jsx"));
const AdminCertification = lazy(() => import("./pages/admin/AdminCertification.jsx"));
const AdminP2P = lazy(() => import("./pages/admin/AdminP2P.jsx"));
const AdminMarketplace = lazy(() => import("./pages/admin/AdminMarketplace.jsx"));
const AdminHubs = lazy(() => import("./pages/admin/AdminHubs.jsx"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers.jsx"));
const AdminAI = lazy(() => import("./pages/admin/AdminAI.jsx"));
const AdminDrivers = lazy(() => import("./pages/admin/AdminDrivers.jsx"));
const AdminMap = lazy(() => import("./pages/admin/AdminMap.jsx"));
const AdminBata = lazy(() => import("./pages/admin/AdminBata.jsx"));
const AdminInfluencers = lazy(() => import("./pages/admin/AdminInfluencers.jsx"));

export default function Root() {
  return (
    // Espace commerçant, back-office et pages annexes chargés à la demande :
    // le site public reste léger (connexions 3G).
    <ErrorBoundary>
    <Suspense fallback={<div className="mk-page-pad" style={{ display: "grid", placeItems: "center" }}><Spinner label="Chargement…" /></div>}>
    <Routes>
      {/* Site public multi-pages : marché, centres, connectivité, vente */}
      <Route element={<MarketLayout />}>
        <Route path="/" element={<App />} />
        <Route path="/marche" element={<ExplorePage />} />
        <Route path="/annonce/:id" element={<ListingPage />} />
        <Route path="/boutique/:id" element={<ShopPage />} />
        <Route path="/panier" element={<CartPage />} />
        <Route path="/centres" element={<HubsPage />} />
        <Route path="/centres/:id" element={<HubPage />} />
        <Route path="/connectivite" element={<Navigate to="/centres" replace />} />
        <Route path="/vendre" element={<SellPage />} />
        <Route path="/vendre/boutique" element={<OnboardingPage key="business" />} />
        <Route path="/vendre/pro" element={<OnboardingPage key="pro" pro />} />
        <Route path="/bata" element={<BataPage />} />
        <Route path="/selection/:slug" element={<SelectionPage />} />
      </Route>
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="/link" element={<LinkPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/pay" element={<PayPage />} />
      <Route path="/step-up" element={<StepUpPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<ChatHome />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="boutique" element={<BoutiquePage />} />
        <Route path="ventes" element={<VentesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="abonnement" element={<SubscriptionPage />} />
        <Route path="certificat-pro" element={<ProCertificatePage />} />
        <Route path="certificat-etablissement" element={<ShopCertificatePage />} />
        <Route path="bata" element={<DashBataPage />} />
        <Route path="influenceur" element={<InfluencerPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="commissions" element={<AdminCommissions />} />
        <Route path="certification" element={<AdminCertification />} />
        <Route path="marche" element={<AdminMarketplace />} />
        <Route path="vendeurs" element={<AdminSellers />} />
        <Route path="centres" element={<AdminHubs />} />
        <Route path="ia" element={<AdminAI />} />
        <Route path="p2p" element={<AdminP2P />} />
        <Route path="bata" element={<AdminBata />} />
        <Route path="influenceurs" element={<AdminInfluencers />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="map" element={<AdminMap />} />
      </Route>
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
