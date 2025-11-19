import SwiftUI

struct LoginView: View {
    @StateObject var viewModel = LoginViewModel()
    @EnvironmentObject var authManager: AuthenticationManager
    @FocusState private var focusedField: Field?
    
    private enum Field {
        case email
        case password
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: [.blue.opacity(0.25), .purple.opacity(0.25)],
                           startPoint: .topLeading,
                           endPoint: .bottomTrailing)
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 32) {
                    header
                    form
                    actionButton
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 60)
            }
            .scrollDismissesKeyboard(.interactively)
            .contentShape(Rectangle())
            .onTapGesture {
                focusedField = nil
            }
        }
        .alert("Login Error", isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { _ in viewModel.errorMessage = nil }
        ), actions: {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        }, message: {
            Text(viewModel.errorMessage ?? "")
        })
    }
    
    private var header: some View {
        VStack(spacing: 12) {
            Image(systemName: "graduationcap.fill")
                .font(.system(size: 72))
                .foregroundColor(.white)
                .padding()
                .background(Circle().fill(.ultraThinMaterial))
            
            Text("LessonHub")
                .font(.system(.largeTitle, design: .rounded))
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Sign in to continue where you left off.")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
        }
        .frame(maxWidth: .infinity)
    }
    
    private var form: some View {
        VStack(spacing: 18) {
            TextField("Email", text: $viewModel.email)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .focused($focusedField, equals: .email)
                .textContentType(.username)
                .submitLabel(.next)
                .onSubmit { focusedField = .password }
                .modifier(FormFieldStyle(iconName: "envelope"))
            
            SecureField("Password", text: $viewModel.password)
                .focused($focusedField, equals: .password)
                .textContentType(.password)
                .submitLabel(.go)
                .onSubmit { loginIfPossible() }
                .modifier(FormFieldStyle(iconName: "lock"))
        }
        .padding(24)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    
    private var actionButton: some View {
        Button(action: loginIfPossible) {
            if viewModel.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .frame(maxWidth: .infinity)
            } else {
                Text("Continue")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(viewModel.isLoading)
    }
    
    private func loginIfPossible() {
        guard !viewModel.isLoading else { return }
        focusedField = nil
        viewModel.login(authManager: authManager)
    }
}

private struct FormFieldStyle: ViewModifier {
    let iconName: String
    
    func body(content: Content) -> some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .foregroundColor(.blue)
            content
                .foregroundStyle(Color.primary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .padding()
            .foregroundColor(Color.white)
            .background(
                LinearGradient(colors: [.blue, .purple],
                               startPoint: .leading,
                               endPoint: .trailing)
            )
            .cornerRadius(16)
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthenticationManager())
}
