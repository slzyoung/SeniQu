# Development Workflow

## 1. Prerequisites
- **Node.js**: v18+
- **npm**: v9+
- **Git**

## 2. Setting Up the Environment

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your DB credentials
   npm install
   npm run start:dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 3. Coding Standards

### TypeScript
- **Strict Mode**: Enabled.
- **No `any`**: Avoid `any` type; use `unknown` or define an Interface.
- **Interfaces**: Use `I` prefix is NOT required. Naming should be descriptive (e.g., `User`, `Artwork`).

### Components (React)
- **Functional Components**: Use `export function ComponentName() {}`.
- **Props Interface**: Define props immediately above the component.
- **Composition**: Prefer composition over prop-drilling.

### Commits
- Use semantic commit messages:
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation
  - `style`: Formatting, missing semi colons, etc
  - `refactor`: Code change that neither fixes a bug nor adds a feature

## 4. Build & Deployment

### Production Build
To create a production-ready build of the frontend:
```bash
cd frontend
npm run build
```
This generates a `dist` folder optimized for static hosting (Vercel, Netlify, AWS S3).

### Linting
Always lint before pushing:
```bash
npm run lint
```
