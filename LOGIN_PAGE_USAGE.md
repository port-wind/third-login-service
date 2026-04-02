# 统一登录页面 - 快速接入指南

> **适用场景：** H5/Web 网页需要嵌入第三方登录，无需自己实现 OAuth 流程

---

## 📋 接入前准备

### 必须提供的信息

| 参数 | 值 | 用途 |
|------|---|------|
| `服务地址` | `https://auth-login.pwtk-dev.work` | 登录服务地址 |
| `app_id` | `test_app` | 应用 ID |
| `app_secret` | `test_secret_123456` | 应用密钥（后台验证用，严格保密） |

**重要：** `app_secret` 仅在后台使用，前端代码中绝对不能包含！

---

## 🚀 快速开始

### 页面地址
```
https://auth-login.pwtk-dev.work/login
```

### 页面尺寸（仅两个按钮）

- **推荐 iframe 尺寸：** 宽 `360px`，高 `180px`
- **最小尺寸：** 宽 `300px`，高 `140px`
- **内容：** 仅包含 Google 和 Apple 两个登录按钮
- **背景：** 纯白色，可无缝嵌入任何页面

### 3 步完成登录

```
1. 嵌入 iframe → 2. 用户点击授权 → 3. postMessage 返回 Token
```

---

## 📝 前端集成代码（完整可复制）

### 步骤概览
1. 创建 iframe 弹窗（带关闭按钮）
2. 监听 postMessage 接收 Token
3. 发送 Token 给自己的后台验证

