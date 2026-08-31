import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appGroup = "group.ai.cervel.capture"
  override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); Task { await capture() } }
  private func capture() async {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem else { return finish() }
    var payload:[String:Any] = ["protocol":"cervel-universal-share/v0.1","source":"ios_share_extension","received_at":ISO8601DateFormatter().string(from:Date())]
    for provider in item.attachments ?? [] {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier), let value = try? await provider.loadItem(forTypeIdentifier:UTType.url.identifier), let url=value as? URL { payload["url"]=url.absoluteString; break }
      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier), let value = try? await provider.loadItem(forTypeIdentifier:UTType.plainText.identifier), let text=value as? String { payload["text"]=text; break }
    }
    if let data=try? JSONSerialization.data(withJSONObject:payload){UserDefaults(suiteName:appGroup)?.set(data,forKey:"cervel.pending-share")}
    if let url=URL(string:"cervel://share/import"){extensionContext?.open(url)}
    finish()
  }
  private func finish(){extensionContext?.completeRequest(returningItems:nil)}
}
