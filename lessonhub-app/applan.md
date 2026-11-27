# Plan: building a native iOS app for the LessonHub platform

This document is the plan for a native iOS app, written in Swift, that works alongside the existing Next.js web app. The app reuses the current backend and keeps changes to the web platform small.

## Phase 1: backend preparation and API changes

The mobile app depends on a documented, stable API. This phase prepares the Next.js backend to serve a mobile client.

1.  **API Audit & Specification:**
    *   **Action:** Analyze the existing data models (`prisma/schema.prisma`) and application logic (`src/actions/`, `src/app/api/`) to list the features the mobile app needs (e.g., user authentication, fetching lessons, viewing assignments, teacher/student interactions).
    *   **Action:** Create a formal API specification document (e.g., using OpenAPI/Swagger). This document is the contract between the backend and the iOS app. It defines all endpoints, request/response payloads, and status codes.
    *   **Goal:** A written specification of the API that the mobile app will call.

2.  **Implement Token-Based Authentication:**
    *   **Action:** Extend the current authentication system (`src/auth.ts`) to support stateless, token-based authentication (e.g., JSON Web Tokens, or JWT).
    *   **Action:** Create new API endpoints:
        *   `POST /api/auth/login`: Accepts user credentials and returns a JWT.
        *   `POST /api/auth/register`: Creates a new user and returns a JWT.
    *   **Action:** Create a middleware to protect API routes by validating the JWT from the `Authorization` header.
    *   **Goal:** The mobile app can authenticate users without web sessions or cookies.

3.  **Develop & Refine API Endpoints:**
    *   **Action:** Based on the API specification, implement any new API routes required by the mobile app under `src/app/api/`.
    *   **Action:** Make sure all endpoints return only JSON and use appropriate HTTP status codes for success and error states.
    *   **Action:** Refactor existing business logic from server components or page routes into reusable functions within the `src/actions/` directory, so they can be shared between the web and mobile API endpoints.
    *   **Goal:** A JSON API endpoint for every feature of the mobile app.

## Phase 2: iOS application development (Swift & SwiftUI)

This phase builds the native iOS client.

1.  **Project Setup (Xcode):**
    *   **Action:** Initialize a new iOS project using Swift and the SwiftUI lifecycle.
    *   **Action:** Use the Model-View-ViewModel (MVVM) architecture, which keeps views, state, and networking in separate, testable layers.
    *   **Action:** Create the folder structure: `Models`, `Views`, `ViewModels`, `Services`.

2.  **Networking Layer:**
    *   **Action:** Create an `APIService` or `NetworkManager` class responsible for all communication with the backend.
    *   **Action:** Use `URLSession` and `async/await` to perform network requests.
    *   **Action:** Define Swift `struct`s that conform to `Codable` and match the JSON structures in the API specification, so responses decode without manual mapping.

3.  **Authentication & Session Management:**
    *   **Action:** Build the Login and Registration views using SwiftUI.
    *   **Action:** Connect the views to a view model that calls the `APIService` to authenticate the user and receive a JWT.
    *   **Action:** Store the received JWT in the system **Keychain**.
    *   **Action:** Modify the `APIService` to automatically attach the JWT to the `Authorization` header of all subsequent requests. Implement logic to handle token refresh or re-authentication when a token expires.

4.  **Feature Implementation:**
    *   **Action:** Build the main features of the app screen by screen (e.g., Dashboard, My Lessons, Profile).
    *   **Action:** For each feature, create the necessary `Views` (SwiftUI), `ViewModels` (business logic and state management), and update the `APIService` with any new endpoint calls.

## Phase 3: testing, deployment, and iteration

1.  **Testing:**
    *   **Backend:** Write integration tests for all new API endpoints covering success, error, and authentication cases.
    *   **iOS App:** Write unit tests for `ViewModels` and `Services` to verify business logic. Conduct UI testing and manual testing on a variety of physical devices and iOS versions.

2.  **Deployment:**
    *   **Backend:** Deploy the updated Next.js application to your hosting provider (e.g., Vercel).
    *   **iOS App:** Prepare the app for submission to the App Store, including creating assets, writing descriptions, and configuring privacy details.

3.  **Iteration:**
    *   **Action:** Monitor app performance and user feedback.
    *   **Action:** Use analytics to see how people use the app and to plan the next features.
