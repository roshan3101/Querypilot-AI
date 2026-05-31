import base64
import hashlib
from app.core.config import settings


def _get_key() -> bytes:
    return hashlib.sha256(settings.SECRET_KEY.encode()).digest()[:16]


def encrypt_password(plain: str) -> str:
    key = _get_key()
    encoded = plain.encode()
    result = bytes([encoded[i] ^ key[i % len(key)] for i in range(len(encoded))])
    return base64.urlsafe_b64encode(result).decode()


def decrypt_password(encrypted: str) -> str:
    key = _get_key()
    decoded = base64.urlsafe_b64decode(encrypted.encode())
    result = bytes([decoded[i] ^ key[i % len(key)] for i in range(len(decoded))])
    return result.decode()
