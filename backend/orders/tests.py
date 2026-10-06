from decimal import Decimal
from unittest.mock import patch

from django.contrib import admin
from django.contrib.messages import constants as message_constants
from django.test import RequestFactory
from django.test import TestCase
from rest_framework.test import APIClient

from products.models import Category, Product
from .admin import OrderAdmin, OrderItemInline, OrderPaymentHistoryInline, OrderStatusHistoryInline
from .models import (
    DeliveryZone,
    Order,
    OrderPaymentHistory,
    OrderStatusHistory,
    PaymentMethodConfiguration,
)
from .services import (
    OrderPaymentError,
    OrderStatusTransitionError,
    change_order_status,
    mark_order_as_paid,
)


class OrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Test")
        self.product = Product.objects.create(
            category=self.category,
            name="Produit test",
            reference="REF-TEST",
            price=Decimal("12.500"),
            stock_quantity=10,
            is_active=True,
        )
        self.delivery_zone = DeliveryZone.objects.create(
            name="Tunis",
            delivery_fee=Decimal("7.000"),
            is_active=True,
        )
        self.payment_config = PaymentMethodConfiguration.objects.create(
            payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
            fee=Decimal("2.000"),
            is_active=True,
        )
        self.payload = {
            "customer_first_name": "Amal",
            "customer_last_name": "Client",
            "customer_email": "client@example.com",
            "customer_phone": "12345678",
            "shipping_address": "Rue test",
            "shipping_city": "Tunis",
            "shipping_postal_code": "1000",
            "delivery_zone_id": self.delivery_zone.id,
            "customer_note": "",
            "items": [
                {
                    "product_id": self.product.id,
                    "quantity": 2,
                }
            ],
        }

    def post_order(self, payload=None):
        return self.client.post("/api/orders/", payload or self.payload, format="json")

    def test_create_valid_order(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        self.assertTrue(response.data["order_number"].startswith("CMD-"))

    def test_backend_recalculates_price(self):
        payload = {
            **self.payload,
            "subtotal": "0.001",
            "total_amount": "0.001",
            "items": [
                {
                    "product_id": self.product.id,
                    "quantity": 2,
                    "unit_price": "0.001",
                    "subtotal": "0.001",
                }
            ],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["subtotal"], "25.000")
        self.assertEqual(response.data["total_amount"], "34.000")

    def test_stock_is_decreased(self):
        self.post_order()
        self.product.refresh_from_db()

        self.assertEqual(self.product.stock_quantity, 8)

    def test_unknown_product_is_rejected(self):
        payload = {
            **self.payload,
            "items": [{"product_id": 999999, "quantity": 1}],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_inactive_product_is_rejected(self):
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])

        response = self.post_order()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_insufficient_stock_is_rejected(self):
        payload = {
            **self.payload,
            "items": [{"product_id": self.product.id, "quantity": 11}],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)

    def test_zero_quantity_is_rejected(self):
        payload = {
            **self.payload,
            "items": [{"product_id": self.product.id, "quantity": 0}],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)

    def test_negative_quantity_is_rejected(self):
        payload = {
            **self.payload,
            "items": [{"product_id": self.product.id, "quantity": -1}],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)

    def test_empty_items_are_rejected(self):
        payload = {
            **self.payload,
            "items": [],
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)

    def test_post_is_allowed(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)

    def test_order_list_get_is_not_public(self):
        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 405)

    def test_initial_status_history_is_created(self):
        self.post_order()
        order = Order.objects.get()

        history = order.status_history.get()
        self.assertIsNone(history.old_status)
        self.assertEqual(history.new_status, Order.Status.PENDING)

    def test_new_order_uses_cash_on_delivery(self):
        self.post_order()
        order = Order.objects.get()

        self.assertEqual(order.payment_method, Order.PaymentMethod.CASH_ON_DELIVERY)

    def test_new_order_payment_status_is_pending(self):
        self.post_order()
        order = Order.objects.get()

        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_client_cannot_mark_new_order_as_paid(self):
        payload = {
            **self.payload,
            "payment_status": Order.PaymentStatus.PAID,
        }

        response = self.post_order(payload)
        order = Order.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_order_response_contains_payment_information(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["payment_method"],
            Order.PaymentMethod.CASH_ON_DELIVERY,
        )
        self.assertEqual(response.data["payment_method_display"], "Paiement à la livraison")
        self.assertEqual(response.data["payment_status"], Order.PaymentStatus.PENDING)
        self.assertEqual(response.data["payment_status_display"], "En attente")

    def test_initial_payment_history_is_created(self):
        self.post_order()
        order = Order.objects.get()

        history = order.payment_history.get()
        self.assertIsNone(history.old_status)
        self.assertEqual(history.new_status, Order.PaymentStatus.PENDING)

    def test_delivery_zone_can_be_created(self):
        zone = DeliveryZone.objects.create(
            name="Ariana",
            delivery_fee=Decimal("5.000"),
            is_active=True,
        )

        self.assertEqual(str(zone), "Ariana")

    def test_delivery_zone_api_returns_only_active_zones(self):
        DeliveryZone.objects.create(
            name="Inactive",
            delivery_fee=Decimal("9.000"),
            is_active=False,
        )

        response = self.client.get("/api/delivery-zones/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Tunis")

    def test_delivery_zone_api_does_not_allow_public_write(self):
        response = self.client.post(
            "/api/delivery-zones/",
            {"name": "Sfax", "delivery_fee": "8.000"},
            format="json",
        )

        self.assertEqual(response.status_code, 405)

    def test_order_with_active_zone_uses_zone_snapshot(self):
        response = self.post_order()
        order = Order.objects.get()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(order.delivery_zone_name, "Tunis")
        self.assertEqual(order.delivery_fee, Decimal("7.000"))

    def test_inactive_delivery_zone_is_rejected(self):
        self.delivery_zone.is_active = False
        self.delivery_zone.save(update_fields=["is_active"])

        response = self.post_order()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_unknown_delivery_zone_is_rejected(self):
        payload = {
            **self.payload,
            "delivery_zone_id": 999999,
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_delivery_fee_comes_from_database(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["delivery_fee"], "7.000")

    def test_payment_fee_comes_from_database(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["payment_fee"], "2.000")

    def test_total_amount_includes_all_backend_fees(self):
        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["subtotal"], "25.000")
        self.assertEqual(response.data["delivery_fee"], "7.000")
        self.assertEqual(response.data["payment_fee"], "2.000")
        self.assertEqual(response.data["total_amount"], "34.000")

    def test_malicious_amounts_are_ignored(self):
        payload = {
            **self.payload,
            "delivery_fee": "0.000",
            "payment_fee": "0.000",
            "total_amount": "1.000",
        }

        response = self.post_order(payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["delivery_fee"], "7.000")
        self.assertEqual(response.data["payment_fee"], "2.000")
        self.assertEqual(response.data["total_amount"], "34.000")

    def test_changing_zone_fee_does_not_change_existing_order_snapshot(self):
        self.post_order()
        order = Order.objects.get()
        self.delivery_zone.delivery_fee = Decimal("11.000")
        self.delivery_zone.save(update_fields=["delivery_fee"])
        order.refresh_from_db()

        self.assertEqual(order.delivery_fee, Decimal("7.000"))

    def test_changing_payment_fee_does_not_change_existing_order_snapshot(self):
        self.post_order()
        order = Order.objects.get()
        self.payment_config.fee = Decimal("4.000")
        self.payment_config.save(update_fields=["fee"])
        order.refresh_from_db()

        self.assertEqual(order.payment_fee, Decimal("2.000"))

    def test_new_order_uses_new_configured_fees(self):
        self.post_order()
        self.delivery_zone.delivery_fee = Decimal("11.000")
        self.delivery_zone.save(update_fields=["delivery_fee"])
        self.payment_config.fee = Decimal("4.000")
        self.payment_config.save(update_fields=["fee"])
        self.product.stock_quantity = 10
        self.product.save(update_fields=["stock_quantity"])

        response = self.post_order()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["delivery_fee"], "11.000")
        self.assertEqual(response.data["payment_fee"], "4.000")
        self.assertEqual(response.data["total_amount"], "40.000")

    def test_inactive_cash_on_delivery_configuration_is_rejected(self):
        self.payment_config.is_active = False
        self.payment_config.save(update_fields=["is_active"])

        response = self.post_order()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_payment_methods_api_returns_active_configuration(self):
        response = self.client.get("/api/payment-methods/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["payment_method"], Order.PaymentMethod.CASH_ON_DELIVERY)
        self.assertEqual(response.data[0]["fee"], "2.000")

    def test_payment_methods_api_does_not_allow_public_write(self):
        response = self.client.post(
            "/api/payment-methods/",
            {
                "payment_method": Order.PaymentMethod.CASH_ON_DELIVERY,
                "fee": "0.000",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 405)


class OrderStatusTransitionTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Test")
        self.product = Product.objects.create(
            category=self.category,
            name="Produit test",
            reference="REF-STATUS",
            price=Decimal("12.500"),
            stock_quantity=8,
            is_active=True,
        )
        self.order = Order.objects.create(
            customer_first_name="Amal",
            customer_last_name="Client",
            customer_email="client@example.com",
            customer_phone="12345678",
            shipping_address="Rue test",
            shipping_city="Tunis",
            shipping_postal_code="1000",
            subtotal=Decimal("25.000"),
            total_amount=Decimal("25.000"),
        )
        self.order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_reference=self.product.reference,
            unit_price=self.product.price,
            quantity=2,
            subtotal=Decimal("25.000"),
        )
        OrderStatusHistory.objects.create(
            order=self.order,
            old_status=None,
            new_status=Order.Status.PENDING,
        )

    def change_status(self, new_status):
        self.order = change_order_status(self.order, new_status)
        self.order.refresh_from_db()
        return self.order

    def assert_transition_allowed(self, start_status, end_status):
        self.order.status = start_status
        self.order.stock_restored = False
        self.order.save(update_fields=["status", "stock_restored"])

        self.change_status(end_status)

        self.assertEqual(self.order.status, end_status)

    def assert_transition_refused(self, start_status, end_status):
        self.order.status = start_status
        self.order.stock_restored = False
        self.order.save(update_fields=["status", "stock_restored"])
        self.product.stock_quantity = 8
        self.product.save(update_fields=["stock_quantity"])

        with self.assertRaises(OrderStatusTransitionError):
            change_order_status(self.order, end_status)

        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, start_status)
        self.assertEqual(self.product.stock_quantity, 8)

    def test_pending_to_confirmed_allowed(self):
        self.assert_transition_allowed(Order.Status.PENDING, Order.Status.CONFIRMED)

    def test_confirmed_to_processing_allowed(self):
        self.assert_transition_allowed(Order.Status.CONFIRMED, Order.Status.PROCESSING)

    def test_processing_to_shipped_allowed(self):
        self.assert_transition_allowed(Order.Status.PROCESSING, Order.Status.SHIPPED)

    def test_shipped_to_delivered_allowed(self):
        self.assert_transition_allowed(Order.Status.SHIPPED, Order.Status.DELIVERED)

    def test_pending_to_cancelled_allowed(self):
        self.assert_transition_allowed(Order.Status.PENDING, Order.Status.CANCELLED)

    def test_confirmed_to_cancelled_allowed(self):
        self.assert_transition_allowed(Order.Status.CONFIRMED, Order.Status.CANCELLED)

    def test_processing_to_cancelled_allowed(self):
        self.assert_transition_allowed(Order.Status.PROCESSING, Order.Status.CANCELLED)

    def test_shipped_to_cancelled_refused(self):
        self.assert_transition_refused(Order.Status.SHIPPED, Order.Status.CANCELLED)

    def test_delivered_to_cancelled_refused(self):
        self.assert_transition_refused(Order.Status.DELIVERED, Order.Status.CANCELLED)

    def test_cancelled_to_other_status_refused(self):
        self.assert_transition_refused(Order.Status.CANCELLED, Order.Status.PENDING)

    def test_delivered_to_other_status_refused(self):
        self.assert_transition_refused(Order.Status.DELIVERED, Order.Status.PROCESSING)

    def test_cancellation_restores_stock(self):
        self.change_status(Order.Status.CANCELLED)
        self.product.refresh_from_db()

        self.assertEqual(self.product.stock_quantity, 10)
        self.assertTrue(self.order.stock_restored)

    def test_second_cancellation_does_not_restore_stock_twice(self):
        self.change_status(Order.Status.CANCELLED)
        self.change_status(Order.Status.CANCELLED)
        self.product.refresh_from_db()

        self.assertEqual(self.product.stock_quantity, 10)

    def test_history_created_on_status_change(self):
        self.change_status(Order.Status.CONFIRMED)

        history = self.order.status_history.order_by("-created_at", "-id").first()
        self.assertEqual(history.old_status, Order.Status.PENDING)
        self.assertEqual(history.new_status, Order.Status.CONFIRMED)

    def test_invalid_transition_does_not_change_status_or_stock(self):
        self.assert_transition_refused(Order.Status.PENDING, Order.Status.DELIVERED)

    def test_restore_error_rolls_back_status_and_stock(self):
        with patch.object(Product, "save", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                change_order_status(self.order, Order.Status.CANCELLED)

        self.order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PENDING)
        self.assertFalse(self.order.stock_restored)
        self.assertEqual(self.product.stock_quantity, 8)


