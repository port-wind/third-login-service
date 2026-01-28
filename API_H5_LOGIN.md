# H5/Web 网页登录接口

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **登录方式** | 页面跳转 / iframe 弹窗 |
| **回调地址** | `https://auth-login.pwtk-dev.work/callback/{provider}` |
| **认证方式** | 无需认证（标准 OAuth 2.0） |
| **适用场景** | 网页端（H5/Web）第三方登录 |

**支持的平台：** `google` | `apple`

---

## 🔄 完整登录流程

```
┌─────────────────────────────────────────────────────────────┐
│                    H5 端登录流程                             │
└─────────────────────────────────────────────────────────────┘

1. H5 打开授权页面（跳转或 iframe）
   ↓
2. 用户在 Google/Apple 页面授权
   ↓
3. 回调到我们的服务
   GET /callback/google?code=xxx
   ↓
4. 我们的服务用 code 换取用户信息
   ↓
5. 生成 JWT Token
   ↓
6. 返回给 H5（URL 参数或 postMessage）
   ↓
7. H5 保存 JWT Token
   ↓
8. H5 把用户 JWT Token 传给你的后台
   ↓
9. 你的后台生成认证 JWT
   ↓
10. 你的后台调用验证接口 (带认证 JWT)
    POST /auth/verify
    ↓
11. 返回完整用户信息
    ↓
12. 你的后台创建会话，完成登录 ✅
```

---

## 🚀 两种集成方式

### 方式 1：页面跳转（推荐，简单）

✅ 优点：实现简单，兼容性好  
❌ 缺点：会跳转页面

### 方式 2：iframe 弹窗（无刷新）

✅ 优点：无刷新登录，用户体验好  
❌ 缺点：某些浏览器可能有限制

---

## 📱 方式 1：页面跳转集成

### 步骤 1: 构建授权 URL 并跳转

#### Google 登录

```javascript
function loginWithGoogle() {
  // 构建 state 参数（可包含 app_id 和 a0 自定义字段）
  const stateObj = {
    callback_url: window.location.href,
    app_id: 'test_app',  // 可选，默认 'h5_callback'
    a0: '自定义字段（可选）'  // 可选参数，会在验证时返回
  };
  
  const params = new URLSearchParams({
    client_id: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com',
    redirect_uri: 'https://auth-login.pwtk-dev.work/callback/google',
    response_type: 'code',
    scope: 'openid email profile',
    state: encodeURIComponent(JSON.stringify(stateObj)),
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

#### Apple 登录

```javascript
function loginWithApple() {
  // 构建 state 参数（可包含 app_id 和 a0 自定义字段）
  const stateObj = {
    callback_url: window.location.href,
    app_id: 'test_app',  // 可选，默认 'h5_callback'
    a0: '自定义字段（可选）'  // 可选参数，会在验证时返回
  };
  
  const params = new URLSearchParams({
    client_id: 'jp.xdreamstar.auth-bridge-dev.service',
    redirect_uri: 'https://auth-login.pwtk-dev.work/callback/apple',
    response_type: 'code',
    scope: 'name email',
    response_mode: 'form_post',
    state: encodeURIComponent(JSON.stringify(stateObj)),
  });
  
  window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
}
```

---

### 步骤 2: 接收回调结果

登录成功后，会跳转回 `state` 参数指定的页面，URL 参数中包含：

| 参数 | 说明 |
|------|------|
| `token` | JWT Token（7天有效） |
| `user_id` | 用户 ID |
| `is_new` | 是否新用户（`true` / `false`） |
| `a0` | 自定义字段（如果 state 中传了） |

**处理代码：**

```javascript
function checkCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const userId = params.get('user_id');
  const isNew = params.get('is_new');
  const error = params.get('error');
  
  if (token && userId) {
    // 登录成功
    console.log('登录成功！JWT Token:', token);
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_id', userId);
    
    // 获取 a0 参数（如果有）
    const a0 = params.get('a0');
    if (a0) {
      console.log('自定义字段 a0:', a0);
    }
    
    // 清理 URL 参数
    window.history.replaceState({}, '', window.location.pathname);
    
    // 把 token 传给你的后台
    sendTokenToBackend(token);
  } else if (error) {
    // 登录失败
    console.error('登录失败:', error);
  }
}

