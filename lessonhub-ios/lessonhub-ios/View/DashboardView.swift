//
//  DashboardView.swift
//  lessonhub-ios
//
//  Created by Gemini on 11/8/25.
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject var authManager: AuthenticationManager

    var body: some View {
        VStack {
            Text(viewModel.welcomeMessage)
                .font(.title)
            
            // More UI will be added here
            
            Spacer()
            
            Button("Log Out") {
                authManager.logout()
            }
            .padding()
        }
        .navigationTitle("Dashboard")
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthenticationManager())
}