### 完整代码示例

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的网站</title>
  <style>
    /* 登录弹窗样式 */
    .login-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .login-modal.show {
      display: flex;
    }
    .login-iframe-container {
      width: 90%;
      max-width: 380px;
      height: 180px;  /* 只需两个按钮的高度 */
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      position: relative;
    }
    .login-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0,0,0,0.05);
      border: none;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      color: #666;
      z-index: 1;
    }
    .close-btn:hover {
      background: rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <h1>我的网站</h1>
  <button onclick="showLogin()">登录</button>
  <div id="userInfo"></div>
  
  <!-- 登录弹窗 -->
  <div id="loginModal" class="login-modal">
    <div class="login-iframe-container">
      <button class="close-btn" onclick="hideLogin()">×</button>
      <iframe id="loginIframe" class="login-iframe"></iframe>
    </div>
  </div>

  <script>
    // ============================================
    // 🔧 配置区（⚠️ 必须修改这里）
    // ============================================
    const AUTH_SERVICE_URL = 'https://auth-login.pwtk-dev.work';  // 登录服务地址
    const APP_ID = 'test_app';  // ⚠️ 改成你的应用 ID
    const BACKEND_API = 'https://your-backend.com/api/auth/login';  // ⚠️ 改成你的后台接口地址
    
    // ============================================
    // 1️⃣ 显示登录弹窗
    // ============================================
    function showLogin() {
      // 构建 state 参数
      const state = JSON.stringify({
        callback_url: window.location.href,  // 当前页面地址
        app_id: APP_ID,                      // 应用 ID
        a0: getUserChannel(),                // 可选：业务自定义字段（如渠道）
        isIframeMode: true                   // 启用 iframe 模式
      });
      
      // 构建登录 URL
      const loginUrl = AUTH_SERVICE_URL + '/login?state=' + 
                       encodeURIComponent(state) + '&iframe=1';
      
      // 显示 iframe
      document.getElementById('loginIframe').src = loginUrl;
      document.getElementById('loginModal').classList.add('show');
    }
    
    function hideLogin() {
      document.getElementById('loginModal').classList.remove('show');
    }
    
    function getUserChannel() {
      // 示例：从 URL 获取渠道参数
      const params = new URLSearchParams(window.location.search);
      return params.get('channel') || 'direct';
    }
    
    // ============================================
    // 2️⃣ 监听登录结果
    // ============================================
    window.addEventListener('message', function(event) {
      // 🔒 验证来源（生产环境必须！）
      if (event.origin !== AUTH_SERVICE_URL) {
        console.warn('忽略非法来源的消息:', event.origin);
        return;
      }
      
      const data = event.data;
      
      // 兼容旧格式和新格式
      if (data.type === 'login_success' || data.success === true) {
        console.log('✅ 登录成功！');
        console.log('Token:', data.token);
        console.log('User ID:', data.user_id);
        
        // 发送 token 给后台验证
        sendTokenToBackend(data.token, data.user_id, data.is_new);
        
      } else if (data.type === 'login_error' || data.success === false) {
        console.error('❌ 登录失败:', data.error);
        alert('登录失败: ' + (data.message || data.error));
        hideLogin();
      }
    });
    
    // ============================================
    // 3️⃣ 发送 Token 给后台验证
    // ============================================
    async function sendTokenToBackend(token, userId, isNew) {
      try {
        // 调用你的后台接口
        const response = await fetch(BACKEND_API, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            token: token,
            user_id: userId,
            is_new: isNew
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // ✅ 后台验证成功
          console.log('后台验证成功，用户信息:', result.user);
          
          // 保存 token
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', userId);
          
          // 关闭登录弹窗
          hideLogin();
          
          // 更新 UI 显示用户信息
          displayUserInfo(result.user);
          
          // 可选：刷新页面
          // location.reload();
          
        } else {
          alert('后台验证失败: ' + result.message);
        }
        
      } catch (error) {
        console.error('发送 token 到后台失败:', error);
        alert('登录失败，请重试');
      }
    }
    
    function displayUserInfo(user) {
      document.getElementById('userInfo').innerHTML = 
        '<p>欢迎，' + user.nickname + '！</p>';
    }
  </script>
</body>
</html>
```

---

## 🔑 后台验证 Token（必须实现）

前端获取 JWT 后，**必须**由后台调用验证接口。

### 认证方式说明

调用 `/auth/verify` 需要两个 Token：

1. **用户 Token**（在请求体中）- 前端传来的 JWT
2. **认证 JWT**（在请求头中）- 后台生成，证明你有权限调用接口

### 认证 JWT 生成规则

```
Payload: { app_id: 'bingo84_app', exp: 当前时间 + 5分钟 }
密钥: app_secret
算法: HS256
有效期: 5 分钟
```

### Node.js 完整示例

```javascript
// 需要安装：npm install jose
import { SignJWT } from 'jose';

// 你的后台接口：POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { token } = req.body;
  
  // 配置（⚠️ 改成你的）
  const APP_ID = 'test_app';
  const APP_SECRET = 'test_secret_123456';
  const AUTH_SERVICE = 'https://auth-login.pwtk-dev.work';
  
  try {
    // 1️⃣ 生成认证 JWT（5分钟有效）
    const secret = new TextEncoder().encode(APP_SECRET);
    const authJWT = await new SignJWT({ app_id: APP_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(secret);
    
    // 2️⃣ 调用验证接口
    const response = await fetch(`${AUTH_SERVICE}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authJWT}`  // 认证 JWT 放在 Authorization 头
      },
      body: JSON.stringify({ token })  // 用户 token 放在 body
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 3️⃣ 获取用户信息
      const userInfo = result.data;
      console.log('用户信息:', {
        user_id: userInfo.user_id,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        email: userInfo.email,
        provider: userInfo.provider,
        a0: userInfo.a0
      });
      
      // 4️⃣ 创建 session
      req.session.userId = userInfo.user_id;
      req.session.user = userInfo;
      
      // 5️⃣ 返回给前端
      res.json({ success: true, user: userInfo });
    } else {
      res.json({ success: false, message: result.message });
    }
    
  } catch (error) {
    console.error('验证失败:', error);
    res.json({ success: false, message: '验证失败' });
  }
});
```

### PHP 完整示例

```php
<?php
// 需要：composer require firebase/php-jwt

use Firebase\JWT\JWT;

// 你的后台接口：POST /api/auth/login
$token = $_POST['token'];

// 配置（⚠️ 改成你的）
$appId = 'test_app';
$appSecret = 'test_secret_123456';
$authService = 'https://auth-login.pwtk-dev.work';

// 1️⃣ 生成认证 JWT（5分钟有效）
$authPayload = [
    'app_id' => $appId,
    'exp' => time() + 300  // 5分钟后过期
];
$authJWT = JWT::encode($authPayload, $appSecret, 'HS256');

