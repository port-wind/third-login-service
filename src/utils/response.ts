/**
 * 响应工具
 */

import type { ApiResponse } from '../types'

/**
 * 成功响应（返回对象，用于 Hono Context）
 */
export function successResponse<T>(data: T, message = '成功'): ApiResponse<T> {
  return {
    success: true,
    code: 'OK',
    message,
    data,
  }
}

/**
 * 错误响应（返回对象，用于 Hono Context）
 */
export function errorResponse(
  code: string,
  message: string,
  _status = 400  // status 参数保留用于兼容性，实际不使用
): ApiResponse {
  return {
    success: false,
    code,
    message,
  }
}

/**
 * 成功响应（返回 Response 对象，用于原始 Request handler）
 */
export function createSuccessResponse<T>(data: T, message = '成功'): Response {
  const body: ApiResponse<T> = {
    success: true,
    code: 'OK',
    message,
    data,
  }
  
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

/**
 * 错误响应（返回 Response 对象，用于原始 Request handler）
 */
export function createErrorResponse(
  code: string,
  message: string,
  status = 400
): Response {
  const body: ApiResponse = {
    success: false,
    code,
    message,
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

/**
 * 重定向响应
 */
export function redirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': url,
    },
  })
}

