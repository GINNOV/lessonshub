import SwiftUI

struct MainView: View {
    @StateObject private var authManager = AuthenticationManager()

    var body: some View {
        if authManager.isAuthenticated {
            DashboardView()
                .environmentObject(authManager)
        } else {
            LoginView()
                .environmentObject(authManager)
        }
    }
}

struct DashboardView: View {
    @EnvironmentObject var authManager: AuthenticationManager

    var body: some View {
        VStack {
            Text("Welcome to your Dashboard!")
                .font(.title)
            Button("Log Out") {
                authManager.logout()
            }
            .padding()
        }
    }
}

#Preview {
    MainView()
}
