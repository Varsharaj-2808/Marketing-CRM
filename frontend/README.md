# Marketing CRM

A React.js client built with Vite and a Node.js backend.

## Repository Structure

```text
Repository Root
├── .vscode
├── backend/   
├── frontend/                  # Frontend application folder
│   ├── public/                # Static assets
│   ├── src/                   # React source code
│   ├── package.json           # Frontend dependencies & scripts
│   ├── vite.config.js         # Vite configuration
│   └── README.md                  # Project documentation
│
├── .gitignore

```

---

## Environment Configuration

Before running the frontend application, you must configure your local environment variables:

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Create your local `.env` file from the example template:
   ```bash
   # On macOS/Linux
   cp .env.example .env

   # On Windows (PowerShell)
   Copy-Item .env.example .env
   ```
3. Open `frontend/.env` and update the environment variables (e.g., `VITE_API_BASE_URL`) as needed for your local backend configurations.

---

## Frontend Setup & Development Workflow

All frontend commands must be executed from the **`frontend/`** directory. Running `npm` commands directly from the repository root will not work.

### Development Workflow

To start development on the frontend, navigate to the `frontend/` directory, install dependencies, and run the dev server:

```bash
# Navigate to the frontend directory
cd frontend

# Install frontend dependencies
npm install

# Start the local development server (runs "vite")
npm run dev

# Run frontend integration/unit test suite (runs "vitest")
npm run test
```

### Build Instructions

To build the production-ready static assets, run the build script from the `frontend/` directory:

```bash
# Navigate to the frontend directory
cd frontend

# Build production bundle (runs "vite build")
npm run build
```

---

## Backend Note

The backend codebase is located in the **`backend/`** directory at the repository root and has its own isolated setup and configuration process. 
- Do **NOT** run backend commands inside the `frontend/` directory.
- Do **NOT** run frontend commands inside the `backend/` directory or at the repository root.

---

## Folder Structure (inside `frontend/src/`)

```text
src/
  components/      - Reusable React components
    admin/         - Admin-specific components
    common/        - Shared UI components
    layout/        - Layout components
    leads/         - Lead management components
    user/          - User-specific components
  pages/           - Page view components mapped to application routes
  services/        - API service layer
  hooks/           - Custom React hooks
  context/         - React context providers
  utils/           - Utility functions
  constants/       - Constants
  styles/          - Global styles
  validations/     - Form validations
  App.jsx          - Root component
  main.jsx         - Entry point
```
