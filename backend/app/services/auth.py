"""Authentication helpers — password hashing and JWT management.

Uses only stdlib (no cryptography dependency).
JWT is implemented manually with HMAC-SHA256.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from app.config import get_settings

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a random salt."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against a salted hash."""
    if "$" not in hashed:
        return False
    salt, stored_hash = hashed.split("$", 1)
    h = hashlib.sha256((salt + plain).encode()).hexdigest()
    return hmac.compare_digest(h, stored_hash)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(user_id: str) -> str:
    """Create a HS256 JWT token."""
    secret = get_settings().secret_key
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = _b64url_encode(json.dumps({"sub": user_id, "exp": int(exp.timestamp())}).encode())
    signing_input = f"{header}.{payload}"
    signature = _b64url_encode(
        hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    )
    return f"{signing_input}.{signature}"


def decode_access_token(token: str) -> str | None:
    """Decode a HS256 JWT and return user_id, or None if invalid/expired."""
    try:
        secret = get_settings().secret_key
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = _b64url_encode(
            hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(signature_b64, expected_sig):
            return None
        # Decode payload
        payload = json.loads(_b64url_decode(payload_b64))
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None
        return payload.get("sub")
    except Exception:
        return None
