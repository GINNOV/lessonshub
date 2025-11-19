//
//  AssignmentService.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

class AssignmentService {
    
    private let baseURL = URL(string: "\(Configuration.baseURL)/api")!

    func getAssignments() async throws -> [Assignment] {
        let url = baseURL.appendingPathComponent("my-lessons")
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let assignments = try JSONDecoder().decode([Assignment].self, from: data)
        return assignments
    }
}
