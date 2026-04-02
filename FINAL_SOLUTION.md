# 🎯 最终方案：统一使用 Google 原始 ID

## 核心思路

**无论用什么方式登录，统一使用 Google 原始 ID 作为 provider_uid**

---

## 改动内容（仅 3 处）

### 1. `src/handlers/verify.ts` Line 66-72

**修改前：**
```typescript
const providerUid = provider === 'apple' 
  ? (googleUser.firebase?.identities?.['apple.com']?.[0] || googleUser.sub)
  : googleUser.sub  // ❌ 直接用 sub（Firebase Token 时是 Firebase UID）
```

**修改后：**
```typescript
// 统一使用第三方平台原始 ID（不使用 Firebase UID）
const providerUid = provider === 'apple' 
  ? (googleUser.firebase?.identities?.['apple.com']?.[0] || googleUser.sub)
  : (googleUser.firebase?.identities?.['google.com']?.[0] || googleUser.sub)  // ✅
```

---

### 2. `src/handlers/auth.ts` Line 63-68

**修改前：**
```typescript
} else {
  providerUid = googleUser.sub  // ❌ 直接用 sub
  nickname = googleUser.name
  avatar = googleUser.picture
  email = googleUser.email
}
```

**修改后：**
```typescript
} else {
  // 统一使用 Google 原始 ID（不使用 Firebase UID）
  providerUid = googleUser.firebase?.identities?.['google.com']?.[0] || googleUser.sub  // ✅
  nickname = googleUser.name
  avatar = googleUser.picture
  email = googleUser.email
}
```

---

### 3. `src/handlers/auth.ts` Line 80 - 修复 Buffer

**修改前：**
```typescript
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
```

**修改后：**
```typescript
const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
```

**原因：** Cloudflare Workers 不支持 Node.js 的 Buffer

---

## 工作原理

### 场景 1：Web OAuth 登录

```
用户 → Google 授权 → 回调 → code 换 token → 获取用户信息
                                                    ↓
                                          sub = Google 原始 ID
                                                    ↓
                                          googleUser.firebase 不存在
                                                    ↓
                                    回退到 googleUser.sub ✅
```

**结果：** `provider_uid = 106012793543365090189`

---

### 场景 2：App Firebase Google 登录

```
用户 → Firebase SDK → Firebase Token
                           ↓
            firebase.identities['google.com'][0] = Google 原始 ID
                           ↓
            优先提取这个 ID ✅
```

**结果：** `provider_uid = 106012793543365090189`

---

### 场景 3：前端直接用 Google OAuth Token（如果有）

```
用户 → Google SDK → Google OAuth Token
                           ↓
                  sub = Google 原始 ID
                           ↓
            googleUser.firebase 不存在
                           ↓
            回退到 googleUser.sub ✅
```

**结果：** `provider_uid = 106012793543365090189`

---

## 统一逻辑

```typescript
// 提取 provider_uid 的统一逻辑
const providerUid = googleUser.firebase?.identities?.['google.com']?.[0] || googleUser.sub
```

**三种情况都能正确处理：**

| 登录方式 | firebase 字段 | identities | 最终使用 |
|---------|--------------|------------|---------|
| Web OAuth | ❌ 不存在 | - | `googleUser.sub`（Google 原始 ID）✅ |
| Firebase Google | ✅ 存在 | ✅ 有值 | `identities['google.com'][0]`（Google 原始 ID）✅ |
| Google OAuth Token | ❌ 不存在 | - | `googleUser.sub`（Google 原始 ID）✅ |

**所有情况都指向同一个 ID！** 🎯

---

## 数据迁移

对于已经产生的重复账号，使用 `migrations/fix_duplicate_google_accounts.sql`：

```sql
-- 查找可能是 Firebase UID 的记录（包含字母）
SELECT 
  u.user_id,
  u.nickname,
  up.provider_uid,
  u.created_at
FROM users u
INNER JOIN user_providers up ON u.user_id = up.user_id
WHERE up.provider = 'google'
  AND up.provider_uid GLOB '*[a-zA-Z]*'  -- Firebase UID 特征
ORDER BY u.created_at DESC;
```

---

## 优势

✅ **最小化改动** - 只改 3 行核心逻辑  
✅ **向后兼容** - 支持所有现有登录方式  
✅ **统一标识** - 同一用户无论哪端登录，provider_uid 相同  
✅ **灵活扩展** - 不强制前端使用 Firebase  

---

## 总结

**改动前：**
- Web OAuth → Google 原始 ID ✅
- Firebase Google → Firebase UID ❌
- 同一账号产生两个用户记录

**改动后：**
- Web OAuth → Google 原始 ID ✅
- Firebase Google → Google 原始 ID ✅
- 同一账号只有一个用户记录

**只需 3 行代码改动，问题完美解决！** 🎉