// 2️⃣ 调用验证接口
$ch = curl_init("$authService/auth/verify");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        "Authorization: Bearer $authJWT"  // 认证 JWT 放在 Authorization 头
    ],
    CURLOPT_POSTFIELDS => json_encode(['token' => $token])  // 用户 token 放在 body
]);

$response = curl_exec($ch);
$result = json_decode($response, true);

if ($result['success']) {
    // 3️⃣ 获取用户信息
    $userInfo = $result['data'];
    
    // 4️⃣ 创建 session
    $_SESSION['user_id'] = $userInfo['user_id'];
    $_SESSION['user'] = $userInfo;
    
    // 5️⃣ 返回
    echo json_encode(['success' => true, 'user' => $userInfo]);
} else {
    echo json_encode(['success' => false, 'message' => $result['message']]);
}
?>
```

---

## 📊 完整数据流图

```
┌─────────────────────────────────────────────────────────────────────┐
│ 👤 用户操作流程                                                       │
└─────────────────────────────────────────────────────────────────────┘

第三方网站                    登录服务                    Google/Apple
    │                           │                             │
    │ 1. 点击登录按钮             │                             │
    │ ────────────────────────> │                             │
    │                           │                             │
    │ 2. 显示 iframe             │                             │
    │   (嵌入 /login 页面)        │                             │
    │                           │                             │
    │ 3. 用户点击 Google 按钮     │                             │
    │ ────────────────────────> │                             │
    │                           │                             │
    │                           │ 4. 重定向到 Google           │
    │                           │ ─────────────────────────> │
    │                           │                             │
    │                           │ 5. 用户登录授权              │
    │                           │ <─────────────────────────  │
    │                           │                             │
    │                           │ 6. 回调 + code              │
    │                           │ <─────────────────────────  │
    │                           │                             │
    │                           │ 7. 换 token + 生成 JWT       │
    │                           │                             │
    │ 8. postMessage 发送 JWT    │                             │
    │ <──────────────────────── │                             │
    │                           │                             │
    │ 9. 发送 JWT 给后台          │                             │
    │ ───────────> 后台          │                             │
    │              │            │                             │
    │              │ 10. 验证 JWT │                             │
    │              │ ─────────> │                             │
    │              │            │                             │
    │              │ 11. 返回用户信息                            │
    │              │ <───────── │                             │
    │              │            │                             │
    │ 12. 登录完成   │            │                             │
    │ <─────────── │            │                             │
    │                           │                             │
```

---

## 🔧 state 参数说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `callback_url` | ❌ | 登录成功后跳转地址（跳转模式用） | `https://your-site.com/` |
| `app_id` | ✅ | 应用 ID | `bingo84_app` |
| `a0` | ❌ | 自定义业务字段（如渠道、邀请码等） | `facebook_ad` |
| `isIframeMode` | ✅ | 是否 iframe 模式 | `true` |

**构建示例：**
```javascript
const state = JSON.stringify({
  app_id: 'bingo84_app',
  a0: 'channel_facebook',  // 可选
  isIframeMode: true
});
```

---

## 📤 postMessage 数据格式

### 登录成功

```javascript
{
  type: 'login_success',    // 消息类型
  success: true,            // 兼容旧格式
  token: 'eyJhbGc...',      // JWT Token (7天有效)
  user_id: 'usr_xxx',       // 用户 ID
  is_new: true,             // 是否新用户
  a0: 'channel_xxx'         // 自定义字段（如果传了）
}
```

### 登录失败

```javascript
{
  type: 'login_error',      // 消息类型
  success: false,           // 兼容旧格式
  error: 'google_token_failed',
  message: '错误详情'
}
```

---

## ⚠️ 重要注意事项

### 1. 配置检查清单

在开始接入前，确保已准备：

- ✅ `app_id`：`bingo84_app`（已分配）
- ✅ `app_secret`：`EJXWZ/30yN+rHcxawc0BxlKdzUsJTliMhITvEhA5W7U=`（已分配）
- ✅ 登录服务地址：`https://auth-login.bingo84.com`
- ✅ 后台 API 地址：你的后台验证接口地址

### 2. 必须验证 origin

```javascript
window.addEventListener('message', function(event) {
  // 🔒 必须验证来源
  if (event.origin !== 'https://auth-login.pwtk-dev.work') {
    console.warn('拒绝来自非法来源的消息:', event.origin);
    return;
  }
  // 处理消息...
});
```

