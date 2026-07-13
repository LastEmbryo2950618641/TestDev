# WeChat Avatar Crop Helper Extraction - 2026-07-13

## Goal

Move pure WeChat avatar display and crop geometry helpers out of the top-level legacy action entry while keeping the existing public `$store.game` methods stable.

## Boundary

- `publish/app/wechat/avatar-crop-helpers.js` owns avatar text, avatar style, default crop values, crop geometry conversion, and crop-display math.
- `publish/wechat-avatar-crop-actions.js` remains the public compatibility facade for those pure helpers and still owns image loading, face detection, save, and crop state mutations.

## Public Methods Preserved

- `wechatAvatarText(contact)`
- `wechatAvatarStyle(contact)`
- `defaultWechatAvatarCrop(ratio)`
- `wechatMessageAvatarContact(msg)`
- `wechatFaceBoxToCrop(box, img)`
- `wechatAvatarCropImageStyle()`

## Compatibility Rule

Do not move `loadWechatAvatarImage`, `detectWechatAvatarFace`, `detectWechatAvatarByFaceDetector`, `detectWechatAvatarByLocalLibrary`, `autoCaptureWechatAvatar`, `autoCaptureWechatAvatarFromUrl`, `applyWechatAvatarCrop`, `openWechatAvatarCrop`, `closeWechatAvatarCrop`, or `saveWechatAvatarCrop` in the same pass. Those methods still form the asynchronous crop/save flow.

## Verification

Runtime dependency verification now requires `app/wechat/avatar-crop-helpers.js` to load before `wechat-avatar-crop-actions.js` in Web and Android manifests.
