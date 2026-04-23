# Phone 登录接口（Firebase Phone Authentication）

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **接口地址** | `POST https://auth-login.pwtk-dev.work/auth/phone` |
| **认证方式** | 请求头添加 `Authorization: Bearer {JWT}` |
| **适用场景** | iOS/Android App 集成 + Web H5 集成 |
| **登录方式** | Firebase Phone Authentication (手机号 + 验证码) |

### 谁需要看什么？

| 角色 | 你需要做的 |
|------|------------|
| **App / H5 接入方** | 在自己的 Firebase 项目里启用 Phone Auth，用 SDK 取 **Firebase ID Token**；`projectId` 需与下方「登录服务」配置为**同一 Firebase 项目**。 |
| **登录服务部署方**（运维本 Worker） | 在 `wrangler.dev.toml` / `wrangler.prod.toml` 的 `[vars]` 中配置 **`FIREBASE_PROJECT_ID`**（必填）。值必须与客户端使用的 Firebase **项目 ID** 完全一致，否则服务端会拒绝校验（防止其它 Firebase 项目签发的 Token 被误接受）。`FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN` 仅用于内置测试页展示 Firebase Web SDK，不参与 Token 校验。 |

---

## 🔄 完整登录流程

```
┌─────────────────────────────────────────────────────────────┐
│                     Phone 登录流程                           │
└─────────────────────────────────────────────────────────────┘

1. App/Web 生成认证 JWT (包含 app_id, 5分钟过期)
   ↓
2. App/Web 调用 Firebase Phone Auth SDK
   ↓
3. 用户输入手机号 + 验证码
   ↓
4. 获取 Firebase Phone ID Token
   ↓
5. App/Web 调用本接口 (带认证 JWT)
   POST /auth/phone
   Header: Authorization: Bearer {认证JWT}
   ↓
6. 我们的服务验证 Firebase Phone ID Token
   ↓
7. 返回用户 JWT Token (7天过期) 给 App/Web
   ↓
8. App/Web 把用户 JWT Token 传给你的后台
   ↓
9. 你的后台生成新的认证 JWT
   ↓
10. 你的后台调用验证接口 (带认证 JWT)
    POST /auth/verify
    ↓
11. 返回完整用户信息（包含手机号）
    ↓
12. 你的后台创建会话，完成登录 ✅
```

---

## 🚀 快速集成（4 步）

### 步骤 1: 生成认证 JWT

**iOS (Swift):**
```swift
import CryptoKit

func generateAuthJWT(appId: String, appSecret: String) -> String? {
    let header = ["alg": "HS256", "typ": "JWT"]
    let payload = [
        "app_id": appId,
        "iat": Int(Date().timeIntervalSince1970),
        "exp": Int(Date().timeIntervalSince1970) + 300  // 5分钟过期
    ]
    
    guard let headerData = try? JSONSerialization.data(withJSONObject: header),
          let payloadData = try? JSONSerialization.data(withJSONObject: payload) else {
        return nil
    }
    
    let headerB64 = headerData.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    let payloadB64 = payloadData.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    let signInput = "\(headerB64).\(payloadB64)"
    let key = SymmetricKey(data: appSecret.data(using: .utf8)!)
    let signature = HMAC<SHA256>.authenticationCode(for: signInput.data(using: .utf8)!, using: key)
    let signatureB64 = Data(signature).base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
    
    return "\(signInput).\(signatureB64)"
}
```

**Android (Kotlin):**
```kotlin
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import java.util.Date

fun generateAuthJWT(appId: String, appSecret: String): String {
    return Jwts.builder()
        .claim("app_id", appId)
        .setIssuedAt(Date())
        .setExpiration(Date(System.currentTimeMillis() + 5 * 60 * 1000)) // 5分钟
        .signWith(SignatureAlgorithm.HS256, appSecret.toByteArray())
        .compact()
}
```

