from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.register, name='api-register'),
    path('auth/login/', views.login_view, name='api-login'),
    path('auth/logout/', views.logout_view, name='api-logout'),
    path('auth/me/', views.me, name='api-me'),
    path('auth/delete/', views.delete_account, name='api-delete-account'),

    # Products
    path('products/', views.ProductListView.as_view(), name='api-products'),
    path('products/<int:pk>/', views.ProductDetailView.as_view(), name='api-product-detail'),
    path('categories/', views.CategoryListView.as_view(), name='api-categories'),

    # Cart
    path('cart/', views.cart_detail, name='api-cart'),
    path('cart/add/', views.cart_add, name='api-cart-add'),
    path('cart/update/<int:item_id>/', views.cart_update, name='api-cart-update'),
    path('cart/remove/<int:item_id>/', views.cart_remove, name='api-cart-remove'),
    path('cart/clear/', views.cart_clear, name='api-cart-clear'),

    # Orders
    path('checkout/', views.checkout, name='api-checkout'),
    path('orders/', views.order_list, name='api-orders'),

    # Balance
    path('balance/', views.balance_view, name='api-balance'),
    path('balance/topup/', views.top_up_balance, name='api-topup'),
]
