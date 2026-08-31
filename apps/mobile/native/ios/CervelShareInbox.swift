import Foundation
import React

@objc(CervelShareInbox)
final class CervelShareInbox:NSObject {
  private let appGroup="group.ai.cervel.capture"
  @objc static func requiresMainQueueSetup()->Bool{false}
  @objc(consume:rejecter:)
  func consume(_ resolve:RCTPromiseResolveBlock,rejecter reject:RCTPromiseRejectBlock){
    guard let defaults=UserDefaults(suiteName:appGroup),let data=defaults.data(forKey:"cervel.pending-share"),var payload=(try? JSONSerialization.jsonObject(with:data))as?[String:Any] else{return resolve(nil)}
    defaults.removeObject(forKey:"cervel.pending-share")
    if let name=payload["staged_file"]as?String,!name.contains("/"),let root=FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:appGroup){let file=root.appendingPathComponent("share-staging").appendingPathComponent(name);if let bytes=try?Data(contentsOf:file),bytes.count<=18*1024*1024{payload["content_base64"]=bytes.base64EncodedString();try?FileManager.default.removeItem(at:file)};payload.removeValue(forKey:"staged_file")}
    guard let out=try?JSONSerialization.data(withJSONObject:payload),let json=String(data:out,encoding:.utf8)else{return reject("UNIVERSAL_SHARE_INVALID","Invalid native share payload",nil)};resolve(json)
  }
}
