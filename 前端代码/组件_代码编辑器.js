import { 智能分析错误位置, 检测重复行, 快速修复缺失逗号, 转义HTML } from './核心_智能验证.js';
import { 注入编辑器专属样式, 渲染编辑器基础DOM } from './视图_代码编辑器.js';
import { 引擎_读取历史记录, 引擎_同步历史记录 } from './业务_编辑器历史.js';

export function 生成高级JSON编辑器DOM(预设数据 = "", 包含保存按钮 = true, 包含返回按钮 = false) {
    注入编辑器专属样式();
    
    const 容器 = document.createElement('div');
    // 组装无逻辑的 HTML 骨架
    容器.innerHTML = 渲染编辑器基础DOM(转义HTML(预设数据), 包含保存按钮, 包含返回按钮);

    const 内容区 = 容器.querySelector('.ft-content');
    const 行号区 = 容器.querySelector('.ft-line-numbers');
    const 提示区 = 容器.querySelector('.ft-msg-box');
    const 编辑器外框 = 容器.querySelector('.ft-editor-container');
    const 修复按钮 = 容器.querySelector('.btn-fix');
    
    const btn撤销 = 容器.querySelector('.btn-undo');
    const btn重做 = 容器.querySelector('.btn-redo');
    
    let 当前错误分析 = null;

    // ---------------------------------------------------------
    // 红绿灯状态机
    // ---------------------------------------------------------
    const 更改状态 = (状态) => {
        编辑器外框.classList.remove('conflict-mode', 'success-mode');
        const btn保存 = 容器.querySelector('.btn-save');
        
        if (btn保存) {
            btn保存.style.background = '';
            btn保存.style.color = '';
            btn保存.className = 'ft-btn btn-save ft-btn-success'; 
        }
        
        if (状态 === 'conflict') {
            编辑器外框.classList.add('conflict-mode');
            if (btn保存) {
                btn保存.style.background = '#e74c3c';
                btn保存.style.color = 'white';
                btn保存.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 确认结果并保存 (Confirm Results & Save)';
            }
        } else if (状态 === 'success') {
            编辑器外框.classList.add('success-mode');
            if (btn保存) {
                btn保存.style.background = '#2ecc71';
                btn保存.style.color = 'white';
                btn保存.innerHTML = '<i class="fas fa-check-circle"></i> 确认结果并保存 (Confirm Results & Save)';
            }
        } else {
            if (btn保存) {
                btn保存.innerHTML = '<i class="fas fa-save"></i> 确认结果并保存 (Confirm Results & Save)';
            }
        }
    };

    // ---------------------------------------------------------
    // 历史状态引擎 (支持物理硬盘)
    // ---------------------------------------------------------
    let 历史记录池 = [];
    let 历史指针 = -1;
    const 最大历史限制 = 50;

    const 更新历史按钮状态 = () => {
        btn撤销.disabled = 历史指针 <= 0;
        btn重做.disabled = 历史指针 >= 历史记录池.length - 1;
    };

    const 保存历史状态 = (text, 需要同步网络 = true) => {
        if (历史指针 >= 0 && 历史记录池[历史指针] === text) return;
        if (历史指针 < 历史记录池.length - 1) 历史记录池 = 历史记录池.slice(0, 历史指针 + 1);
        
        历史记录池.push(text);
        if (历史记录池.length > 最大历史限制) 历史记录池.shift();
        else 历史指针++;
        
        更新历史按钮状态();
        if (需要同步网络) 引擎_同步历史记录(历史记录池.slice(0, 历史指针 + 1));
    };

    const 获取纯文本 = () => 内容区.innerText;
    const 显示信息 = (文本, 类别) => { 提示区.style.display = ''; 提示区.className = `ft-msg-box ${类别}`; 提示区.innerHTML = 文本; };
    const 更新行号 = () => { 行号区.innerHTML = Array.from({length: 获取纯文本().split('\n').length}, (_, i) => i + 1).join('<br>'); };
    
    // 启动初始化加载
    更新行号();
    引擎_读取历史记录().then(res => {
        if (res && res.status === 'success' && res.history && res.history.length > 0) {
            历史记录池 = res.history;
            历史指针 = 历史记录池.length - 1;
            const currentText = 获取纯文本();
            if (历史记录池[历史指针] !== currentText) 保存历史状态(currentText, true);
            else 更新历史按钮状态();
        } else {
            保存历史状态(获取纯文本(), true);
        }
    }).catch(() => { 保存历史状态(获取纯文本(), false); });

    // ---------------------------------------------------------
    // 打字事件与防抖
    // ---------------------------------------------------------
    let isComposing = false;
    let 输入防抖计时器;

    内容区.addEventListener('compositionstart', () => { isComposing = true; });
    内容区.addEventListener('compositionend', () => { isComposing = false; 保存历史状态(获取纯文本()); });

    内容区.addEventListener('input', () => {
        更新行号(); 修复按钮.style.display = 'none'; 当前错误分析 = null; 更改状态('default'); 
        
        if (!isComposing) {
            clearTimeout(输入防抖计时器);
            输入防抖计时器 = setTimeout(() => { 保存历史状态(获取纯文本()); }, 2000); 
        }
    });

    内容区.addEventListener('blur', () => { clearTimeout(输入防抖计时器); 保存历史状态(获取纯文本()); });
    内容区.addEventListener('scroll', () => { 行号区.scrollTop = 内容区.scrollTop; });

    // ---------------------------------------------------------
    // 工具栏交互事件
    // ---------------------------------------------------------
    btn撤销.addEventListener('click', () => {
        if (历史指针 > 0) {
            历史指针--; 内容区.innerText = 历史记录池[历史指针];
            更新行号(); 更新历史按钮状态(); 提示区.style.display = 'none'; 
            更改状态('default'); 引擎_同步历史记录(历史记录池.slice(0, 历史指针 + 1)); 
        }
    });

    btn重做.addEventListener('click', () => {
        if (历史指针 < 历史记录池.length - 1) {
            历史指针++; 内容区.innerText = 历史记录池[历史指针];
            更新行号(); 更新历史按钮状态(); 提示区.style.display = 'none';
            更改状态('default'); 引擎_同步历史记录(历史记录池.slice(0, 历史指针 + 1));
        }
    });

    容器.querySelector('.btn-duplicate').addEventListener('click', () => {
        const 文本 = 获取纯文本();
        const { duplicateLines, totalDuplicateGroups, totalDuplicates } = 检测重复行(文本);
        
        if(totalDuplicateGroups === 0) {
            显示信息("<i class='fas fa-check'></i> 代码纯净，未发现发生冲突的节点名", "success");
            内容区.innerText = 文本; 更改状态('success'); 
        } else {
            显示信息(`<i class='fas fa-exclamation-triangle'></i> 发现 <b>${totalDuplicateGroups}组</b> 命名冲突的主键，共 <b>${totalDuplicates}处</b>。建议使用【排除已翻译】进行清理！`, "warning");
            更改状态('conflict'); 
            
            const dupLineNumbers = new Set();
            duplicateLines.forEach(dup => dup.lines.forEach(num => dupLineNumbers.add(num)));
            
            let highlightHTML = '';
            文本.split('\n').forEach((line, index) => {
                if(dupLineNumbers.has(index + 1)) highlightHTML += `<span class="hl-duplicate">${转义HTML(line)}</span>\n`;
                else highlightHTML += 转义HTML(line) + '\n';
            });
            内容区.innerHTML = highlightHTML;
        }
    });

    容器.querySelector('.btn-exclude').addEventListener('click', () => {
        const 文本 = 获取纯文本();
        try {
            const { totalDuplicateGroups } = 检测重复行(文本);
            if(totalDuplicateGroups === 0) {
                显示信息("<i class='fas fa-check'></i> 代码中没有冲突的节点名，无需排除。", "success");
                更改状态('success'); return;
            }
            const 新文本 = JSON.stringify(JSON.parse(文本), null, 4);
            内容区.innerText = 新文本; 保存历史状态(新文本); 
            显示信息(`<i class='fas fa-magic'></i> 成功清除了 <b>${totalDuplicateGroups}个</b> 未翻译的新节点，完美保留了旧有翻译！`, "success");
            更改状态('success'); 更新行号();
        } catch (e) { 容器.querySelector('.btn-validate').click(); }
    });

    容器.querySelector('.btn-validate').addEventListener('click', () => {
        const 文本 = 获取纯文本();
        try {
            JSON.parse(文本);
            显示信息("<i class='fas fa-check-circle'></i> 验证通过，JSON结构完美", "success");
            内容区.innerText = 文本; 修复按钮.style.display = 'none'; 更改状态('success');
        } catch (e) {
            当前错误分析 = 智能分析错误位置(e, 文本);
            let msg = `<b><i class='fas fa-times-circle'></i> 解析错误:</b> ${当前错误分析.errorMessage}<br>`;
            msg += `实际错误行: ${当前错误分析.actualLine}<br>`;
            if(当前错误分析.suggestedFix) msg += `<span style="color:#c0392b;">💡 建议: ${当前错误分析.suggestedFix}</span>`;
            
            显示信息(msg, "error"); 更改状态('conflict'); 
            
            let highlightHTML = '';
            文本.split('\n').forEach((line, index) => {
                if(index + 1 === 当前错误分析.actualLine) highlightHTML += `<span class="hl-error">${转义HTML(line)}</span>\n`;
                else highlightHTML += 转义HTML(line) + '\n';
            });
            内容区.innerHTML = highlightHTML;
            if(当前错误分析.errorType === "missing_comma") 修复按钮.style.display = 'inline-flex';
        }
    });

    容器.querySelector('.btn-format').addEventListener('click', () => {
        try {
            const 文本 = 获取纯文本(); if(!文本.trim()) return;
            const { totalDuplicateGroups } = 检测重复行(文本);
            const 新文本 = JSON.stringify(JSON.parse(文本), null, 4);
            内容区.innerText = 新文本; 保存历史状态(新文本); 
            
            if (totalDuplicateGroups > 0) 显示信息(`<i class='fas fa-check-circle'></i> 格式化成功，并清理了 ${totalDuplicateGroups} 个重复项！`, "success");
            else 显示信息("<i class='fas fa-check-circle'></i> 格式化成功", "success");
            更改状态('success'); 更新行号();
        } catch (e) { 容器.querySelector('.btn-validate').click(); } 
    });

    修复按钮.addEventListener('click', () => {
        if(当前错误分析) {
            const 新文本 = 快速修复缺失逗号(获取纯文本(), 当前错误分析);
            内容区.innerText = 新文本; 保存历史状态(新文本); 
            容器.querySelector('.btn-validate').click(); 
        }
    });

    return { 
        DOM: 容器, 
        获取内容: 获取纯文本, 
        提示区: 提示区, 
        更改状态,
        btn返回: 容器.querySelector('.btn-discard') 
    };
}