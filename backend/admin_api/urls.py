from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminDashboardView,
    AdminCategoryViewSet,
    AdminDeliveryZoneViewSet,
    AdminLoginView,
    AdminLogoutView,
    AdminMeView,
    AdminOrderViewSet,
    AdminPaymentMethodConfigurationViewSet,
    AdminProductImageViewSet,
    AdminProductViewSet,
    AdminRefreshView,
    AdminStockViewSet,
    AdminUsageViewSet,
)

router = DefaultRouter()
router.register("products", AdminProductViewSet, basename="admin-products")
router.register("product-images", AdminProductImageViewSet, basename="admin-product-images")
router.register("categories", AdminCategoryViewSet, basename="admin-categories")
router.register("usages", AdminUsageViewSet, basename="admin-usages")
router.register("orders", AdminOrderViewSet, basename="admin-orders")
router.register("stock", AdminStockViewSet, basename="admin-stock")
router.register("delivery-zones", AdminDeliveryZoneViewSet, basename="admin-delivery-zones")
router.register("payment-methods", AdminPaymentMethodConfigurationViewSet, basename="admin-payment-methods")

urlpatterns = [
    path("auth/login/", AdminLoginView.as_view(), name="admin-auth-login"),
    path("auth/refresh/", AdminRefreshView.as_view(), name="admin-auth-refresh"),
    path("auth/logout/", AdminLogoutView.as_view(), name="admin-auth-logout"),
    path("auth/me/", AdminMeView.as_view(), name="admin-auth-me"),
    path("dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
] + router.urls
