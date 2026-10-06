from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, UsageViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("usages", UsageViewSet, basename="usage")
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls
