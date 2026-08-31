import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appGroup = "group.ai.cervel.capture"
  private let maxBytes = 18 * 1024 * 1024
  override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); Task { await capture() } }
  private func capture() async {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem else { return finish() }
    var payload:[String:Any] = ["protocol":"cervel-universal-share/v0.1","source":"ios_share_extension","received_at":ISO8601DateFormatter().string(from:Date())]
    for provider in item.attachments ?? [] {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier), let value = try? await provider.loadItem(forTypeIdentifier:UTType.url.identifier), let url=value as? URL, ["http","https"].contains(url.scheme?.lowercased() ?? "") { payload["url"]=url.absoluteString; break }
      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier), let value = try? await provider.loadItem(forTypeIdentifier:UTType.plainText.identifier), let text=value as? String { payload["text"]=text; break }
      if let type=provider.registeredTypeIdentifiers.first, let value=try? await provider.loadItem(forTypeIdentifier:type), let source=value as? URL, let container=FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:appGroup) {
        let values=try? source.resourceValues(forKeys:[.fileSizeKey]);guard let size=values?.fileSize,size<=maxBytes else{continue};let dir=container.appendingPathComponent("share-staging",isDirectory:true);try? FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);let name=UUID().uuidString+"-"+source.lastPathComponent.replacingOccurrences(of:"/",with:"_");let target=dir.appendingPathComponent(name);try? FileManager.default.copyItem(at:source,to:target);payload["staged_file"]=name;payload["mime_type"]=UTType(type)?.preferredMIMEType ?? "application/octet-stream";break
      }
    }
    if let data=try? JSONSerialization.data(withJSONObject:payload){UserDefaults(suiteName:appGroup)?.set(data,forKey:"cervel.pending-share")}
    // The deep link is only a wake-up signal. Shared data never travels in URL/query parameters.
    if let url=URL(string:"cervel://share/import"){extensionContext?.open(url)}
    finish()
  }
  private func finish(){extensionContext?.completeRequest(returningItems:nil)}
}
