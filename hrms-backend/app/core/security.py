from jose import jwt, JWTError
from fastapi import HTTPException, status
import httpx
import traceback
from app.config import settings

# Global cache for JWKS to avoid fetching it on every request
_jwks_cache = None

def get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            response = httpx.get(url, timeout=5.0)
            response.raise_for_status()
            _jwks_cache = response.json()
        except Exception as e:
            print(f"Failed to fetch JWKS from {url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not fetch auth provider signing keys."
            )
    return _jwks_cache

def verify_supabase_jwt(token: str) -> dict:
    """
    Decodes and verifies a JWT token from Supabase.
    Supports both HS256 (via local secret) and ES256/RS256 (via JWKS).
    Throws HTTP 401 if token validation fails.
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        
        if not alg:
            raise JWTError("Missing 'alg' in token header")

        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            return payload
            
        elif alg in ("ES256", "RS256"):
            jwks = get_jwks()
            kid = unverified_header.get("kid")
            if not kid:
                raise JWTError("Missing 'kid' in token header")
                
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if not key:
                # Try refreshing JWKS cache once
                global _jwks_cache
                _jwks_cache = None
                jwks = get_jwks()
                key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
                
            if not key:
                raise JWTError(f"Signing key with kid '{kid}' not found in JWKS")
                
            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                audience="authenticated"
            )
            return payload
            
        else:
            raise JWTError(f"Unsupported token signing algorithm: {alg}")

    except JWTError as e:
        print("--- JWT VALIDATION FAILURE ---")
        print(f"Error details: {str(e)}")
        try:
            print(f"Unverified Header: {jwt.get_unverified_header(token)}")
        except Exception as header_err:
            print(f"Failed to read header: {header_err}")
        traceback.print_exc()
        print("------------------------------")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


