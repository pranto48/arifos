

## Analysis: Why Restored Data Does Not Appear in Docker

### Root Cause (Critical Discovery)

The restore operation **works correctly** — data IS successfully written to the PostgreSQL database via the backend API (`/api/data/:table/upsert`). The `user_id` is properly remapped on line 706 of DataExport.tsx and again on line 1165 of server.js.

**The real problem**: Every page in the application (Tasks, Notes, Goals, Dashboard, etc.) fetches data using `supabase.from('tasks').select(...)` directly. In Docker mode, the Supabase client points to `http://localhost:9999` — a dummy URL that doesn't exist. This means:

- Restore writes data to PostgreSQL via `/api/data/:table` — **works**
- Pages read data via `supabase.from().select()` hitting `localhost:9999` — **fails silently**
- Result: "restore complete" but nothing shows anywhere

The error logs confirm this: every single `localhost:9999/rest/v1/...` request fails with `ERR_CONNECTION_REFUSED`.

### Scope of the Problem

There are **167 `supabase.from()` calls across 9 page files** plus additional calls in hooks and components. Making every single page dual-mode is a massive undertaking that would touch virtually every file in the application.

### Proposed Solution: Proxy Supabase REST Calls Through the Backend

Instead of rewriting every page, we intercept at the infrastructure level:

**1. Add a PostgREST-compatible proxy layer to the Docker backend (`docker/backend/server.js`)**

Add a route handler for `/rest/v1/:table` that translates Supabase-style REST API calls into direct PostgreSQL queries. This way, when the Supabase client in Docker mode calls `localhost:9999/rest/v1/tasks?select=*&user_id=eq.xxx`, the nginx proxy routes it to the backend which executes the equivalent SQL query.

The proxy will handle:
- `GET /rest/v1/:table` — Parse PostgREST query params (`select`, `eq`, `order`, `limit`, `offset`, `in`, `not.is`, `gte`, `lte`, `like`, `neq`, `or`)
- `POST /rest/v1/:table` — Insert rows (handle both single and array bodies)
- `PATCH /rest/v1/:table` — Update rows with filter params
- `DELETE /rest/v1/:table` — Delete rows with filter params
- `HEAD /rest/v1/:table` — Return count headers (used by some operations)

Auth will be extracted from the `apikey`/`Authorization` header that the Supabase client sends.

**2. Update the Supabase client URL in Docker builds (`Dockerfile`)**

Change `VITE_SUPABASE_URL` from `http://localhost:9999` to an empty string or a relative URL, and configure nginx to proxy `/rest/v1/` requests to the backend.

**3. Update nginx proxy config (`nginx.conf`)**

Add a proxy rule so `/rest/v1/` requests are forwarded to the backend server alongside the existing `/api/` proxy.

**4. Handle the `functions/v1/` calls**

Add a catch-all for `/functions/v1/` that returns graceful no-op responses in Docker mode (these are edge functions that don't exist in self-hosted).

### Technical Details

**PostgREST query param parser** — the key translations needed:

```text
?select=*                          → SELECT *
?select=id,title,status            → SELECT id, title, status
&user_id=eq.{uuid}                 → WHERE user_id = '{uuid}'
&status=neq.pending                → WHERE status != 'pending'
&date=gte.2026-02-01               → WHERE date >= '2026-02-01'
&order=created_at.desc             → ORDER BY created_at DESC
&limit=20&offset=0                 → LIMIT 20 OFFSET 0
&or=(col1.eq.val1,col2.eq.val2)    → WHERE (col1 = 'val1' OR col2 = 'val2')
&col=in.(val1,val2)                → WHERE col IN ('val1', 'val2')
&col=not.is.null                   → WHERE col IS NOT NULL
```

**Auth handling** — The Supabase client sends the anon key as `apikey` header plus the user's JWT in `Authorization: Bearer`. In Docker mode, the JWT is the self-hosted token. We need to:
- Accept both the dummy anon key and the self-hosted JWT
- Extract user identity from the self-hosted JWT via `verifyToken()`
- Scope queries by user_id automatically for data tables

**RPC calls** — Handle `POST /rest/v1/rpc/:function_name` for database functions like `get_support_users_safe`.

### Files to modify

- `docker/backend/server.js` — Add PostgREST-compatible proxy routes (~200 lines)
- `nginx.conf` — Add `/rest/v1/` and `/functions/v1/` proxy rules
- `Dockerfile` — Change `VITE_SUPABASE_URL` to point to the app itself (e.g., `http://localhost:80` or use relative URL)

### Why this approach

- **Zero changes to any page or component** — all 167+ `supabase.from()` calls work as-is
- **Backup, restore, AND normal page rendering** all work
- **Future-proof** — any new pages automatically work in Docker mode
- **Single point of maintenance** — the proxy layer in server.js

### Risk mitigation

- The PostgREST query parser doesn't need to be 100% complete — just the subset actually used by the app
- Unknown query params are safely ignored
- Tables are still whitelisted for security
- User scoping is enforced server-side

