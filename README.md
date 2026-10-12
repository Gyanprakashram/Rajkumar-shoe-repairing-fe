# Raj Kumar Shoe Repairing – Full-stack app
React (Vite) + Spring Boot 3 (Java 21). Local development uses Oracle Database XE; the Render UAT profile supports Neon PostgreSQL. Role-based login (USER / ADMIN) uses 15-minute access JWTs with rotating refresh tokens. Sessions end after five minutes without activity; active users remain signed in while refreshing tokens.

## Run
1. Database: install/start Oracle Database Free with service `FREEPDB1` on port `1521`. To use Docker instead, set `ORACLE_PASSWORD` and `ORACLE_JDBC_URL=jdbc:oracle:thin:@//localhost:1521/XEPDB1`, then run `docker compose up -d db` (runs db/01_schema.sql + db/02_seed.sql on first start).
   For a local Oracle installation, connect to `FREEPDB1` and run the two SQL files in /db in order. The app's default JDBC URL is `jdbc:oracle:thin:@//localhost:1521/FREEPDB1`.
2. Backend: set your Oracle credentials in PowerShell, then start Spring Boot:
   ```powershell
   $env:ORACLE_USERNAME = "SYSTEM"
   $env:ORACLE_PASSWORD = "<your Oracle SYSTEM password>"
   cd backend
   mvn spring-boot:run
   ```
   The app is available at http://localhost:8080.
3. Frontend:  `cd frontend && npm install && npm run dev`   → http://localhost:5173

Frontend structure: `frontend/src/App.jsx` owns app-wide state and navigation, `frontend/src/pages.jsx` contains page/form and reusable UI components, and `frontend/src/assets/images/` holds image assets such as the shop logo.

Owners can attach a JPG, PNG, or WebP product photo (up to 5 MB) while adding a material. Photos are stored in the Oracle `products` table and displayed in the materials cards and product detail view; older products without a photo continue to show their emoji fallback.

Products can be assigned to the storefront's material sections and marked out of stock by setting the stock count to zero. The materials page has category, min/max price, stock-availability, and sort controls.

Override `ORACLE_JDBC_URL` if your Oracle listener uses a different host, port, or service name. Do not commit database credentials.

### Render backend with Neon

The backend Dockerfile activates the `uat` profile. UAT database settings are in `backend/src/main/resources/application.properties`. Because Spring JDBC requires a JDBC URL, configure Neon connection details as separate Render environment variables rather than pasting the raw `postgresql://` URL:

Set these additional Render environment variables:

- `NEON_HOST`: the hostname from the Neon connection string (use the pooled hostname)
- `NEON_DATABASE`: the database name from the Neon connection string
- `NEON_USERNAME` and `NEON_PASSWORD`: the Neon credentials; rotate any password that has been shared
- `NEON_PORT`: `5432` (optional; this is the default)
- `JWT_SECRET`: a newly generated, private signing secret
- `ADMIN_PHONE` and `ADMIN_PASSWORD`: the owner account credentials
- `FRONTEND_URL` and `CORS_ORIGIN`: the deployed frontend origin (for example, `https://your-frontend.onrender.com`)

SMTP settings are optional; configure `SMTP_USERNAME`, `SMTP_PASSWORD`, and optionally `SMTP_FROM` to enable email. The Neon database should be empty for a fresh deployment; Hibernate creates the application tables, and the app initializes the owner account and settings. Existing Oracle records are not copied. Keep all credentials in Render's environment settings, not in source control.

The frontend selects the backend automatically: `npm run dev` uses `http://localhost:8080/api`, while production builds use `https://rajkumarshoerepairing.onrender.com/api`. To target another backend, set the optional `VITE_API` environment variable to its API base URL (including `/api`) before starting Vite or building. Once deployed, `GET /api/products` is a public readiness check.

Backend defaults and environment overrides are centralized in `backend/src/main/resources/application.properties`. Access JWTs expire after 15 minutes (`JWT_EXPIRATION_MS=900000`) and sessions expire after five idle minutes (`SESSION_IDLE_TIMEOUT_MS=300000`). Refresh tokens rotate on use and are stored as hashes in the database. Set `JWT_SECRET` to a private, strong signing key. Frontend-only build settings such as `VITE_API` and `VITE_SHOP_MAPS_URL` belong in `frontend/.env`, because Vite reads them at build time.

### Optional encrypted API JSON payloads

