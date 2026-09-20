## Auth Service - Helper

GET /api/v1/admin/accounts
POST /api/v1/admin/accounts
GET /api/v1/admin/accounts/{accountId}
PATCH /api/v1/admin/accounts/{accountId}/role
PATCH /api/v1/admin/accounts/{accountId}/status
GET /api/v1/accounts/me
PATCH /api/v1/accounts/me/profile
PATCH /api/v1/accounts/me/password

## Security behavior:
Administrative endpoints require ROLE_ADMIN.
Self-service endpoints derive the account ID from the authenticated principal, preventing users from modifying another account.
The future JWT authentication filter must set Authentication.getName() to the account UUID.
Until that JWT filter is registered, your current SecurityConfig will return 401 for authenticated endpoints.