**JavaScript (Web H5):**
```javascript
// 需要使用 jose 库
import { SignJWT } from 'jose';

async function generateAuthJWT(appId, appSecret) {
  const secret = new TextEncoder().encode(appSecret);
  
  const jwt = await new SignJWT({ app_id: appId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(secret);
  
  return jwt;
}
```

---

### 步骤 2: 使用 Firebase Phone Auth 获取 ID Token

**iOS (Swift):**
```swift
import FirebaseAuth

func loginWithPhone(phoneNumber: String) {
    // 1. 发送验证码
    PhoneAuthProvider.provider().verifyPhoneNumber(phoneNumber, uiDelegate: nil) { verificationID, error in
        if let error = error {
            print("发送验证码失败: \(error.localizedDescription)")
            return
        }
        
        // 2. 保存 verificationID，等待用户输入验证码
        UserDefaults.standard.set(verificationID, forKey: "authVerificationID")
    }
}

func verifyCode(code: String) {
    guard let verificationID = UserDefaults.standard.string(forKey: "authVerificationID") else {
        return
    }
    
    // 3. 用验证码登录
    let credential = PhoneAuthProvider.provider().credential(
        withVerificationID: verificationID,
        verificationCode: code
    )
    
    Auth.auth().signIn(with: credential) { result, error in
        if let error = error {
            print("登录失败: \(error.localizedDescription)")
            return
        }
        
        // 4. 获取 ID Token
        result?.user.getIDToken { idToken, error in
            if let idToken = idToken {
                print("获取到 ID Token: \(idToken)")
                // 调用步骤 3
                self.callLoginAPI(idToken: idToken)
            }
        }
    }
}
```

**Android (Kotlin):**
```kotlin
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthProvider

// 1. 发送验证码
fun sendVerificationCode(phoneNumber: String, activity: Activity) {
    val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
        .setPhoneNumber(phoneNumber)  // 例如: +8613800138000
        .setTimeout(60L, TimeUnit.SECONDS)
        .setActivity(activity)
        .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // 自动验证成功
                signInWithCredential(credential)
            }
            
            override fun onVerificationFailed(e: FirebaseException) {
                Log.e("PhoneAuth", "验证失败: ${e.message}")
            }
            
            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                // 验证码已发送
                saveVerificationId(verificationId)
            }
        })
        .build()
    
    PhoneAuthProvider.verifyPhoneNumber(options)
}

// 2. 用验证码登录
fun verifyCode(verificationId: String, code: String) {
    val credential = PhoneAuthProvider.getCredential(verificationId, code)
    signInWithCredential(credential)
}

// 3. 登录并获取 ID Token
fun signInWithCredential(credential: PhoneAuthCredential) {
    FirebaseAuth.getInstance().signInWithCredential(credential)
        .addOnCompleteListener { task ->
            if (task.isSuccessful) {
                // 获取 ID Token
                FirebaseAuth.getInstance().currentUser?.getIdToken(true)
                    ?.addOnCompleteListener { tokenTask ->
                        val idToken = tokenTask.result?.token
                        if (idToken != null) {
                            Log.d("PhoneAuth", "获取到 ID Token: $idToken")
                            // 调用步骤 3
                            callLoginAPI(idToken)
                        }
                    }
            }
        }
}
```

**JavaScript (Web H5):**
```javascript
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const auth = getAuth();

// 1. 初始化 reCAPTCHA
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'normal',
  'callback': (response) => {
    // reCAPTCHA 验证成功
  }
});

// 2. 发送验证码
async function sendVerificationCode(phoneNumber) {
  const appVerifier = window.recaptchaVerifier;
  
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    console.log('验证码已发送');
  } catch (error) {
    console.error('发送验证码失败:', error);
  }
}

// 3. 验证码登录
async function verifyCode(code) {
  try {
    const result = await window.confirmationResult.confirm(code);
    
    // 4. 获取 ID Token
    const idToken = await result.user.getIdToken();
    console.log('获取到 ID Token:', idToken);
    
    // 调用步骤 3
    await callLoginAPI(idToken);
  } catch (error) {
    console.error('验证码错误:', error);
  }
}
```

