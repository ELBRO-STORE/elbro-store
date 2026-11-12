
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import { ToastProvider, Toaster } from './components/ui/Toast';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminGuard } from './components/layout/AdminGuard';
import './styles/globals.css';
import './styles/hero.css';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess').then(m => ({ default: m.OrderSuccess })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Wishlist = lazy(() => import('./pages/Wishlist').then(m => ({ default: m.Wishlist })));
const OrderTracking = lazy(() => import('./pages/OrderTracking').then(m => ({ default: m.OrderTracking })));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/admin/Products').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/admin/Orders').then(m => ({ default: m.AdminOrders })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.AdminSettings })));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons').then(m => ({ default: m.AdminCoupons })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminCategories = lazy(() => import('./pages/admin/Categories').then(m => ({ default: m.AdminCategories })));

const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Chargement...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<MainLayout><Outlet /></MainLayout>}>
                  <Route index element={<Home />} />
                  <Route path="produits" element={<Products />} />
                  <Route path="produits/:slug" element={<ProductDetail />} />
                  <Route path="panier" element={<Cart />} />
                  <Route path="favoris" element={<Wishlist />} />
                  <Route path="suivi" element={<OrderTracking />} />
                  <Route path="commande" element={<Checkout />} />
                  <Route path="commande/succes" element={<OrderSuccess />} />
                  <Route path="connexion" element={<Login />} />
                  <Route path="inscription" element={<Login />} />
                  <Route path="profil" element={<Profile />} />
                  <Route
                    path="cgv"
                    element={
                      <div className="container mx-auto py-12 px-4">
                        <h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente</h1>
                        <div className="prose text-elbro-400">Contenu des CGV...</div>
                      </div>
                    }
                  />
                  <Route
                    path="confidentialite"
                    element={
                      <div className="container mx-auto py-12 px-4">
                        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
                        <div className="prose text-elbro-400">Contenu de la politique...</div>
                      </div>
                    }
                  />
                </Route>

                <Route
                  path="/admin"
                  element={
                    <AdminGuard>
                      <AdminLayout>
                        <Outlet />
                      </AdminLayout>
                    </AdminGuard>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="produits" element={<AdminProducts />} />
                  <Route path="commandes" element={<AdminOrders />} />
                  <Route path="commandes/:id" element={<AdminOrders />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="utilisateurs" element={<AdminUsers />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="parametres" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Toaster />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
