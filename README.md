# Swastik Camphor — Online Store

Full e-commerce website for **Swastik Camphor** (VIJAYASREE CAMPHOR INDUSTRIES, Hyderabad).
Customers can browse camphor products, order online with UPI/PhonePe or Cash on Delivery,
track orders, leave reviews, chat with support, and receive branded order emails.
A private staff portal manages products, orders, customers, promo posters, coupons,
shipping, and notifications.

## Main features

- Product catalogue with ratings, discounts, wishlist, and cart
- Checkout with PhonePe / UPI (QR + deep links) and Cash on Delivery
- Verified-payment PDF receipts and order confirmation emails
- Customer accounts (Google sign-in) with address book and order history
- Multi-language customer site: English, Telugu, Hindi
- Admin portal: catalogue, orders, customers, promo poster carousel (images + video),
  coupons, shipping, reviews, analytics
- Realtime order updates and support chat

## Technologies

- **TanStack Start v1** (React 19, SSR) with **Vite 7**
- **Tailwind CSS v4** + shadcn-style components
- **Lovable Cloud** (managed database, auth, storage)
- **PhonePe** payment gateway
- Order emails via the shop mailbox (`shop@online.swastikcamphor.in`)

## Run locally

Requirements: Node.js 20+ and npm (or bun).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
cp .env.example .env   # then fill in your real values
npm run dev
```

The app runs at `http://localhost:8080`.

## Environment variables

All required variables are listed in **`.env.example`** with placeholder values.
Copy it to `.env` and fill in the real values (database keys, PhonePe credentials,
mailbox password, etc.). The real `.env` file is git-ignored and must never be committed.

## Build & deploy

```sh
npm run build
```

The project is built and hosted on [Lovable](https://lovable.dev); publishing from the
Lovable editor deploys it to production. The connected GitHub repository stays in
two-way sync with the Lovable project automatically.

## Project structure

```
src/
  routes/          # pages (file-based routing) + /api server endpoints
  components/      # UI components (storefront, admin, checkout, chat)
  lib/             # server functions, payments, email, i18n, catalogue
  integrations/    # generated backend clients (do not edit)
  assets/          # images & media pointers
public/            # static files (favicon, product images, robots.txt)
supabase/          # backend configuration
```
