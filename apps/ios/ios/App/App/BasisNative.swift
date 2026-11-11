import Capacitor
import QuickLook
import UIKit

// What the BASIS app adds to the portal it carries (docs/APP_STORE.md):
// the web view behaves like an app (swipe back, no link previews), and the
// customer's documents open in the system's own viewer and share sheet
// instead of a browser tab. Everything else is the portal of the brand site.

/// The app's one screen: Capacitor's web view with the BASIS plugin registered.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BasisDocumentPlugin())
        webView?.allowsBackForwardNavigationGestures = true
        webView?.allowsLinkPreview = false
    }
}

/// Opens a document behind sign-in: fetched with the person's own ID token,
/// kept in the app's temporary folder, shown in Quick Look (which can print,
/// mark up and save it) or handed to the share sheet.
@objc(BasisDocumentPlugin)
public class BasisDocumentPlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource {
    public let identifier = "BasisDocumentPlugin"
    public let jsName = "BasisDocument"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareLink", returnType: CAPPluginReturnPromise),
    ]

    private var previewing: URL?

    @objc func open(_ call: CAPPluginCall) {
        fetch(call) { file in
            self.previewing = file
            let preview = QLPreviewController()
            preview.dataSource = self
            self.bridge?.viewController?.present(preview, animated: true)
            call.resolve()
        }
    }

    @objc func share(_ call: CAPPluginCall) {
        fetch(call) { file in
            let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            if let view = self.bridge?.viewController?.view {
                // An anchor for the popover on larger screens.
                sheet.popoverPresentationController?.sourceView = view
                sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 80, width: 1, height: 1)
            }
            self.bridge?.viewController?.present(sheet, animated: true)
            call.resolve()
        }
    }

    /// A link for someone else (an invitation): Messages, WhatsApp, Mail or Copy.
    @objc func shareLink(_ call: CAPPluginCall) {
        guard let address = call.getString("url"), let url = URL(string: address), url.scheme == "https" else {
            call.reject("The link is not valid.")
            return
        }
        let text = call.getString("text") ?? ""
        DispatchQueue.main.async {
            let sheet = UIActivityViewController(activityItems: text.isEmpty ? [url] : [text, url], applicationActivities: nil)
            if let view = self.bridge?.viewController?.view {
                sheet.popoverPresentationController?.sourceView = view
                sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 80, width: 1, height: 1)
            }
            self.bridge?.viewController?.present(sheet, animated: true)
            call.resolve()
        }
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewing == nil ? 0 : 1
    }

    public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        (previewing ?? URL(fileURLWithPath: "/")) as NSURL
    }

    /// Downloads the document to a file named for it; the portal's own message on failure.
    private func fetch(_ call: CAPPluginCall, then present: @escaping (URL) -> Void) {
        guard let address = call.getString("url"), let url = URL(string: address), url.scheme == "https" || url.host == "127.0.0.1" else {
            call.reject("The document address is not valid.")
            return
        }
        var request = URLRequest(url: url)
        if let token = call.getString("token"), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let title = call.getString("filename")
        URLSession.shared.dataTask(with: request) { data, response, error in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard error == nil, let data = data, status == 200 else {
                var message = "The document could not be opened."
                if let data = data, let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let text = body["message"] as? String {
                    message = text
                }
                call.reject(message)
                return
            }
            let name = BasisDocumentPlugin.fileName(title, fallback: url.lastPathComponent, mimeType: response?.mimeType)
            do {
                let folder = FileManager.default.temporaryDirectory.appendingPathComponent("BASIS Documents", isDirectory: true)
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                let file = folder.appendingPathComponent(name)
                try data.write(to: file, options: .atomic)
                DispatchQueue.main.async { present(file) }
            } catch {
                call.reject("The document could not be kept on this iPhone.")
            }
        }.resume()
    }

    /// "Quotation QUO-26-0012" becomes "Quotation QUO-26-0012.pdf", the extension
    /// following what the server sent; no path separators survive.
    static func fileName(_ title: String?, fallback: String, mimeType: String?) -> String {
        let base = (title?.isEmpty == false ? title! : fallback)
            .components(separatedBy: CharacterSet(charactersIn: "/\\:?%*|\"<>"))
            .joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let named = base.isEmpty ? "Document" : base
        let known = ["application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "text/plain": "txt",
                     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"]
        let ext = known[mimeType ?? ""] ?? "pdf"
        return named.lowercased().hasSuffix(".\(ext)") ? named : "\(named).\(ext)"
    }
}
