Setup (Railway or local)

1) Create an environment file based on env.example:
   - DATABASE_URL=postgresql connection string (Railway provides this)
   - JWT_SECRET=secure random string
   - PORT=3001 (Railway sets PORT automatically)

2) Install and generate Prisma client:
   - npm install
   - npm run prisma:generate

3) Apply database migrations (create tables):
   - npx prisma migrate deploy
   (For first-time local dev you can run: npx prisma db push)

4) Start the server:
   - Development: npm run dev
   - Production: npm run build && npm start

API
- POST /api/auth/register { email, password } -> { token, user }
- POST /api/auth/login { email, password } -> { token, user }

Notes
- Passwords are hashed with bcrypt (10 rounds).
- JWT uses HS256 with 15d expiry; payload includes sub = userId.
- CORS enabled by default; adjust in src/index.ts if needed.
