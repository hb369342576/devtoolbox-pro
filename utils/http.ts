/**
 * HTTP 请求工具模块
 * 使用 Tauri invoke 调用 Rust 后端发送 HTTP 请求
 * 绕过浏览器 CORS 限制
 */
import { invoke } from '@tauri-apps/api/core';

interface HttpResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
}

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

/**
 * 发送 HTTP 请求 (通过 Rust 后端，绕过 CORS)
 */
export async function httpFetch(url: string, options: RequestOptions = {}): Promise<Response> {
    const { method = 'GET', headers, body } = options;
    
    try {
        const result = await invoke<HttpResponse>('http_request', {
            url,
            method,
            headers: headers || null,
            body: body || null,
        });
        
        // 模拟 Response 对象
        return {
            ok: result.status >= 200 && result.status < 300,
            status: result.status,
            statusText: '',
            headers: new Headers(result.headers),
            json: async () => JSON.parse(result.body),
            text: async () => result.body,
            body: null,
            bodyUsed: false,
            arrayBuffer: async () => new TextEncoder().encode(result.body).buffer,
            blob: async () => new Blob([result.body]),
            formData: async () => { throw new Error('formData not implemented'); },
            clone: function() { return this; },
            type: 'basic' as ResponseType,
            url,
            redirected: false,
            bytes: async () => new Uint8Array(),
        } as Response;
    } catch (error) {
        throw new Error(`HTTP request failed: ${error}`);
    }
}

/**
 * 发送文件上传请求 (Multipart/form-data，通过 Rust 后端)
 */
export async function httpUpload(
    url: string, 
    options: {
        headers?: Record<string, string>;
        fileName: string;
        fileData: Uint8Array | number[];
        formFields?: Record<string, string>;
    }
): Promise<Response> {
    const { headers, fileName, fileData, formFields } = options;
    
    try {
        const result = await invoke<HttpResponse>('http_upload', {
            url,
            headers: headers || null,
            fileName,
            fileData: Array.from(fileData), // 确保是数组格式传给 Rust
            formFields: formFields || null,
        });
        
        return {
            ok: result.status >= 200 && result.status < 300,
            status: result.status,
            statusText: '',
            headers: new Headers(result.headers),
            json: async () => JSON.parse(result.body),
            text: async () => result.body,
        } as Response;
    } catch (error) {
        throw new Error(`HTTP upload failed: ${error}`);
    }
}

export default httpFetch;
