import Combine
import SwiftUI
import Foundation

@MainActor
class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService()
    private let defaults = UserDefaults.standard
    private enum Keys {
        static let lastLoginEmail = "lessonhub.lastLoginEmail"
    }
    
    init() {
        email = defaults.string(forKey: Keys.lastLoginEmail) ?? ""
    }
    
    private func rememberEmail(_ email: String) {
        defaults.set(email, forKey: Keys.lastLoginEmail)
    }
    
    func login(authManager: AuthenticationManager) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.login(email: email, password: password)
                rememberEmail(email)
                authManager.login()
                print("Login successful from ViewModel")
            } catch {
                errorMessage = "Login failed. Please check your credentials."
                print("Login error: \(error)")
            }
            isLoading = false
        }
    }
}
