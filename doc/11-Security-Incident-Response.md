# Security Incident Response & Key Management

This document outlines the procedures for handling security incidents, specifically focusing on key leaks, secrets management, and post-incident remediation based on past experiences in the Seniqu application.

## 1. Secrets Management Policy

To ensure the security of third-party integrations (e.g., Privy, Brevo, Supabase, Google OAuth) and database credentials, the following strict policies are enforced:

1. **No Hardcoded Secrets**: Under no circumstances should API keys, secrets, or sensitive configuration values be hardcoded in the source code.
2. **Environment Variables**: All secrets must be injected via environment variables (`.env` for local development, and platform-specific environment settings for production).
3. **Configuration Service**: The backend must use NestJS's `ConfigService` to retrieve environment variables. This prevents direct `process.env` access throughout the application and allows for validation.
4. **Git Ignore**: All `.env`, `.env.local`, and similar files must be strictly included in `.gitignore`.

## 2. Case Study: Privy Key Leak & Rotation

### 2.1 The Incident
During development, the `PRIVY_APP_ID` and `PRIVY_APP_SECRET` were inadvertently hardcoded into `privy.service.ts` and pushed to the Git repository. Even though the repository might be private, having secrets in the git history poses a significant risk of lateral movement if a developer's machine or the repository itself is compromised.

### 2.2 Immediate Response (Containment)
1. **Identify the Leak**: The exposure was identified during a security audit of the backend credentials.
2. **Revoke the Keys**: The immediate action was to log into the Privy Developer Dashboard and permanently revoke the compromised `PRIVY_APP_SECRET`. 

### 2.3 Remediation (Eradication & Recovery)
1. **Rotate Keys**: New keys (`PRIVY_APP_ID` and `PRIVY_APP_SECRET`) were generated in the Privy dashboard.
2. **Codebase Cleanup**: The hardcoded keys were removed from `backend/src/auth/privy.service.ts` and replaced with dynamic access via `ConfigService`:
   ```typescript
   this.privy = new PrivyClient(
       this.configService.get<string>('PRIVY_APP_ID')!,
       this.configService.get<string>('PRIVY_APP_SECRET')!
   );
   ```
3. **Environment Update**: The new keys were added to the local `.env` file and securely injected into the production hosting environment (e.g., Render/Railway/Vercel).
4. **Git History Scrubbing (Optional but Recommended)**: If the repository is public, the Git history must be scrubbed using tools like `BFG Repo-Cleaner` or `git filter-repo` to remove the commit containing the secret. If private, revoking the key is often considered sufficient mitigation.

### 2.4 Lessons Learned
- **Automated Scanning**: Implement tools like `git-secrets` or `trufflehog` in the CI/CD pipeline or as pre-commit hooks to prevent secrets from being committed.
- **Code Review**: Enforce strict code reviews focusing on the `src/config` and service instantiation files to catch hardcoded values early.

## 3. General Incident Response Plan

In the event of any suspected key leak or security breach, follow these steps:

1. **Verify**: Confirm the leak is real and identify which key/service is affected.
2. **Revoke & Rotate**: Immediately revoke the compromised key from the provider's dashboard and generate a new one.
3. **Deploy**: Update the environment variables in the production environment and trigger a redeployment.
4. **Audit**: Review access logs for the compromised service to determine if the key was actively exploited.
5. **Report**: If user data or financial infrastructure (e.g., wallet private keys, though Seniqu is non-custodial) was compromised, initiate the user notification protocol.
