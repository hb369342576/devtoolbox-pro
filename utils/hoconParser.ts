/**
 * HOCON (Human-Optimized Config Object Notation) to JSON 转换器
 * 用于将 SeaTunnel 的 .conf 文件格式转换为 JSON
 * 
 * 支持特性:
 * - 多行字符串 """..."""
 * - # 和 // 注释
 * - key = value 语法
 * - 省略键引号
 * - 嵌套对象
 */

/**
 * 检测内容是否为 HOCON 格式
 */
export function isHoconFormat(content: string): boolean {
    const trimmed = content.trim();
    
    // 如果是有效的 JSON，返回 false
    try {
        JSON.parse(trimmed);
        return false;
    } catch {
        // 不是有效 JSON，可能是 HOCON
    }
    
    // 检查 HOCON 特征
    const hoconPatterns = [
        /^\s*(env|source|transform|sink)\s*\{/m,  // SeaTunnel 块
        /^\s*\w+\s*=\s*/m,                         // key = value 语法
        /^\s*\w+\s*\{/m,                           // key { 语法（无冒号）
        /^\s*#[^"]/m,                              // # 注释（不在引号后）
        /^\s*\/\//m,                               // // 注释
        /"""/,                                      // 多行字符串
    ];
    
    return hoconPatterns.some(pattern => pattern.test(trimmed));
}

// Token 类型
type TokenType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'NULL' | 'IDENTIFIER' | 
                 'LBRACE' | 'RBRACE' | 'LBRACKET' | 'RBRACKET' | 
                 'EQUALS' | 'COLON' | 'COMMA' | 'NEWLINE' | 'EOF';

interface Token {
    type: TokenType;
    value: string;
    line: number;
    col: number;
}

class HoconTokenizer {
    private pos = 0;
    private line = 1;
    private col = 1;
    private tokens: Token[] = [];
    
    constructor(private input: string) {}
    
    tokenize(): Token[] {
        while (this.pos < this.input.length) {
            this.skipWhitespaceAndComments();
            if (this.pos >= this.input.length) break;
            
            const char = this.input[this.pos];
            
            if (char === '{') {
                this.addToken('LBRACE', '{');
                this.advance();
            } else if (char === '}') {
                this.addToken('RBRACE', '}');
                this.advance();
            } else if (char === '[') {
                this.addToken('LBRACKET', '[');
                this.advance();
            } else if (char === ']') {
                this.addToken('RBRACKET', ']');
                this.advance();
            } else if (char === '=') {
                this.addToken('EQUALS', '=');
                this.advance();
            } else if (char === ':') {
                this.addToken('COLON', ':');
                this.advance();
            } else if (char === ',') {
                this.addToken('COMMA', ',');
                this.advance();
            } else if (char === '\n') {
                this.addToken('NEWLINE', '\n');
                this.advance();
                this.line++;
                this.col = 1;
            } else if (char === '"') {
                this.readString();
            } else if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
                this.readNumber();
            } else if (this.isIdentifierStart(char)) {
                this.readIdentifier();
            } else {
                this.advance();
            }
        }
        
        this.addToken('EOF', '');
        return this.tokens;
    }
    
    private advance(): string {
        const char = this.input[this.pos];
        this.pos++;
        this.col++;
        return char;
    }
    
    private peek(offset = 0): string {
        return this.input[this.pos + offset] || '';
    }
    
    private addToken(type: TokenType, value: string) {
        this.tokens.push({ type, value, line: this.line, col: this.col });
    }
    
    private skipWhitespaceAndComments() {
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            
            // 跳过空白（不包括换行）
            if (char === ' ' || char === '\t' || char === '\r') {
                this.advance();
                continue;
            }
            
            // # 注释
            if (char === '#') {
                this.skipToEndOfLine();
                continue;
            }
            
            // // 注释
            if (char === '/' && this.peek(1) === '/') {
                this.skipToEndOfLine();
                continue;
            }
            
            break;
        }
    }
    
    private skipToEndOfLine() {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
            this.advance();
        }
    }
    
    private readString() {
        const startLine = this.line;
        const startCol = this.col;
        
        // 检查是否是多行字符串 """
        if (this.peek(0) === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
            this.advance(); // "
            this.advance(); // "
            this.advance(); // "
            
            let value = '';
            while (this.pos < this.input.length) {
                if (this.peek(0) === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
                    this.advance(); // "
                    this.advance(); // "
                    this.advance(); // "
                    break;
                }
                const char = this.advance();
                if (char === '\n') {
                    this.line++;
                    this.col = 1;
                }
                value += char;
            }
            
            this.tokens.push({ type: 'STRING', value, line: startLine, col: startCol });
            return;
        }
        
        // 普通字符串
        this.advance(); // 跳过开头的 "
        let value = '';
        let escaped = false;
        
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            
            if (escaped) {
                value += char;
                escaped = false;
            } else if (char === '\\') {
                value += char;
                escaped = true;
            } else if (char === '"') {
                this.advance();
                break;
            } else if (char === '\n') {
                // 字符串中的换行
                this.line++;
                this.col = 1;
                value += char;
            } else {
                value += char;
            }
            
            this.advance();
        }
        
        this.tokens.push({ type: 'STRING', value, line: startLine, col: startCol });
    }
    
    private readNumber() {
        let value = '';
        
        if (this.input[this.pos] === '-') {
            value += this.advance();
        }
        
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (this.isDigit(char) || char === '.' || char === 'e' || char === 'E' || char === '+' || char === '-') {
                value += this.advance();
            } else {
                break;
            }
        }
        
        this.addToken('NUMBER', value);
    }
    
    private readIdentifier() {
        let value = '';
        
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (this.isIdentifierChar(char)) {
                value += this.advance();
            } else {
                break;
            }
        }
        
        // 检查是否是布尔值或 null
        if (value === 'true' || value === 'false') {
            this.addToken('BOOLEAN', value);
        } else if (value === 'null') {
            this.addToken('NULL', value);
        } else {
            this.addToken('IDENTIFIER', value);
        }
    }
    
    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }
    
    private isIdentifierStart(char: string): boolean {
        return (char >= 'a' && char <= 'z') || 
               (char >= 'A' && char <= 'Z') || 
               char === '_';
    }
    
    private isIdentifierChar(char: string): boolean {
        return this.isIdentifierStart(char) || 
               this.isDigit(char) || 
               char === '.' || 
               char === '-' ||
               char === '_';
    }
}