class OrderPaymentTests(TestCase):
    def setUp(self):
        self.order = Order.objects.create(
            customer_first_name="Amal",
            customer_last_name="Client",
            customer_email="client@example.com",
            customer_phone="12345678",
            shipping_address="Rue test",
            shipping_city="Tunis",
            shipping_postal_code="1000",
            subtotal=Decimal("25.000"),
            total_amount=Decimal("25.000"),
        )

    def test_active_order_can_be_marked_as_paid(self):
        mark_order_as_paid(self.order)
        self.order.refresh_from_db()

        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)

    def test_already_paid_order_has_no_extra_effect(self):
        mark_order_as_paid(self.order)
        mark_order_as_paid(self.order)

        self.assertEqual(
            OrderPaymentHistory.objects.filter(
                order=self.order,
                old_status=Order.PaymentStatus.PENDING,
                new_status=Order.PaymentStatus.PAID,
            ).count(),
            1,
        )

    def test_cancelled_order_cannot_be_marked_as_paid(self):
        self.order.status = Order.Status.CANCELLED
        self.order.save(update_fields=["status"])

        with self.assertRaises(OrderPaymentError):
            mark_order_as_paid(self.order)

        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)


class DummyMessages:
    def __init__(self):
        self.messages = []

    def add(self, level, message, extra_tags=""):
        self.messages.append((level, str(message), extra_tags))


class OrderAdminActionTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = OrderAdmin(Order, admin.site)
        self.category = Category.objects.create(name="Admin")
        self.product = Product.objects.create(
            category=self.category,
            name="Produit admin",
            reference="REF-ADMIN",
            price=Decimal("12.500"),
            stock_quantity=8,
            is_active=True,
        )
        self.order = self.create_order()

    def create_order(self, status=Order.Status.PENDING, payment_status=Order.PaymentStatus.PENDING):
        order = Order.objects.create(
            customer_first_name="Amal",
            customer_last_name="Client",
            customer_email="client@example.com",
            customer_phone="12345678",
            shipping_address="Rue test",
            shipping_city="Tunis",
            shipping_postal_code="1000",
            subtotal=Decimal("25.000"),
            delivery_zone_name="Tunis",
            delivery_fee=Decimal("7.000"),
            payment_fee=Decimal("2.000"),
            total_amount=Decimal("34.000"),
            status=status,
            payment_status=payment_status,
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_reference=self.product.reference,
            unit_price=self.product.price,
            quantity=2,
            subtotal=Decimal("25.000"),
        )
        return order

    def request(self):
        request = self.factory.post("/admin/orders/order/")
        request.user = "admin"
        request._messages = DummyMessages()
        return request

    def queryset_for(self, *orders):
        return Order.objects.filter(id__in=[order.id for order in orders])

    def test_admin_confirm_pending_order(self):
        self.admin.confirm_selected_orders(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    def test_admin_prepare_confirmed_order(self):
        self.order.status = Order.Status.CONFIRMED
        self.order.save(update_fields=["status"])

        self.admin.prepare_selected_orders(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.PROCESSING)

    def test_admin_ship_processing_order(self):
        self.order.status = Order.Status.PROCESSING
        self.order.save(update_fields=["status"])

        self.admin.ship_selected_orders(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.SHIPPED)

    def test_admin_deliver_shipped_order(self):
        self.order.status = Order.Status.SHIPPED
        self.order.save(update_fields=["status"])

        self.admin.deliver_selected_orders(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.DELIVERED)

    def test_admin_cancel_pending_order_restores_stock(self):
        self.admin.cancel_selected_orders(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.CANCELLED)
        self.assertTrue(self.order.stock_restored)
        self.assertEqual(self.product.stock_quantity, 10)

    def test_admin_invalid_action_is_refused(self):
        self.order.status = Order.Status.SHIPPED
        self.order.save(update_fields=["status"])

        request = self.request()
        self.admin.cancel_selected_orders(request, self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.status, Order.Status.SHIPPED)
        self.assertTrue(
            any(level == message_constants.ERROR for level, _, _ in request._messages.messages)
        )

    def test_admin_cancelled_order_cannot_be_paid(self):
        self.order.status = Order.Status.CANCELLED
        self.order.save(update_fields=["status"])

        self.admin.mark_selected_orders_as_paid(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)

    def test_admin_active_order_can_be_marked_paid(self):
        self.admin.mark_selected_orders_as_paid(self.request(), self.queryset_for(self.order))
        self.order.refresh_from_db()

        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)

    def test_admin_double_payment_has_no_extra_paid_history(self):
        self.admin.mark_selected_orders_as_paid(self.request(), self.queryset_for(self.order))
        self.admin.mark_selected_orders_as_paid(self.request(), self.queryset_for(self.order))

        self.assertEqual(
            OrderPaymentHistory.objects.filter(
                order=self.order,
                old_status=Order.PaymentStatus.PENDING,
                new_status=Order.PaymentStatus.PAID,
            ).count(),
            1,
        )

    def test_admin_status_actions_use_business_service(self):
        with patch("orders.admin.change_order_status", wraps=change_order_status) as service:
            self.admin.confirm_selected_orders(self.request(), self.queryset_for(self.order))

        self.assertTrue(service.called)

    def test_financial_snapshots_are_readonly(self):
        for field in (
            "subtotal",
            "delivery_zone_name",
            "delivery_fee",
            "payment_method",
            "payment_fee",
            "total_amount",
        ):
            self.assertIn(field, self.admin.readonly_fields)

    def test_order_item_inline_is_readonly(self):
        inline = OrderItemInline(Order, admin.site)

        self.assertFalse(inline.can_delete)
        self.assertFalse(inline.has_add_permission(self.request(), self.order))
        self.assertIn("unit_price", inline.readonly_fields)
        self.assertIn("subtotal", inline.readonly_fields)

    def test_history_inlines_are_readonly(self):
        status_inline = OrderStatusHistoryInline(Order, admin.site)
        payment_inline = OrderPaymentHistoryInline(Order, admin.site)

        self.assertFalse(status_inline.can_delete)
        self.assertFalse(payment_inline.can_delete)
        self.assertFalse(status_inline.has_add_permission(self.request(), self.order))
        self.assertFalse(payment_inline.has_add_permission(self.request(), self.order))
