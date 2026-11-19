# Eneba Marketplace

A full-stack digital marketplace for games, gift cards, subscriptions, and other digital products.

Built with React, TypeScript, Firebase, and Stripe.

## Features

- **Product catalogue**
- **Search and filtering**
- **Product details**
- **Shopping cart**
- **Authentication**
- **Checkout**
- **Digital key fulfilment**
- **Order history**

## Tech Stack

| Technology              | Purpose                           |
| ----------------------- | --------------------------------- |
| React 19                | UI library                        |
| React Router 8          | Routing and server-side rendering |
| TypeScript              | Type safety                       |
| Tailwind CSS 4          | Styling                           |
| Vite 8                  | Build tooling                     |
| Node.js 24              | Runtime                           |
| Firebase Authentication | User authentication               |
| Cloud Firestore         | Database                          |
| Firebase Admin SDK      | Server-side Firebase operations   |
| Stripe                  | Payment processing                |
| Docker                  | Containerization                  |
| Render                  | Deployment                        |

## Getting Started

### Prerequisites

- Node.js 24 or later
- npm
- A Firebase project
- A Stripe account

### Installation

Clone the repository:

```bash
git clone https://github.com/Zileriel/eneba-marketplace.git
cd eneba-marketplace
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root.

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Stripe
STRIPE_SECRET_KEY=

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=
```

Fill in the values using your Firebase and Stripe project credentials.
`GOOGLE_APPLICATION_CREDENTIALS` should point to a Firebase service accoutn JSON file.

**Note:** Stripe integration currently supports test-mode secret keys.

#### Development

Start the development server:

```bash
npm run dev
```

### Available Scripts

| Command                         | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `npm run dev`                   | Start the development server                |
| `npm run build`                 | Build the application                       |
| `npm run start`                 | Start the production server                 |
| `npm run typecheck`             | Run TypeScript and React Router type checks |
| `npm run migrate:product-keys`  | Migrate product key inventory               |
| `npm run seed:popular-searches` | Seed popular search data                    |
| `npm run seed:products`         | Seed product data                           |

### Project Structure

```plaintext
.
├── app/
│   ├── components/       # Reusable UI components
│   ├── lib/
│   │   ├── auth/         # Authentication
│   │   ├── cache/        # Caching utilities
│   │   ├── cart/         # Shopping cart
│   │   ├── checkout/     # Checkout and payment logic
│   │   ├── firebase/     # Firebase configuration
│   │   ├── orders/       # Order management
│   │   └── products/     # Product-related logic
│   └── routes/           # Application routes
├── data/                 # Local seed data
├── scripts/              # Database scripts
├── Dockerfile
├── firebase.json
├── firestore.rules
├── package.json
└── react-router.config.ts
```

### Local Development Data

Some seed operations require local data files that are not included in the repository.
For example, the product seeding script expects `data/product-keys.local.json`
Provide the required data before running the corresponding seed script.
