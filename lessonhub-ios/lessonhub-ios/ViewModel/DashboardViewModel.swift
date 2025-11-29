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
    @Published var assignments: [Assignment] = []
    @Published var userProfile: UserProfile?
    @Published var profileDetails: ProfileUser?
    @Published var hubGuides: [HubGuide] = []
    
    private let userService = UserService()
    private let assignmentService = AssignmentService()
    private let profileService = ProfileService()
    
    func onAppear() {
        Task {
            await fetchProfile()
            await fetchAssignments()
        }
    }

    private func fetchProfile() async {
        do {
            async let basicProfile = userService.getProfile()
            async let detailedProfile = profileService.fetchProfileDetails()
            
            let (user, details) = try await (basicProfile, detailedProfile)
            welcomeMessage = "Welcome, \(user.name ?? "User")!"
            userProfile = user
            profileDetails = details.user
            hubGuides = details.hubGuides ?? []
        } catch {
            print("Error fetching profile: \(error)")
            // Handle error, maybe show a default welcome message
        }
    }

    private func fetchAssignments() async {
        do {
            assignments = try await assignmentService.getAssignments()
        } catch {
            print("Error fetching assignments: \(error)")
            // Handle error, maybe show an empty state or error message
        }
    }
}