---

### 步骤 3: 调用登录接口

**请求示例：**

```bash
# 先生成认证 JWT
AUTH_JWT=$(node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { app_id: 'test_app' },
  'test_secret_123456',
  { expiresIn: '5m' }
));
")

# 调用登录接口
curl -X POST https://auth-login.pwtk-dev.work/auth/phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_JWT" \
  -d '{
    "token": "Firebase_Phone_ID_Token",
    "platform": "ios",
    "device_id": "设备UUID",
    "a0": "自定义字段（可选）"
  }'
```

**iOS 完整代码：**
```swift
func callLoginAPI(idToken: String) {
    // 1. 生成认证 JWT
    guard let authJWT = generateAuthJWT(appId: "test_app", appSecret: "test_secret_123456") else {
        print("生成认证 JWT 失败")
        return
    }
    
    // 2. 调用登录接口
    let url = URL(string: "https://auth-login.pwtk-dev.work/auth/phone")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(authJWT)", forHTTPHeaderField: "Authorization")
    
    let body: [String: Any] = [
        "token": idToken,
        "platform": "ios",
        "device_id": UIDevice.current.identifierForVendor?.uuidString ?? "",
        "a0": "自定义字段（可选）"
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let success = json["success"] as? Bool,
           success,
           let dataDict = json["data"] as? [String: Any],
           let userJWT = dataDict["token"] as? String {
            
            // 3. 保存用户 JWT Token
            UserDefaults.standard.set(userJWT, forKey: "user_jwt_token")
            
            // 4. 传给后台
            print("用户 JWT Token: \(userJWT)")
        }
    }.resume()
}
```

**Android 完整代码：**
```kotlin
fun callLoginAPI(idToken: String) {
    // 1. 生成认证 JWT
    val authJWT = generateAuthJWT("test_app", "test_secret_123456")
    
    // 2. 调用登录接口
    val client = OkHttpClient()
    val json = JSONObject().apply {
        put("token", idToken)
        put("platform", "android")
        put("device_id", Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID))
        put("a0", "自定义字段（可选）")
    }
    
    val body = json.toString().toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("https://auth-login.pwtk-dev.work/auth/phone")
        .post(body)
        .addHeader("Authorization", "Bearer $authJWT")
        .build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            val result = JSONObject(response.body?.string() ?: "")
            if (result.getBoolean("success")) {
                val userJWT = result.getJSONObject("data").getString("token")
                
                // 3. 保存用户 JWT Token
                sharedPreferences.edit()
                    .putString("user_jwt_token", userJWT)
                    .apply()
                
                // 4. 传给后台
                Log.d("Login", "用户 JWT Token: $userJWT")
            }
        }
    })
}
```

