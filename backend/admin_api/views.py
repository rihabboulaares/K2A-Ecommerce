from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from django.db import transaction
from django.db.models.functions import TruncDate
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from orders.models import DeliveryZone, Order, PaymentMethodConfiguration
from orders.services import (
    OrderPaymentError,
    OrderStatusTransitionError,
    change_order_status,
    mark_order_as_paid,
)
from products.models import Category, Product, ProductImage, StockAdjustment, Usage

from .permissions import IsStaffOrSuperuser
from .serializers import (
    AdminCategorySerializer,
    AdminDeliveryZoneSerializer,
    AdminOrderSerializer,
    AdminPaymentMethodConfigurationSerializer,
    AdminProductImageSerializer,
    AdminProductImageUploadSerializer,
    AdminProductSerializer,
    AdminStockAdjustSerializer,
    AdminStockAdjustmentSerializer,
    AdminTokenObtainPairSerializer,
    AdminUsageSerializer,
    AdminUserSerializer,
)

LOW_STOCK_THRESHOLD = 5


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class AdminRefreshView(TokenRefreshView):
    pass


class AdminLogoutView(APIView):
    permission_classes = (IsStaffOrSuperuser,)

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            return Response(
                {"detail": "Session invalide ou deja terminee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminMeView(APIView):
    permission_classes = (IsStaffOrSuperuser,)

    def get(self, request):
        serializer = AdminUserSerializer(request.user)
        return Response(serializer.data)


class AdminDashboardView(APIView):
    permission_classes = (IsStaffOrSuperuser,)

    def get(self, request):
        products = Product.objects.all()
        orders = Order.objects.all()
        today = timezone.now().date()
        start_date = today - timedelta(days=29)
        revenue = (
            orders.filter(payment_status=Order.PaymentStatus.PAID)
            .aggregate(total=Sum("total_amount"))
            .get("total")
            or Decimal("0.000")
        )
        revenue_by_day = {
            item["day"]: item["total"] or Decimal("0.000")
            for item in orders.filter(
                payment_status=Order.PaymentStatus.PAID,
                created_at__date__gte=start_date,
            )
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Sum("total_amount"))
        }
        sales_last_30_days = [
            {
                "date": start_date + timedelta(days=index),
                "revenue_collected": revenue_by_day.get(
                    start_date + timedelta(days=index),
                    Decimal("0.000"),
                ),
            }
            for index in range(30)
        ]

        latest_orders = [
            {
                "order_number": order.order_number,
                "customer_first_name": order.customer_first_name,
                "customer_last_name": order.customer_last_name,
                "items_count": order.items.count(),
                "total_amount": order.total_amount,
                "status": order.status,
                "status_display": order.get_status_display(),
                "payment_status": order.payment_status,
                "payment_status_display": order.get_payment_status_display(),
                "created_at": order.created_at,
            }
            for order in orders.order_by("-created_at", "-id")[:5]
        ]

        return Response(
            {
                "low_stock_threshold": LOW_STOCK_THRESHOLD,
                "total_products": products.count(),
                "active_products": products.filter(is_active=True).count(),
                "low_stock_products": products.filter(
                    stock_quantity__gt=0,
                    stock_quantity__lte=LOW_STOCK_THRESHOLD,
                ).count(),
                "out_of_stock_products": products.filter(stock_quantity=0).count(),
                "total_orders": orders.count(),
                "pending_orders": orders.filter(status=Order.Status.PENDING).count(),
                "confirmed_orders": orders.filter(status=Order.Status.CONFIRMED).count(),
                "processing_orders": orders.filter(status=Order.Status.PROCESSING).count(),
                "shipped_orders": orders.filter(status=Order.Status.SHIPPED).count(),
                "delivered_orders": orders.filter(status=Order.Status.DELIVERED).count(),
                "cancelled_orders": orders.filter(status=Order.Status.CANCELLED).count(),
                "pending_payments": orders.filter(
                    payment_status=Order.PaymentStatus.PENDING,
                ).count(),
                "paid_orders": orders.filter(payment_status=Order.PaymentStatus.PAID).count(),
                "revenue_collected": revenue,
                "order_status_distribution": {
                    "pending": orders.filter(status=Order.Status.PENDING).count(),
                    "confirmed": orders.filter(status=Order.Status.CONFIRMED).count(),
                    "processing": orders.filter(status=Order.Status.PROCESSING).count(),
                    "shipped": orders.filter(status=Order.Status.SHIPPED).count(),
                    "delivered": orders.filter(status=Order.Status.DELIVERED).count(),
                    "cancelled": orders.filter(status=Order.Status.CANCELLED).count(),
                },
                "sales_last_30_days": sales_last_30_days,
                "latest_orders": latest_orders,
            }
        )


class AdminProductFilter(filters.FilterSet):
    category = filters.NumberFilter(field_name="category_id")
    is_active = filters.BooleanFilter()
    is_featured = filters.BooleanFilter()
    stock = filters.CharFilter(method="filter_stock")

    class Meta:
        model = Product
        fields = ("category", "is_active", "is_featured", "stock")

    def filter_stock(self, queryset, name, value):
        if value == "low":
            return queryset.filter(
                stock_quantity__gt=0,
                stock_quantity__lte=LOW_STOCK_THRESHOLD,
            )
        if value == "out":
            return queryset.filter(stock_quantity=0)
        if value == "in":
            return queryset.filter(stock_quantity__gt=LOW_STOCK_THRESHOLD)
        return queryset


class AdminProductViewSet(viewsets.ModelViewSet):
    serializer_class = AdminProductSerializer
    permission_classes = (IsStaffOrSuperuser,)
    filterset_class = AdminProductFilter
    search_fields = ("name", "reference", "description", "scent")
    ordering_fields = ("name", "price", "stock_quantity", "created_at")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Product.objects.select_related("category")
            .prefetch_related("usages", "images")
            .all()
        )

    @action(
        detail=True,
        methods=["post"],
        parser_classes=(MultiPartParser, FormParser),
        url_path="images",
    )
    def upload_image(self, request, pk=None):
        product = self.get_object()
        serializer = AdminProductImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            if serializer.validated_data.get("is_primary"):
                product.images.update(is_primary=False)
            image = serializer.save(product=product)

        return Response(
            AdminProductImageSerializer(image).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        product = self.get_object()
        product.is_active = not product.is_active
        product.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(product).data)