class HoconParser {
    private pos = 0;
    private tokens: Token[] = [];
    
    constructor(tokens: Token[]) {
        this.tokens = tokens.filter(t => t.type !== 'NEWLINE');
    }
    
    parse(): any {
        const result = this.parseObject(false);
        return result;
    }
    
    private current(): Token {
        return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, col: 0 };
    }
    
    private advance(): Token {
        return this.tokens[this.pos++];
    }
    
    private expect(type: TokenType): Token {
        const token = this.current();
        if (token.type !== type) {
            throw new Error(`Expected ${type} but got ${token.type} at line ${token.line}`);
        }
        return this.advance();
    }
    
    private parseObject(expectBraces = true): any {
        const obj: any = {};
        
        if (expectBraces) {
            this.expect('LBRACE');
        }
        
        while (this.current().type !== 'RBRACE' && this.current().type !== 'EOF') {
            // 跳过逗号
            if (this.current().type === 'COMMA') {
                this.advance();
                continue;
            }
            
            // 读取键
            const keyToken = this.current();
            if (keyToken.type !== 'IDENTIFIER' && keyToken.type !== 'STRING') {
                break;
            }
            this.advance();
            const key = keyToken.value;
            
            // 检查是否有 = 或 : 或直接 {
            const separator = this.current();
            if (separator.type === 'EQUALS' || separator.type === 'COLON') {
                this.advance();
            }
            
            // 读取值
            const value = this.parseValue();
            obj[key] = value;
        }
        
        if (expectBraces && this.current().type === 'RBRACE') {
            this.advance();
        }
        
        return obj;
    }
    
    private parseArray(): any[] {
        this.expect('LBRACKET');
        const arr: any[] = [];
        
        while (this.current().type !== 'RBRACKET' && this.current().type !== 'EOF') {
            if (this.current().type === 'COMMA') {
                this.advance();
                continue;
            }
            
            arr.push(this.parseValue());
        }
        
        if (this.current().type === 'RBRACKET') {
            this.advance();
        }
        
        return arr;
    }
    
    private parseValue(): any {
        const token = this.current();
        
        switch (token.type) {
            case 'LBRACE':
                return this.parseObject(true);
            case 'LBRACKET':
                return this.parseArray();
            case 'STRING':
                this.advance();
                return token.value;
            case 'NUMBER':
                this.advance();
                return parseFloat(token.value);
            case 'BOOLEAN':
                this.advance();
                return token.value === 'true';
            case 'NULL':
                this.advance();
                return null;
            case 'IDENTIFIER':
                // 无引号的字符串值
                this.advance();
                return token.value;
            default:
                throw new Error(`Unexpected token ${token.type} at line ${token.line}`);
        }
    }
}

