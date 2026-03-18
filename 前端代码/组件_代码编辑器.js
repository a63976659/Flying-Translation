import { 智能分析错误位置, 检测重复行, 快速修复缺失逗号, 转义HTML } from './核心_智能验证.js';

function 注入编辑器专属样式() {
    if(document.getElementById('ft-editor-style')) return;
    const 样式 = document.createElement('style');
    样式.id = 'ft-editor-style';
    样式.textContent = `
        .ft-editor-container { display: flex; flex-direction: column; height: 450px; border-radius: 8px; border: 2px solid #e0e6ef; background: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
        .ft-editor-container:focus-within { border-color: #6a11cb; }
        .ft-toolbar { display: flex; gap: 5px; padding: 8px; background: #f9fafc; border-bottom: 1px solid #e0e6ef; flex-wrap: wrap; }
        .ft-tool-btn { padding: 4px 8px; border: 1px solid #ddd; background: #fff; border-radius: 4px; font-size: 11px; cursor: pointer; color: #555; transition: 0.2s; }
        .ft-tool-btn:hover { background: #eee; }
        .ft-tool-btn.warning { color: #d35400; border-color: #f39c12; background: #fdf2e9; }
        .ft-editor-main { display: flex; flex: 1; overflow: hidden; position: relative; }
        .ft-line-numbers { padding: 10px 5px; background: #f9fafc; text-align: right; border-right: 1px solid #e0e6ef; font-family: 'Consolas', monospace; font-size: 12px; color: #7f8c8d; user-select: none; overflow-y: hidden; min-width: 35px; }
        .ft-content { flex: 1; padding: 10px; font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.5; outline: none; overflow: auto; white-space: pre; background: #fff; color: #333 !important; tab-size: 4; }
        
        /* 智能高亮系统 */
        .hl-error { background-color: #ffeaea; border-left: 3px solid #e74c3c; padding-left: 2px; display: inline-block; width: 100%; }
        .hl-duplicate { background-color: #fff3cd; border-left: 3px solid #f39c12; padding-left: 2px; display: inline-block; width: 100%; }
        .ft-msg-box { font-size: 11px; padding: 8px; border-radius: 4px; margin-top: 5px; display: none; word-wrap: break-word; }
        .ft-msg-box.success { background: #e8f8f5; color: #27ae60; border: 1px solid #2ecc71; display: block; }
        .ft-msg-box.error { background: #fdedec; color: #c0392b; border: 1px solid #e74c3c; display: block; }
        .ft-msg-box.warning { background: #fef5e7; color: #d35400; border: 1px solid #f39c12; display: block; }
    `;
    document.head.appendChild(样式);
}

