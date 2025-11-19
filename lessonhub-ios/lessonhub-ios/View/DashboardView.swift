import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var authManager: AuthenticationManager
    @Environment(\.openURL) private var openURL
    
    @State private var selectedTab: DashboardTab = .lessons
    @State private var selectedFilter: AssignmentFilter = .all
    @State private var searchText = ""
    @State private var isProfilePresented = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    header
                    overviewSection
                    tabs
                    searchAndFilters
                    contentSection
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
            .background(Color(.systemGroupedBackground))
            .toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $isProfilePresented) {
                ProfileView()
            }
            .onAppear {
                viewModel.onAppear()
            }
        }
    }
    
    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text("LessonHUB")
                    .font(.system(.largeTitle, design: .rounded))
                    .fontWeight(.bold)
                Text("👋 \(viewModel.welcomeMessage)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Menu {
                if let email = viewModel.userProfile?.email {
                    Text(email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Button("Profile") { isProfilePresented = true }
                Button("What's new") { openWebPath("/changelog") }
                Button("Referral dashboard") { openWebPath("/referrals") }
                Button("Rate your teacher") { openWebPath("/rate-teacher") }
                Button("Send Feedback") { sendFeedbackEmail() }
                Divider()
                Button(role: .destructive) {
                    Task { await logoutAndReset() }
                } label: {
                    Text("Sign Out")
                }
            } label: {
                AvatarButton(imageURL: viewModel.userProfile?.image)
            }
        }
    }
    
    private var overviewSection: some View {
        ViewThatFits {
            HStack(alignment: .top, spacing: 16) {
                progressCard
                summaryCard
            }
            VStack(spacing: 16) {
                progressCard
                summaryCard
            }
        }
    }
    
    private var progressCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("My Progress")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.8))
                Spacer()
                Image(systemName: "arrow.up.right")
                    .foregroundColor(.white.opacity(0.7))
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text(totalValue, format: .currency(code: "EUR"))
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Text("\(totalPoints) pts earned")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Invest in your future – 🚀")
                    .foregroundColor(.white)
                Text("Click the links on the web to explore LessonHUB benefits.")
                    .font(.footnote)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(colors: [.indigo, .purple],
                           startPoint: .topLeading,
                           endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
    
    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Assignment Summary")
                .font(.headline)
            
            LazyVGrid(columns: summaryGridColumns, spacing: 16) {
                ForEach(summaryItems) { item in
                    VStack(spacing: 8) {
                        Circle()
                            .fill(item.color.opacity(0.16))
                            .frame(width: 56, height: 56)
                            .overlay(
                                Image(systemName: item.icon)
                                    .font(.title3)
                                    .foregroundColor(item.color)
                            )
                        
                        VStack(spacing: 2) {
                            Text("\(item.value)")
                                .font(.headline)
                            Text(item.title)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
            }
            
            Text("Aggiorna il tuo profilo con una bio per farti conoscere dagli altri studenti.")
                .font(.footnote)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 8)
    }

    private var summaryGridColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 16), count: 3)
    }
    
    private var tabs: some View {
        HStack(spacing: 8) {
            ForEach(DashboardTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    Text(tab.title)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            Group {
                                if selectedTab == tab {
                                    Color.white
                                } else {
                                    Color.clear
                                }
                            }
                        )
                        .foregroundColor(selectedTab == tab ? .primary : .secondary)
                        .cornerRadius(14)
                }
            }
        }
        .padding(6)
        .background(Color.white.opacity(0.8))
        .clipShape(Capsule())
        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
    
    private var searchAndFilters: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search by title or teacher…", text: $searchText)
                    .textInputAutocapitalization(.never)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(AssignmentFilter.allCases) { filter in
                        Button {
                            selectedFilter = filter
                        } label: {
                            Text(filter.label)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(
                                    filterBackground(for: filter)
                                )
                                .foregroundColor(filterForeground(for: filter))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(filter == selectedFilter ? Color.blue : Color.clear, lineWidth: 1)
                                )
                        }
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private var contentSection: some View {
        switch selectedTab {
        case .lessons:
            if groupedAssignments.isEmpty {
                emptyState
            } else {
                VStack(spacing: 24) {
                    ForEach(groupedAssignments) { section in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 8) {
                                Text(section.title)
                                    .font(.headline)
                                Image(systemName: "calendar")
                                    .foregroundColor(.secondary)
                            }
                            
                            VStack(spacing: 16) {
                                ForEach(section.assignments) { assignment in
                                    AssignmentCard(assignment: assignment)
                                }
                            }
                        }
                    }
                }
            }
        case .hubGuides:
            VStack(spacing: 12) {
                Text("Hub Guides")
                    .font(.title2.bold())
                Text("Le guide saranno presto disponibili nell'app.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 44))
                .foregroundColor(.secondary)
            Text("No assignments found")
                .font(.headline)
            Text("Try adjusting your filters or check back later.")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    
    private var totalPoints: Int {
        viewModel.assignments.reduce(0) { $0 + $1.pointsAwarded }
    }
    
    private var totalValue: Double {
        viewModel.assignments.reduce(0) { $0 + $1.lesson.price }
    }
    
    private var summaryItems: [SummaryItem] {
        [
            SummaryItem(title: "Total", value: viewModel.assignments.count, icon: "square.stack.3d.up", color: .primary),
            SummaryItem(title: "Pending", value: count(for: .pending), icon: "clock.badge.exclamationmark", color: .orange),
            SummaryItem(title: "Submitted", value: count(for: .submitted), icon: "tray.full", color: .blue),
            SummaryItem(title: "Graded", value: count(for: .graded), icon: "checkmark.seal.fill", color: .green),
            SummaryItem(title: "Past Due", value: pastDueCount, icon: "calendar.badge.exclamationmark", color: .red),
            SummaryItem(title: "Failed", value: count(for: .failed), icon: "xmark.octagon.fill", color: .pink)
        ]
    }
    
    private var pastDueCount: Int {
        viewModel.assignments.filter(\.isPastDue).count
    }
    
    private func count(for status: AssignmentStatusCategory) -> Int {
        viewModel.assignments.filter { $0.normalizedStatus == status }.count
    }
    
    private func logoutAndReset() async {
        do {
            try await UserService().logout()
        } catch {
            print("Logout failed: \(error)")
        }
        await MainActor.run {
            authManager.logout()
        }
    }
    
    private func openWebPath(_ path: String) {
        guard let url = URL(string: "\(Configuration.baseURL)\(path)") else { return }
        openURL(url)
    }
    
    private func sendFeedbackEmail() {
        if let url = URL(string: "mailto:hello@lessonhub.school") {
            openURL(url)
        }
    }
    
    private var filteredAssignments: [Assignment] {
        viewModel.assignments.filter { assignment in
            filterMatches(assignment)
        }
        .filter { assignment in
            searchText.isEmpty ||
            assignment.lesson.title.localizedCaseInsensitiveContains(searchText) ||
            (assignment.lesson.teacher?.name ?? "").localizedCaseInsensitiveContains(searchText)
        }
        .sorted {
            ($0.deadlineDate ?? .distantFuture) > ($1.deadlineDate ?? .distantFuture)
        }
    }
    
    private func filterMatches(_ assignment: Assignment) -> Bool {
        switch selectedFilter {
        case .all:
            return true
        case .pending:
            return assignment.normalizedStatus == .pending
        case .graded:
            return assignment.normalizedStatus == .graded
        case .failed:
            return assignment.normalizedStatus == .failed
        case .submitted:
            return assignment.normalizedStatus == .submitted
        }
    }
    
    private var groupedAssignments: [AssignmentSection] {
        let grouped = Dictionary(grouping: filteredAssignments) { $0.weekLabel }
        return grouped.map { key, value in
            AssignmentSection(title: key, assignments: value.sorted {
                ($0.deadlineDate ?? .distantFuture) > ($1.deadlineDate ?? .distantFuture)
            })
        }
        .sorted { lhs, rhs in
            let lhsDate = lhs.assignments.first?.deadlineDate ?? .distantPast
            let rhsDate = rhs.assignments.first?.deadlineDate ?? .distantPast
            return lhsDate > rhsDate
        }
    }
    
    private func filterBackground(for filter: AssignmentFilter) -> some View {
        Group {
            if filter == selectedFilter {
                Color.white
            } else {
                Color(.systemGray6)
            }
        }
        .clipShape(Capsule())
    }
    
    private func filterForeground(for filter: AssignmentFilter) -> Color {
        filter == selectedFilter ? .blue : .primary
    }
}

private struct SummaryItem: Identifiable {
    let id = UUID()
    let title: String
    let value: Int
    let icon: String
    let color: Color
}

private struct AssignmentSection: Identifiable {
    let title: String
    let assignments: [Assignment]
    
    var id: String { title }
}

private struct AssignmentCard: View {
    let assignment: Assignment
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                LessonPreviewImage(urlString: assignment.lesson.assignment_image_url)
                VStack(alignment: .leading, spacing: 4) {
                    Text(assignment.lessonSubtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(assignment.lesson.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(assignment.lesson.assignment_text)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                Spacer()
                StatusBadge(status: assignment.normalizedStatus)
            }
            
            Divider()
            
            HStack {
                Label(assignment.lesson.teacher?.name ?? "Unknown", systemImage: "person.fill")
                    .foregroundColor(.secondary)
                Spacer()
                Label("\(assignment.lesson.submittedCount) of \(assignment.lesson.completionCount)", systemImage: "person.2.fill")
                    .foregroundColor(.secondary)
            }
            .font(.footnote)
            
            HStack {
                LevelBadge(price: assignment.lesson.price)
                Spacer()
                Label("Due \(assignment.dueDateDescription)", systemImage: "calendar")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 6)
    }
}

private struct LessonPreviewImage: View {
    let urlString: String?
    
    var body: some View {
        Group {
            if let urlString, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure(_):
                        placeholder
                    case .empty:
                        ProgressView()
                    @unknown default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: 90, height: 70)
        .background(Color(.systemGray5))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
    
    private var placeholder: some View {
        ZStack {
            LinearGradient(colors: [.orange.opacity(0.6), .pink.opacity(0.6)], startPoint: .top, endPoint: .bottom)
            Image(systemName: "graduationcap")
                .foregroundColor(.white)
        }
    }
}

private struct StatusBadge: View {
    let status: AssignmentStatusCategory
    
    var body: some View {
        Text(status.displayName)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(backgroundColor.opacity(0.15))
            .foregroundColor(backgroundColor)
            .clipShape(Capsule())
    }
    
    private var backgroundColor: Color {
        switch status {
        case .pending: return .orange
        case .graded: return .green
        case .failed: return .red
        case .submitted: return .blue
        }
    }
}

private struct LevelBadge: View {
    let price: Double
    
    var body: some View {
        Text(label)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.green.opacity(0.1))
            .foregroundColor(.green)
            .clipShape(Capsule())
    }
    
    private var label: String {
        if price < 30 {
            return "SUPER SIMPLE"
        } else if price < 60 {
            return "INTERMEDIATE"
        } else {
            return "CHALLENGING"
        }
    }
}

private enum DashboardTab: String, CaseIterable, Identifiable {
    case lessons
    case hubGuides
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .lessons: return "Lessons"
        case .hubGuides: return "Hub Guides"
        }
    }
}

private enum AssignmentFilter: String, CaseIterable, Identifiable {
    case all
    case pending
    case graded
    case failed
    case submitted
    
    var id: String { rawValue }
    
    var label: String {
        rawValue.uppercased()
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthenticationManager())
}
private struct ProfileMenuButton: View {
    let profile: UserProfile?
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .trailing, spacing: 2) {
                Text(profile?.name ?? "Student")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                Text((profile?.role ?? "student").capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            AvatarButton(imageURL: profile?.image, name: profile?.name)
        }
        .padding(6)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.95))
        )
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
}
