from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Category, Cart, CartItem, Order, OrderItem, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 3
    fields = ['image', 'preview', 'is_thumbnail', 'order']
    readonly_fields = ['preview']

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:6px;object-fit:cover">', obj.image.url)
        return "—"
    preview.short_description = "Preview"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'stock', 'category', 'is_active', 'image_count']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'description']
    inlines = [ProductImageInline]

    def image_count(self, obj):
        c = obj.images.count()
        return f"{c} image{'s' if c != 1 else ''}"
    image_count.short_description = "Gallery"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total_amount', 'created_at']
    list_filter = ['status']


admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(OrderItem)