/**
 * 将 HOCON 格式转换为 JSON
 */
export function hoconToJson(hocon: string): string {
    const tokenizer = new HoconTokenizer(hocon);
    const tokens = tokenizer.tokenize();
    const parser = new HoconParser(tokens);
    const obj = parser.parse();
    
    // SeaTunnel 要求 source/sink/transform 为数组格式
    // 将 { "Jdbc": { ... } } 转换为 [{ "plugin_name": "Jdbc", ... }]
    const result = convertToSeaTunnelFormat(obj);
    
    return JSON.stringify(result, null, 2);
}

/**
 * 将解析结果转换为 SeaTunnel API 期望的格式
 * source/sink/transform 需要是数组，每个元素包含 plugin_name
 */
function convertToSeaTunnelFormat(obj: any): any {
    const result: any = {};
    
    for (const key of Object.keys(obj)) {
        if (key === 'source' || key === 'sink' || key === 'transform') {
            // 转换为数组格式
            const plugins = obj[key];
            if (Array.isArray(plugins)) {
                result[key] = plugins;
            } else if (typeof plugins === 'object' && plugins !== null) {
                // { "Jdbc": { ... }, "Console": {} } => [{ "plugin_name": "Jdbc", ... }, { "plugin_name": "Console" }]
                const arr: any[] = [];
                for (const pluginName of Object.keys(plugins)) {
                    const pluginConfig = plugins[pluginName];
                    if (typeof pluginConfig === 'object' && pluginConfig !== null) {
                        arr.push({
                            plugin_name: pluginName,
                            ...pluginConfig
                        });
                    } else {
                        arr.push({ plugin_name: pluginName });
                    }
                }
                result[key] = arr;
            } else {
                result[key] = plugins;
            }
        } else {
            result[key] = obj[key];
        }
    }
    
    return result;
}

/**
 * 格式化 JSON 输出
 */
export function formatJson(json: string): string {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return json;
    }
}

/**
 * 自动检测格式并转换为 JSON
 */
export function convertToJson(content: string): { json: string; converted: boolean; error?: string } {
    const trimmed = content.trim();
    
    if (!trimmed) {
        return { json: '', converted: false, error: 'Empty content' };
    }
    
    // 尝试直接解析为 JSON
    try {
        JSON.parse(trimmed);
        return { json: formatJson(trimmed), converted: false };
    } catch {
        // 不是有效 JSON
    }
    
    // 检测是否为 HOCON 格式
    if (isHoconFormat(trimmed)) {
        try {
            const json = hoconToJson(trimmed);
            return { json, converted: true };
        } catch (err: any) {
            return { 
                json: '', 
                converted: false, 
                error: `HOCON 转换失败: ${err.message}` 
            };
        }
    }
    
    return { json: '', converted: false, error: '无法识别的配置格式' };
}
