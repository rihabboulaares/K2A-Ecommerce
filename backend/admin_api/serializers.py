from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from orders.models import (
    DeliveryZone,
    Order,
    OrderPaymentHistory,
    OrderStatusHistory,
    PaymentMethodConfiguration,
)
from products.models import Category, Product, ProductImage, StockAdjustment, Usage


class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    is_staff = serializers.BooleanField()
    is_superuser = serializers.BooleanField()


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        if not (self.user.is_staff or self.user.is_superuser):
            raise AuthenticationFailed(
                "Acces administrateur refuse.",
                code="admin_access_denied",
            )

        data["user"] = AdminUserSerializer(self.user).data
        return data


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description", "image", "is_active", "created_at")
        read_only_fields = ("id", "created_at")


class AdminUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = ("id", "name")
        read_only_fields = ("id",)


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "is_primary", "created_at")
        read_only_fields = ("id", "created_at")


class AdminProductSerializer(serializers.ModelSerializer):
    category = AdminCategorySerializer(read_only=True)
    usages = AdminUsageSerializer(many=True, read_only=True)
    images = AdminProductImageSerializer(many=True, read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
    )
    usage_ids = serializers.PrimaryKeyRelatedField(
        queryset=Usage.objects.all(),
        source="usages",
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "reference",
            "description",
            "price",
            "old_price",
            "stock_quantity",
            "volume_value",
            "volume_unit",
            "scent",
            "is_active",
            "is_featured",
            "is_in_stock",
            "category",
            "category_id",
            "usages",
            "usage_ids",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        return value

    def validate_old_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("L'ancien prix ne peut pas être négatif.")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Le stock ne peut pas être négatif.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        usages = validated_data.pop("usages", [])
        product = Product.objects.create(**validated_data)
        product.usages.set(usages)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        usages = validated_data.pop("usages", None)
        product = super().update(instance, validated_data)
        if usages is not None:
            product.usages.set(usages)
        return product


class AdminProductImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "is_primary")
        read_only_fields = ("id",)

    def validate_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image trop volumineuse.")
        content_type = getattr(value, "content_type", "")
        if content_type and not content_type.startswith("image/"):
            raise serializers.ValidationError("Le fichier doit être une image.")
        return value


class AdminOrderStatusHistorySerializer(serializers.ModelSerializer):
    old_status_display = serializers.CharField(source="get_old_status_display", read_only=True)
    new_status_display = serializers.CharField(source="get_new_status_display", read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = (
            "id",
            "old_status",
            "old_status_display",
            "new_status",
            "new_status_display",
            "note",
            "created_at",
        )


class AdminOrderPaymentHistorySerializer(serializers.ModelSerializer):
    old_status_display = serializers.CharField(source="get_old_status_display", read_only=True)
    new_status_display = serializers.CharField(source="get_new_status_display", read_only=True)

    class Meta:
        model = OrderPaymentHistory
        fields = (
            "id",
            "old_status",
            "old_status_display",
            "new_status",
            "new_status_display",
            "note",
            "created_at",
        )


class AdminOrderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    status_history = AdminOrderStatusHistorySerializer(many=True, read_only=True)
    payment_history = AdminOrderPaymentHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer_first_name",
            "customer_last_name",
            "customer_email",
            "customer_phone",
            "shipping_address",
            "shipping_city",
            "shipping_postal_code",
            "customer_note",
            "subtotal",
            "delivery_zone_name",
            "delivery_fee",
            "payment_fee",
            "total_amount",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "payment_status",
            "payment_status_display",
            "stock_restored",
            "items",
            "status_history",
            "payment_history",
            "created_at",
            "updated_at",
        )

    def get_items(self, order):
        return [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "product_reference": item.product_reference,
                "product_image": item.product.images.filter(is_primary=True).first().image.url
                if item.product and item.product.images.filter(is_primary=True).exists()
                else "",
                "unit_price": item.unit_price,
                "quantity": item.quantity,
                "subtotal": item.subtotal,
            }
            for item in order.items.select_related("product").prefetch_related("product__images")
        ]


class AdminDeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ("id", "name", "delivery_fee", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_delivery_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Les frais de livraison ne peuvent pas être négatifs.")
        return value


class AdminPaymentMethodConfigurationSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = PaymentMethodConfiguration
        fields = (
            "id",
            "payment_method",
            "payment_method_display",
            "fee",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_fee(self, value):
        if value < 0:
            raise serializers.ValidationError("Les frais de paiement ne peuvent pas être négatifs.")
        return value


class AdminStockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_reference = serializers.CharField(source="product.reference", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = (
            "id",
            "product",
            "product_name",
            "product_reference",
            "old_quantity",
            "new_quantity",
            "difference",
            "reason",
            "created_at",
            "created_by_username",
        )
        read_only_fields = fields


class AdminStockAdjustSerializer(serializers.Serializer):
    new_quantity = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(max_length=255)
