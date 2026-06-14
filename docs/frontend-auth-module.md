# Frontend Auth Module

## 1. Purpose

The Frontend Auth Module connects the Next.js panel to the Avid backend authentication API.

It allows users to log in with username and password and stores the backend JWT access token and refresh token inside the NextAuth JWT session.

## 2. What This Module Does

This module handles:

- login page
- login form
- username/password authentication
- backend login API connection
- access token storage
- refresh token storage
- automatic access token refresh
- current session data
- Persian login messages

## 3. Main Files

### src/lib/auth/options.ts

Contains the main NextAuth configuration.

It defines the credentials provider, connects to the backend login endpoint, stores backend tokens, and refreshes the access token when needed.

### src/pages/api/auth/[...nextauth].ts

Registers the NextAuth API route for the Pages Router.

### src/pages/auth/login.tsx

Displays the Persian login page and redirects authenticated users to the dashboard.

### src/components/auth/LoginForm.tsx

Contains the login form.

It collects username and password, calls NextAuth signIn, displays Persian validation errors, and redirects after successful login.

### src/types/next-auth.d.ts

Extends NextAuth types.

It adds custom fields such as username, role, access level, permissions, access token, and refresh token.

### src/lib/axios.ts

Creates a shared Axios client.

It automatically attaches the current session access token to API requests.

## 4. Login Flow

The login flow works like this:

Login Form
→ signIn credentials
→ NextAuth CredentialsProvider
→ Backend /auth/login
→ Backend verifies username and password
→ Backend returns user and tokens
→ NextAuth stores tokens in JWT session
→ User redirects to dashboard

## 5. Backend Response Mapping

The backend returns authentication data in this structure:

{
  "success": true,
  "data": {
    "user": {},
    "tokens": {}
  }
}

The frontend reads:

const authData = responseData.data;
const user = authData.user;
const tokens = authData.tokens;

## 6. Token Handling

The frontend stores:

- accessToken
- refreshToken
- accessTokenExpiresAt
- refreshTokenExpiresIn

When the access token expires, NextAuth calls the backend refresh endpoint:

POST /api/v1/auth/refresh

The backend returns a new access token and refresh token.

## 7. Persian Panel Support

The module uses Persian text for:

- login page title
- login page subtitle
- input labels
- validation messages
- authentication errors

## 8. Design Summary

This module keeps frontend authentication separate from business pages.

NextAuth manages the browser session.

The backend remains the source of truth for user identity, password verification, roles, access levels, permissions, and token generation.