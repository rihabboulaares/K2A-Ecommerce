from django_filters import rest_framework as filters
from rest_framework import viewsets

from .models import Category, Product, Usage
from .serializers import CategorySerializer, ProductSerializer, UsageSerializer


class ProductFilter(filters.FilterSet):
    category = filters.NumberFilter(field_name="category_id")
    is_featured = filters.BooleanFilter()
    scent = filters.CharFilter(lookup_expr="icontains")
    volume_unit = filters.ChoiceFilter(choices=Product.VolumeUnit.choices)
    usage = filters.NumberFilter(field_name="usages__id")
    usages = filters.NumberFilter(field_name="usages__id")

    class Meta:
        model = Product
        fields = (
            "category",
            "is_featured",
            "scent",
            "volume_unit",
            "usage",
            "usages",
        )


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True).order_by("name")


class UsageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UsageSerializer
    queryset = Usage.objects.all().order_by("name")


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    search_fields = ("name", "reference", "description", "scent")
    ordering_fields = ("price", "created_at", "name")
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("usages", "images")
            .distinct()
        )
