# Architecture

## Project Structure

```text
subscription-service/
|
|-- package.json
|-- tsconfig.json
|-- .env
|-- src/
    |
    |-- server.ts
    |-- app.ts
    |
    |-- constants/
    |   |-- subscription.ts
    |
    |-- data/
    |   |-- memory.ts
    |
    |-- services/
    |   |-- csrng.service.ts
    |   |-- subscription.service.ts
    |
    |-- routes/
    |   |-- subscription.routes.ts
    |
    |-- validators/
    |   |-- subscription.validator.ts
    |
    |-- middlewares/
        |-- error.middleware.ts
```
