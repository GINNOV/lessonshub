//
//  Profile.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

struct ProfileDetailsResponse: Codable {
    let user: ProfileUser
    let loginHistory: [LoginHistoryEntry]
}

struct ProfileUser: Codable, Identifiable {
    let id: String
    let name: String?
    let email: String?
    let image: String?
    let role: String
    let timeZone: String?
    let weeklySummaryOptOut: Bool?
    let gender: String?
    let lastSeen: String?
    let isPaying: Bool?
    let isSuspended: Bool?
    let isTakingBreak: Bool?
    let totalPoints: Int?
    let studentBio: String?
}

struct LoginHistoryEntry: Codable, Identifiable {
    let id: String
    let timestamp: String
    let lessonId: String?
    let lessonTitle: String?
    
    var formattedDate: String {
        guard let date = Self.isoFormatter.date(from: timestamp) else { return timestamp }
        return Self.displayFormatter.string(from: date)
    }
    
    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    private static let displayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
