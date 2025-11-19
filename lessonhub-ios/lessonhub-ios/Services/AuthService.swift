//
//  AuthService.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

// MARK: - Data Models

struct LoginRequest: Encodable {
    let email: String
    let password: String
    let csrfToken: String
    let callbackUrl: String = "/"
    let json: Bool = true
    let redirect: Bool = false
}

struct CsrfResponse: Codable {
    let csrfToken: String
}


// MARK: - AuthService

class AuthService {
    
    private let baseURL = URL(string: "\(Configuration.baseURL)/api/auth")!

    func getCsrfToken() async throws -> String {
        let url = baseURL.appendingPathComponent("csrf")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let csrf = try JSONDecoder().decode(CsrfResponse.self, from: data)
        return csrf.csrfToken
    }

    func login(email: String, password: String) async throws {
        let csrfToken = try await getCsrfToken()
        
        let url = baseURL.appendingPathComponent("callback/credentials")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let loginRequest = LoginRequest(email: email, password: password, csrfToken: csrfToken)
        request.httpBody = try JSONEncoder().encode(loginRequest)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        // Handle the response data if necessary
        // For example, you might want to decode a user object from the response
        print("Login successful")
    }
}
