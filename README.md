# OAuth Login API

Production-ready OAuth authentication API with Google and GitHub login support.

## Tech Stack

Node.js • Express • TypeScript • PostgreSQL • Jest

## Features

- Google & GitHub OAuth authentication
- HttpOnly cookies with SHA-256 token hashing
- CSRF protection & rate limiting
- 38 passing tests

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Environment Setup

Create `.env`:
```env
DATABASE_URL=postgresql://username@localhost:5432/oauth_db
NODE_ENV=development
PORT=3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

SESSION_COOKIE_NAME=session_token
COOKIE_SECRET=generate_with_crypto_randomBytes_32
```

### 3. Database Setup
```bash
psql -U username -d postgres
```
```sql
CREATE DATABASE oauth_db;
\c oauth_db

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### 4. OAuth Credentials

**Google:** [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- Redirect URI: `http://localhost:3000/auth/google/callback`

**GitHub:** [github.com/settings/developers](https://github.com/settings/developers)
- Callback URL: `http://localhost:3000/auth/github/callback`

### 5. Run
```bash
npm run dev     # Development
npm test        # Run tests
npm run build   # Production build
npm start       # Production
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /auth/google/start` | Start Google OAuth |
| `GET /auth/google/callback` | Google callback |
| `GET /auth/github/start` | Start GitHub OAuth |
| `GET /auth/github/callback` | GitHub callback |
| `GET /auth/me` | Get current user |
| `POST /auth/logout` | Logout |

## Health Check

Verify your environment is ready:
```bash
# 1. Check PostgreSQL connection
psql -U username -d oauth_db -c "SELECT version();"

# 2. Check environment variables
node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT, '\nDB:', process.env.DATABASE_URL ? 'SET' : 'MISSING');"

# 3. Start server and test health endpoint
npm run dev
curl http://localhost:3000/health

# 4. Run tests
npm test

# Expected: "3 test suites, 38 tests passed"
```

**Health Checklist:**
- [ ] PostgreSQL running and accessible
- [ ] All `.env` variables configured
- [ ] OAuth credentials obtained from Google/GitHub
- [ ] Database tables created
- [ ] Server starts without errors
- [ ] `/health` endpoint returns 200
- [ ] All tests passing

## Security Features

- HttpOnly + Secure cookies
- SHA-256 session token hashing
- CSRF protection (state parameter)
- Rate limiting (100 req/15min)
- Helmet security headers

## Testing
```bash
npm test                # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Secure `COOKIE_SECRET` (64+ chars)
- [ ] Managed PostgreSQL with SSL
- [ ] HTTPS configured
- [ ] Production OAuth redirect URIs
- [ ] Session cleanup cron job

## Author

**Daud Abdi**  
📧 daudsaidabdi@gmail.com  
🔗 [GitHub](https://github.com/Daudsaid) • [LinkedIn](https://linkedin.com/in/daudabdi0506) • [Portfolio](https://daud-abdi-portfolio-site.vercel.app/)

## License

MIT