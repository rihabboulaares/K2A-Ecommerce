from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from orders.models import DeliveryZone, Order, PaymentMethodConfiguration
from orders.services import change_order_status, mark_order_as_paid
from products.models import Category, Product, StockAdjustment


class AdminAuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        self.normal_user = User.objects.create_user(
            username="client",
            email="client@example.com",
            password="StrongPass123!",
        )

    def login(self, username="admin", password="StrongPass123!"):
        return self.client.post(
            "/api/admin/auth/login/",
            {"username": username, "password": password},
            format="json",
        )

    def authenticate_admin(self):
        response = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response

    def test_admin_login_valid(self):
        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "admin")

    def test_wrong_password_is_refused(self):
        response = self.login(password="wrong")

        self.assertEqual(response.status_code, 401)

    def test_non_staff_user_is_refused(self):
        response = self.login(username="client")

        self.assertEqual(response.status_code, 401)

    def test_dashboard_without_authentication_is_refused(self):
        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, 401)

    def test_dashboard_non_admin_user_is_refused(self):
        self.client.force_authenticate(user=self.normal_user)

        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, 403)

    def test_dashboard_admin_is_accepted(self):
        self.authenticate_admin()

        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, 200)

    def test_me_endpoint_is_protected(self):
        response = self.client.get("/api/admin/auth/me/")

        self.assertEqual(response.status_code, 401)

    def test_me_endpoint_exposes_no_sensitive_data(self):
        self.authenticate_admin()

        response = self.client.get("/api/admin/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "admin")
        self.assertNotIn("password", response.data)
        self.assertNotIn("user_permissions", response.data)
        self.assertNotIn("groups", response.data)


class AdminDashboardApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin_user = User.objects.create_user(
            username="admin",
            password="StrongPass123!",
            is_staff=True,
        )
        self.client.force_authenticate(user=self.admin_user)
        self.category = Category.objects.create(name="Dashboard")

    def create_product(self, reference, stock_quantity, is_active=True):
        return Product.objects.create(
            category=self.category,
            name=f"Produit {reference}",
            reference=reference,
            price=Decimal("10.000"),
            stock_quantity=stock_quantity,
            is_active=is_active,
        )

    def create_order(
        self,
        suffix,
        status=Order.Status.PENDING,
        payment_status=Order.PaymentStatus.PENDING,
        total_amount=Decimal("10.000"),
    ):
        return Order.objects.create(
            order_number=f"CMD-DASH-{suffix}",
            customer_first_name="Amal",
            customer_last_name=f"Client {suffix}",
            customer_email=f"client{suffix}@example.com",
            customer_phone="12345678",
            shipping_address="Rue test",
            shipping_city="Tunis",
            shipping_postal_code="1000",
            subtotal=total_amount,
            total_amount=total_amount,
            status=status,
            payment_status=payment_status,
        )

    def get_dashboard(self):
        return self.client.get("/api/admin/dashboard/")

    def test_product_stats_are_correct(self):
        self.create_product("ACTIVE", stock_quantity=12)
        self.create_product("LOW", stock_quantity=5)
        self.create_product("OUT", stock_quantity=0)
        self.create_product("INACTIVE", stock_quantity=3, is_active=False)

        response = self.get_dashboard()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_products"], 4)
        self.assertEqual(response.data["active_products"], 3)
        self.assertEqual(response.data["low_stock_products"], 2)
        self.assertEqual(response.data["out_of_stock_products"], 1)
        self.assertEqual(response.data["low_stock_threshold"], 5)

    def test_order_stats_are_correct(self):
        self.create_order("1", status=Order.Status.PENDING)
        self.create_order("2", status=Order.Status.PROCESSING)
        self.create_order("3", status=Order.Status.SHIPPED)
        self.create_order("4", status=Order.Status.DELIVERED)
        self.create_order("5", status=Order.Status.CANCELLED)
        self.create_order("6", payment_status=Order.PaymentStatus.PAID)

        response = self.get_dashboard()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_orders"], 6)
        self.assertEqual(response.data["pending_orders"], 2)
        self.assertEqual(response.data["processing_orders"], 1)
        self.assertEqual(response.data["shipped_orders"], 1)
        self.assertEqual(response.data["delivered_orders"], 1)
        self.assertEqual(response.data["cancelled_orders"], 1)
        self.assertEqual(response.data["pending_payments"], 5)
        self.assertEqual(response.data["paid_orders"], 1)

    def test_revenue_collected_counts_only_paid_orders(self):
        self.create_order(
            "PAID",
            payment_status=Order.PaymentStatus.PAID,
            total_amount=Decimal("40.000"),
        )
        self.create_order(
            "PENDING",
            payment_status=Order.PaymentStatus.PENDING,
            total_amount=Decimal("90.000"),
        )

        response = self.get_dashboard()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["revenue_collected"], Decimal("40.000"))

    def test_latest_orders_are_limited_to_five(self):
        for index in range(6):
            self.create_order(str(index))

        response = self.get_dashboard()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["latest_orders"]), 5)
        self.assertEqual(response.data["latest_orders"][0]["order_number"], "CMD-DASH-5")
        self.assertIn("status_display", response.data["latest_orders"][0])
        self.assertNotIn("customer_email", response.data["latest_orders"][0])


class AdminManagementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.admin_user = User.objects.create_user(
            username="admin",
            password="StrongPass123!",
            is_staff=True,
        )
        self.normal_user = User.objects.create_user(
            username="client",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.admin_user)
        self.category = Category.objects.create(name="Admin")
        self.product = Product.objects.create(
            category=self.category,
            name="Glass Pro",
            reference="GP-5L",
            price=Decimal("39.000"),
            stock_quantity=8,
            is_active=True,
        )

    def create_order(self, status=Order.Status.PENDING, payment_status=Order.PaymentStatus.PENDING):
        order = Order.objects.create(
            customer_first_name="Amal",
            customer_last_name="Client",
            customer_email="client@example.com",
            customer_phone="12345678",
            shipping_address="Rue test",
            shipping_city="Tunis",
            shipping_postal_code="1000",
            subtotal=Decimal("78.000"),
            total_amount=Decimal("78.000"),
            status=status,
            payment_status=payment_status,
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_reference=self.product.reference,
            unit_price=self.product.price,
            quantity=2,
            subtotal=Decimal("78.000"),
        )
        return order

    def test_admin_product_list_requires_admin(self):
        self.client.force_authenticate(user=self.normal_user)

        response = self.client.get("/api/admin/products/")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_product(self):
        response = self.client.post(
            "/api/admin/products/",
            {
                "name": "Lamssa",
                "reference": "LAM-1",
                "category_id": self.category.id,
                "price": "12.000",
                "stock_quantity": 10,
                "is_active": True,
                "is_featured": False,
                "usage_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Product.objects.filter(reference="LAM-1").exists())

    def test_product_reference_must_be_unique(self):
        response = self.client.post(
            "/api/admin/products/",
            {
                "name": "Duplicate",
                "reference": self.product.reference,
                "category_id": self.category.id,
                "price": "12.000",
                "stock_quantity": 10,
                "usage_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_product_negative_price_is_refused(self):
        response = self.client.post(
            "/api/admin/products/",
            {
                "name": "Bad",
                "reference": "BAD",
                "category_id": self.category.id,
                "price": "-1.000",
                "stock_quantity": 10,
                "usage_ids": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_stock_adjustment_creates_history(self):
        response = self.client.post(
            f"/api/admin/stock/{self.product.id}/adjust/",
            {"new_quantity": 12, "reason": "Inventaire"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 12)
        self.assertEqual(StockAdjustment.objects.count(), 1)

    def test_stock_negative_adjustment_is_refused(self):
        response = self.client.post(
            f"/api/admin/stock/{self.product.id}/adjust/",
            {"new_quantity": -1, "reason": "Erreur"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_delivery_zone_negative_fee_is_refused(self):
        response = self.client.post(
            "/api/admin/delivery-zones/",
            {"name": "Tunis", "delivery_fee": "-1.000", "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_delivery_zone_update_does_not_change_order_snapshot(self):
        zone = DeliveryZone.objects.create(
            name="Tunis",
            delivery_fee=Decimal("7.000"),
            is_active=True,
        )
        order = self.create_order()
        order.delivery_zone = zone
        order.delivery_zone_name = zone.name
        order.delivery_fee = zone.delivery_fee
        order.save(update_fields=["delivery_zone", "delivery_zone_name", "delivery_fee"])

        response = self.client.patch(
            f"/api/admin/delivery-zones/{zone.id}/",
            {"delivery_fee": "9.000"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.delivery_fee, Decimal("7.000"))

    def test_payment_fee_negative_is_refused(self):
        config = PaymentMethodConfiguration.objects.create(
            payment_method=Order.PaymentMethod.CASH_ON_DELIVERY,
            fee=Decimal("2.000"),
            is_active=True,
        )

        response = self.client.patch(
            f"/api/admin/payment-methods/{config.id}/",
            {"fee": "-1.000"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_order_confirm_uses_business_service(self):
        order = self.create_order()

        with patch("admin_api.views.change_order_status", wraps=change_order_status) as service:
            response = self.client.post(f"/api/admin/orders/{order.id}/confirm/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(service.called)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)

    def test_order_cancel_restores_stock(self):
        order = self.create_order()
        self.product.stock_quantity = 6
        self.product.save(update_fields=["stock_quantity"])

        response = self.client.post(f"/api/admin/orders/{order.id}/cancel/")

        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)

    def test_order_mark_paid_uses_business_service(self):
        order = self.create_order(status=Order.Status.CONFIRMED)

        with patch("admin_api.views.mark_order_as_paid", wraps=mark_order_as_paid) as service:
            response = self.client.post(f"/api/admin/orders/{order.id}/mark-paid/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(service.called)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)

    def test_cancelled_order_cannot_be_paid(self):
        order = self.create_order(status=Order.Status.CANCELLED)

        response = self.client.post(f"/api/admin/orders/{order.id}/mark-paid/")

        self.assertEqual(response.status_code, 400)
