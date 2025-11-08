//
//  AuthService.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

// MARK: - Data Models

struct LoginRequest: Codable {
    let email: String
    let password: String
    let csrfToken: String
    let callbackUrl: String = "/"
    let json: Bool = true
}

struct SessionResponse: Codable {
    let user: User?
    let expires: String
    let csrfToken: String
}

struct User: Codable {
    let name: String?
    let email: String?
    let image: String?
}


// MARK: - AuthService

class AuthService {
    
    private let baseURL = URL(string: "http://localhost:3000/api/auth")!

    func getCsrfToken() async throws -> String {
        let url = baseURL.appendingPathComponent("session")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let session = try JSONDecoder().decode(SessionResponse.self, from: data)
        return session.csrfToken
    }

    func login(email: String, password: String) async throws {
        let csrfToken = try await getCsrfToken()
        
        let url = baseURL.appendingPathComponent("callback/credentials")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let loginRequest = LoginRequest(email: email, password: password, csrfToken: csrfToken)
        request.httpBody = try JSONEncoder().encode(loginRequest)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        // Handle the response data if necessary
        // For example, you might want to decode a user object from the response
        print("Login successful")
    }
}