// 页面加载时检查
checkCallback();
```

---

## 🎨 方式 2：iframe 弹窗集成

### 步骤 1: 打开 iframe 弹窗

**关键点：state 参数加 `iframe:` 前缀**

```javascript
function openLoginModal(provider) {
  // 创建弹窗
  const modal = document.createElement('div');
  modal.id = 'login-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  
  // 创建 iframe
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 600px;
    border: none;
    background: white;
    border-radius: 8px;
  `;
  
  // 构建 state 参数（可包含 app_id 和 a0）
  const stateObj = {
    callback_url: window.location.href,
    app_id: 'test_app',  // 可选，默认 'h5_callback'
    a0: '自定义字段（可选）'  // 可选参数
  };
  const state = 'iframe:' + encodeURIComponent(JSON.stringify(stateObj));
  
  // 构建授权 URL
  let authUrl = '';
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com',
      redirect_uri: 'https://auth-login.pwtk-dev.work/callback/google',
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
    });
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  } else if (provider === 'apple') {
    const params = new URLSearchParams({
      client_id: 'jp.xdreamstar.auth-bridge-dev.service',
      redirect_uri: 'https://auth-login.pwtk-dev.work/callback/apple',
      response_type: 'code',
      scope: 'name email',
      response_mode: 'form_post',
      state: state,
    });
    authUrl = `https://appleid.apple.com/auth/authorize?${params}`;
  }
  
  iframe.src = authUrl;
  modal.appendChild(iframe);
  document.body.appendChild(modal);
  
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: white;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
  `;
  closeBtn.onclick = () => document.body.removeChild(modal);
  modal.appendChild(closeBtn);
}
```

---

### 步骤 2: 监听 postMessage

登录成功后，iframe 会通过 `postMessage` 发送结果给父页面，数据结构：

**成功响应：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | `true` 表示成功 |
| `token` | string | JWT Token（7天有效） |
| `user_id` | string | 用户 ID |
| `is_new` | boolean | 是否新用户 |
| `a0` | string | 自定义字段（如果 state 中传了） |

**失败响应：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | `false` 表示失败 |
| `error` | string | 错误码 |
| `message` | string | 错误消息 |

**接收代码：**

```javascript
// 监听来自 iframe 的消息
window.addEventListener('message', (event) => {
  // 验证来源
  if (event.origin !== 'https://auth-login.pwtk-dev.work') {
    return;
  }
  
  const data = event.data;
  
  if (data.success) {
    // 登录成功
    console.log('登录成功！JWT Token:', data.token);
    localStorage.setItem('jwt_token', data.token);
    localStorage.setItem('user_id', data.user_id);
    
    // 获取 a0 参数（如果有）
    if (data.a0) {
      console.log('自定义字段 a0:', data.a0);
    }
    
    // 关闭弹窗
    const modal = document.getElementById('login-modal');
    if (modal) modal.remove();
    
    // 把 token 传给你的后台
    sendTokenToBackend(data.token);
  } else {
    // 登录失败
    console.error('登录失败:', data.error);
    alert('登录失败：' + data.message);
  }
});
```

---

## 📄 完整示例

### 方式 1：页面跳转

```html
<!DOCTYPE html>
<html>
<head>
  <title>第三方登录</title>
</head>
<body>
  <h1>第三方登录</h1>
  <button onclick="loginWithGoogle()">🔵 Google 登录</button>
  <button onclick="loginWithApple()">🍎 Apple 登录</button>
  
  <script>
    function loginWithGoogle() {
      const params = new URLSearchParams({
        client_id: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com',
        redirect_uri: 'https://auth-login.pwtk-dev.work/callback/google',
        response_type: 'code',
        scope: 'openid email profile',
        state: encodeURIComponent(window.location.href),
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }
    
    function loginWithApple() {
      const params = new URLSearchParams({
        client_id: 'jp.xdreamstar.auth-bridge-dev.service',
        redirect_uri: 'https://auth-login.pwtk-dev.work/callback/apple',
        response_type: 'code',
        scope: 'name email',
        response_mode: 'form_post',
        state: encodeURIComponent(window.location.href),
      });
      window.location.href = `https://appleid.apple.com/auth/authorize?${params}`;
    }
    
    // 检查回调
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      console.log('登录成功！Token:', token);
      localStorage.setItem('jwt_token', token);
      window.history.replaceState({}, '', window.location.pathname);
    }
  </script>
