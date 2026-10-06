from rest_framework.routers import DefaultRouter

from .views import (
    DeliveryZoneViewSet,
    OrderViewSet,
    PaymentMethodConfigurationViewSet,
)

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("delivery-zones", DeliveryZoneViewSet, basename="delivery-zone")
router.register(
    "payment-methods",
    PaymentMethodConfigurationViewSet,
    basename="payment-method",
)

urlpatterns = router.urls