class AdminProductImageViewSet(viewsets.ModelViewSet):
    serializer_class = AdminProductImageSerializer
    permission_classes = (IsStaffOrSuperuser,)
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    http_method_names = ("patch", "delete", "options", "head")

    def get_queryset(self):
        return ProductImage.objects.select_related("product")

    def partial_update(self, request, *args, **kwargs):
        image = self.get_object()
        is_primary = request.data.get("is_primary")
        if str(is_primary).lower() in ("true", "1", "yes"):
            image.product.images.update(is_primary=False)
            image.is_primary = True
            image.save(update_fields=["is_primary"])
        return Response(self.get_serializer(image).data)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = AdminCategorySerializer
    permission_classes = (IsStaffOrSuperuser,)
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    search_fields = ("name", "description")
    ordering_fields = ("name", "created_at")
    ordering = ("name",)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        category = self.get_object()
        category.is_active = not category.is_active
        category.save(update_fields=["is_active"])
        return Response(self.get_serializer(category).data)


class AdminUsageViewSet(viewsets.ModelViewSet):
    queryset = Usage.objects.all().order_by("name")
    serializer_class = AdminUsageSerializer
    permission_classes = (IsStaffOrSuperuser,)
    search_fields = ("name",)
    ordering_fields = ("name",)
    ordering = ("name",)


