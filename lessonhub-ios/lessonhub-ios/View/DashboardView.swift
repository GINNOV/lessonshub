import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var authManager: AuthenticationManager

    var body: some View {
        VStack {
            Text(viewModel.welcomeMessage)
                .font(.title)
                .padding()

            List(viewModel.assignments) { assignment in
                VStack(alignment: .leading) {
                    Text(assignment.lesson.title)
                        .font(.headline)
                    Text("with \(assignment.lesson.teacher?.name ?? "N/A")")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Button("Log Out") {
                authManager.logout()
            }
            .padding()
        }
        .navigationTitle("Dashboard")
        .onAppear {
            viewModel.onAppear()
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthenticationManager())
}
