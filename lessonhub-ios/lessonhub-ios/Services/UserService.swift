//
//  UserService.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

struct UserProfile: Codable {
    let id: String
    let name: String?
    let email: String?
    let image: String?
    let role: String
}

struct SessionData: Codable {
    let user: UserProfile
}


class UserService {
    
    private let authBaseURL = URL(string: "\(Configuration.baseURL)/api/auth")!
    private let profileURL = URL(string: "\(Configuration.baseURL)/api/profile")!

    func getProfile() async throws -> UserProfile {
        let url = authBaseURL.appendingPathComponent("session")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let sessionData = try JSONDecoder().decode(SessionData.self, from: data)
        return sessionData.user
    }
    
    func logout() async throws {
        let url = authBaseURL.appendingPathComponent("signout")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "csrfToken": try await AuthService().getCsrfToken(),
            "json": true
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
    
    func getDetailedProfile() async throws -> ProfileUser {
        let (data, response) = try await URLSession.shared.data(from: profileURL)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let details = try JSONDecoder().decode(ProfileDetailsResponse.self, from: data)
        return details.user
    }
}
