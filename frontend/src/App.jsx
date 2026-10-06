import { Route, Routes } from 'react-router-dom'
import './App.css'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute.jsx'
import AdminLayout from './layouts/admin/AdminLayout.jsx'
import MainLayout from './components/layout/MainLayout.jsx'
import AdminDashboardPage from './pages/Admin/AdminDashboardPage.jsx'
import AdminCategoriesPage from './pages/Admin/AdminCategoriesPage.jsx'
import AdminDeliveryPage from './pages/Admin/AdminDeliveryPage.jsx'
import AdminLoginPage from './pages/Admin/AdminLoginPage.jsx'
import AdminOrderDetailPage from './pages/Admin/AdminOrderDetailPage.jsx'
import AdminOrdersPage from './pages/Admin/AdminOrdersPage.jsx'
import AdminPaymentsPage from './pages/Admin/AdminPaymentsPage.jsx'
import AdminPlaceholderPage from './pages/Admin/AdminPlaceholderPage.jsx'
import AdminProductFormPage from './pages/Admin/AdminProductFormPage.jsx'
import AdminProductsPage from './pages/Admin/AdminProductsPage.jsx'
import AdminSettingsPage from './pages/Admin/AdminSettingsPage.jsx'
import AdminStockPage from './pages/Admin/AdminStockPage.jsx'
import HomePage from './pages/Home/HomePage.jsx'
import ProductDetailsPage from './pages/ProductDetails/ProductDetailsPage.jsx'
import ProductsPage from './pages/Products/ProductsPage.jsx'
import CartPage from './pages/Cart/CartPage.jsx'
import CheckoutPage from './pages/Checkout/CheckoutPage.jsx'
import OrderConfirmationPage from './pages/OrderConfirmation/OrderConfirmationPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route
            path="products/new"
            element={<AdminProductFormPage />}
          />
          <Route
            path="products/:id/edit"
            element={<AdminProductFormPage />}
          />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="stock" element={<AdminStockPage />} />
          <Route path="delivery" element={<AdminDeliveryPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<AdminPlaceholderPage title="Module admin" />} />
        </Route>
      </Route>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailsPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
