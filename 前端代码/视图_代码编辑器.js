// ==========================================
// 模块：代码编辑器视图模板 (纯净的 HTML & CSS)
// ==========================================

export function 注入编辑器专属样式() {
    if(document.getElementById('ft-editor-style')) return;
    const 样式 = document.createElement('style');
    样式.id = 'ft-editor-style';
    样式.textContent = `
        .ft-editor-container { display: flex; flex-direction: column; height: 560px; border-radius: 8px; border: 2px solid #e0e6ef; background: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); transition: all 0.3s ease; }
        .ft-editor-container:focus-within { border-color: #6a11cb; }
        
        .ft-editor-container.conflict-mode { border: 2px solid #e74c3c !important; box-shadow: inset 0 0 10px rgba(231,76,60,0.05), 0 0 12px rgba(231,76,60,0.4) !important; }
        .ft-editor-container.success-mode { border: 2px solid #2ecc71 !important; box-shadow: inset 0 0 10px rgba(46,204,113,0.05), 0 0 12px rgba(46,204,113,0.4) !important; }
        
        .ft-toolbar { display: flex; gap: 8px; padding: 10px; background: #f4f6f9; border-bottom: 1px solid #e0e6ef; flex-wrap: wrap; align-items: center; justify-content: center; }
        .ft-tool-btn { padding: 6px 12px; border: 1px solid #d1d9e6; background: #fff; border-radius: 6px; cursor: pointer; color: #334155; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 90px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .ft-tool-btn:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; transform: translateY(-1px); box-shadow: 0 3px 6px rgba(0,0,0,0.05); }
        .ft-tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ft-tool-btn .main-text { font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 5px; }
        .ft-tool-btn .sub-text { font-size: 9px; opacity: 0.6; font-family: Arial, sans-serif; }
        
        .ft-toolbar-divider { width: 1px; height: 24px; background: #cbd5e1; margin: 0 4px; }

        .ft-editor-main { display: flex; flex: 1; overflow: hidden; position: relative; }
        .ft-line-numbers { padding: 10px 5px; background: #f9fafc; text-align: right; border-right: 1px solid #e0e6ef; font-family: 'Consolas', monospace; font-size: 12px; color: #7f8c8d; user-select: none; overflow-y: hidden; min-width: 35px; }
        .ft-content { flex: 1; padding: 10px; font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.5; outline: none; overflow: auto; white-space: pre; background: #fff; color: #333 !important; tab-size: 4; }
        
        .hl-error { background-color: #ffeaea; border-left: 3px solid #e74c3c; padding-left: 2px; display: inline-block; width: 100%; }
        .hl-duplicate { background-color: #fff3cd; border-left: 3px solid #f39c12; padding-left: 2px; display: inline-block; width: 100%; }
        .ft-msg-box { font-size: 11px; padding: 8px; border-radius: 4px; margin-top: 5px; display: none; word-wrap: break-word; }
        .ft-msg-box.success { background: #e8f8f5; color: #27ae60; border: 1px solid #2ecc71; display: block; }
        .ft-msg-box.error { background: #fdedec; color: #c0392b; border: 1px solid #e74c3c; display: block; }
        .ft-msg-box.warning { background: #fef5e7; color: #d35400; border: 1px solid #f39c12; display: block; }
    `;
    document.head.appendChild(样式);
}

export function 渲染编辑器基础DOM(转义后的数据, 包含保存按钮, 包含返回按钮) {
    return `
        <div class="ft-editor-container">
            <div class="ft-toolbar">
                <button class="ft-tool-btn btn-duplicate">
                    <div class="main-text"><i class="fas fa-copy"></i> 查重复节点</div>
                    <div class="sub-text">Check Duplicates</div>
                </button>
                <button class="ft-tool-btn btn-exclude">
                    <div class="main-text"><i class="fas fa-filter"></i> 排除已翻译</div>
                    <div class="sub-text">Exclude Translated</div>
                </button>
                <div class="ft-toolbar-divider"></div>
                <button class="ft-tool-btn btn-validate">
                    <div class="main-text"><i class="fas fa-check-double"></i> 智能验证</div>
                    <div class="sub-text">Smart Validate</div>
                </button>
                <button class="ft-tool-btn btn-format">
                    <div class="main-text"><i class="fas fa-indent"></i> 格式化</div>
                    <div class="sub-text">Format JSON</div>
                </button>
                <div class="ft-toolbar-divider"></div>
                <button class="ft-tool-btn btn-undo">
                    <div class="main-text"><i class="fas fa-undo"></i> 撤销</div>
                    <div class="sub-text">Undo</div>
                </button>
                <button class="ft-tool-btn btn-redo">
                    <div class="main-text"><i class="fas fa-redo"></i> 重做</div>
                    <div class="sub-text">Redo</div>
                </button>
                <button class="ft-tool-btn btn-fix" style="display:none; color:#e74c3c; border-color:#e74c3c; background:#fdedec;">
                    <div class="main-text"><i class="fas fa-magic"></i> 修复逗号</div>
                    <div class="sub-text">Fix Comma</div>
                </button>
            </div>
            <div class="ft-editor-main">
                <div class="ft-line-numbers">1</div>
                <div class="ft-content" contenteditable="true" spellcheck="false">${转义后的数据}</div>
            </div>
        </div>
        <div class="ft-msg-box"></div>
        ${包含保存按钮 ? `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                <button class="ft-btn ft-btn-success btn-save"><i class="fas fa-save"></i> 确认结果并保存 (Confirm Results & Save)</button>
                ${包含返回按钮 ? `<button class="ft-btn btn-discard" style="background: #e2e8f0; color: #475569; border: 1px solid #cbd5e1;"><i class="fas fa-arrow-left"></i> 放弃并返回 (Discard & Return)</button>` : ''}
            </div>
        ` : ''}
    `;
}