`app.api-encryption.enabled` in `backend/src/main/resources/application.properties` controls an additional AES-256-GCM payload format for API requests and JSON responses. When enabled, the wire body is a single Base64 string of `12-byte IV || ciphertext || 16-byte GCM tag`; when disabled, requests/responses use normal JSON. The backend key is a Base64-encoded 32-byte value in `app.api-encryption.key` in that same properties file. The Vite frontend must use the matching key as `VITE_API_ENCRYPTION_KEY` and set `VITE_API_ENCRYPTION_ENABLED=true` in `frontend/.env.local`. Keep the frontend local file ignored and do not expose the key in public source control. Multipart uploads sent through the API helper are encrypted before reaching the backend and reconstructed before controller processing. Binary image endpoints remain binary and rely on HTTPS for transport protection.

This layer is only an extra payload wrapper: because the browser must have the shared key, a user can extract it and inspect their own decrypted data. It does not replace HTTPS/TLS, authorization, or data minimization. Use AES-GCM (authenticated encryption), not AES-CBC without a separately designed authentication scheme. Browser DevTools and the application still see decrypted JSON after successful decryption.

Backend logs include a server-generated `X-Request-ID` for every HTTP request and method entry/exit/failure logs for controllers, services, and notification channels. The request ID is also returned in safe API error bodies; provide it when investigating failures. Logs intentionally exclude request/response bodies, method arguments, query strings, tokens, credentials, and exception messages. Console logs can be collected by the process manager or container platform; set application log retention and access controls in the deployment environment.

## HTTPS / transport encryption

Use HTTPS in production; TLS encrypts both API requests and responses and authenticates the server. Do not add a shared AES key to the browser bundle: any key used by browser JavaScript is visible to users and cannot provide a reliable secret. Either terminate TLS at a trusted reverse proxy/load balancer and set the frontend `VITE_API` to its `https://.../api` URL, or configure Spring Boot TLS directly. For direct TLS, provide a PKCS12 keystore outside source control and set `HTTPS_ENABLED=true`, `HTTPS_KEYSTORE`, `HTTPS_KEYSTORE_PASSWORD`, and optionally `HTTPS_KEYSTORE_TYPE` / `HTTPS_KEY_ALIAS`. These map to Spring's `server.ssl.*` settings in `application.properties`. Local development keeps HTTP enabled by default (`HTTPS_ENABLED=false`); use a trusted development certificate before setting it true. Do not commit certificates or passwords.

In the owner dashboard, **Products → Edit all details** edits the material name, section, emoji fallback, description, price, MRP, stock/availability, storefront visibility, and photo. Existing photos can be replaced or removed. Hidden products remain in the admin list so they can be made visible again.

Owner login (auto-created): phone `9263627052`, password `admin123` unless `ADMIN_PASSWORD` was set. On startup, the app migrates the original default admin phone `9999999999` to `9263627052` when that number is not already registered; its existing password is preserved. Override with `ADMIN_PHONE` / `ADMIN_PASSWORD`.

## Google Pay, email, and WhatsApp

### Razorpay checkout / UPI
Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the backend environment before starting Spring Boot. Use Razorpay test credentials for local testing, then configure live credentials and the receiving bank account in the Razorpay dashboard for production. Keep the secret on the backend; never put it in a Vite environment variable or source control. The existing `app.razorpay.key-id` and `app.razorpay.key-secret` properties read those environment variables.

Customers can pay through the secure Razorpay checkout using available methods such as UPI/Google Pay and cards, or choose pay on delivery. The backend creates the Razorpay order, checks the checkout signature and payment amount against the gateway, captures an authorized payment, and only then confirms the order. The checkout expires after ten minutes; abandoned or failed orders are cancelled and reserved inventory is returned. If a payment is captured after expiry, the backend requests a refund and marks it for owner follow-up. Razorpay credentials are unavailable by default, so online checkout is disabled until both backend variables are configured.

Repair, custom, and showroom bulk requests do not collect payment at submission. The owner enters a quote; the customer receives an in-app notification and, when configured, email and WhatsApp message with the amount. The customer accepts or declines in **My orders**. Accepted work is confirmed and due on delivery.

### Email (SMTP)
The SMTP defaults in `backend/src/main/resources/application.properties` use Gmail (`smtp.gmail.com`, port `587`) and the shop's configured sender address. Customer order-received and owner booking emails use a branded HTML layout, with booking details in the owner notification. Customer approval messages are sent through the configured email and SMS channels. External notification delivery runs asynchronously after booking transactions commit, so SMTP or messaging delays do not hold up order submission. SMTP connection/read/write timeouts default to 5 seconds each and can be changed with `SMTP_CONNECTION_TIMEOUT_MS`, `SMTP_READ_TIMEOUT_MS`, and `SMTP_WRITE_TIMEOUT_MS`. Email notifications are enabled when a valid Gmail App Password is supplied as `SMTP_PASSWORD`; no password is stored in source. If it is unset or invalid, mail delivery will fail and be logged.

