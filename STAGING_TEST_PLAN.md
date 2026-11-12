# ELBRO STORE - Staging Test Plan

**Date:** 2026-11-10  
**Purpose:** Safe testing of Migrations 008 & 009 before production deployment  
**Environment:** Separate Supabase project (staging)

---

## 1. Staging Environment Setup

### Option A: New Supabase Project (Recommended)
```bash
# 1. Create new Supabase project at supabase.com
# Project name: elbro-store-staging
# Region: Same as production for latency parity

# 2. Get connection details:
# Project URL: https://xxx.supabase.co
# Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Service Role Key: (DO NOT use in client code)

# 3. Configure local .env.staging:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option B: Supabase Local Development (CLI)
```bash
# Requires Supabase CLI (Linux/WSL2/macOS only - no Windows binary)
# Not available on Windows native

# Alternative: Use GitHub Codespaces or GitPod
# 1. Open repo in Codespaces
# 2. supabase init
# 3. supabase start
# 4. Apply migrations: supabase db reset
```

### Option C: Docker-based Local Supabase
```yaml
# docker-compose.yml
version: '3.8'
services:
  supabase:
    image: supabase/supabase:latest
    ports:
      - "54321:54321"  # API
      - "54322:54322"  # Postgres
      - "54323:54323"  # Studio
    environment:
      POSTGRES_PASSWORD: postgres
      JWT_SECRET: your-jwt-secret
```

---

## 2. Migration Application Order

### Step 1: Apply All Previous Migrations (001-007)
```sql
-- Run in order in Supabase Dashboard SQL Editor:
-- 001_initial_schema.sql
-- 002_products_categories.sql
-- 003_orders.sql
-- 004_rls_policies.sql
-- 005_admin_users.sql
-- 006_order_functions.sql
-- 007_settings.sql
```

### Step 2: Apply Migration 008
```sql
-- Copy FULL contents of supabase/migrations/008_orders_user_tracking.sql
-- Paste into Supabase Dashboard → SQL Editor → Run
-- Verify: No errors returned
```

### Step 3: Apply Migration 009
```sql
-- Copy FULL contents of supabase/migrations/009_coupons.sql
-- Paste into Supabase Dashboard → SQL Editor → Run
-- Verify: No errors returned
```

---

## 3. Test Scenarios

### 3.1 Migration 008: Order User Tracking

| Test | Expected Result |
|------|-----------------|
| **A. Guest Order Creation** | Order created with `user_id = NULL`, status `NEW` |
| **B. Authenticated Order Creation** | Order created with `user_id = auth.uid()` |
| **C. Backfill Verification** | Existing orders with matching phone+email get `user_id` set |
| **D. Guest Orders Remain Unlinked** | Orders with no matching profile keep `user_id = NULL` |
| **E. Phone Collision Test** | Two users with same phone - only email-matching orders linked |
| **F. RLS - User Sees Own Orders** | `SELECT * FROM orders` returns only `user_id = auth.uid()` |
| **G. RLS - Guest Orders Invisible** | Orders with `user_id = NULL` not returned to any user |
| **H. RLS - Admin Sees All** | Admin user sees all orders |
| **I. Order Items RLS** | User sees items only for their orders |
| **J. Signup Links Guest Orders** | New signup → `link_guest_orders_to_user()` called → orders linked |
| **K. Login Links Guest Orders** | Existing user login → orders linked by phone+email |
| **L. Tracking Fields** | `tracking_number`, `carrier`, `shipped_at` nullable, admin-writable |

### 3.2 Migration 009: Coupon System

| Test | Expected Result |
|------|-----------------|
| **A. Create Coupon (Admin)** | `admin_create_coupon` returns UUID, coupon in table |
| **B. Percentage Discount** | 10% on 1000 MAD = 100 MAD discount |
| **C. Fixed Amount Discount** | 5000 cents = 50 MAD discount |
| **D. Usage Limit Enforced** | After N uses, coupon rejected |
| **E. Per-User Limit** | Same user can use N times only |
| **F. Validity Dates** | Before `valid_from` / after `valid_until` = rejected |
| **G. Minimum Order** | Subtotal < minimum = rejected |
| **H. Category Restriction** | Only applicable categories work |
| **I. Product Restriction** | Only applicable products work |
| **J. Excluded Products** | Excluded products block coupon |
| **K. Coupon Usage Recorded** | `coupon_usages` row + `usage_count` incremented |
| **L. Available Coupons API** | `get_available_coupons` returns valid public coupons |
| **M. Checkout Integration** | Coupon applied → discount shown → order created with `coupon_id` |
| **N. Admin CRUD** | Create, read, update, soft-delete all work |
| **O. RLS - Public Coupons** | Anonymous users see active public coupons |
| **P. RLS - Private Coupons** | Only creator admin sees non-public coupons |
| **Q. RLS - Usage Tracking** | Users see own usages, admins see all |

---

## 4. Phone Collision Test Cases (Critical)

### Test Case 1: Same Phone, Different Emails
```sql
-- Setup: Two users with same phone, different emails
INSERT INTO auth.users (id, email, phone) VALUES 
  ('user-1', 'alice@example.com', '+212600000001'),
  ('user-2', 'bob@example.com', '+212600000001');

