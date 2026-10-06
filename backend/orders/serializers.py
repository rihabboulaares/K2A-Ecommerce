from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from products.models import Product
from .models import DeliveryZone, Order, OrderItem, PaymentMethodConfiguration
from .services import create_initial_payment_history, create_initial_status_history


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "product_name",
            "product_reference",
            "unit_price",
            "quantity",
            "subtotal",
        )
        read_only_fields = fields


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ("id", "name", "delivery_fee")
        read_only_fields = fields


class PaymentMethodConfigurationSerializer(serializers.ModelSerializer):
    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    label = serializers.CharField(source="get_payment_method_display", read_only=True)

    class Meta:
        model = PaymentMethodConfiguration
        fields = ("payment_method", "label", "payment_method_display", "fee")
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    payment_status_display = serializers.CharField(
        source="get_payment_status_display",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "status",
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
            "total_amount",
            "payment_method",
            "payment_method_display",
            "payment_fee",
            "payment_status",
            "payment_status_display",
            "items",
            "created_at",
        )
        read_only_fields = fields


class OrderCreateSerializer(serializers.Serializer):
    customer_first_name = serializers.CharField(max_length=100)
    customer_last_name = serializers.CharField(max_length=100)
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(max_length=30)
    shipping_address = serializers.CharField(max_length=255)
    shipping_city = serializers.CharField(max_length=100)
    shipping_postal_code = serializers.CharField(max_length=20)
    delivery_zone_id = serializers.IntegerField()
    customer_note = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemInputSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Le panier ne peut pas être vide.")

        merged_items = {}

        for item in items:
            if item["quantity"] < 1:
                raise serializers.ValidationError(
                    "Chaque quantité doit être supérieure ou égale à 1."
                )

            product_id = item["product_id"]
            merged_items[product_id] = merged_items.get(product_id, 0) + item["quantity"]

        return [
            {"product_id": product_id, "quantity": quantity}
            for product_id, quantity in merged_items.items()
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        delivery_zone_id = validated_data.pop("delivery_zone_id")
        customer_note = validated_data.pop("customer_note", "")
        product_ids = [item["product_id"] for item in items_data]

        with transaction.atomic():
            try:
                delivery_zone = DeliveryZone.objects.select_for_update().get(
                    id=delivery_zone_id,
                    is_active=True,
                )
            except DeliveryZone.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {
                        "delivery_zone_id": (
                            "La zone de livraison sélectionnée n'est pas disponible."
                        )
                    }
                ) from exc

            try:
                payment_config = PaymentMethodConfiguration.objects.select_for_update().get(
                    payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
                    is_active=True,
                )
            except PaymentMethodConfiguration.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {
                        "payment_method": (
                            "Le paiement à la livraison n'est pas disponible."
                        )
                    }
                ) from exc

            products = {
                product.id: product
                for product in Product.objects.select_for_update().filter(
                    id__in=product_ids
                )
            }

            order_items = []
            subtotal = Decimal("0.000")

            for item_data in items_data:
                product_id = item_data["product_id"]
                quantity = item_data["quantity"]
                product = products.get(product_id)

                if product is None:
                    raise serializers.ValidationError(
                        {"items": f"Le produit {product_id} n'existe plus."}
                    )

                if not product.is_active:
                    raise serializers.ValidationError(
                        {"items": f"Le produit {product.name} n'est plus disponible."}
                    )

                if quantity > product.stock_quantity:
                    raise serializers.ValidationError(
                        {
                            "items": (
                                f"Stock insuffisant pour {product.name}. "
                                f"Stock disponible : {product.stock_quantity}."
                            )
                        }
                    )

                line_subtotal = product.price * quantity
                subtotal += line_subtotal
                order_items.append(
                    {
                        "product": product,
                        "product_name": product.name,
                        "product_reference": product.reference,
                        "unit_price": product.price,
                        "quantity": quantity,
                        "subtotal": line_subtotal,
                    }
                )

            delivery_fee = delivery_zone.delivery_fee
            payment_fee = payment_config.fee
            total_amount = subtotal + delivery_fee + payment_fee

            order = Order.objects.create(
                **validated_data,
                customer_note=customer_note,
                subtotal=subtotal,
                delivery_zone=delivery_zone,
                delivery_zone_name=delivery_zone.name,
                delivery_fee=delivery_fee,
                total_amount=total_amount,
                payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
                payment_fee=payment_fee,
                payment_status=Order.PaymentStatus.PENDING,
            )

            for item in order_items:
                product = item["product"]
                OrderItem.objects.create(order=order, **item)
                product.stock_quantity -= item["quantity"]
                product.save(update_fields=["stock_quantity"])

            create_initial_status_history(order)
            create_initial_payment_history(order)

        return order
