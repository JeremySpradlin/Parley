from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize the limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100 per minute"]) 