/*
  Paste these into Postman Mock Server as example responses.
  BASE_URL = https://54c19606-357c-410a-a421-e16b93fcf051.mock.pstmn.io
*/

// ============================================================
// GET {{BASE_URL}}/admin/users/EMP-00001  (200)
// ============================================================
{
  "success": true,
  "data": {
    "id": "ae12bc34-5678-9def-0123-456789abcdef",
    "employee_id": "EMP-00001",
    "name": "Admin User",
    "email": "admin@company.com",
    "mobile": "9876543210",
    "role": "Admin",
    "status": "active",
    "failedLoginAttempts": 0,
    "lockoutUntil": null,
    "lastLoginAt": "2026-06-29T00:00:00.000Z",
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-29T00:00:00.000Z"
  }
}

// ============================================================
// GET {{BASE_URL}}/admin/users/me  (200)
// ============================================================
{
  "success": true,
  "data": {
    "id": "ae12bc34-5678-9def-0123-456789abcdef",
    "employee_id": "EMP-00001",
    "name": "Admin User",
    "email": "admin@company.com",
    "mobile": "9876543210",
    "role": "Admin",
    "status": "active",
    "failedLoginAttempts": 0,
    "lockoutUntil": null,
    "lastLoginAt": "2026-06-29T00:00:00.000Z",
    "createdAt": "2026-06-01T00:00:00.000Z",
    "updatedAt": "2026-06-29T00:00:00.000Z"
  }
}

