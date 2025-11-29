import SwiftUI

struct MainView: View {
    @StateObject private var authManager = AuthenticationManager()

    var body: some View {
        if authManager.isAuthenticated {
            NavigationView {
                DashboardView()
                    .environmentObject(authManager)
            }
        } else {
            LoginView()
                .environmentObject(authManager)
        }
    }
}

#Preview {
    MainView()
}
