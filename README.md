# 🔐 OAuth Login API

**Built by [Daud Abdi](https://linkedin.com/in/daudabdi0506)**

🌐 **Live Demo:** http://oauth.3.10.174.145.nip.io:5000  
💻 **GitHub:** [View Source](https://github.com/Daudsaid/OAuth-Login-API)  
📧 **Contact:** daudsaidabdi@gmail.com  
📱 **Portfolio:** [daud-abdi-portfolio-site.vercel.app](https://daud-abdi-portfolio-site.vercel.app)

---

Production-ready OAuth 2.0 authentication API with Google and GitHub login support. Deployed on AWS infrastructure with session management, CSRF protection, and comprehensive test coverage.

## 🚀 Try It Live

**Google OAuth:**
```
http://oauth.3.10.174.145.nip.io:5000/auth/google/start
```

**GitHub OAuth:**
```
http://oauth.3.10.174.145.nip.io:5000/auth/github/start
```

**Health Check:**
```
http://oauth.3.10.174.145.nip.io:5000/health
```

## ✨ Features

- 🔐 Google OAuth 2.0 - Full authentication flow
- 🔐 GitHub OAuth 2.0 - Full authentication flow
- 🍪 Secure Sessions - HttpOnly cookies with SHA-256 token hashing
- 🛡️ CSRF Protection - State parameter validation
- ⚡ Rate Limiting - 100 requests per 15 minutes
- 🧪 38 Passing Tests - Comprehensive test coverage
- 🔒 Security Headers - Helmet middleware
- 📊 PostgreSQL - AWS RDS with SSL

## 🛠️ Tech Stack

**Backend:** Node.js • Express • TypeScript • PostgreSQL • Jest

**Deployment:** AWS EC2 • AWS RDS • PM2 • nip.io DNS

**Security:** HttpOnly cookies • SHA-256 hashing • CSRF protection • Rate limiting

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/auth/google/start` | GET | Start Google OAuth flow |
| `/auth/google/callback` | GET | Google OAuth callback |
| `/auth/github/start` | GET | Start GitHub OAuth flow |
| `/auth/github/callback` | GET | GitHub OAuth callback |
| `/auth/me` | GET | Get current user (protected) |
| `/auth/logout` | POST | Logout user |

## 🏗️ Architecture
```
AWS EC2 (Ubuntu 24.04)
└── Node.js + Express + PM2
    └── Port: 5000
        └── PostgreSQL on AWS RDS
            ├── users
            ├── oauth_accounts
            └── sessions
```

## 💻 Local Development
```bash
# Clone
git clone https://github.com/Daudsaid/OAuth-Login-API.git
cd OAuth-Login-API

# Install
npm install

# Configure .env (see below)

# Setup database (see schema.sql)
createdb oauth_db
psql oauth_db < schema.sql

# Run
npm run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://user@localhost:5432/oauth_db
NODE_ENV=development
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
SESSION_COOKIE_NAME=session_token
COOKIE_SECRET=generate_random_32_byte_string
```

## 🧪 Testing
```bash
npm test              # Run all tests (38 passing)
npm run test:watch    # Watch mode
```

## 🔒 Security Features

- HttpOnly & Secure cookies
- SHA-256 session token hashing
- CSRF protection with state parameters
- Rate limiting (100 req/15min)
- Helmet security headers
- SQL injection protection
- 7-day session expiry

## 📊 Database Schema
```sql
users (id, email, name, avatar_url, created_at, updated_at)
oauth_accounts (id, user_id, provider, provider_user_id, created_at)
sessions (id, user_id, token_hash, expires_at, created_at)
```

## 📄 License

MIT

## 👤 Author

**Daud Abdi**

Portfolio: [daud-abdi-portfolio-site.vercel.app](https://daud-abdi-portfolio-site.vercel.app)  
LinkedIn: [linkedin.com/in/daudabdi0506](https://linkedin.com/in/daudabdi0506)  
GitHub: [@Daudsaid](https://github.com/Daudsaid)  
Email: daudsaidabdi@gmail.com

---

⭐ Star this repo if you found it helpful!

Made with ❤️ by Daud Abdi