export function 生成高级JSON编辑器DOM(预设数据 = "", 包含保存按钮 = true) {
    注入编辑器专属样式();
    
    const 容器 = document.createElement('div');
    容器.innerHTML = `
        <div class="ft-editor-container">
            <div class="ft-toolbar">
                <button class="ft-tool-btn btn-format"><i class="fas fa-indent"></i> 格式化 (Format)</button>
                <button class="ft-tool-btn btn-validate"><i class="fas fa-check"></i> 智能验证 (Validate)</button>
                <button class="ft-tool-btn btn-duplicate"><i class="fas fa-copy"></i> 查重复 (Find Duplicates)</button>
                <button class="ft-tool-btn warning btn-fix" style="display:none;"><i class="fas fa-magic"></i> 修复逗号 (Fix Comma)</button>
            </div>
            <div class="ft-editor-main">
                <div class="ft-line-numbers">1</div>
                <div class="ft-content" contenteditable="true" spellcheck="false">${转义HTML(预设数据)}</div>
            </div>
        </div>
        <div class="ft-msg-box"></div>
        ${包含保存按钮 ? `<button class="ft-btn ft-btn-success btn-save" style="margin-top:10px;"><i class="fas fa-save"></i> 确认并保存 (Confirm & Save)</button>` : ''}
    `;

    const 内容区 = 容器.querySelector('.ft-content');
    const 行号区 = 容器.querySelector('.ft-line-numbers');
    const 提示区 = 容器.querySelector('.ft-msg-box');
    const 修复按钮 = 容器.querySelector('.btn-fix');
    let 当前错误分析 = null;

    const 显示信息 = (文本, 类别) => { 提示区.className = `ft-msg-box ${类别}`; 提示区.innerHTML = 文本; };
    const 获取纯文本 = () => 内容区.innerText;
    
    const 更新行号 = () => {
        const 行数 = 获取纯文本().split('\n').length;
        行号区.innerHTML = Array.from({length: 行数}, (_, i) => i + 1).join('<br>');
    };
    
    内容区.addEventListener('input', () => { 更新行号(); 修复按钮.style.display = 'none'; 当前错误分析 = null; });
    内容区.addEventListener('scroll', () => { 行号区.scrollTop = 内容区.scrollTop; });
    更新行号();

    // 格式化功能
    容器.querySelector('.btn-format').addEventListener('click', () => {
        try {
            const 文本 = 获取纯文本(); if(!文本.trim()) return;
            内容区.innerText = JSON.stringify(JSON.parse(文本), null, 4);
            显示信息("<i class='fas fa-check-circle'></i> 格式化成功 (Formatted Successfully)", "success");
            更新行号();
        } catch (e) { 容器.querySelector('.btn-validate').click(); } // 格式化失败直接触发智能验证
    });

    // 智能查错功能
    容器.querySelector('.btn-validate').addEventListener('click', () => {
        const 文本 = 获取纯文本();
        try {
            JSON.parse(文本);
            显示信息("<i class='fas fa-check-circle'></i> 验证通过，JSON结构完美 (Validation Passed ✅)", "success");
            内容区.innerText = 文本; // 清除高亮
            修复按钮.style.display = 'none';
        } catch (e) {
            当前错误分析 = 智能分析错误位置(e, 文本);
            let msg = `<b><i class='fas fa-times-circle'></i> 解析错误 (Parse Error):</b> ${当前错误分析.errorMessage}<br>`;
            msg += `实际错误行: ${当前错误分析.actualLine} (准确度: ${当前错误分析.accuracy})<br>`;
            if(当前错误分析.suggestedFix) msg += `<span style="color:#c0392b;">💡 建议 (Suggest): ${当前错误分析.suggestedFix}</span>`;
            
            显示信息(msg, "error");
            
            // 渲染高亮 (重写 innerHTML 插入 span)
            const lines = 文本.split('\n');
            let highlightHTML = '';
            lines.forEach((line, index) => {
                if(index + 1 === 当前错误分析.actualLine) highlightHTML += `<span class="hl-error">${转义HTML(line)}</span>\n`;
                else highlightHTML += 转义HTML(line) + '\n';
            });
            内容区.innerHTML = highlightHTML;
            
            if(当前错误分析.errorType === "missing_comma") 修复按钮.style.display = 'inline-block';
        }
    });

    // 快速修复逗号
    修复按钮.addEventListener('click', () => {
        if(当前错误分析) {
            内容区.innerText = 快速修复缺失逗号(获取纯文本(), 当前错误分析);
            容器.querySelector('.btn-validate').click(); // 修复后自动重验
        }
    });

    // 重复行检测
    容器.querySelector('.btn-duplicate').addEventListener('click', () => {
        const 文本 = 获取纯文本();
        const { duplicateLines, totalDuplicateGroups, totalDuplicates } = 检测重复行(文本);
        
        if(totalDuplicateGroups === 0) {
            显示信息("<i class='fas fa-check'></i> 代码纯净，未发现完全重复的行 (No duplicate lines found)", "success");
            内容区.innerText = 文本; // 移除高亮
        } else {
            显示信息(`<i class='fas fa-exclamation-triangle'></i> 发现 <b>${totalDuplicateGroups}组</b> 重复行，共 <b>${totalDuplicates}处</b>。 (Found ${totalDuplicates} duplicates in ${totalDuplicateGroups} groups)`, "warning");
            
            // 渲染黄色高亮
            const dupLineNumbers = new Set();
            duplicateLines.forEach(dup => dup.lines.forEach(num => dupLineNumbers.add(num)));
            
            const lines = 文本.split('\n');
            let highlightHTML = '';
            lines.forEach((line, index) => {
                if(dupLineNumbers.has(index + 1)) highlightHTML += `<span class="hl-duplicate">${转义HTML(line)}</span>\n`;
                else highlightHTML += 转义HTML(line) + '\n';
            });
            内容区.innerHTML = highlightHTML;
        }
    });

    return { DOM: 容器, 获取内容: 获取纯文本, 提示区: 提示区 };
}