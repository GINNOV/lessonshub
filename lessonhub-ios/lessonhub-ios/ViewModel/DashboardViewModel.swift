//
//  DashboardViewModel.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var welcomeMessage = "Welcome!"
    
    // We will add properties here to hold dashboard data,
    // like a list of lessons or assignments.
}
