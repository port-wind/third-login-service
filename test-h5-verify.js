/**
 * H5 登录验证测试脚本
 * 用于测试修复后的 H5 登录 + 验证流程
 */

import { SignJWT } from 'jose';

const BASE_URL = 'https://auth-login.pwtk-dev.work';
// const BASE_URL = 'http://localhost:8787'; // 本地测试用

/**
 * 测试 H5 登录验证流程
 */
async function testH5LoginVerify() {
  console.log('🧪 测试 H5 登录验证流程\n');
  
  // 假设这是从 H5 登录获得的用户 JWT
  const userJWT = process.argv[2];
  
  if (!userJWT) {
    console.log('❌ 请提供用户 JWT Token');
    console.log('\n使用方法：');
    console.log('1. 访问 https://auth-login.pwtk-dev.work/test');
    console.log('2. 点击 Google 登录');
    console.log('3. 登录成功后复制显示的 JWT Token');
    console.log('4. 运行: node test-h5-verify.js <JWT_TOKEN>\n');
    process.exit(1);
  }
  
  console.log('📋 用户 JWT (前50字符):', userJWT.substring(0, 50) + '...\n');
  
  // 测试方案 1: 使用默认的 h5_callback
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 测试方案 1: 使用 h5_callback');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 生成认证 JWT
    const appId = 'h5_callback';
    const appSecret = 'h5_callback_secret_123456';
    
    console.log('1️⃣ 生成认证 JWT...');
    console.log(`   App ID: ${appId}`);
    console.log(`   App Secret: ${appSecret.substring(0, 10)}...\n`);
    
    const authJWT = await new SignJWT({ app_id: appId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(appSecret));
    
    console.log(`   ✅ 认证 JWT 生成成功\n`);
    
    // 调用验证接口
    console.log('2️⃣ 调用验证接口...');
    const response = await fetch(`${BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authJWT}`,
      },
      body: JSON.stringify({ token: userJWT })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('   ✅ 验证成功！\n');
      console.log('📊 用户信息：');
      console.log(`   User ID: ${result.data.user_id}`);
      console.log(`   Nickname: ${result.data.nickname}`);
      console.log(`   Provider: ${result.data.provider}`);
      console.log(`   App ID: ${result.data.app_id}`);
      console.log(`   有效期剩余: ${Math.floor(result.data.expires_in / 3600)} 小时\n`);
      
      // 检查 app_id 是否匹配
      if (result.data.app_id === appId) {
        console.log('   ✅ App ID 匹配正确\n');
      } else {
        console.log(`   ⚠️  App ID 不匹配：期望 ${appId}，实际 ${result.data.app_id}\n`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 测试通过！H5 登录验证流程正常工作');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } else {
      console.log(`   ❌ 验证失败`);
      console.log(`   错误代码: ${result.code}`);
      console.log(`   错误信息: ${result.message}\n`);
      
      if (result.code === 'INVALID_TOKEN') {
        console.log('💡 可能的原因：');
        console.log('   1. Token 已过期（7天有效期）');
        console.log('   2. Token 格式不正确');
        console.log('   3. 使用了错误的 app_id 和 app_secret\n');
      } else if (result.code === 'APP_NOT_FOUND') {
        console.log('💡 可能的原因：');
        console.log('   1. h5_callback 配置还未部署');
        console.log('   2. 配置文件有误\n');
      }
    }
    
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}\n`);
  }
}

// 运行测试
testH5LoginVerify().catch(console.error);

