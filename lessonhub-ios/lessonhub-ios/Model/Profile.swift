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
    let hubGuides: [HubGuide]?
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
    let progressCardTitle: String?
    let progressCardBody: String?
    let progressCardLinkText: String?
    let progressCardLinkUrl: String?
    let progressTotalValue: Double?
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

struct HubGuide: Codable, Identifiable {
    let id: String
    let title: String
    let summary: String?
    let description: String?
    let url: String?
    let link: String?
    let path: String?
    let coverImage: String?
    let coverImageUrl: String?
    let image: String?
    let tags: [String]?
    let tagList: [String]?
    let estimatedTime: String?
    let readTime: String?
    let difficulty: String?
    let level: String?
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        if let stringID = try? container.decode(String.self, forKey: .id) {
            id = stringID
        } else if let intID = try? container.decode(Int.self, forKey: .id) {
            id = String(intID)
        } else if let uuidID = try? container.decode(UUID.self, forKey: .id) {
            id = uuidID.uuidString
        } else {
            throw DecodingError.keyNotFound(CodingKeys.id, DecodingError.Context(codingPath: container.codingPath, debugDescription: "Missing HubGuide identifier"))
        }
        
        title = try container.decode(String.self, forKey: .title)
        summary = try container.decodeIfPresent(String.self, forKey: .summary)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        link = try container.decodeIfPresent(String.self, forKey: .link)
        path = try container.decodeIfPresent(String.self, forKey: .path)
        coverImage = try container.decodeIfPresent(String.self, forKey: .coverImage)
        coverImageUrl = try container.decodeIfPresent(String.self, forKey: .coverImageUrl)
        image = try container.decodeIfPresent(String.self, forKey: .image)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        tagList = try container.decodeIfPresent([String].self, forKey: .tagList)
        estimatedTime = try container.decodeIfPresent(String.self, forKey: .estimatedTime)
        readTime = try container.decodeIfPresent(String.self, forKey: .readTime)
        difficulty = try container.decodeIfPresent(String.self, forKey: .difficulty)
        level = try container.decodeIfPresent(String.self, forKey: .level)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(summary, forKey: .summary)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(url, forKey: .url)
        try container.encodeIfPresent(link, forKey: .link)
        try container.encodeIfPresent(path, forKey: .path)
        try container.encodeIfPresent(coverImage, forKey: .coverImage)
        try container.encodeIfPresent(coverImageUrl, forKey: .coverImageUrl)
        try container.encodeIfPresent(image, forKey: .image)
        try container.encodeIfPresent(tags, forKey: .tags)
        try container.encodeIfPresent(tagList, forKey: .tagList)
        try container.encodeIfPresent(estimatedTime, forKey: .estimatedTime)
        try container.encodeIfPresent(readTime, forKey: .readTime)
        try container.encodeIfPresent(difficulty, forKey: .difficulty)
        try container.encodeIfPresent(level, forKey: .level)
    }
    
    private enum CodingKeys: String, CodingKey {
        case id
        case title
        case summary
        case description
        case url
        case link
        case path
        case coverImage
        case coverImageUrl
        case image
        case tags
        case tagList
        case estimatedTime
        case readTime
        case difficulty
        case level
    }
    
    var displaySummary: String? {
        summary ?? description
    }
    
    var destinationURL: URL? {
        guard let raw = url ?? link ?? path, !raw.isEmpty else { return nil }
        if let absolute = URL(string: raw), absolute.scheme != nil {
            return absolute
        }
        return URL(string: raw, relativeTo: URL(string: Configuration.baseURL))
    }
    
    var coverImageURL: URL? {
        guard let raw = coverImage ?? coverImageUrl ?? image, !raw.isEmpty else { return nil }
        if let absolute = URL(string: raw), absolute.scheme != nil {
            return absolute
        }
        return URL(string: raw, relativeTo: URL(string: Configuration.baseURL))
    }
    
    var normalizedDifficulty: String? {
        (difficulty ?? level)?.uppercased()
    }
    
    var displayTags: [String] {
        tags ?? tagList ?? []
    }
    
    var displayEstimatedTime: String? {
        estimatedTime ?? readTime
    }
}
