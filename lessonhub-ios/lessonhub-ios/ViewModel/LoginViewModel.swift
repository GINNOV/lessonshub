import Combine
import SwiftUI

@MainActor
class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService()
    
    func login(authManager: AuthenticationManager) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authService.login(email: email, password: password)
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
