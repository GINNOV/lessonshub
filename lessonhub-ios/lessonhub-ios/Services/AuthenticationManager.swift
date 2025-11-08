//
//  AuthenticationManager.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Combine
import SwiftUI

@MainActor
class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    
    func login() {
        // This will be called after a successful API login
        isAuthenticated = true
    }
    
    func logout() {
        // This will clear the user's session
        isAuthenticated = false
    }
}
