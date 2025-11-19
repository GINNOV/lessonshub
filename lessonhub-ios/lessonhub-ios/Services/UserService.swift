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
    
    private let baseURL = URL(string: "\(Configuration.baseURL)/api/auth")!

    func getProfile() async throws -> UserProfile {
        let url = baseURL.appendingPathComponent("session")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let sessionData = try JSONDecoder().decode(SessionData.self, from: data)
        return sessionData.user
    }
}
