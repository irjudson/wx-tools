# Caddy Security Configuration

Drop these blocks into your existing Caddyfile. The app runs on `localhost:7000`.
Replace `yourdomain.com` with your actual domain.

```caddy
yourdomain.com {

    # Block admin routes — accessible locally only
    @admin path /import* /analysis* /explorer* /settings*
    respond @admin 403

    # Block all write API methods
    @writes method POST PUT DELETE PATCH
    respond @writes 403

    # Block FastAPI auto-generated docs
    respond /docs* 403
    respond /redoc* 403
    respond /openapi.json 403

    # Security headers
    header {
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; connect-src 'self'"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }

    # Rate limit public API endpoints
    @publicapi path /api/weather/*
    rate_limit @publicapi {
        zone wx_public {
            key {remote_host}
            events 30
            window 1m
        }
    }

    reverse_proxy localhost:7000
}
```

## Local Admin Access

Access the full app directly at `http://localhost:7000` (or your LAN IP).
Caddy only fronts the public-facing port — bypass it entirely for admin work.

## Vue Router Route Flags

Public routes are marked with `meta.public = true` in `frontend/src/router/index.ts`
for documentation purposes. Real access control is enforced here at Caddy, not the client.