</body>
</html>
```

---

### 方式 2：iframe 弹窗

```html
<!DOCTYPE html>
<html>
<head>
  <title>第三方登录 - iframe 模式</title>
</head>
<body>
  <h1>第三方登录 - iframe 模式</h1>
  <button onclick="openLoginModal('google')">🔵 Google 登录</button>
  <button onclick="openLoginModal('apple')">🍎 Apple 登录</button>
  
  <script>
    function openLoginModal(provider) {
      const modal = document.createElement('div');
      modal.id = 'login-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;';
      
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:600px;border:none;background:white;border-radius:8px;';
      
      let authUrl = '';
      if (provider === 'google') {
        const params = new URLSearchParams({
          client_id: '782998765578-32jugpmg4chshrfl9r04llfdfo991m8b.apps.googleusercontent.com',
          redirect_uri: 'https://auth-login.pwtk-dev.work/callback/google',
          response_type: 'code',
          scope: 'openid email profile',
          state: 'iframe:' + encodeURIComponent(window.location.href),
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      } else if (provider === 'apple') {
        const params = new URLSearchParams({
          client_id: 'jp.xdreamstar.auth-bridge-dev.service',
          redirect_uri: 'https://auth-login.pwtk-dev.work/callback/apple',
          response_type: 'code',
          scope: 'name email',
          response_mode: 'form_post',
          state: 'iframe:' + encodeURIComponent(window.location.href),
        });
        authUrl = `https://appleid.apple.com/auth/authorize?${params}`;
      }
      
      iframe.src = authUrl;
      modal.appendChild(iframe);
      document.body.appendChild(modal);
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:white;border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:20px;';
      closeBtn.onclick = () => document.body.removeChild(modal);
      modal.appendChild(closeBtn);
    }
    
    // 监听 postMessage
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://auth-login.pwtk-dev.work') return;
      
      const data = event.data;
      if (data.success) {
        console.log('登录成功！Token:', data.token);
        localStorage.setItem('jwt_token', data.token);
        
        const modal = document.getElementById('login-modal');
        if (modal) modal.remove();
        
        alert('登录成功！User ID: ' + data.user_id);
      } else {
        console.error('登录失败:', data.error);
        alert('登录失败：' + data.message);
      }
    });
  </script>
