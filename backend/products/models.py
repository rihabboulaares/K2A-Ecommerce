from django.db import models
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to="categories/",
        blank=True,
        null=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Usage(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):

    class VolumeUnit(models.TextChoices):
        ML = "ML", "ml"
        L = "L", "L"

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    usages = models.ManyToManyField(
        Usage,
        related_name="products",
        blank=True
    )

    name = models.CharField(max_length=200)

    reference = models.CharField(
        max_length=100,
        unique=True
    )

    description = models.TextField(blank=True)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=3
    )

    old_price = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        blank=True,
        null=True
    )

    stock_quantity = models.PositiveIntegerField(default=0)

    volume_value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True
    )

    volume_unit = models.CharField(
        max_length=2,
        choices=VolumeUnit.choices,
        blank=True
    )

    scent = models.CharField(
        max_length=100,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    is_featured = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="products/"
    )

    is_primary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "id"]

    def __str__(self):
        return f"Image - {self.product.name}"


class StockAdjustment(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_adjustments",
    )
    old_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()
    difference = models.IntegerField()
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="stock_adjustments",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.product.reference}: {self.old_quantity} -> {self.new_quantity}"
