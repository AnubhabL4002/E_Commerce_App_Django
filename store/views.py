from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Product, Category, Cart, CartItem, Order, OrderItem
from .serializers import (
    UserSerializer, RegisterSerializer, ProductSerializer,
    CategorySerializer, CartSerializer, CartItemSerializer, OrderSerializer
)
from . import bank


# ─── AUTH VIEWS ───────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        # Initialize bank balance
        bank.get_balance(user.username)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        # Ensure cart exists
        Cart.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully'})


@api_view(['DELETE'])
def delete_account(request):
    user = request.user
    username = user.username
    user.delete()
    return Response({'message': f'Account "{username}" deleted successfully'})


@api_view(['GET'])
def me(request):
    balance = bank.get_balance(request.user.username)
    data = UserSerializer(request.user).data
    data['balance'] = str(balance)
    return Response(data)


# ─── PRODUCT VIEWS ────────────────────────────────────────────────────────────

class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True)
        q = self.request.query_params.get('q')
        category = self.request.query_params.get('category')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        if category:
            qs = qs.filter(category__slug=category)
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        return qs.select_related('category')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


# ─── CART VIEWS ───────────────────────────────────────────────────────────────

@api_view(['GET'])
def cart_detail(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    serializer = CartSerializer(cart, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
def cart_add(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))

    try:
        product = Product.objects.get(id=product_id, is_active=True)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    if quantity > product.stock:
        return Response({'error': f'Only {product.stock} in stock'}, status=400)

    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        item.quantity += quantity
    else:
        item.quantity = quantity

    if item.quantity > product.stock:
        item.quantity = product.stock
    item.save()

    return Response(CartSerializer(cart, context={'request': request}).data)


@api_view(['PATCH'])
def cart_update(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)

    quantity = int(request.data.get('quantity', 1))
    if quantity <= 0:
        item.delete()
    else:
        if quantity > item.product.stock:
            quantity = item.product.stock
        item.quantity = quantity
        item.save()

    cart = Cart.objects.get(user=request.user)
    return Response(CartSerializer(cart, context={'request': request}).data)


@api_view(['DELETE'])
def cart_remove(request, item_id):
    try:
        item = CartItem.objects.get(id=item_id, cart__user=request.user)
        item.delete()
    except CartItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)

    cart = Cart.objects.get(user=request.user)
    return Response(CartSerializer(cart, context={'request': request}).data)


@api_view(['DELETE'])
def cart_clear(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    cart.items.all().delete()
    return Response(CartSerializer(cart).data)


# ─── ORDER / BUY VIEWS ────────────────────────────────────────────────────────

@api_view(['POST'])
def checkout(request):
    cart, _ = Cart.objects.get_or_create(user=request.user)
    items = cart.items.select_related('product').all()

    if not items.exists():
        return Response({'error': 'Cart is empty'}, status=400)

    total = cart.total

    # Check bank balance
    success, new_balance, error = bank.deduct_balance(request.user.username, total)
    if not success:
        return Response({'error': error}, status=400)

    # Validate stock
    for item in items:
        if item.quantity > item.product.stock:
            bank.add_balance(request.user.username, total)  # refund
            return Response({
                'error': f'Not enough stock for {item.product.name}. '
                         f'Available: {item.product.stock}'
            }, status=400)

    # Create order
    order = Order.objects.create(user=request.user, total_amount=total, status='paid')
    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            quantity=item.quantity,
            price=item.product.price
        )
        # Deduct stock
        item.product.stock -= item.quantity
        item.product.save()

    # Clear cart
    cart.items.all().delete()

    return Response({
        'message': 'Order placed successfully!',
        'order': OrderSerializer(order).data,
        'new_balance': str(new_balance),
        'amount_deducted': str(total)
    })


@api_view(['GET'])
def order_list(request):
    orders = Order.objects.filter(user=request.user).prefetch_related('items__product').order_by('-created_at')
    return Response(OrderSerializer(orders, many=True).data)


@api_view(['GET'])
def balance_view(request):
    bal = bank.get_balance(request.user.username)
    return Response({'username': request.user.username, 'balance': str(bal)})


@api_view(['POST'])
def top_up_balance(request):
    """For demo: add money to balance."""
    amount = float(request.data.get('amount', 100))
    if amount <= 0 or amount > 10000:
        return Response({'error': 'Amount must be between 1 and 10000'}, status=400)
    new_bal = bank.add_balance(request.user.username, amount)
    return Response({'balance': str(new_bal), 'message': f'${amount:.2f} added to your account!'})