</body>
</html>
```

---

## 🔑 核心要点

### State 参数说明

`state` 参数支持两种格式：

#### 1. 简单格式（字符串）
```javascript
state: encodeURIComponent(window.location.href)
```

#### 2. JSON 格式（推荐，支持更多参数）
```javascript
const stateObj = {
  callback_url: window.location.href,  // 必填：回调地址
  app_id: 'test_app',                  // 可选：应用ID（默认 'h5_callback'）
  a0: '自定义字段'                      // 可选：自定义业务字段
};
state: encodeURIComponent(JSON.stringify(stateObj))
```

**State 参数字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| `callback_url` | ✅ | 登录成功后的回调地址 |
| `app_id` | ❌ | 应用ID，用于区分不同应用（默认 `h5_callback`） |
| `a0` | ❌ | 自定义业务字段，会在回调和验证时返回 |

**`a0` 参数的使用场景：**
- 📊 **渠道追踪**：记录用户来源渠道（如 `channel_facebook`、`promo_2024`）
- 🎯 **业务标识**：传递业务相关的临时信息（如活动ID、推广码）
- 🔗 **关联数据**：关联前端的临时状态到后端（如邀请码、分享ID）
- 💡 **灵活扩展**：任何需要在登录流程中传递的自定义数据

**数据流：** `Web H5 传入 a0` → `编码到 state` → `OAuth 回调` → `生成 JWT（包含 a0）` → `返回给 Web H5` → `后端验证时返回 a0`

### 页面跳转模式
```javascript
state: encodeURIComponent(JSON.stringify({ callback_url: window.location.href }))
// ↓ 回调：重定向到该 URL，带 token 参数
```

### iframe 弹窗模式
```javascript
state: 'iframe:' + encodeURIComponent(JSON.stringify({ callback_url: window.location.href }))
// ↓ 回调：返回 HTML，通过 postMessage 发送 token
```

**区别只在 `state` 参数！加 `iframe:` 前缀表示使用 iframe 模式。**

---

## 📝 获取到 Token 后

无论哪种方式，获取到 JWT Token 后：

### 步骤 1：保存 Token
```javascript
localStorage.setItem('jwt_token', token);
```

### 步骤 2：传给你的后台
```javascript
async function sendTokenToBackend(jwtToken) {
  const response = await fetch('https://your-backend.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: jwtToken })
  });
  
  const result = await response.json();
  console.log('后台验证结果:', result);
}
```

### 步骤 3：后台验证 Token

你的后台收到 Token 后，调用 [后台验证接口](./API_VERIFY_TOKEN.md) 验证。

---

## 💡 a0 参数完整使用示例

### 场景：记录用户来源渠道

```javascript
// 1. 前端：从 URL 获取渠道参数
function getChannelFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('channel') || params.get('from') || 'direct';
}

// 2. 登录时传入 a0
function loginWithGoogle() {
  const channel = getChannelFromUrl();  // 例如: 'facebook_ad'
  
  const stateObj = {
    callback_url: window.location.href,
    app_id: 'my_game_web',
    a0: channel  // ← 把渠道作为 a0 传入
  };
  
  const state = 'iframe:' + encodeURIComponent(JSON.stringify(stateObj));
  
  // 构建登录 URL...
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `state=${state}&...`;
  
  // 打开 iframe...
}

// 3. 接收回调（含 a0）
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://auth-login.pwtk-dev.work') return;
  
  const { success, token, user_id, a0 } = event.data;
  
  if (success) {
    console.log('用户ID:', user_id);
    console.log('来源渠道:', a0);  // 输出: 'facebook_ad'
    
    // 4. 传给后台（后台验证 Token 时会返回 a0）
    sendToBackend(token, a0);
  }
});

// 5. 后台验证时也会返回 a0
async function sendToBackend(token, channel) {
  const response = await fetch('https://your-game-backend.com/api/login', {
    method: 'POST',
    body: JSON.stringify({ token, channel })
  });
  
  // 后台调用 /auth/verify 验证 Token
  // 验证响应中会包含 a0，后台可以记录用户渠道
}
```

**数据流：**
```
URL: https://game.com?channel=facebook_ad
  ↓
前端提取 channel → a0: 'facebook_ad'
  ↓
登录 state: { a0: 'facebook_ad' }
  ↓
OAuth 回调 → 服务端生成 JWT（包含 a0）
  ↓
postMessage 返回: { token: '...', a0: 'facebook_ad' }
  ↓
后台验证 Token → 返回: { user_id: '...', a0: 'facebook_ad' }
  ↓
后台记录用户来源渠道到数据库
```

---

## ⚠️ 注意事项

### iframe 模式限制

- Google/Apple 的授权页面**允许在 iframe 中打开**
- 某些浏览器（如 Safari）对 iframe 有跨域限制
- 如果遇到问题，建议使用页面跳转模式

### postMessage 安全

```javascript
// 必须验证来源
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://auth-login.pwtk-dev.work') {
    return; // 忽略非法来源
  }
  // 处理消息
});
```

---

## 🧪 测试

访问测试页面体验完整流程：
```
https://auth-login.pwtk-dev.work/test
```

---

## 📞 相关文档

- [App 登录接口](./API_APP_LOGIN.md)
- [后台验证接口](./API_VERIFY_TOKEN.md)