### 3. 后台必须验证 Token（关键！）

❌ **错误做法：** 前端收到 token 后直接信任
```javascript
// ❌ 不安全！
if (data.token) {
  localStorage.setItem('token', data.token);
  location.reload();  // 直接登录
}
```

✅ **正确做法：** 必须发给后台验证
```javascript
// ✅ 安全！
if (data.token) {
  // 发给后台验证
  fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ token: data.token })
  }).then(res => {
    // 后台验证通过后才登录
  });
}
```

### 3. Token 有效期

- JWT 有效期：**7 天**
- 过期后需要重新登录
- 可在后台调用 `/auth/verify` 时检查 `expires_in` 字段

---

## ✅ 接入检查清单

### 前端开发需要做的：

- [ ] 1. 在页面中添加 iframe 弹窗 HTML 结构
- [ ] 2. 修改配置：`AUTH_SERVICE_URL`、`APP_ID`、`BACKEND_API`
- [ ] 3. 实现 `showLogin()` 函数（构建 state 并显示 iframe）
- [ ] 4. 实现 `message` 事件监听（接收 postMessage）
- [ ] 5. 实现 `sendTokenToBackend()` 函数（发送 token 给后台）
- [ ] 6. 验证 `event.origin` 是否为 `https://auth-login.bingo84.com`

### 后台开发需要做的：

- [ ] 1. 创建接口：`POST /api/auth/login`（接收前端传来的 token）
- [ ] 2. 安装 JWT 库（Node.js: `jose`，PHP: `firebase/php-jwt`，Python: `PyJWT`）
- [ ] 3. 生成认证 JWT（payload: `{app_id, exp}`，密钥: `app_secret`，算法: HS256）
- [ ] 4. 调用验证接口：`POST https://auth-login.bingo84.com/auth/verify`
- [ ] 5. 请求头：`Authorization: Bearer {认证JWT}`
- [ ] 6. 请求体：`{"token": "用户JWT"}`
- [ ] 7. 解析返回的用户信息（user_id、nickname、email、avatar、a0 等）
- [ ] 8. 创建 session 或 cookie（你的业务登录态）
- [ ] 9. 返回登录成功给前端

### 测试验证：

- [ ] 1. 访问你的网页，点击"登录"按钮
- [ ] 2. iframe 弹窗正常显示两个按钮
- [ ] 3. 点击 Google/Apple 按钮，跳转到授权页面
- [ ] 4. 授权完成，前端收到 postMessage
- [ ] 5. 前端发送 token 给后台
- [ ] 6. 后台调用验证接口成功，返回用户信息
- [ ] 7. 前端关闭弹窗，显示登录成功

---

## 🧪 快速测试

### 生产环境地址
```
https://auth-login.bingo84.com/login
```

### 测试环境地址（开发调试用）
```
https://auth-login.pwtk-dev.work/login
```

### 测试 iframe 模式（带 state）
```javascript
const state = JSON.stringify({
  app_id: 'test_app',
  isIframeMode: true
});
const url = 'https://auth-login.pwtk-dev.work/login?state=' + 
            encodeURIComponent(state) + '&iframe=1';
```

---

## 📚 相关文档

- **后台验证接口：** `API_VERIFY_TOKEN.md`
- **App SDK 登录：** `API_APP_LOGIN.md`
- **H5 原生集成：** `API_H5_LOGIN.md`（如果不用 `/login` 页面）

---

## 🆘 常见问题

### Q: iframe 中的 Google 授权页面会跳出来吗？
A: 会的。Google/Apple 授权时会跳出 iframe，变成整个浏览器窗口，授权完成后会重定向回 iframe 页面。

### Q: 支持移动端吗？
A: 完全支持。登录页面已做响应式设计，自动适配移动端。

### Q: 可以自定义登录页面样式吗？
A: 当前版本不支持。如需自定义，请参考 `API_H5_LOGIN.md` 自己实现 OAuth 流程。

### Q: 支持其他登录方式（LINE、Facebook 等）吗？
A: 当前仅支持 Google 和 Apple。其他平台待后续扩展。

---

## 📞 技术支持

如有问题，请查看：
- 完整 API 文档：`API_VERIFY_TOKEN.md`
- 配置清单：`CONFIG_CHECKLIST.md`
