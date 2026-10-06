from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models import (
    DeliveryZone,
    Order,
    OrderItem,
    OrderPaymentHistory,
    OrderStatusHistory,
    PaymentMethodConfiguration,
)
from .services import (
    change_order_status,
    mark_order_as_paid,
    validate_order_status_transition,
)


class OrderAdminForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = "__all__"

    def clean_status(self):
        new_status = self.cleaned_data["status"]

        if not self.instance.pk:
            return new_status

        old_status = Order.objects.get(pk=self.instance.pk).status
        try:
            validate_order_status_transition(old_status, new_status)
        except ValidationError as exc:
            raise forms.ValidationError(exc.messages[0])

        return new_status


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = (
        "product",
        "product_name",
        "product_reference",
        "unit_price",
        "quantity",
        "subtotal",
    )
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ("old_status", "new_status", "note", "created_at")
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


class OrderPaymentHistoryInline(admin.TabularInline):
    model = OrderPaymentHistory
    extra = 0
    can_delete = False
    readonly_fields = ("old_status", "new_status", "note", "created_at")
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    form = OrderAdminForm
    list_display = (
        "order_number",
        "customer_full_name",
        "customer_phone",
        "delivery_zone_name",
        "total_amount",
        "status",
        "payment_method",
        "payment_status",
        "stock_restored",
        "created_at",
    )
    list_filter = (
        "status",
        "payment_method",
        "payment_status",
        "stock_restored",
        "created_at",
    )
    search_fields = (
        "order_number",
        "customer_first_name",
        "customer_last_name",
        "customer_email",
        "customer_phone",
    )
    readonly_fields = (
        "order_number",
        "subtotal",
        "delivery_zone",
        "delivery_zone_name",
        "delivery_fee",
        "total_amount",
        "payment_method",
        "payment_fee",
        "payment_status",
        "stock_restored",
        "created_at",
        "updated_at",
    )
    actions = (
        "confirm_selected_orders",
        "prepare_selected_orders",
        "ship_selected_orders",
        "deliver_selected_orders",
        "cancel_selected_orders",
        "mark_selected_orders_as_paid",
    )
    inlines = (OrderItemInline, OrderStatusHistoryInline, OrderPaymentHistoryInline)
    fieldsets = (
        (
            "Commande",
            {
                "fields": (
                    "order_number",
                    "status",
                )
            },
        ),
        (
            "Client",
            {
                "fields": (
                    "customer_first_name",
                    "customer_last_name",
                    "customer_email",
                    "customer_phone",
                )
            },
        ),
        (
            "Livraison",
            {
                "fields": (
                    "shipping_address",
                    "shipping_city",
                    "shipping_postal_code",
                    "delivery_zone",
                    "delivery_zone_name",
                    "customer_note",
                )
            },
        ),
        (
            "Montants",
            {
                "fields": (
                    "subtotal",
                    "delivery_fee",
                    "payment_fee",
                    "total_amount",
                )
            },
        ),
        (
            "Paiement",
            {
                "fields": (
                    "payment_method",
                    "payment_status",
                )
            },
        ),
        (
            "Suivi",
            {
                "fields": (
                    "stock_restored",
                )
            },
        ),
        (
            "Dates",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return

        old_order = Order.objects.get(pk=obj.pk)
        requested_status = obj.status
        obj.status = old_order.status
        super().save_model(request, obj, form, change)

        if requested_status != old_order.status:
            try:
                change_order_status(
                    obj,
                    requested_status,
                    note=f"Changement effectué depuis Django Admin par {request.user}.",
                )
                messages.success(
                    request,
                    self.get_status_success_message(obj, requested_status),
                )
            except ValidationError as exc:
                messages.error(request, exc.messages[0])

    def apply_status_action(self, request, queryset, target_status):
        processed_count = 0
        refused_count = 0

        for order in queryset:
            try:
                updated_order = change_order_status(
                    order,
                    target_status,
                    note=f"Action effectuée depuis Django Admin par {request.user}.",
                )
                if updated_order.status == target_status:
                    processed_count += 1
                    self.message_user(
                        request,
                        self.get_status_success_message(updated_order, target_status),
                        level=messages.SUCCESS,
                    )
            except ValidationError as exc:
                refused_count += 1
                self.message_user(
                    request,
                    f"{order.order_number} : {exc.messages[0]}",
                    level=messages.ERROR,
                )

        self.message_user(
            request,
            f"{processed_count} commande(s) traitée(s), {refused_count} refusée(s).",
            level=messages.INFO,
        )

    def get_status_success_message(self, order, target_status):
        messages_by_status = {
            Order.Status.CONFIRMED: f"Commande {order.order_number} confirmée.",
            Order.Status.PROCESSING: (
                f"Commande {order.order_number} passée en préparation."
            ),
            Order.Status.SHIPPED: f"Commande {order.order_number} marquée comme expédiée.",
            Order.Status.DELIVERED: f"Commande {order.order_number} marquée comme livrée.",
            Order.Status.CANCELLED: (
                f"Commande {order.order_number} annulée et stock restauré."
            ),
        }
        return messages_by_status.get(
            target_status,
            f"Commande {order.order_number} mise à jour.",
        )

    @admin.action(description="Confirmer la commande")
    def confirm_selected_orders(self, request, queryset):
        self.apply_status_action(request, queryset, Order.Status.CONFIRMED)

    @admin.action(description="Passer en préparation")
    def prepare_selected_orders(self, request, queryset):
        self.apply_status_action(request, queryset, Order.Status.PROCESSING)

    @admin.action(description="Marquer comme expédiée")
    def ship_selected_orders(self, request, queryset):
        self.apply_status_action(request, queryset, Order.Status.SHIPPED)

    @admin.action(description="Marquer comme livrée")
    def deliver_selected_orders(self, request, queryset):
        self.apply_status_action(request, queryset, Order.Status.DELIVERED)

    @admin.action(description="Annuler la commande")
    def cancel_selected_orders(self, request, queryset):
        self.apply_status_action(request, queryset, Order.Status.CANCELLED)

    @admin.action(description="Marquer comme payé")
    def mark_selected_orders_as_paid(self, request, queryset):
        paid_count = 0
        refused_count = 0

        for order in queryset:
            try:
                if order.payment_status == Order.PaymentStatus.PAID:
                    refused_count += 1
                    self.message_user(
                        request,
                        f"{order.order_number} : paiement déjà encaissé.",
                        level=messages.WARNING,
                    )
                    continue

                updated_order = mark_order_as_paid(
                    order,
                    note=f"Paiement confirmé depuis Django Admin par {request.user}.",
                )
                if updated_order.payment_status == Order.PaymentStatus.PAID:
                    paid_count += 1
                    self.message_user(
                        request,
                        (
                            "Paiement de la commande "
                            f"{updated_order.order_number} marqué comme encaissé."
                        ),
                        level=messages.SUCCESS,
                    )
            except ValidationError as exc:
                refused_count += 1
                self.message_user(
                    request,
                    f"{order.order_number} : {exc.messages[0]}",
                    level=messages.ERROR,
                )

        self.message_user(
            request,
            f"{paid_count} paiement(s) traité(s), {refused_count} refusé(s).",
            level=messages.INFO,
        )


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "delivery_fee", "is_active", "updated_at")
    list_editable = ("delivery_fee", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(PaymentMethodConfiguration)
class PaymentMethodConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "payment_method",
        "fee",
        "is_active",
        "updated_at",
    )
    list_editable = ("fee", "is_active")
    list_filter = ("payment_method", "is_active")
    readonly_fields = ("created_at", "updated_at")