class AdminOrderFilter(filters.FilterSet):
    status = filters.CharFilter()
    payment_status = filters.CharFilter()
    zone = filters.CharFilter(field_name="delivery_zone_name", lookup_expr="icontains")

    class Meta:
        model = Order
        fields = ("status", "payment_status", "zone")


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminOrderSerializer
    permission_classes = (IsStaffOrSuperuser,)
    filterset_class = AdminOrderFilter
    search_fields = (
        "order_number",
        "customer_first_name",
        "customer_last_name",
        "customer_email",
        "customer_phone",
    )
    ordering_fields = ("created_at", "total_amount", "status", "payment_status")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Order.objects.prefetch_related(
                "items",
                "items__product",
                "items__product__images",
                "status_history",
                "payment_history",
            )
            .all()
        )

    def _change_status(self, order, new_status, note):
        try:
            order = change_order_status(order, new_status, note=note)
        except (OrderStatusTransitionError, DjangoValidationError) as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._change_status(
            self.get_object(),
            Order.Status.CONFIRMED,
            "Confirmation depuis le back-office.",
        )

    @action(detail=True, methods=["post"], url_path="process")
    def process_order(self, request, pk=None):
        return self._change_status(
            self.get_object(),
            Order.Status.PROCESSING,
            "Passage en préparation depuis le back-office.",
        )

    @action(detail=True, methods=["post"])
    def ship(self, request, pk=None):
        return self._change_status(
            self.get_object(),
            Order.Status.SHIPPED,
            "Expédition depuis le back-office.",
        )

    @action(detail=True, methods=["post"])
    def deliver(self, request, pk=None):
        return self._change_status(
            self.get_object(),
            Order.Status.DELIVERED,
            "Livraison confirmée depuis le back-office.",
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._change_status(
            self.get_object(),
            Order.Status.CANCELLED,
            "Annulation depuis le back-office.",
        )

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        try:
            order = mark_order_as_paid(
                self.get_object(),
                note="Paiement marqué encaissé depuis le back-office.",
            )
        except (OrderPaymentError, DjangoValidationError) as exc:
            return Response({"detail": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(order).data)


class AdminStockViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminProductSerializer
    permission_classes = (IsStaffOrSuperuser,)
    filterset_class = AdminProductFilter
    search_fields = ("name", "reference", "category__name")
    ordering_fields = ("name", "reference", "stock_quantity")
    ordering = ("name",)

    def get_queryset(self):
        return Product.objects.select_related("category").prefetch_related("usages", "images")

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        product = self.get_object()
        serializer = AdminStockAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_quantity = product.stock_quantity
        new_quantity = serializer.validated_data["new_quantity"]

        with transaction.atomic():
            product.stock_quantity = new_quantity
            product.save(update_fields=["stock_quantity", "updated_at"])
            StockAdjustment.objects.create(
                product=product,
                old_quantity=old_quantity,
                new_quantity=new_quantity,
                difference=new_quantity - old_quantity,
                reason=serializer.validated_data["reason"],
                created_by=request.user,
            )

        return Response(self.get_serializer(product).data)

    @action(detail=False, methods=["get"], url_path="adjustments")
    def adjustments(self, request):
        adjustments = StockAdjustment.objects.select_related("product", "created_by")[:50]
        serializer = AdminStockAdjustmentSerializer(adjustments, many=True)
        return Response(serializer.data)


class AdminDeliveryZoneViewSet(viewsets.ModelViewSet):
    queryset = DeliveryZone.objects.all().order_by("name")
    serializer_class = AdminDeliveryZoneSerializer
    permission_classes = (IsStaffOrSuperuser,)
    search_fields = ("name",)
    ordering_fields = ("name", "delivery_fee", "updated_at")
    ordering = ("name",)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        zone = self.get_object()
        zone.is_active = not zone.is_active
        zone.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(zone).data)


class AdminPaymentMethodConfigurationViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethodConfiguration.objects.all().order_by("payment_method")
    serializer_class = AdminPaymentMethodConfigurationSerializer
    permission_classes = (IsStaffOrSuperuser,)
    ordering_fields = ("payment_method", "fee", "updated_at")
    ordering = ("payment_method",)

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        method = self.get_object()
        method.is_active = not method.is_active
        method.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(method).data)