- `SMTP_HOST`, `SMTP_PORT` (usually 587), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`
- `ORDER_NOTIFICATION_EMAIL` (shop inbox receiving order alerts; defaults to `gyanprakashram015@gmail.com`)
- Customer email is optional during registration. If present, order-received, quote, and approval emails go to that address; otherwise customer email is skipped and configured WhatsApp/SMS still go to the customer's registered phone. Owner booking details go to `ORDER_NOTIFICATION_EMAIL`.

For Gmail, enable 2-Step Verification on the sending Google account, create an **App password** under Google Account → Security → 2-Step Verification → App passwords, and use that 16-character app password as `SMTP_PASSWORD` (not your normal Gmail password). Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USERNAME=your-address@gmail.com`, and `SMTP_FROM=your-address@gmail.com`. The configured sender and shop alert inbox default to `gyanprakashram015@gmail.com`; owner notifications default to `9263627052`.

Example PowerShell setup (replace values locally; never paste secrets into source files):

```powershell
$env:SMTP_HOST = "smtp.gmail.com"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = "your-address@gmail.com"
$env:SMTP_PASSWORD = "your-16-character-app-password"
$env:SMTP_FROM = "your-address@gmail.com"
$env:ORDER_NOTIFICATION_EMAIL = "shop-inbox@example.com"
```

### WhatsApp Cloud API
1. In Meta for Developers, create or select an app and add the **WhatsApp** product.
2. In WhatsApp → API Setup, copy the **temporary/permanent access token** and **Phone number ID**. The ID is not the display phone number. For production, create a long-lived system-user token with WhatsApp messaging permissions and connect/verify the business phone number.
3. Create and get approval for a WhatsApp message template in WhatsApp Manager. The current sender uses a template with one body text parameter; set `WHATSAPP_TEMPLATE` and `WHATSAPP_LANGUAGE` to match the approved template.
4. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_PHONE` (shop owner's WhatsApp number), and optionally `WHATSAPP_API_VERSION`, `WHATSAPP_COUNTRY_CODE` (default `91`), `WHATSAPP_TEMPLATE`, and `WHATSAPP_LANGUAGE` in the backend environment.
5. The Meta test number can only send to recipients added as test recipients. Verify the owner/customer number is permitted and the template is approved. Keep access tokens private and rotate/revoke exposed tokens.

Owner alerts use `ORDER_NOTIFICATION_EMAIL` and `ADMIN_PHONE`. Customer welcome messages, quotes, and order updates use the email and phone saved on that customer's account. Each configured channel (email, WhatsApp, SMS) is attempted independently for both recipients; a missing customer email skips only email and does not prevent delivery attempts to WhatsApp or SMS. In-app notifications continue to be stored in Oracle for each account. WhatsApp requires its Cloud API configuration above.

### SMS (Twilio)
The backend already supports ordinary SMS to both the shop owner and the customer's registered mobile. Twilio currently documents a free trial with 100 SMS units for 30 days. Trial restrictions apply: verify recipient numbers first, and check current country-specific sender and delivery rules. Continued production SMS is generally usage-priced, so it cannot be promised as free.

1. Create a Twilio trial account and verify your email and mobile.
2. In the Console, use **Try out SMS Messaging** to set up a sender. Add/verify the owner and customer numbers as trial recipients.
3. Copy the Account SID and Auth Token from the Console, then set these variables in the same PowerShell session used to start the backend:

```powershell
$env:TWILIO_ACCOUNT_SID = "AC..."
$env:TWILIO_AUTH_TOKEN = "<keep private>"
$env:TWILIO_FROM_NUMBER = "+<country-code><Twilio SMS sender>"
Set-Location .\backend
mvn spring-boot:run
```

Use the sender assigned/provisioned in Twilio, not a personal phone number. For India or other regulated destinations, follow Twilio's current local sender, registration, and recipient requirements; trial sending may not work to every country/number. Never put these secrets in source control or share them in chat. If no paid SMS is an option, the app's in-app order tracker and browser notifications remain available at no messaging charge, provided the customer is online and allows browser notifications.

Admin-console notifications continue to be stored in Oracle even when any external channel is not configured; provider delivery errors are logged.

### Required order details and tracking
Customers can follow the full order journey in **My orders** and **Repair → Track your order**: received, confirmed, in progress, ready, out for delivery, and delivered. The order status refreshes automatically. On delivery, the customer also receives a celebratory email with a dedicated delivery-success design and a **Leave a rating & review** button when an email address and SMTP are configured. The button opens the selected delivered order's feedback form; customers must sign in.

Feedback is saved separately in Oracle's `customer_feedback` table, one review per delivered order. Customers can submit a 1–5 star rating and written review only for their own delivered orders. The submitted review content is available only to admins through **Admin → Ratings & reviews**. Set `FRONTEND_URL` to the deployed frontend origin before enabling customer email links in production; it defaults to `http://localhost:5173` for local development.

