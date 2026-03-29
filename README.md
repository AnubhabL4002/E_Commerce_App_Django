# ◈ NOVA — Full-Stack Django E-Commerce App

A modern, animated e-commerce single-page application built with Django REST Framework on the backend and a pure HTML/CSS/JS SPA on the frontend. Features both **dark and light themes**, JWT-free token auth, a CSV-based bank balance system, and full cart/order management.

---

## ✨ Features

| System | Details |
|---|---|
| **Auth** | Register · Login · Logout · Delete Account · Token-based via DRF |
| **Products** | Grid with images · Category filter pills · Real-time search · Sort |
| **Product Detail** | Modal with image · Description · Stock badge · Quantity picker |
| **Cart** | Add/remove/update items · Live subtotals · Persisted per-user |
| **Checkout** | Deducts from CSV balance · Stock validation · Order created |
| **Orders** | Full order history with item breakdown |
| **Balance** | CSV file per user · Top-up feature · Live balance display in cart |
| **UI** | Dark/Light theme · Skeleton loaders · Animated cards · Toast notifications |

---

## 🚀 Quick Start

### 1. Clone / extract the project

```bash
cd nova-ecommerce    # project root (contains manage.py)
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows (CMD)
venv\Scripts\activate.bat

# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

**requirements.txt includes:**
- `Django==4.2.9`
- `djangorestframework==3.14.0`
- `django-cors-headers==4.3.1`
- `Pillow==10.2.0`

### 4. Apply migrations

```bash
python manage.py makemigrations store
python manage.py migrate
```

### 5. Seed the database (12 products + demo user)

```bash
python manage.py seed
```

This creates:
- 5 categories (Electronics, Clothing, Books, Home & Garden, Sports)
- 12 products with Unsplash preview images
- Demo user: **username:** `demo` **password:** `demo123` **balance:** $1,500

### 6. (Optional) Create a superuser for admin panel

```bash
python manage.py createsuperuser
```

### 7. Run the development server

```bash
python manage.py runserver
```

Open **http://127.0.0.1:8000** in your browser.

Admin panel: **http://127.0.0.1:8000/admin/**

---

## 🗂 Project Structure

```
nova-ecommerce/
├── manage.py
├── requirements.txt
├── bank_balance.csv          ← auto-created on first run
├── db.sqlite3                ← auto-created after migrations
├── .env.example
├── .gitignore
│
├── ecommerce/                ← Django project package
│   ├── settings.py
│   ├── urls.py               ← root URL config
│   ├── wsgi.py
│   └── asgi.py
│
├── store/                    ← main app
│   ├── models.py             ← Product, Category, Cart, CartItem, Order, OrderItem
│   ├── serializers.py        ← DRF serializers for all models
│   ├── views.py              ← all API views (auth, products, cart, orders, balance)
│   ├── urls.py               ← /api/* REST endpoints
│   ├── frontend_urls.py      ← serves the SPA at /
│   ├── bank.py               ← CSV balance read/write utilities
│   ├── admin.py              ← admin registrations
│   ├── apps.py
│   └── management/
│       └── commands/
│           └── seed.py       ← python manage.py seed
│
├── templates/
│   └── store/
│       └── index.html        ← entire SPA (HTML + CSS + JS, ~900 lines)
│
└── static/
    └── images/
        └── placeholder.svg   ← fallback product image
```

---

## 🌐 REST API Endpoints

All API endpoints are prefixed with `/api/`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/` | ❌ | Create account `{username, email, password, password2, first_name?, last_name?}` |
| POST | `/api/auth/login/` | ❌ | Sign in `{username, password}` → returns `{token, user}` |
| POST | `/api/auth/logout/` | ✅ | Invalidate token |
| GET  | `/api/auth/me/` | ✅ | Get current user + balance |
| DELETE | `/api/auth/delete/` | ✅ | Permanently delete account |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products/` | ❌ | List products. Query: `?q=`, `?category=`, `?min_price=`, `?max_price=` |
| GET | `/api/products/<id>/` | ❌ | Get single product |
| GET | `/api/categories/` | ❌ | List all categories |

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart/` | ✅ | Get current user's cart with all items |
| POST | `/api/cart/add/` | ✅ | Add item `{product_id, quantity}` |
| PATCH | `/api/cart/update/<item_id>/` | ✅ | Update qty `{quantity}` (qty ≤ 0 removes item) |
| DELETE | `/api/cart/remove/<item_id>/` | ✅ | Remove single item |
| DELETE | `/api/cart/clear/` | ✅ | Clear entire cart |

### Orders & Checkout

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/checkout/` | ✅ | Place order, deduct balance, clear cart |
| GET | `/api/orders/` | ✅ | List user's order history |

### Bank Balance

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/balance/` | ✅ | Get `{username, balance}` |
| POST | `/api/balance/topup/` | ✅ | Add funds `{amount}` (1–10,000) |

---

## 💰 Bank Balance (CSV System)

The balance system uses a simple CSV file at the project root: `bank_balance.csv`.

```csv
username,balance
demo,1500.00
jane_doe,500.00
```

**How it works:**
- New users automatically get **$500.00** on registration
- On checkout, `bank.deduct_balance()` checks if balance ≥ cart total
- If insufficient → `400 Bad Request` with error message
- If sufficient → deducts amount and saves updated balance
- Top-up endpoint adds to balance (for demo purposes)
- Refunds happen automatically if stock validation fails after deduction

**File location:** configured in `settings.py` as `BANK_BALANCE_FILE`

---

## 🎨 UI Features

### Theme System
- Persistent dark/light toggle (saved to `localStorage`)
- All colors via CSS custom properties → instant full-app theming
- Dark: deep navy/charcoal with purple accents
- Light: soft lavender-white with vivid purple accents

### Animations
- Page-load: `fadeUp` stagger on product cards
- Skeleton loaders during API fetch
- Hover: card lift + image zoom
- Cart badge: `pop` keyframe on update
- Modals: scale + translate entrance
- Toast notifications: slide-in from right

### Keyboard Shortcuts
- `Escape` — close any open modal
- `Ctrl/Cmd + K` — focus search bar

### Product Badges
- 🟣 **New** — first 3 results
- 🟡 **Only N left** — stock ≤ 5
- 🔴 **Out of Stock** — stock = 0 (add button disabled)

---

## 🔧 Configuration

Key settings in `ecommerce/settings.py`:

```python
# Bank CSV file path
BANK_BALANCE_FILE = BASE_DIR / 'bank_balance.csv'

# REST Framework auth
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# CORS (allow all for development)
CORS_ALLOW_ALL_ORIGINS = True
```

---

## 📦 Adding Products via Admin

1. Go to **http://127.0.0.1:8000/admin/**
2. Sign in with your superuser
3. Under **Store → Products**, click **Add Product**
4. Fill in name, description, price, stock, category
5. Either upload an image file **or** paste an image URL in `image_url`
6. Save — it appears on the storefront immediately

---

## 🧪 Testing the API with curl

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123","password2":"pass123","email":"t@t.com"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123"}'
# → copy the token

# Browse products
curl http://localhost:8000/api/products/

# Search
curl "http://localhost:8000/api/products/?q=headphones"

# Add to cart (replace TOKEN)
curl -X POST http://localhost:8000/api/cart/add/ \
  -H "Authorization: Token TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":2}'

# Checkout
curl -X POST http://localhost:8000/api/checkout/ \
  -H "Authorization: Token TOKEN"
```

---

## 🛡 Notes on Production

This app is configured for **development**. For production:

1. Change `SECRET_KEY` to a strong random value
2. Set `DEBUG = False`
3. Set `ALLOWED_HOSTS` to your domain
4. Use PostgreSQL instead of SQLite
5. Set `CORS_ALLOW_ALL_ORIGINS = False` and specify `CORS_ALLOWED_ORIGINS`
6. Replace the CSV balance system with a real payment gateway (Stripe, Razorpay, etc.)
7. Run `python manage.py collectstatic`
8. Serve with Gunicorn + Nginx

---

## 📄 License

MIT — free to use, modify, and distribute.
