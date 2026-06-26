# Marketing CRM

## Project Description

A full-stack Customer Relationship Management (CRM) system designed for marketing teams to manage leads, campaigns, and customer interactions efficiently.

## Tech Stack

| Layer              | Technology                         |
| ------------------ | ---------------------------------- |
| Frontend           | React.js (Vite)                    |
| Backend            | Node.js, Express                   |
| Database           | Supabase PostgreSQL                |
| Authentication     | Supabase Auth (Email OTP / Google) |
| Storage            | Supabase Storage                   |
| State Mgmt         | Redux                              |
| Styling            | CSS / Tailwind                     |
| Container          | Docker                             |
| CI/CD              | GitHub Actions                     |

## Installation Steps

### Prerequisites

- Node.js v18+
- Supabase account (free tier)
- Docker (optional)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your Supabase URL and keys
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
cd database
# Run SQL scripts in schema/ to create tables
# Apply RLS policies from policies/
```

## Folder Structure

```
Marketing-CRM/
├── backend/          # Express API server
├── frontend/         # React client
├── docs/             # Project documentation
├── database/         # SQL schema, policies, functions, triggers, views
├── postman/          # API collections
├── design/           # UI/UX assets
├── docker/           # Docker configurations
├── scripts/          # Automation scripts
├── .github/          # CI/CD and templates
└── .vscode/          # Editor settings
```

## Git Branch Strategy

| Branch                  | Purpose                        |
| ----------------------- | ------------------------------ |
| `main`                  | Production-ready code          |
| `develop`               | Integration branch             |
| `feature/login-api`     | Backend login API              |
| `feature/user-management-api` | User management API       |
| `feature/lead-management-api`  | Lead management API       |
| `feature/dashboard-api` | Dashboard API                  |
| `feature/login-ui`      | Login UI                       |
| `feature/dashboard-ui`  | Dashboard UI                   |
| `feature/lead-ui`       | Lead management UI             |
| `bug/*`                 | Bug fixes                      |
| `hotfix/*`              | Urgent production fixes        |
| `release/*`             | Release preparation            |

## Team Members

- Backend Developers
- Frontend Developers
- QA Engineers
- Business Analysts
- UI/UX Designers
- DevOps Engineers

## Contribution Guidelines

1. Create a feature branch from `develop`
2. Write clean, testable code
3. Follow the coding standards
4. Submit a PR with a descriptive title
5. Request review from at least one team member
6. Squash commits before merging

## Coding Standards

- **JavaScript**: ES6+ syntax, async/await over callbacks
- **Backend**: MVC pattern, service-repository layer
- **Frontend**: Functional components, hooks, Redux for state
- **Naming**: camelCase for variables/functions, PascalCase for components, UPPER_SNAKE_CASE for constants
- **Formatting**: Single quotes, semicolons, 2-space indentation
