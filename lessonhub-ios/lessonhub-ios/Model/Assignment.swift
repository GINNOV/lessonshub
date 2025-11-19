//
//  Assignment.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation
import SwiftUI

struct Assignment: Codable, Identifiable {
    let id: String
    let studentId: String
    let lessonId: String
    let deadline: String
    let status: String
    let pointsAwarded: Int
    let teacherAnswerComments: String?
    let lesson: Lesson
}

struct Lesson: Codable, Identifiable {
    let id: String
    let title: String
    let assignment_text: String
    let lesson_preview: String?
    let assignment_image_url: String?
    let price: Double
    let completionCount: Int
    let submittedCount: Int
    let teacher: Teacher?
    let type: String?
    let difficulty: Int?
}

struct Teacher: Codable, Identifiable {
    let id: String
    let name: String?
    let email: String?
    let image: String?
    let defaultLessonPrice: Double?
}

// MARK: - Presentation Helpers

extension Assignment {
    var normalizedStatus: AssignmentStatusCategory {
        AssignmentStatusCategory(rawValue: status.lowercased()) ?? .pending
    }
    
    var deadlineDate: Date? {
        Self.dateFormatter.date(from: deadline) ?? Self.isoFormatter.date(from: deadline)
    }
    
    var weekLabel: String {
        guard let date = deadlineDate else { return "Upcoming" }
        let week = Calendar.current.component(.weekOfYear, from: date)
        return "Week \(week)"
    }
    
    var dueDateDescription: String {
        guard let date = deadlineDate else { return deadline }
        return Self.displayDateFormatter.string(from: date)
    }
    
    var lessonSubtitle: String {
        guard let date = deadlineDate else { return lesson.title.uppercased() }
        let weekday = Self.weekdayFormatter.string(from: date).uppercased()
        let week = weekLabel.replacingOccurrences(of: "Week ", with: "")
        return "LESSON \(week) — \(weekday)"
    }
    
    var isPastDue: Bool {
        guard let date = deadlineDate else { return false }
        return date < Date() && normalizedStatus == .pending
    }
    
    var lessonProgress: Double {
        guard lesson.completionCount > 0 else { return 0 }
        return Double(lesson.submittedCount) / Double(lesson.completionCount)
    }
    
    var lessonHeroImageURL: String {
        if let url = lesson.assignment_image_url, !url.isEmpty {
            return url
        }
        if let type = lesson.type {
            switch type.uppercased() {
            case "FLASHCARD":
                return "/my-lessons/flashcard.png"
            case "MULTI_CHOICE":
                return "/my-lessons/multiquestions.png"
            case "LEARNING_SESSION", "LYRIC":
                return "/my-lessons/learning.png"
            default:
                return "/my-lessons/standard.png"
            }
        }
        return "/my-lessons/standard.png"
    }
    
    var formattedPreview: String {
        let source = lesson.lesson_preview ?? lesson.assignment_text
        return Assignment.cleanMarkdown(from: source)
    }
    
    var difficultyLabel: String {
        switch clampedDifficulty {
        case 1: return "Super Simple"
        case 2: return "Approachable"
        case 3: return "Intermediate"
        case 4: return "Challenging"
        case 5: return "Advanced"
        default: return "Intermediate"
        }
    }
    
    var difficultyColor: Color {
        switch clampedDifficulty {
        case 1: return Color(red: 0.0, green: 0.6, blue: 0.3)
        case 2: return Color(red: 0.47, green: 0.73, blue: 0.2)
        case 3: return Color.orange
        case 4: return Color(red: 0.9, green: 0.4, blue: 0.0)
        case 5: return Color.red
        default: return Color.green
        }
    }
    
    private var clampedDifficulty: Int {
        min(max(lesson.difficulty ?? 3, 1), 5)
    }
    
    private static func cleanMarkdown(from text: String) -> String {
        let stripped = text.replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "\r", with: " ")
        var cleaned = stripped
        let patterns = ["\\*\\*", "__", "_", "\\*", "`", "~", "#", "-", "\\[", "\\]", "\\(", "\\)"]
        for pattern in patterns {
            cleaned = cleaned.replacingOccurrences(of: pattern, with: "", options: .regularExpression)
        }
        cleaned = cleaned.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()
    
    private static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter
    }()
    
    private static let weekdayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "E"
        return formatter
    }()
}

enum AssignmentStatusCategory: String, CaseIterable {
    case pending
    case graded
    case failed
    case submitted
}

extension AssignmentStatusCategory {
    var displayName: String {
        rawValue.capitalized
    }
}
