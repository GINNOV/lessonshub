import SwiftUI

struct AvatarButton: View {
    var imageURL: String?
    var name: String? = nil
    var size: CGFloat = 42
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.blue.opacity(0.15))
                .frame(width: size, height: size)
            if let urlString = imageURL, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure(_):
                        placeholder
                    case .empty:
                        ProgressView()
                    @unknown default:
                        placeholder
                    }
                }
                .frame(width: size, height: size)
                .clipShape(Circle())
            } else {
                placeholder
            }
        }
    }
    
    private var placeholder: some View {
        Text(initials(from: name) ?? "LH")
            .font(.system(size: size * 0.4, weight: .semibold))
            .foregroundColor(.blue)
    }
    
    private func initials(from name: String?) -> String? {
        guard let name = name, !name.isEmpty else { return nil }
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts.first!.first!)\(parts.last!.first!)".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
