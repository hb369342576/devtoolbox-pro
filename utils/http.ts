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
 * 发送 HTTP 请求
 * - Tauri 桌面版：通过 Rust 后端 invoke，绕过 CORS
 * - Web 浏览器：使用原生 fetch（如有 CORS 问题需服务端配置允许跨域）
 */
export async function httpFetch(url: string, options: RequestOptions = {}): Promise<Response> {
    const { method = 'GET', headers, body } = options;
    const isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

    if (isTauri) {
        // Tauri 模式：走 Rust 后端，绕过 CORS
        try {
            const result = await invoke<HttpResponse>('http_request', {
                url,
                method,
                headers: headers || null,
                body: body || null,
            });

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
    } else {
        // Web 模式：使用原生 fetch
        try {
            return await window.fetch(url, {
                method,
                headers: headers as HeadersInit,
                body: body || undefined,
            });
        } catch (error) {
            throw new Error(`HTTP request failed: ${error}`);
        }
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
