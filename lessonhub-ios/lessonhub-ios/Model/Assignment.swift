//
//  Assignment.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

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
        guard let date = deadlineDate else { return lesson.title }
        let weekday = Self.weekdayFormatter.string(from: date).uppercased()
        return "Lesson \(weekLabel.replacingOccurrences(of: "Week ", with: "")) - \(weekday)"
    }
    
    var isPastDue: Bool {
        guard let date = deadlineDate else { return false }
        return date < Date() && normalizedStatus == .pending
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
