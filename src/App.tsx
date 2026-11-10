import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import { ToastProvider, Toaster } from './components/ui/Toast';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminProducts } from './pages/admin/Products';
import { AdminOrders } from './pages/admin/Orders';
import { AdminSettings } from './pages/admin/Settings';
import './styles/globals.css';
import './styles/hero.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout><Outlet /></MainLayout>}>
                <Route index element={<Home />} />
                <Route path="produits" element={<Products />} />
                <Route path="produits/:slug" element={<ProductDetail />} />
                <Route path="panier" element={<Cart />} />
                <Route path="commande" element={<Checkout />} />
                <Route path="commande/succes" element={<OrderSuccess />} />
                <Route path="connexion" element={<Login />} />
                <Route path="inscription" element={<Login />} />
                <Route path="cgv" element={<div className="container mx-auto py-12 px-4"><h1 className="text-3xl font-bold mb-8">Conditions Générales de Vente</h1><div className="prose text-elbro-400">Contenu des CGV...</div></div>} />
                <Route path="confidentialite" element={<div className="container mx-auto py-12 px-4"><h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1><div className="prose text-elbro-400">Contenu de la politique...</div></div>} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="produits" element={<AdminProducts />} />
                <Route path="commandes" element={<AdminOrders />} />
                <Route path="commandes/:id" element={<AdminOrders />} />
                <Route path="parametres" element={<AdminSettings />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}