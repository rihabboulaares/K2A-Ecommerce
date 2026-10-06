from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import DeliveryZone, Order, PaymentMethodConfiguration
from .serializers import (
    DeliveryZoneSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    PaymentMethodConfigurationSerializer,
)


class OrderViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Order.objects.prefetch_related("items")
    permission_classes = (AllowAny,)

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        output_serializer = OrderSerializer(order, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class DeliveryZoneViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeliveryZoneSerializer
    permission_classes = (AllowAny,)
    queryset = DeliveryZone.objects.filter(is_active=True).order_by("name")


class PaymentMethodConfigurationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentMethodConfigurationSerializer
    permission_classes = (AllowAny,)
    queryset = PaymentMethodConfiguration.objects.filter(is_active=True).order_by(
        "payment_method"
    )
