# Gemini-Specific Notes for lessonhub-ios

## Project Goal

This project is the native iOS companion app for the LessonHub platform. The primary goal is to provide a seamless and intuitive mobile experience for both students and teachers, allowing them to access core LessonHub features on their iPhones and iPads.

## Tech Stack

- **Language:** Swift
- **UI Framework:** SwiftUI
- **Architecture:** MVVM (Model-View-ViewModel) is preferred for a clean separation of concerns.
- **Networking:** Utilize `URLSession` or a lightweight networking library to interact with the main LessonHub application's API.

## Development Guidelines

- **API Integration:** All data should be fetched from the main LessonHub web application's API. Do not duplicate business logic on the client-side.
- **Authentication:** Implement authentication that mirrors the web app's methods (e.g., OAuth, token-based auth) to ensure a consistent user session.
- **User Experience:** Focus on creating a user-friendly and responsive interface that adheres to Apple's Human Interface Guidelines (HIG).
- **Dependencies:** Keep third-party dependencies to a minimum.