**JavaScript (Web H5) 完整代码：**
```javascript
async function callLoginAPI(idToken) {
    // 1. 生成认证 JWT（需要在后端生成，这里仅作示例）
    const authJWT = await generateAuthJWT('test_app', 'test_secret_123456');
    
    // 2. 调用登录接口
    const response = await fetch('https://auth-login.pwtk-dev.work/auth/phone', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authJWT}`
        },
        body: JSON.stringify({
            token: idToken,
            platform: 'web',
            device_id: 'web_device_id',
            a0: '自定义字段（可选）'
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        const userJWT = result.data.token;
        
        // 3. 保存用户 JWT Token
        localStorage.setItem('user_jwt_token', userJWT);
        
        // 4. 传给后台
        console.log('用户 JWT Token:', userJWT);
    }
}
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",  // 用户 JWT Token (7天过期)，传给后台
    "user_id": "user_123",
    "nickname": "+8613800138000",
    "is_new": false
  }
}
```

---

### 步骤 4: 把用户 JWT Token 传给后台

App/Web 把获取到的用户 JWT Token 传给你们的后台服务，后台再调用验证接口验证（见 [后台验证接口文档](./API_VERIFY_TOKEN.md)）。

---

## 📝 请求参数

### 请求头

| 参数 | 必填 | 说明 |
|------|------|------|
| `Authorization` | ✅ | Bearer {认证JWT}，包含 app_id，5分钟过期 |

### 请求体

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `token` | ✅ | Firebase Phone ID Token | `eyJhbGci...` |
| `platform` | ❌ | 平台类型 | `ios` / `android` / `web` |
| `device_id` | ❌ | 设备唯一 ID | UUID |
| `a0` | ❌ | 自定义字段，会在验证时返回 | 任意字符串 |

---

## ❌ 常见错误

### 401 - 认证 Token 无效
```json
{"success": false, "code": "INVALID_AUTH_TOKEN", "message": "认证 Token 验证失败"}
```
**解决：** 
- 检查认证 JWT 是否正确生成
- 检查 app_id 和 app_secret 是否匹配
- 检查 JWT 是否过期（5分钟有效期）

### 400 - Token 验证失败
```json
{"success": false, "code": "INVALID_TOKEN", "message": "Phone token 验证失败"}
```
**解决：** 
- 检查 Token 是否是 Firebase Phone Auth 返回的 ID Token
- 检查 Token 是否过期（1小时有效期）
- 检查 **客户端 Firebase 项目 ID** 与登录服务部署的 **`FIREBASE_PROJECT_ID`** 是否一致
- 确认 Worker 已配置 `FIREBASE_PROJECT_ID`（未配置时服务端会直接拒绝手机 Token 校验）

---

## ⚠️ 重要说明

### 手机号格式

**必须使用国际格式（E.164）：**
- ✅ 正确：`+8613800138000`（中国）
- ✅ 正确：`+14155552671`（美国）
- ❌ 错误：`13800138000`（缺少国家代码）
- ❌ 错误：`+86 138 0013 8000`（包含空格）

### Firebase 配置要求

**登录服务（Cloudflare Worker，运维配置）：**

1. **`FIREBASE_PROJECT_ID`（必填）**  
   - 在 Firebase Console → 项目设置 →「项目 ID」  
   - 写入 `wrangler.dev.toml` / `wrangler.prod.toml` 的 `[vars]`  
   - 服务端会校验 ID Token 的 `aud` / `iss` 是否属于该项目；未配置或配置错误时，`/auth/phone` 与携带手机登录 Firebase Token 的 `/auth/verify` 会校验失败。  
2. **`FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN`（可选）**  
   - 仅用于托管在本服务上的 **测试页** 初始化 Firebase Web SDK；不接测试页可不配。

**App 端（iOS/Android）：**
1. 在 Firebase Console 启用 Phone Authentication
2. 配置 SHA-256 证书指纹（Android）
3. 配置 APNs 证书（iOS）

**Web 端（H5）：**
1. 在 Firebase Console 启用 Phone Authentication
2. 添加授权域名到白名单
3. 配置 reCAPTCHA（必须）

### 账号绑定

- ✅ 同一手机号登录会映射到同一个 user_id
- ✅ 不支持账号绑定（例如：Google + Phone 绑定）
- ✅ 如需绑定功能，由调用方后台实现

---

## 🧪 测试

**测试配置：**
- `app_id`: `test_app`
- `app_secret`: `test_secret_123456`

**注意：** Phone Auth 需要真实手机号和 Firebase 配置，无法使用测试脚本模拟。

---

## 📞 获取配置

联系服务提供方申请正式的 `app_id` 和 `app_secret`。

**相关文档：**
- [后台验证接口](./API_VERIFY_TOKEN.md)
- [App Google/Apple 登录接口](./API_APP_LOGIN.md)
- [H5 登录接口](./API_H5_LOGIN.md)
