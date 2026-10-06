from django.core.exceptions import ValidationError
from django.db import transaction

from products.models import Product
from .models import Order, OrderPaymentHistory, OrderStatusHistory


ALLOWED_STATUS_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PROCESSING, Order.Status.CANCELLED},
    Order.Status.PROCESSING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED},
    Order.Status.DELIVERED: set(),
    Order.Status.CANCELLED: set(),
}


class OrderStatusTransitionError(ValidationError):
    pass


class OrderPaymentError(ValidationError):
    pass


def validate_order_status_transition(old_status, new_status):
    if old_status == new_status:
        return

    allowed_statuses = ALLOWED_STATUS_TRANSITIONS.get(old_status, set())
    if new_status not in allowed_statuses:
        raise OrderStatusTransitionError(
            f"Transition invalide : {old_status} vers {new_status}."
        )


def create_initial_status_history(order):
    OrderStatusHistory.objects.create(
        order=order,
        old_status=None,
        new_status=order.status,
        note="Création de la commande.",
    )


def change_order_status(order, new_status, note=""):
    with transaction.atomic():
        locked_order = (
            Order.objects.select_for_update()
            .prefetch_related("items")
            .get(pk=order.pk)
        )
        old_status = locked_order.status

        validate_order_status_transition(old_status, new_status)

        if old_status == new_status:
            return locked_order

        if new_status == Order.Status.CANCELLED and not locked_order.stock_restored:
            product_ids = [item.product_id for item in locked_order.items.all()]
            products = {
                product.id: product
                for product in Product.objects.select_for_update().filter(
                    id__in=product_ids
                )
            }

            for item in locked_order.items.all():
                product = products[item.product_id]
                product.stock_quantity += item.quantity
                product.save(update_fields=["stock_quantity"])

            locked_order.stock_restored = True

        locked_order.status = new_status
        locked_order.save(update_fields=["status", "stock_restored", "updated_at"])
        OrderStatusHistory.objects.create(
            order=locked_order,
            old_status=old_status,
            new_status=new_status,
            note=note,
        )

    return locked_order


def create_initial_payment_history(order):
    OrderPaymentHistory.objects.create(
        order=order,
        old_status=None,
        new_status=order.payment_status,
        note="Paiement à la livraison en attente.",
    )


def mark_order_as_paid(order, note=""):
    with transaction.atomic():
        locked_order = Order.objects.select_for_update().get(pk=order.pk)

        if locked_order.status == Order.Status.CANCELLED:
            raise OrderPaymentError(
                "Une commande annulée ne peut pas être marquée comme payée."
            )

        if locked_order.payment_status == Order.PaymentStatus.PAID:
            return locked_order

        old_status = locked_order.payment_status
        locked_order.payment_status = Order.PaymentStatus.PAID
        locked_order.save(update_fields=["payment_status", "updated_at"])
        OrderPaymentHistory.objects.create(
            order=locked_order,
            old_status=old_status,
            new_status=Order.PaymentStatus.PAID,
            note=note,
        )

    return locked_order
