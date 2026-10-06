from django.contrib import admin

from .models import Category, Product, ProductImage, Usage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("name",)
    readonly_fields = ("created_at",)


@admin.register(Usage)
class UsageAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    ordering = ("name",)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image", "is_primary", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "reference",
        "category",
        "price",
        "stock_quantity",
        "is_active",
        "is_featured",
    )
    list_display_links = ("name", "reference")
    list_editable = ("is_active", "is_featured")
    list_filter = ("category", "is_active", "is_featured", "usages")
    search_fields = ("name", "reference", "description", "scent")
    ordering = ("-created_at",)
    filter_horizontal = ("usages",)
    readonly_fields = ("created_at", "updated_at")
    inlines = (ProductImageInline,)
    fieldsets = (
        (
            "Informations generales",
            {
                "fields": (
                    "name",
                    "reference",
                    "category",
                    "description",
                )
            },
        ),
        (
            "Caracteristiques",
            {
                "fields": (
                    "volume_value",
                    "volume_unit",
                    "scent",
                    "usages",
                )
            },
        ),
        (
            "Prix et stock",
            {
                "fields": (
                    "price",
                    "old_price",
                    "stock_quantity",
                )
            },
        ),
        (
            "Visibilite",
            {
                "fields": (
                    "is_active",
                    "is_featured",
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
