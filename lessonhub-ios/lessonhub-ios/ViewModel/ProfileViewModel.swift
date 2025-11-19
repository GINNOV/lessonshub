//
//  ProfileViewModel.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import Foundation
import Combine
import SwiftUI

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var profile: ProfileUser?
    @Published var loginHistory: [LoginHistoryEntry] = []
    @Published var name: String = ""
    @Published var email: String = ""
    @Published var timeZone: String = TimeZone.current.identifier
    @Published var studentBio: String = ""
    @Published var weeklySummaryOptOut: Bool = false
    @Published var gender: String = "BINARY"
    @Published var isTakingBreak: Bool = false
    @Published var isUpdatingBreak = false
    @Published var newPassword: String = ""
    @Published var confirmPassword: String = ""
    @Published var isUpdatingPassword = false
    @Published var isLoading = false
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private let profileService = ProfileService()
    
    let timeZones: [String] = TimeZone.knownTimeZoneIdentifiers.sorted()
    let genderOptions: [String] = ["FEMALE", "MALE", "BINARY"]
    
    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let details = try await profileService.fetchProfileDetails()
            apply(details)
        } catch {
            errorMessage = "Unable to load your profile. Please try again."
            print("Profile load error: \(error)")
        }
    }
    
    func saveProfile() async {
        guard !isSaving else { return }
        isSaving = true
        defer { isSaving = false }
        
        do {
            let request = UpdateProfileRequest(
                name: name,
                timeZone: timeZone,
                weeklySummaryOptOut: weeklySummaryOptOut,
                studentBio: studentBio,
                gender: gender
            )
            let updatedUser = try await profileService.updateProfile(request)
            profile = updatedUser
            successMessage = "Profile updated successfully."
        } catch {
            errorMessage = "Unable to save your profile right now."
            print("Profile save error: \(error)")
        }
    }
    
    func updateBreakStatus(to value: Bool) async {
        guard !isUpdatingBreak else { return }
        isUpdatingBreak = true
        defer { isUpdatingBreak = false }
        
        do {
            let updatedUser = try await profileService.updateBreakStatus(isTakingBreak: value)
            profile = updatedUser
            isTakingBreak = updatedUser.isTakingBreak ?? value
            successMessage = updatedUser.isTakingBreak == true ? "Lessons paused." : "Lessons resumed."
        } catch {
            isTakingBreak.toggle()
            errorMessage = "Unable to update your break status."
            print("Break status error: \(error)")
        }
    }
    
    func changePassword() async {
        guard !isUpdatingPassword else { return }
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords do not match."
            return
        }
        guard newPassword.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return
        }
        
        isUpdatingPassword = true
        defer { isUpdatingPassword = false }
        
        do {
            try await profileService.updatePassword(newPassword: newPassword)
            newPassword = ""
            confirmPassword = ""
            successMessage = "Password updated successfully."
        } catch {
            errorMessage = "Unable to update password."
            print("Password change error: \(error)")
        }
    }
    
    private func apply(_ details: ProfileDetailsResponse) {
        profile = details.user
        loginHistory = details.loginHistory
        name = details.user.name ?? ""
        email = details.user.email ?? ""
        timeZone = details.user.timeZone ?? TimeZone.current.identifier
        studentBio = details.user.studentBio ?? ""
        weeklySummaryOptOut = details.user.weeklySummaryOptOut ?? false
        gender = details.user.gender?.uppercased() ?? "BINARY"
        isTakingBreak = details.user.isTakingBreak ?? false
    }
}
