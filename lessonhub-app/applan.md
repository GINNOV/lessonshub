# Plan: Building a Native iOS App for the LessonHub Platform

This document outlines the plan for creating a native iOS Swift application that complements the existing Next.js web application. The goal is to leverage the current backend infrastructure as much as possible, minimizing changes to the web platform while providing a rich native experience for mobile users.

## Phase 1: Backend Preparation & API Enhancement

The foundation of the mobile app is a robust and well-defined API. This phase focuses on preparing the Next.js backend to serve a mobile client.

1.  **API Audit & Specification:**
    *   **Action:** Analyze the existing data models (`prisma/schema.prisma`) and application logic (`src/actions/`, `src/app/api/`) to identify core functionalities required for the mobile app (e.g., user authentication, fetching lessons, viewing assignments, teacher/student interactions).
    *   **Action:** Create a formal API specification document (e.g., using OpenAPI/Swagger). This will serve as the contract between the backend and the iOS app, defining all endpoints, request/response payloads, and status codes.
    *   **Goal:** A clear blueprint for the API that the mobile app will consume.

2.  **Implement Token-Based Authentication:**
    *   **Action:** Augment the current authentication system (`src/auth.ts`) to support stateless, token-based authentication (e.g., JSON Web Tokens - JWT).
    *   **Action:** Create new API endpoints:
        *   `POST /api/auth/login`: Accepts user credentials and returns a JWT.
        *   `POST /api/auth/register`: Creates a new user and returns a JWT.
    *   **Action:** Create a middleware to protect API routes by validating the JWT from the `Authorization` header.
    *   **Goal:** A secure way for the mobile app to authenticate users without relying on web-specific sessions/cookies.

3.  **Develop & Refine API Endpoints:**
    *   **Action:** Based on the API specification, implement any new API routes required by the mobile app under `src/app/api/`.
    *   **Action:** Ensure all endpoints strictly return JSON data and use appropriate HTTP status codes for success and error states.
    *   **Action:** Refactor existing business logic from server components or page routes into reusable functions within the `src/actions/` directory, so they can be shared between the web and mobile API endpoints.
    *   **Goal:** A comprehensive set of JSON-based API endpoints for all mobile app functionalities.

## Phase 2: iOS Application Development (Swift & SwiftUI)

This phase involves building the native iOS client.

1.  **Project Setup (Xcode):**
    *   **Action:** Initialize a new iOS project using Swift and the SwiftUI lifecycle.
    *   **Action:** Establish a clear project architecture. Model-View-ViewModel (MVVM) is recommended for its testability and separation of concerns.
    *   **Action:** Create the folder structure: `Models`, `Views`, `ViewModels`, `Services`.

2.  **Networking Layer:**
    *   **Action:** Create a generic `APIService` or `NetworkManager` class responsible for all communication with the backend.
    *   **Action:** Use `URLSession` and `async/await` to perform network requests.
    *   **Action:** Define Swift `struct`s that conform to the `Codable` protocol, mirroring the JSON structures defined in the API specification for easy decoding.

3.  **Authentication & Session Management:**
    *   **Action:** Build the Login and Registration views using SwiftUI.
    *   **Action:** Connect the views to a view model that calls the `APIService` to authenticate the user and receive a JWT.
    *   **Action:** Securely store the received JWT on the device using the system **Keychain**.
    *   **Action:** Modify the `APIService` to automatically attach the JWT to the `Authorization` header of all subsequent requests. Implement logic to handle token refresh or re-authentication when a token expires.

4.  **Feature Implementation:**
    *   **Action:** Develop the primary features of the app screen by screen (e.g., Dashboard, My Lessons, Profile).
    *   **Action:** For each feature, create the necessary `Views` (SwiftUI), `ViewModels` (business logic and state management), and update the `APIService` with any new endpoint calls.
    *   **Action:** Focus on creating a responsive, intuitive, and native user experience.

## Phase 3: Testing, Deployment, and Iteration

1.  **Testing:**
    *   **Backend:** Write integration tests for all new API endpoints to ensure they are reliable and secure.
    *   **iOS App:** Write unit tests for `ViewModels` and `Services` to verify business logic. Conduct UI testing and manual testing on a variety of physical devices and iOS versions.

2.  **Deployment:**
    *   **Backend:** Deploy the updated Next.js application to your hosting provider (e.g., Vercel).
    *   **iOS App:** Prepare the app for submission to the App Store, including creating assets, writing descriptions, and configuring privacy details.

3.  **Iteration:**
    *   **Action:** Monitor app performance and user feedback.
    s   **Action:** Use analytics to understand user behavior and plan for future feature enhancements.
