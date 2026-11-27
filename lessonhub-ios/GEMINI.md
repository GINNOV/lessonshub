# Gemini notes for lessonhub-ios

## Project goal

This project is the native iOS companion app for the LessonHub platform. It gives students and teachers the core LessonHub features on iPhone and iPad.

## Tech stack

- **Language:** Swift
- **UI Framework:** SwiftUI
- **Architecture:** MVVM (Model-View-ViewModel) is preferred, to keep views, state, and networking separate.
- **Networking:** Use `URLSession` or a lightweight networking library to interact with the main LessonHub application's API.

## Development guidelines

- **API Integration:** All data should be fetched from the main LessonHub web application's API. Do not duplicate business logic on the client.
- **Authentication:** Use the same sign-in methods as the web app (e.g., OAuth, token-based auth), so a user has one session across both.
- **User Experience:** Follow Apple's Human Interface Guidelines (HIG).
- **Dependencies:** Keep third-party dependencies to a minimum.