INSERT INTO profiles (id, user_id, phone, email) VALUES
  ('user-1', 'user-1', '+212600000001', 'alice@example.com'),
  ('user-2', 'user-2', '+212600000001', 'bob@example.com');

-- Guest order with Alice's email
INSERT INTO orders (customer_name, customer_phone, customer_email, customer_city, customer_address, subtotal_cents, total_cents)
VALUES ('Alice', '+212600000001', 'alice@example.com', 'Casablanca', '123 Rue', 10000, 12000);

-- Run backfill (migration 008)
-- Expected: Order linked to user-1 ONLY (phone + email match)

-- Guest order with NO email
INSERT INTO orders (customer_name, customer_phone, customer_email, customer_city, customer_address, subtotal_cents, total_cents)
VALUES ('Unknown', '+212600000001', NULL, 'Rabat', '456 Ave', 5000, 7000);

-- Run backfill
-- Expected: Order linked to BOTH users (phone matches, email NULL)
-- This is acceptable - rare edge case, admin can review
```

### Test Case 2: link_guest_orders_to_user() Function
```sql
-- User Alice signs up, has existing guest orders
SELECT link_guest_orders_to_user('user-1', '+212600000001');
-- Expected: Returns 1 (only Alice's email-matching order linked)
-- Bob's order should NOT be linked
```

---

## 5. Rollback Verification

### Migration 008 Rollback
```sql
-- Run rollback section from 008_orders_user_tracking.sql (lines 250-400)
-- Verify:
-- 1. Columns dropped: user_id, tracking_number, carrier, shipped_at, discount_cents, coupon_id
-- 2. Original create_order function restored
-- 3. Original phone-based RLS policies restored
-- 4. link_guest_orders_to_user function dropped
-- 5. idx_orders_user_id index dropped
-- DATA LOSS: Any data in new columns PERMANENTLY LOST
```

### Migration 009 Rollback
```sql
-- Run rollback section from 009_coupons.sql (lines 448-473)
-- Verify:
-- 1. coupon_usages table dropped
-- 2. coupons table dropped
-- 3. All 6 functions dropped
-- 4. All policies dropped
-- 5. All indexes dropped
-- 6. Trigger dropped
-- NO DATA LOSS: Only new tables removed
```

---

## 6. Frontend Integration Tests

| Feature | Test Command |
|---------|--------------|
| Guest Checkout | `npm run dev` → Add to cart → Checkout without login |
| Auth Checkout | Login → Add to cart → Checkout → Verify `user_id` in order |
| Profile Page | `/profil` → Orders tab shows linked orders |
| Coupon at Checkout | Enter valid code → Discount applied |
| Admin Coupons | `/admin/coupons` → Create/edit/delete coupons |
| Admin Orders | `/admin/commandes` → See all orders with user info |

---

## 7. Staging Deployment Checklist

- [ ] Staging Supabase project created
- [ ] All migrations 001-007 applied
- [ ] Migration 008 applied and verified
- [ ] Migration 009 applied and verified
- [ ] Phone collision tests pass
- [ ] All RLS policies verified
- [ ] Frontend connects to staging (update `.env.staging`)
- [ ] All test scenarios in Section 3 pass
- [ ] Rollback tested on staging
- [ ] Performance: Order creation < 500ms
- [ ] No console errors in browser

---

## 8. Production Deployment Prerequisites

Only after ALL staging tests pass:

- [ ] Full production database backup taken
- [ ] Maintenance window scheduled
- [ ] Migration 008 applied to production
- [ ] Migration 008 verified on production
- [ ] Migration 009 applied to production
- [ ] Migration 009 verified on production
- [ ] Frontend deployed to Vercel with production env vars
- [ ] Smoke tests on production
- [ ] Monitoring alerts configured

---

## 9. Emergency Rollback Procedure (Production)

```bash
# If critical issue after 008:
# 1. Run 008 rollback SQL in Supabase Dashboard
# 2. Revert frontend to pre-008 commit
# 3. Redeploy frontend

# If critical issue after 009:
# 1. Run 009 rollback SQL in Supabase Dashboard
# 2. Frontend works without coupons (graceful degradation)
# 3. Redeploy frontend if needed
```