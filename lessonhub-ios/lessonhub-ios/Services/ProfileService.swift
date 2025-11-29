//
//  ProfileService.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//


struct UpdateProfileRequest: Encodable {
    let name: String
    let timeZone: String
    let weeklySummaryOptOut: Bool
    let studentBio: String
    let gender: String
    
    enum CodingKeys: String, CodingKey {
        case name
        case timeZone
        case weeklySummaryOptOut
        case studentBio
        case gender
    }
}

class ProfileService {
    private let baseURL = URL(string: "\(Configuration.baseURL)/api/profile")!
    
    func fetchProfileDetails() async throws -> ProfileDetailsResponse {
        let (data, response) = try await URLSession.shared.data(from: baseURL)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(ProfileDetailsResponse.self, from: data)
    }
    
    func updateProfile(_ request: UpdateProfileRequest) async throws -> ProfileUser {
        var urlRequest = URLRequest(url: baseURL)
        urlRequest.httpMethod = "PATCH"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(ProfileUser.self, from: data)
    }
    
    func updateBreakStatus(isTakingBreak: Bool) async throws -> ProfileUser {
        var urlRequest = URLRequest(url: baseURL)
        urlRequest.httpMethod = "PATCH"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: ["isTakingBreak": isTakingBreak])
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(ProfileUser.self, from: data)
    }
    
    func updatePassword(newPassword: String) async throws {
        var urlRequest = URLRequest(url: baseURL)
        urlRequest.httpMethod = "PATCH"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: ["newPassword": newPassword])
        
        let (_, response) = try await URLSession.shared.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}
import Foundation