// ============================================================
// GET {{BASE_URL}}/admin/users/EMP-99999  (404 — not found)
// ============================================================
{
  "success": false,
  "status": 404,
  "message": "User not found."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (201 — success)
// ============================================================
{
  "success": true,
  "status": 201,
  "data": {
    "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "employee_id": "EMP-00004",
    "name": "John Doe",
    "email": "john@company.com",
    "mobile": "9876543212",
    "role": "Marketing Executive",
    "status": "active",
    "failedLoginAttempts": 0,
    "lockoutUntil": null,
    "lastLoginAt": null,
    "createdAt": "2026-06-29T12:00:00.000Z",
    "updatedAt": "2026-06-29T12:00:00.000Z"
  },
  "message": "User created successfully."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (400 — missing required field)
// ============================================================
{
  "success": false,
  "status": 400,
  "message": "Employee Name is required."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (400 — invalid email format)
// ============================================================
{
  "success": false,
  "status": 400,
  "message": "Invalid email format."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (400 — invalid role)
// ============================================================
{
  "success": false,
  "status": 400,
  "message": "Invalid role. Allowed values: Admin, Marketing Executive."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (409 — duplicate email)
// ============================================================
{
  "success": false,
  "status": 409,
  "message": "Email already registered."
}

// ============================================================
// POST {{BASE_URL}}/admin/users  (409 — duplicate mobile)
// ============================================================
{
  "success": false,
  "status": 409,
  "message": "Mobile number already registered."
}

// ============================================================
// PUT {{BASE_URL}}/admin/users/EMP-00004  (200 — success)
// ============================================================
{
  "success": true,
  "message": "User updated successfully.",
  "data": {
    "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "Marketing Executive",
    "accountStatus": "active",
    "failedLoginAttempts": 0,
    "lockoutUntil": null,
    "lastLoginAt": "2026-06-29T12:00:00.000Z",
    "createdAt": "2026-06-28T00:00:00.000Z",
    "updatedAt": "2026-06-29T12:00:00.000Z",
    "employee_id": "EMP-00004",
    "name": "John Updated",
    "mobile": "9876543212"
  }
}

// ============================================================
// PUT {{BASE_URL}}/admin/users/EMP-00004  (400 — immutable ID)
// ============================================================
{
  "success": false,
  "status": 400,
  "message": "Employee ID is immutable."
}

// ============================================================
// PATCH {{BASE_URL}}/admin/users/EMP-00004/deactivate  (200)
// ============================================================
{
  "success": true,
  "message": "User deactivated successfully.",
  "data": {
    "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "employee_id": "EMP-00004",
    "name": "John Doe",
    "email": "john@company.com",
    "mobile": "9876543212",
    "role": "Marketing Executive",
    "status": "inactive"
  }
}

// ============================================================
// PATCH {{BASE_URL}}/admin/users/EMP-00004/activate  (200)
// ============================================================
{
  "success": true,
  "message": "User activated successfully.",
  "data": {
    "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
    "employee_id": "EMP-00004",
    "name": "John Doe",
    "email": "john@company.com",
    "mobile": "9876543212",
    "role": "Marketing Executive",
    "status": "active"
  }
}

// ============================================================
// DELETE {{BASE_URL}}/admin/users/EMP-00004  (200 — success)
// ============================================================
{
  "success": true,
  "message": "User deleted successfully."
}

// ============================================================
// DELETE {{BASE_URL}}/admin/users/EMP-00001  (403 — blocked)
// ============================================================
{
  "success": false,
  "status": 403,
  "message": "User deletion is not permitted. Use deactivation instead."
}

// ============================================================
// DELETE {{BASE_URL}}/admin/users/EMP-00001  (401 — not authenticated)
// ============================================================
{
  "success": false,
  "status": 401,
  "message": "Authentication required."
}

// ============================================================
// GET {{BASE_URL}}/admin/users  (200 — list)
// ============================================================
{
  "success": true,
  "data": [
    {
      "id": "ae12bc34-5678-9def-0123-456789abcdef",
      "employee_id": "EMP-00001",
      "name": "Admin User",
      "email": "admin@company.com",
      "mobile": "9876543210",
      "role": "Admin",
      "status": "active",
      "failedLoginAttempts": 0,
      "lockoutUntil": null,
      "lastLoginAt": "2026-06-29T00:00:00.000Z",
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-29T00:00:00.000Z"
    },
    {
      "id": "bd460208-3d59-43ef-86c6-523dabe8edd9",
      "employee_id": "EMP-00002",
      "name": "Executive User",
      "email": "executive@company.com",
      "mobile": "9876543211",
      "role": "Marketing Executive",
      "status": "active",
      "failedLoginAttempts": 0,
      "lockoutUntil": null,
      "lastLoginAt": null,
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    },
    {
      "id": "cdef0123-4567-89ab-cdef-0123456789ab",
      "employee_id": "EMP-00003",
      "name": "Deactivated User",
      "email": "deactivated@company.com",
      "mobile": "9988776655",
      "role": "Marketing Executive",
      "status": "inactive",
      "failedLoginAttempts": 0,
      "lockoutUntil": null,
      "lastLoginAt": null,
      "createdAt": "2026-06-15T08:30:00.000Z",
      "updatedAt": "2026-06-15T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 3,
    "totalPages": 1
  }
}

// ============================================================
// {{BASE_URL}}/admin/users  (403 — non-admin tries to access)
// ============================================================
{
  "success": false,
  "status": 403,
  "message": "Admin access required."
}

// ============================================================
// {{BASE_URL}}/admin/users  (401 — no auth token)
// ============================================================
{
  "success": false,
  "status": 401,
  "message": "Authentication required."
}

// ============================================================
// GET {{BASE_URL}}/api/admin/audit-log  (200)
// ============================================================
{
  "success": true,
  "data": [
    {
      "id": "743ff841-b7d2-4434-89cc-7e0e882b4eac",
      "user_id": "bd460208-3d59-43ef-86c6-523dabe8edd9",
      "action": "LOGIN_SUCCESS",
      "resource": "Auth",
      "resourceId": "",
      "details": "Successful login",
      "ipAddress": "::1",
      "userAgent": "PostmanRuntime/7.54.0",
      "result": "Success",
      "createdAt": "2026-06-29T01:46:47.513Z",
      "email": "vishnu.off.2004@gmail.com"
    },
    {
      "id": "8f2a1b3c-4d5e-6f78-9abc-def012345678",
      "user_id": "ae12bc34-5678-9def-0123-456789abcdef",
      "action": "USER_CREATED",
      "resource": "User",
      "resourceId": "EMP-00004",
      "details": "John Doe created with role Marketing Executive",
      "ipAddress": "::1",
      "userAgent": "Mozilla/5.0",
      "result": "Success",
      "createdAt": "2026-06-28T14:32:10.000Z",
      "email": "admin@company.com"
    },
    {
      "id": "1a2b3c4d-5e6f-7890-abcd-ef0123456789",
      "user_id": "ae12bc34-5678-9def-0123-456789abcdef",
      "action": "USER_UPDATED",
      "resource": "User",
      "resourceId": "EMP-00003",
      "details": "Jane Smith updated (employee_name, role)",
      "ipAddress": "::1",
      "userAgent": "Mozilla/5.0",
      "result": "Success",
      "createdAt": "2026-06-28T10:15:30.000Z",
      "email": "admin@company.com"
    },
    {
      "id": "4d5e6f78-9abc-def0-1234-56789abcdef0",
      "user_id": "ae12bc34-5678-9def-0123-456789abcdef",
      "action": "USER_DEACTIVATED",
      "resource": "User",
      "resourceId": "EMP-00003",
      "details": "Jane Smith deactivated",
      "ipAddress": "::1",
      "userAgent": "Mozilla/5.0",
      "result": "Success",
      "createdAt": "2026-06-27T16:45:00.000Z",
      "email": "admin@company.com"
    },
    {
      "id": "01234567-89ab-cdef-0123-456789abcdef",
      "user_id": "cdef0123-4567-89ab-cdef-0123456789ab",
      "action": "LOGIN_FAILED",
      "resource": "Auth",
      "resourceId": "",
      "details": "Invalid email or password",
      "ipAddress": "192.168.1.100",
      "userAgent": "PostmanRuntime/7.54.0",
      "result": "Failure",
      "createdAt": "2026-06-29T00:15:20.000Z",
      "email": "unknown@company.com"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 5,
    "totalPages": 1
  }
}

// ============================================================
// GET {{BASE_URL}}/api/admin/audit-log?user_id=EMP-00001  (200 — filtered)
// ============================================================
{
  "success": true,
  "data": [
    {
      "id": "8f2a1b3c-4d5e-6f78-9abc-def012345678",
      "user_id": "ae12bc34-5678-9def-0123-456789abcdef",
      "action": "USER_CREATED",
      "resource": "User",
      "resourceId": "EMP-00004",
      "details": "John Doe created with role Marketing Executive",
      "ipAddress": "::1",
      "userAgent": "Mozilla/5.0",
      "result": "Success",
      "createdAt": "2026-06-28T14:32:10.000Z",
      "email": "admin@company.com"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}

// ============================================================
// POST {{BASE_URL}}/auth/login  (200 — success, JWT returned)
// ============================================================
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token-admin",
    "user": {
      "id": "ae12bc34-5678-9def-0123-456789abcdef",
      "name": "Admin User",
      "email": "admin@company.com",
      "role": "Admin",
      "status": "active"
    },
    "refreshToken": "mock-refresh-token"
  }
}

// ============================================================
// POST {{BASE_URL}}/auth/login  (403 — deactivated user)
// ============================================================
{
  "success": false,
  "status": 403,
  "message": "Account is inactive. Contact your administrator."
}
