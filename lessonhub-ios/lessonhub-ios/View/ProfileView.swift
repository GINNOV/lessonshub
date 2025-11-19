//
//  ProfileView.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import SwiftUI

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var selectedTab: ProfileTab = .profile
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading profile…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            introSection
                            tabPicker
                            tabContent
                        }
                        .padding(20)
                    }
                    .background(Color(.systemGroupedBackground))
                }
            }
            .navigationTitle("Control Center")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await viewModel.loadProfile() }
            .alert("Notice", isPresented: Binding(
                get: { viewModel.errorMessage != nil || viewModel.successMessage != nil },
                set: { _ in
                    viewModel.errorMessage = nil
                    viewModel.successMessage = nil
                }
            )) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(viewModel.errorMessage ?? viewModel.successMessage ?? "")
            }
        }
    }
    
    private var introSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Control Center")
                .font(.system(size: 32, weight: .bold, design: .rounded))
            Text("Update your profile and review recent activity.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var tabPicker: some View {
        HStack(spacing: 8) {
            ForEach(ProfileTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    Text(tab.title)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(selectedTab == tab ? Color.white : Color.clear)
                        )
                        .foregroundColor(selectedTab == tab ? .primary : .secondary)
                }
            }
        }
        .padding(6)
        .background(Color.white.opacity(0.9), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
    
    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .profile:
            VStack(spacing: 24) {
                headerCard
                profileForm
                loginHistorySection
            }
        case .billing:
            placeholderCard(title: "Billing", message: "Manage payments from the LessonHUB web dashboard.")
        case .password:
            passwordCard
        case .breakTime:
            breakCard
        }
    }
    
    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 72, height: 72)
                    Text(initials(from: viewModel.name))
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.name.isEmpty ? "LessonHUB Student" : viewModel.name)
                        .font(.title2.bold())
                    Text(viewModel.email)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    if let role = viewModel.profile?.role {
                        Text(role.capitalized)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .clipShape(Capsule())
                    }
                }
                Spacer()
            }
            
            if let points = viewModel.profile?.totalPoints {
                Label("\(points) pts earned", systemImage: "sparkles")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 8)
    }
    
    private var profileForm: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Update Profile")
                    .font(.title3.bold())
                Text("Keep your LessonHUB identity up to date for teachers and classmates.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            profilePictureRow
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Name")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("Enter your name", text: $viewModel.name)
                    .textFieldStyle(.roundedBorder)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Email")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("", text: .constant(viewModel.email))
                    .textFieldStyle(.roundedBorder)
                    .disabled(true)
                    .foregroundColor(.secondary)
                Text("Email addresses cannot be changed.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Gender")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Picker("Gender", selection: $viewModel.gender) {
                    ForEach(viewModel.genderOptions, id: \.self) { option in
                        Text(option.capitalized).tag(option)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            
            Toggle(isOn: $viewModel.weeklySummaryOptOut) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Weekly summary emails")
                    Text("Receive a Sunday recap of your accomplishments.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .yellow))
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Timezone")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Picker(selection: $viewModel.timeZone, label: menuLabel(for: viewModel.timeZone)) {
                    ForEach(viewModel.timeZones, id: \.self) { zone in
                        Text(zone).tag(zone)
                    }
                }
                .pickerStyle(.menu)
            }
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Bio")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextEditor(text: $viewModel.studentBio)
                    .frame(minHeight: 120)
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                Text("Shown on your leaderboard profile so classmates can get to know you.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Button {
                Task { await viewModel.saveProfile() }
            } label: {
                if viewModel.isSaving {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Save Profile Changes")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
            .background(Color.yellow)
            .foregroundColor(.black)
            .cornerRadius(16)
            .disabled(viewModel.isSaving)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
    }
    
    private var profilePictureRow: some View {
        HStack(spacing: 16) {
            AvatarButton(imageURL: viewModel.profile?.image, name: viewModel.name, size: 60)
            VStack(alignment: .leading, spacing: 4) {
                Text("Profile Picture")
                    .font(.headline)
                Text("Change your photo from the LessonHUB website.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Button(action: {}) {
                Text("Upload")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground), in: Capsule())
            }
            .disabled(true)
            .opacity(0.5)
        }
    }
    
    private var loginHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Activity")
                .font(.headline)
            if viewModel.loginHistory.isEmpty {
                Text("No login history yet.")
                    .foregroundColor(.secondary)
            } else {
                ForEach(viewModel.loginHistory) { entry in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.lessonTitle ?? "LessonHub")
                            .fontWeight(.semibold)
                        Text(entry.formattedDate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
    }
    
    private func placeholderCard(title: String, message: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3.bold())
            Text(message)
                .foregroundColor(.secondary)
            Button("Open on Web") {
                if let url = URL(string: "\(Configuration.baseURL)/profile") {
                    openURL(url)
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
    }
    
    private var passwordCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Password")
                .font(.title3.bold())
            Text("Set a new password to keep your account secure.")
                .foregroundColor(.secondary)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("New Password")
                    .font(.caption)
                    .foregroundColor(.secondary)
                SecureField("Enter new password", text: $viewModel.newPassword)
                    .textFieldStyle(.roundedBorder)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Confirm Password")
                    .font(.caption)
                    .foregroundColor(.secondary)
                SecureField("Re-enter new password", text: $viewModel.confirmPassword)
                    .textFieldStyle(.roundedBorder)
            }
            
            Text("Use at least 8 characters. Changing your password does not sign you out automatically.")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Button {
                Task { await viewModel.changePassword() }
            } label: {
                if viewModel.isUpdatingPassword {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle())
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Update Password")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(16)
            .disabled(viewModel.isUpdatingPassword)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
    }
    
    private var breakCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Break(up) time")
                .font(.title3.bold())
            Text("Pause lessons if you need time off. You can resume whenever you're ready.")
                .foregroundColor(.secondary)
            
            Toggle(isOn: Binding(
                get: { viewModel.isTakingBreak },
                set: { newValue in
                    viewModel.isTakingBreak = newValue
                    Task { await viewModel.updateBreakStatus(to: newValue) }
                }
            )) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.isTakingBreak ? "Lessons are paused" : "Lessons are active")
                        .fontWeight(.semibold)
                    Text(viewModel.isTakingBreak ? "Teachers will know you're unavailable." : "You'll receive assignments normally.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .green))
            .disabled(viewModel.isUpdatingBreak)
            
            if viewModel.isUpdatingBreak {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle())
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
    }
    
    private func menuLabel(for timeZone: String) -> some View {
        HStack {
            Text(timeZone)
                .foregroundColor(.primary)
            Spacer()
            Image(systemName: "chevron.down")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
    
    private func initials(from name: String) -> String {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "LH" }
        let components = trimmed.split(separator: " ")
        if components.count >= 2 {
            return "\(components.first?.first ?? Character("L"))\(components.last?.first ?? Character("H"))".uppercased()
        }
        return String(trimmed.prefix(2)).uppercased()
    }
}

#Preview {
    ProfileView()
}

private enum ProfileTab: String, CaseIterable, Identifiable {
    case profile
    case billing
    case password
    case breakTime
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .profile: return "Profile"
        case .billing: return "Billing"
        case .password: return "Password"
        case .breakTime: return "Break(up) time"
        }
    }
}
