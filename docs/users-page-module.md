# Users Page Module

## 1. Purpose

The Users Page Module provides the first frontend management screen for system users.

It allows administrators to view users and create new users from the dashboard.

## 2. What This Module Does

The module handles:

- displaying the users list
- fetching user role metadata
- searching users
- filtering users by role
- showing user status
- showing access level
- opening a create-user modal
- creating users with different role types

## 3. Main Files

### src/pages/dashboard/users/index.tsx

This file renders the users management page.

It fetches users from the backend, displays summary cards, renders the users table, and controls the create-user modal.

### src/components/users/CreateUserModal.tsx

This file contains the create-user modal.

It allows the admin to enter identity information, role, profile information, and independent work unit information.

### src/components/users/index.ts

This file exports the users components.

## 4. User Types

The create-user modal supports all backend role types:

- SUPER_ADMIN
- ADMIN
- MANAGER
- PROJECT_OWNER
- SPECIALTY_OWNER
- EMPLOYEE

The role metadata is loaded from the backend endpoint:

GET /api/v1/users/meta/options

## 5. Create User Flow

The create-user flow works like this:

Admin opens modal
→ fills user information
→ selects role
→ submits form
→ frontend sends POST /users
→ backend creates user
→ users list refreshes

## 6. API Usage

The page uses these backend endpoints:

GET /users/meta/options

GET /users

POST /users

## 7. RTL Support

The page and modal are designed for Persian RTL usage.

English fields such as username, email, phone, and unit code are displayed with LTR direction.

## 8. Design Summary

The Users Page Module is the first admin-facing management screen.

It is currently focused on listing and creating users.

Edit, delete, status-change, and permission-customization actions can be added later.