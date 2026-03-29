import csv
import os
from decimal import Decimal
from django.conf import settings

BANK_FILE = settings.BANK_BALANCE_FILE


def ensure_bank_file():
    """Create bank balance file if it doesn't exist."""
    if not os.path.exists(BANK_FILE):
        with open(BANK_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['username', 'balance'])
            # default demo user with $1000
            writer.writerow(['demo', '1000.00'])


def get_balance(username):
    ensure_bank_file()
    with open(BANK_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['username'] == username:
                return Decimal(row['balance'])
    # New user gets $500 default
    set_balance(username, Decimal('500.00'))
    return Decimal('500.00')


def set_balance(username, amount):
    ensure_bank_file()
    rows = []
    found = False
    with open(BANK_FILE, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['username'] == username:
                row['balance'] = f"{amount:.2f}"
                found = True
            rows.append(row)

    if not found:
        rows.append({'username': username, 'balance': f"{amount:.2f}"})

    with open(BANK_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['username', 'balance'])
        writer.writeheader()
        writer.writerows(rows)


def deduct_balance(username, amount):
    """Deduct amount from balance. Returns (success, new_balance, error_msg)."""
    current = get_balance(username)
    amount = Decimal(str(amount))
    if current < amount:
        return False, current, f"Insufficient balance. Have ${current:.2f}, need ${amount:.2f}"
    new_balance = current - amount
    set_balance(username, new_balance)
    return True, new_balance, None


def add_balance(username, amount):
    """Add amount to balance (for refunds etc)."""
    current = get_balance(username)
    new_balance = current + Decimal(str(amount))
    set_balance(username, new_balance)
    return new_balance
