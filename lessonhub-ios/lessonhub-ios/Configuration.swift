//
//  Configuration.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation

struct Configuration {
#if DEBUG && targetEnvironment(simulator)
    static let baseURL = "http://localhost:3000"
#else
    static let baseURL = "https://lessonshub.vercel.app"
#endif
}
