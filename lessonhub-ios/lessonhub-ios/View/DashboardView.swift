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
                Text(progressAmountText)
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.yellow.opacity(0.9))
                    Text(progressSubtitle)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                }
            }
            
            VStack(alignment: .leading, spacing: 6) {
                Text(progressBody)
                    .foregroundColor(.white)
                if let linkText = progressLinkText, let linkURL = progressLinkURL {
                    Link(linkText, destination: linkURL)
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.9))
                }
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
            
            SummaryGrid(items: summaryItems)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 8)
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
    
    private var progressAmountText: String {
        if let value = viewModel.profileDetails?.progressTotalValue {
            let formatter = NumberFormatter()
            formatter.numberStyle = .currency
            formatter.currencyCode = "EUR"
            if let formatted = formatter.string(from: NSNumber(value: value)) {
                return formatted
            }
        }
        if let custom = viewModel.profileDetails?.progressCardTitle, custom.contains("€") {
            return custom
        }
        let total = viewModel.assignments.reduce(0) { $0 + $1.lesson.price }
        return total.formatted(.currency(code: "EUR"))
    }
    
    private var progressSubtitle: String {
        if let pts = viewModel.profileDetails?.totalPoints {
            return "\(pts) pts earned"
        }
        return "\(viewModel.assignments.reduce(0) { $0 + $1.pointsAwarded }) pts earned"
    }
    
    private var progressBody: String {
        viewModel.profileDetails?.progressCardBody ?? "Invest in your future – 🚀"
    }
    
    private var progressLinkText: String? {
        viewModel.profileDetails?.progressCardLinkText
    }
    
    private var progressLinkURL: URL? {
        guard let path = viewModel.profileDetails?.progressCardLinkUrl,
              let url = URL(string: path, relativeTo: URL(string: Configuration.baseURL)) else { return nil }
        return url
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
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                LessonPreviewImage(url: assignment.lessonHeroImageURL)
                StatusBadge(status: assignment.normalizedStatus)
                    .padding(12)
            }
            
            VStack(alignment: .leading, spacing: 12) {
                Text(assignment.lessonSubtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 6) {
                    Text(assignment.lesson.title)
                        .font(.title3.bold())
                    Text(assignment.formattedPreview)
                        .font(.callout)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                LessonProgressIndicator(level: assignment.difficultyLevel)
                
                HStack {
                    Label {
                        Text(assignment.lesson.teacher?.name ?? "Unassigned")
                    } icon: {
                        Image(systemName: "person.fill")
                    }
                    .foregroundColor(.secondary)
                    Spacer()
                    Label("Due \(assignment.dueDateDescription)", systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            
            Divider()
                .padding(.horizontal)
            
            HStack(alignment: .center) {
                Label {
                    Text("\(assignment.lesson.submittedCount) of \(assignment.lesson.completionCount)")
                } icon: {
                    Image(systemName: "person.2.fill")
                }
                Spacer()
                Label {
                    Text("Share")
                } icon: {
                    Image(systemName: "square.and.arrow.up")
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color(.systemBackground))
        )
        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 8)
    }
}

private struct LessonProgressIndicator: View {
    let level: AssignmentDifficultyLevel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                ForEach(AssignmentDifficultyLevel.allCases, id: \.self) { item in
                    Capsule()
                        .fill(item == level ? color(for: level) : Color(.systemGray5))
                        .frame(height: 12)
                        .frame(maxWidth: .infinity)
                        .overlay(
                            Capsule()
                                .stroke(Color(.systemGray4))
                                .opacity(item == level ? 0 : 1)
                        )
                        .shadow(color: item == level ? color(for: level).opacity(0.25) : .clear,
                                radius: item == level ? 8 : 0, x: 0, y: 2)
                }
            }
            
            Text(level.label.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundColor(color(for: level))
        }
    }
    
    private func color(for level: AssignmentDifficultyLevel) -> Color {
        switch level {
        case .superSimple: return Color(red: 0.0, green: 0.6, blue: 0.3)
        case .approachable: return Color(red: 0.47, green: 0.73, blue: 0.2)
        case .intermediate: return .orange
        case .challenging: return Color(red: 0.9, green: 0.4, blue: 0.0)
        case .advanced: return .red
        }
    }
}

private struct LessonPreviewImage: View {
    let url: URL?
    
    var body: some View {
        ZStack {
            Color(.systemGray5)
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .clipped()
                    case .failure:
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
        .frame(maxWidth: .infinity, minHeight: 160, maxHeight: 160)
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

private struct SummaryGrid: View {
    let items: [SummaryItem]
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 16, alignment: .top)], spacing: 16) {
            ForEach(items) { item in
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
