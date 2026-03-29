from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from store.models import Product, Category, Cart
from rest_framework.authtoken.models import Token
from store import bank


class Command(BaseCommand):
    help = 'Seed the database with sample products and users'

    def handle(self, *args, **kwargs):
        # Categories
        categories_data = [
            ('Electronics', 'electronics'),
            ('Clothing', 'clothing'),
            ('Books', 'books'),
            ('Home & Garden', 'home-garden'),
            ('Sports', 'sports'),
        ]
        categories = {}
        for name, slug in categories_data:
            cat, _ = Category.objects.get_or_create(slug=slug, defaults={'name': name})
            categories[slug] = cat

        # Products with Unsplash image URLs
        products = [
            {
                'name': 'Sony WH-1000XM5 Headphones',
                'description': 'Industry-leading noise canceling headphones with up to 30-hour battery life. Crystal clear hands-free calling with exceptional sound quality.',
                'price': 349.99,
                'stock': 15,
                'category': 'electronics',
                'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
            },
            {
                'name': 'MacBook Pro 14"',
                'description': 'Apple M3 chip with 16GB RAM and 512GB SSD. Stunning Liquid Retina XDR display, all-day battery life.',
                'price': 1999.00,
                'stock': 8,
                'category': 'electronics',
                'image_url': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
            },
            {
                'name': 'iPhone 15 Pro',
                'description': 'Titanium design with A17 Pro chip. Pro camera system with 48MP main camera and Action button.',
                'price': 999.00,
                'stock': 20,
                'category': 'electronics',
                'image_url': 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop',
            },
            {
                'name': 'Nike Air Max 270',
                'description': 'Max cushioning for all-day comfort. Engineered mesh upper with dynamic support. Available in multiple colorways.',
                'price': 129.99,
                'stock': 30,
                'category': 'clothing',
                'image_url': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
            },
            {
                'name': 'Levi\'s 501 Original Jeans',
                'description': 'The original straight fit jean since 1873. Button fly, sturdy denim that gets better with every wear.',
                'price': 69.99,
                'stock': 45,
                'category': 'clothing',
                'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
            },
            {
                'name': 'The Great Gatsby',
                'description': 'F. Scott Fitzgerald\'s timeless classic. A story of decadence, idealism, and the American Dream in the Jazz Age.',
                'price': 12.99,
                'stock': 100,
                'category': 'books',
                'image_url': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
            },
            {
                'name': 'Atomic Habits',
                'description': 'James Clear\'s #1 New York Times bestseller. An easy and proven way to build good habits and break bad ones.',
                'price': 18.99,
                'stock': 75,
                'category': 'books',
                'image_url': 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=400&fit=crop',
            },
            {
                'name': 'Indoor Plant Collection',
                'description': 'Set of 3 beautiful low-maintenance indoor plants. Perfect for home or office. Includes pothos, snake plant, and ZZ plant.',
                'price': 45.00,
                'stock': 25,
                'category': 'home-garden',
                'image_url': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
            },
            {
                'name': 'Scented Candle Set',
                'description': 'Luxury soy wax candles in 3 signature scents: Vanilla & Sandalwood, Lavender Dreams, and Fresh Linen.',
                'price': 34.99,
                'stock': 40,
                'category': 'home-garden',
                'image_url': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
            },
            {
                'name': 'Yoga Mat Pro',
                'description': 'Non-slip 6mm thick yoga mat with alignment lines. Eco-friendly TPE material, sweat resistant and easy to clean.',
                'price': 59.99,
                'stock': 35,
                'category': 'sports',
                'image_url': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
            },
            {
                'name': 'Adjustable Dumbbell Set',
                'description': '5-52.5 lbs adjustable dumbbells. Replace 15 sets of weights. Quick change mechanism for home gym convenience.',
                'price': 299.00,
                'stock': 12,
                'category': 'sports',
                'image_url': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
            },
            {
                'name': 'Samsung 4K Smart TV 55"',
                'description': 'Crystal UHD 4K display with HDR. Smart TV with built-in Netflix, YouTube, and Prime Video. Slim bezel design.',
                'price': 649.99,
                'stock': 10,
                'category': 'electronics',
                'image_url': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop',
            },
        ]

        for p in products:
            cat = categories[p.pop('category')]
            Product.objects.get_or_create(
                name=p['name'],
                defaults={**p, 'category': cat}
            )

        # Demo user
        if not User.objects.filter(username='demo').exists():
            user = User.objects.create_user('demo', 'demo@example.com', 'demo123')
            user.first_name = 'Demo'
            user.last_name = 'User'
            user.save()
            Cart.objects.get_or_create(user=user)
            Token.objects.get_or_create(user=user)
            bank.set_balance('demo', 1500.00)
            self.stdout.write(self.style.SUCCESS('Created demo user (username: demo, password: demo123)'))

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(products)} products and {len(categories_data)} categories!'))