Required fields are validated in both the browser and backend: account name/phone/password, delivery address and recipient phone, showroom footwear type/quantity/location, product name/category/prices/stock/variants, quote amount, payment confirmation, and order status. Email is optional but must be valid if supplied.

## Flow
1. Customers can search product names, categories and variant values (including partial prefixes/suffixes); search results expose on-demand filters for category, brand/company, size, price and stock. All matching materials render in the scrollable catalog.
2. Owners can define any combination of variant attributes (for example, brand and size for soles, colour for thread, or brand/colour/volume for polish), with price, MRP and stock tracked per combination. Customers choose an available combination and quantity before adding it to their cart.
3. The account area lets customers edit their profile and saved delivery address, review orders, and open their cart. Checkout pre-fills the saved address and keeps delivery contact details separate from the sign-in phone. The optional location button uses browser permission to place GPS coordinates in the editable landmark field; no reverse-geocoding service is called.
4. Material orders can use verified Razorpay checkout or pay on delivery. The server only confirms an online order after it verifies the gateway payment; a self-reported UPI reference alone is not treated as proof of payment.
5. Repair requests can include up to three JPG, PNG, or WebP photos; showroom bulk requests and custom orders can include up to five (5 MB each). Repair/bulk photos are stored as Base64 CLOBs in Oracle and attached to the owner's order email when SMTP is configured. Custom reference photos remain BLOBs. The owner can view uploaded images in the admin order list.
6. The owner dashboard filters orders by order ID/product/customer, type, amount, payment/order status and date (today, last 30 days or all time), and filters products by name, category and availability. Showroom bulk requests include footwear type, estimated pair quantity, showroom/pickup location, repair details and photos. The bulk page links to a Bistupur, Jamshedpur Google Maps search; set `VITE_SHOP_MAPS_URL` in the frontend environment to the verified Google Business Profile.
7. New customers receive a welcome notification on the contact channels they provide. The owner sees customer contact details and uploaded photos on each booking, then quotes or declines requests and updates accepted order statuses. Quote emails include a direct WhatsApp chat link to the shop.
## API (all under /api)
auth: POST /auth/register, /auth/login · public: GET /products, /settings/public
customer: multipart POST /orders, GET /orders, POST /orders/{id}/payment (material UTR), POST /orders/{id}/quote-response, GET /feedback/status/{orderId}, POST /feedback/{orderId}, GET /notifications, POST /notifications/read
owner (ROLE_ADMIN): GET /admin/orders, GET /admin/orders/{id}/images, GET /admin/feedback, POST /admin/orders/{id}/quote|decision|refunded|status, POST/PUT/DELETE /admin/products, PUT /admin/staticdata.

## Store configuration and rate limiting

Run `db/01_schema.sql` to create the Oracle `rk_staticdata` key/value table (the backend also uses Hibernate schema update). Public shop identity and delivery settings are read from `GET /api/staticdata`; an authenticated owner can update the values from **Admin → Settings** or `PUT /api/admin/staticdata`. Defaults include `shop.name`, `shop.address`, `shop.established_year`, `shop.phone`, `shop.hours`, `delivery.free_threshold`, and `delivery.fee`. The table also stores configurable `rate-limit.api-per-minute`, `rate-limit.auth-per-minute`, and `rate-limit.order-per-minute` limits.

Rate limits use fixed one-minute windows per client IP: auth defaults to 10 requests/minute (maximum 60), order creation/payment to 10/minute (maximum 500), and other API requests to 120/minute (maximum 5000). Exceeded requests receive HTTP 429 and a `Retry-After` header. Counters are held in process memory; deployments with multiple backend instances need a shared limiter to enforce a cluster-wide limit.

## Notes / not included
- Notifications are stored in DB, polled every 10s, and shown as labeled, wrapped cards in the admin console/browser. WhatsApp chat links are rendered as clickable links. Configure SMTP, WhatsApp Cloud API, and Twilio settings in `backend/src/main/resources/application.properties` (secrets are supplied through environment overrides). Owner destinations are `ORDER_NOTIFICATION_EMAIL` / `ADMIN_PHONE`; customer destinations are their registered email and phone. Email is optional; WhatsApp and SMS are attempted independently when configured.
- Access JWTs last 15 minutes and are refreshed during active use. A five-minute idle timeout revokes the session; signing in again is required after inactivity.
- Backend runtime configuration is in `backend/src/main/resources/application.properties` with environment-variable overrides for secrets and deployment-specific values. Frontend build-time settings are kept separately in `frontend/.env`.
- The exact Maps Business Profile link is needed to point directly to this shop's verified location and reviews; no review text is fabricated or embedded as a customer testimonial.
- Kafka and AI chat are not included in this version.
