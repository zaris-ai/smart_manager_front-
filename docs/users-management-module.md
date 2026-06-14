# Users Management Module

## 1. Purpose

The Users Management Module provides the frontend screen for managing system users.

It supports listing, searching, filtering, creating, editing, and archiving users.

## 2. UI Framework

This module uses DaisyUI components.

Main DaisyUI components used:

- card
- stats
- table
- modal
- input
- select
- textarea
- checkbox
- badge
- alert
- button
- join

## 3. Form Handling

All forms use React Hook Form.

The create/edit user modal uses React Hook Form with Zod validation.

The users filter form also uses React Hook Form.

## 4. Main Files

### src/pages/dashboard/users/index.tsx

This file renders the users management page.

It handles:

- loading role metadata
- loading users
- filtering users
- opening create modal
- opening edit modal
- opening delete confirmation modal
- pagination

### src/components/users/UserFormModal.tsx

This file contains the reusable user form modal.

It is used for both create and edit modes.

In create mode, the password field is visible.

In edit mode, the password field is hidden.

### src/components/users/index.ts

This file exports user-related components.

## 5. API Usage

The module uses these endpoints:

- GET /users/meta/options
- GET /users
- POST /users
- PATCH /users/:id
- DELETE /users/:id

## 6. RTL Support

The module is RTL by default.

Fields that contain English or numeric values use LTR direction:

- username
- email
- phone
- unitCode

## 7. Design Summary

The module follows the frontend rule:

- DaisyUI for UI
- React Hook Form for forms
- Zod for validation
- Axios for API calls