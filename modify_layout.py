import re

with open(r"d:\work-ai\devtoolbox-pro\features\DataService\components\ApiDocAndTest.tsx", 'r', encoding='utf-8') as f:
    code = f.read()

# 1. 扩宽容器
code = code.replace(
    '<div className="max-w-5xl mx-auto space-y-8 animate-in fade-in transition-all pb-10">',
    '<div className="w-full max-w-full space-y-10 px-4 animate-in fade-in transition-all pb-32">'
)

# 2. 隐藏 single tab
code = code.replace(
    'Object.keys(apiDoc.endpoints).map(ep => (',
    'Object.keys(apiDoc.endpoints).filter(ep => ep !== \'one\').map(ep => ('
)

# 3. 移除外层大 grid 并且重构
# 找到 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"> 及其闭合
# 这个太复杂，直接正则或分割切分出几个块：Headers表, Request表, Response表, JSON块(包含内外层), 联调部分

# Header
code = code.replace(
    '<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">\n                    {/* Left: Fields Table */}\n                    <div className="space-y-8 lg:col-span-7">',
    '<div className="space-y-12 items-start w-full mt-6">\n'
)

# Extract Examples Request and Response blocks to put them side by side
req_table_block = """                        {/* Request Params */}
                        <div className="space-y-4">
                            <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                <List size={16} className="mr-2 text-blue-500" /> 请求参数 (Body)
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-xs">"""

req_example_html = """                                    {/* Request Example */}
                                    {apiDoc.examples.request && (
                                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col transition-all">
                                            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center">
                                                    请求参数示例 (Request)
                                                    <span className="text-green-400 ml-2 animate-pulse text-[8px] px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">● 实时联动修改</span>
                                                </span>
                                                <button onClick={() => handleCopy(JSON.stringify(getDynamicRequestJson(), null, 2), 'req-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                                    {copied === 'req-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                                <pre className="text-[11px] font-mono text-blue-300 leading-relaxed tabular-nums">
                                                    {JSON.stringify(getDynamicRequestJson(), null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}"""

res_table_block = """                        {/* Response Fields */}
                        <div className="space-y-4">
                            <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                <Code size={16} className="mr-2 text-green-500" /> 响应字段 (Response)
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-xs">"""

res_example_html = """                                    {/* Response Example */}
                                    {apiDoc.examples.response && (
                                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col">
                                            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">响应结果示例 (Response)</span>
                                                <button onClick={() => handleCopy(JSON.stringify(apiDoc.examples.response, null, 2), 'res-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                                    {copied === 'res-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed tabular-nums">
                                                    {JSON.stringify(apiDoc.examples.response, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}"""

# First, construct the paired side-by-side blocks
code = code.replace(
    req_table_block,
    '<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">\n' + req_table_block
)
# Close req table block and inject req example
old_req_close = """                                </table>
                            </div>
                        </div>

                        {/* Response Fields */}"""
new_req_close = """                                </table>
                            </div>
                        </div>
                        {apiDoc.examples && (
""" + req_example_html + """
                        )}
                        </div>

                        {/* Response Fields */}"""
code = code.replace(old_req_close, new_req_close)

# Now for Response
code = code.replace(
    res_table_block,
    '<div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">\n' + res_table_block
)

# Close res table block, inject res example, and remove the old trailing Examples block
old_res_close_with_old_examples = """                                </table>
                            </div>
                        </div>

                        {/* 数据示例 (JSON Examples) */}
                        {apiDoc.examples && (
                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                                    <FileText size={16} className="mr-2 text-indigo-500" /> 数据示例 (Data Examples)
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Request Example */}
                                    {apiDoc.examples.request && (
                                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col transition-all">
                                            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center">
                                                    请求参数示例 (Request)
                                                    <span className="text-green-400 ml-2 animate-pulse text-[8px] px-1.5 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">● 实时联动修改</span>
                                                </span>
                                                <button onClick={() => handleCopy(JSON.stringify(getDynamicRequestJson(), null, 2), 'req-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                                    {copied === 'req-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                                <pre className="text-[11px] font-mono text-blue-300 leading-relaxed tabular-nums">
                                                    {JSON.stringify(getDynamicRequestJson(), null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* Response Example */}
                                    {apiDoc.examples.response && (
                                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col">
                                            <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">响应结果示例 (Response)</span>
                                                <button onClick={() => handleCopy(JSON.stringify(apiDoc.examples.response, null, 2), 'res-exp')} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center transition-colors">
                                                    {copied === 'res-exp' ? <Check size={12} className="mr-1 text-green-400" /> : <Copy size={12} className="mr-1" />} 复制
                                                </button>
                                            </div>
                                            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[300px] flex-1 custom-scrollbar">
                                                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed tabular-nums">
                                                    {JSON.stringify(apiDoc.examples.response, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Online Test Portal */}
                    <div className="space-y-4 lg:col-span-5 relative">
                         <div className="flex items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                            <Play size={16} className="mr-2 text-green-500" /> 在线联调测试
                        </div>"""

new_res_close_and_test_start = """                                </table>
                            </div>
                        </div>
                        {apiDoc.examples && (
""" + res_example_html + """
                        )}
                        </div>
                    </div>

                    {/* Bottom: Online Test Portal */}
                    <div className="space-y-6 mt-16 pt-10 border-t-2 border-slate-200 dark:border-slate-800/80">
                         <div className="flex items-center text-xl font-black text-slate-800 dark:text-slate-100">
                            <Play size={24} className="mr-3 text-green-500" /> 在线联调测试
                        </div>"""

code = code.replace(old_res_close_with_old_examples, new_res_close_and_test_start)


# Change the testing container to full layout Grid
code = code.replace(
    '<div className="sticky top-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">',
    '<div className="grid grid-cols-1 2xl:grid-cols-3 gap-8 items-start"><div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm 2xl:sticky 2xl:top-8">'
)

# And wrap the result part in the remaining 2 spans
code = code.replace(
    """                            <button 
                                onClick={runTest} 
                                disabled={testing}
                                className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-black text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center shadow-lg active:scale-95"
                            >
                                {testing ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Play size={18} className="mr-2 fill-current" />} 发送测试请求
                            </button>

                            {testResult && (""",
    """                            <button 
                                onClick={runTest} 
                                disabled={testing}
                                className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-black text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center shadow-lg active:scale-95"
                            >
                                {testing ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Play size={18} className="mr-2 fill-current" />} 发送测试请求
                            </button>
                        </div>
                        <div className="2xl:col-span-2">
                            {testResult ? ("""
)

# Replace the closing logic for testResult
code = code.replace(
    """                                </div>
                            )}
                        </div>
                    </div>
                  </div>
              </div>""",
    """                                </div>
                            ) : (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 bg-slate-50 dark:bg-slate-800/50">
                                    <Terminal size={48} className="opacity-20 mb-4" />
                                    <p>参数填写完毕后，请点击发送请求即可查看返回值。</p>
                                </div>
                            )}
                        </div>
                    </div>
                  </div>
              </div>"""
)

with open(r"d:\work-ai\devtoolbox-pro\features\DataService\components\ApiDocAndTest.tsx", 'w', encoding='utf-8') as f:
    f.write(code)

print("success")
