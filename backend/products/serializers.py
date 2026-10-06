from rest_framework import serializers

from .models import Category, Product, ProductImage, Usage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "description", "image")
        read_only_fields = fields


class UsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = ("id", "name")
        read_only_fields = fields


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "is_primary")
        read_only_fields = fields


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    usages = UsageSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

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
            "usages",
            "images",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
