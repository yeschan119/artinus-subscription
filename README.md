# Architecture

subscription-service/
│
├── Configuration
│   ├── package.json              # Dependencies / Scripts
│   ├── tsconfig.json            # TypeScript Compiler Config
│   └── .env                     # Environment Variables
│
└── src/
    │
    ├── Entry Point
    │   ├── server.ts            # Server Bootstrap
    │   └── app.ts               # Express App Setup
    │
    ├── Domain Constants
    │   └── constants/
    │       └── subscription.ts  # Subscription Status / Channel Rules
    │
    ├── Data Layer
    │   └── data/
    │       └── memory.ts        # In-Memory Storage (Mock DB)
    │
    ├── Business Logic
    │   └── services/
    │       ├── csrng.service.ts       # Random Failure / External API Simulation
    │       └── subscription.service.ts# Subscribe / Cancel / History Logic
    │
    ├── API Layer
    │   └── routes/
    │       └── subscription.routes.ts # REST Endpoints
    │
    ├── Validation Layer
    │   └── validators/
    │       └── subscription.validator.ts # Request Schema Validation
    │
    └── Cross Cutting Concerns
        └── middlewares/
            └── error.middleware.ts # Global Error Handler
