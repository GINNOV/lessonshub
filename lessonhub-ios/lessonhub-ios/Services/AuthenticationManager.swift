//
//  AuthenticationManager.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Combine
import SwiftUI
import Foundation

@MainActor
class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated: Bool
    
    private let defaults = UserDefaults.standard
    private enum Keys {
        static let isAuthenticated = "lessonhub.isAuthenticated"
    }
    
    init() {
        isAuthenticated = defaults.bool(forKey: Keys.isAuthenticated)
    }
    
    func login() {
        isAuthenticated = true
        defaults.set(true, forKey: Keys.isAuthenticated)
    }
    
    func logout() {
        isAuthenticated = false
        defaults.set(false, forKey: Keys.isAuthenticated)
    }
}
