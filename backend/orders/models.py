import uuid

from django.db import models

from products.models import Product


def generate_order_number():
    return f"CMD-{uuid.uuid4().hex[:10].upper()}"


class DeliveryZone(models.Model):
    name = models.CharField(max_length=100, unique=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        CONFIRMED = "CONFIRMED", "Confirmée"
        PROCESSING = "PROCESSING", "En préparation"
        SHIPPED = "SHIPPED", "Expédiée"
        DELIVERED = "DELIVERED", "Livrée"
        CANCELLED = "CANCELLED", "Annulée"

    class PaymentMethod(models.TextChoices):
        CASH_ON_DELIVERY = "CASH_ON_DELIVERY", "Paiement à la livraison"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PAID = "PAID", "Payé"

    order_number = models.CharField(
        max_length=20,
        unique=True,
        default=generate_order_number,
        editable=False,
    )
    customer_first_name = models.CharField(max_length=100)
    customer_last_name = models.CharField(max_length=100)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=30)
    shipping_address = models.CharField(max_length=255)
    shipping_city = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)
    customer_note = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    delivery_zone = models.ForeignKey(
        DeliveryZone,
        on_delete=models.PROTECT,
        related_name="orders",
        blank=True,
        null=True,
    )
    delivery_zone_name = models.CharField(max_length=100, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH_ON_DELIVERY,
    )
    payment_fee = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    stock_restored = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number

    @property
    def customer_full_name(self):
        return f"{self.customer_first_name} {self.customer_last_name}".strip()


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=200)
    product_reference = models.CharField(max_length=100)
    unit_price = models.DecimalField(max_digits=10, decimal_places=3)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=3)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    old_status = models.CharField(
        max_length=20,
        choices=Order.Status.choices,
        blank=True,
        null=True,
    )
    new_status = models.CharField(max_length=20, choices=Order.Status.choices)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = "Order status history"
        verbose_name_plural = "Order status histories"

    def __str__(self):
        return f"{self.order.order_number}: {self.old_status or '-'} -> {self.new_status}"


class OrderPaymentHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payment_history",
    )
    old_status = models.CharField(
        max_length=20,
        choices=Order.PaymentStatus.choices,
        blank=True,
        null=True,
    )
    new_status = models.CharField(
        max_length=20,
        choices=Order.PaymentStatus.choices,
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name = "Order payment history"
        verbose_name_plural = "Order payment histories"

    def __str__(self):
        return f"{self.order.order_number}: {self.old_status or '-'} -> {self.new_status}"


class PaymentMethodConfiguration(models.Model):
    payment_method = models.CharField(
        max_length=30,
        choices=Order.PaymentMethod.choices,
        unique=True,
    )
    fee = models.DecimalField(max_digits=10, decimal_places=3)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["payment_method"]

    def __str__(self):
        return self.get_payment_method_display()
