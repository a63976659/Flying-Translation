import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";

export function 挂载对比面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

    容器.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%;">
            <h3 style="flex-shrink: 0; color: #2c3e50; font-size: 14px; border-bottom: 2px solid #eee; padding-bottom: 5px; margin: 0 0 10px 0;">
                <i class="fas fa-layer-group"></i> 覆盖与合并 (Merge & Override)
            </h3>
            <p style="flex-shrink: 0; font-size: 11px; color: #888; margin-bottom: 15px;">将 [补丁文件 B] 的增量翻译无缝插入到 [主文件 A] 中 (Merge B into A).</p>
            
            <div id="传统文件选择区" style="flex-shrink: 0;">
                <div class="飞行汉化-控件组">
                    <label style="color: #555;">主文件 A (Base File / 旧翻译):</label>
                    <input type="file" id="合并-输入A" accept=".json" style="padding: 6px; background: #fff; border: 1px solid #ccc; border-radius: 4px; color: #333 !important; width: 100%; box-sizing: border-box;" />
                </div>

                <div class="飞行汉化-控件组" style="margin-top: 10px;">
                    <label style="color: #555;">补丁文件 B (Patch File / 新提取):</label>
                    <input type="file" id="合并-输入B" accept=".json" style="padding: 6px; background: #fff; border: 1px solid #ccc; border-radius: 4px; color: #333 !important; width: 100%; box-sizing: border-box;" />
                </div>

                <button id="btn-极速合并" class="ft-btn ft-btn-success" style="margin-top: 15px;">
                    <i class="fas fa-bolt"></i> 极速内存合并 (Fast Memory Merge)
                </button>
            </div>
            
            <div id="合并结果-包裹区" style="display: none; flex: 1; flex-direction: column; margin-top: 15px; min-height: 0;">
                <h3 style="flex-shrink: 0; color: #d35400; font-size: 13px; margin: 0 0 10px 0;"><i class="fas fa-eye"></i> 合并结果审查 (Result Review)</h3>
                <div id="合并编辑器挂载点" style="flex: 1; overflow: hidden; padding: 2px; position: relative;"></div>
            </div>
        </div>
    `;

    const 回退视图逻辑 = () => {
        容器.querySelector('#合并结果-包裹区').style.display = 'none';
        容器.querySelector('#传统文件选择区').style.display = 'block';
        
        const 导航项 = document.querySelectorAll('.导航-项');
        const 滑动轨道 = document.getElementById('主滑动轨道');
        if (导航项.length > 0 && 滑动轨道) {
            window.飞行汉化缓存.当前所在Tab = 0; 
            导航项.forEach(t => t.classList.remove('激活'));
            导航项[0].classList.add('激活');
            滑动轨道.style.transform = `translateX(0%)`;
        }
    };

    window.飞行汉化_智能唤起合并 = (旧数据字典, 新数据字典, 原始文件名) => {
        const 导航项 = document.querySelectorAll('.导航-项');
        const 滑动轨道 = document.getElementById('主滑动轨道');
        if (导航项[2] && 滑动轨道) {
            window.飞行汉化缓存.当前所在Tab = 2; 
            导航项.forEach(t => t.classList.remove('激活'));
            导航项[2].classList.add('激活');
            滑动轨道.style.transform = `translateX(-66.666%)`;
        }
        
        容器.querySelector('#传统文件选择区').style.display = 'none';
        const 结果区 = 容器.querySelector('#合并结果-包裹区');
        结果区.style.display = 'flex'; 
        
        const 挂载点 = 容器.querySelector('#合并编辑器挂载点');
        
        // 【核心改进】：动态注入支持左滑过渡的 200% 宽度轨道结构
        挂载点.innerHTML = `
            <div style="display: flex; width: 200%; height: 100%; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);" class="ft-slider-track">
                
                <div style="width: 50%; height: 100%; display: flex; flex-direction: column; padding: 2px;" class="ft-editor-pane"></div>
                
                <div style="width: 50%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: rgba(16,185,129,0.05); border: 1px dashed rgba(16,185,129,0.3); border-radius: 8px;" class="ft-success-pane">
                    <i class="fas fa-check-circle" style="font-size: 56px; color: #10b981; margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(16,185,129,0.2));"></i>
                    <h2 style="color: #10b981; font-size: 20px; margin: 0 0 15px 0; font-weight: bold;">合并覆写成功</h2>
                    <p class="ft-save-path-text" style="color: #cbd5e1; font-size: 11px; text-align: center; word-break: break-all; margin-bottom: 25px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; width: 100%; border: 1px solid rgba(255,255,255,0.05);"></p>
                    
                    <div style="display: flex; gap: 15px; width: 100%; justify-content: center;">
                        <button class="ft-btn ft-btn-open-path" style="background: #38bdf8; color: #fff; padding: 10px 20px;">
                            <i class="fas fa-folder-open"></i> 打开所在文件夹
                        </button>
                        <button class="ft-btn ft-btn-return" style="background: #475569; color: #fff; padding: 10px 20px;">
                            <i class="fas fa-undo"></i> 返回界面第一步
                        </button>
                    </div>
                </div>

            </div>
        `;
        
        const track = 挂载点.querySelector('.ft-slider-track');
        const editorPane = 挂载点.querySelector('.ft-editor-pane');
        const pathText = 挂载点.querySelector('.ft-save-path-text');
        const btnOpen = 挂载点.querySelector('.ft-btn-open-path');
        const btnReturn = 挂载点.querySelector('.ft-btn-return');

        btnOpen.addEventListener('click', async () => {
            const path = pathText.innerText;
            if (!path) return;
            try { await fetch('/flying_trans/api/open_folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: path }) }); } catch(e) { window.飞行汉化_提示("打开失败，请检查网络", "error"); }
        });

        btnReturn.addEventListener('click', 回退视图逻辑);

        let 新_str = JSON.stringify(新数据字典, null, 4).replace(/^\{\s*/, '').replace(/\s*\}\s*$/, '');
        let 旧_str = JSON.stringify(旧数据字典, null, 4).replace(/^\{\s*/, '').replace(/\s*\}\s*$/, '');
        
        let 预设文本 = "{\n";
        if (新_str && 旧_str) {
            预设文本 += 新_str + ",\n" + 旧_str;
        } else if (新_str) {
            预设文本 += 新_str;
        } else if (旧_str) {
            预设文本 += 旧_str;
        }
        预设文本 += "\n}";
        
        try { window.飞行汉化缓存.暂存编辑数据 = JSON.parse(预设文本); } catch(e) {}
        
        const 编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true, true);
        
        if (编辑器实例.btn返回) {
            编辑器实例.btn返回.addEventListener('click', 回退视图逻辑);
        }
        
        编辑器实例.更改状态('conflict');
        editorPane.appendChild(编辑器实例.DOM);
        
        const btn保存 = 编辑器实例.DOM.querySelector('.btn-save');
        btn保存.addEventListener('click', async () => {
            btn保存.disabled = true;
            btn保存.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在强制保存 (Saving...)';
            
            let 保存成功标记 = false;

            try {
                const 最终数据 = JSON.parse(编辑器实例.获取内容());
                const 响应 = await fetch('/flying_trans/api/save_file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: 原始文件名,
                        // 核心修正：动态获取用户选择的语言，保证多语言合并落盘不出错
                        language: window.飞行汉化缓存.当前目标语言 || 'Merged', 
                        data: 最终数据,
                        force_overwrite: true 
                    })
                });
                
                const 结果 = await 响应.json();
                
                if (结果.status === 'success') {
                    保存成功标记 = true;
                    编辑器实例.更改状态('success');
                    window.飞行汉化_提示("合并覆写成功！", "success");
                    
                    // 【核心触发】：保存成功后执行左滑过渡
                    pathText.innerText = 结果.path;
                    track.style.transform = 'translateX(-50%)';
                    
                } else { 
                    throw new Error(结果.message); 
                }
                
            } catch(e) {
                window.飞行汉化_提示(`保存失败: ${e.message}`, "error");
            } finally {
                if (btn保存.isConnected) {
                    btn保存.disabled = false;
                    btn保存.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 确认结果并强制保存';
                    if (!保存成功标记) {
                        编辑器实例.更改状态('conflict');
                    }
                }
            }
        });
    };

    容器.querySelector('#btn-极速合并').addEventListener('click', async () => {
        const 输入A = 容器.querySelector('#合并-输入A');
        const 输入B = 容器.querySelector('#合并-输入B');
        
        if (!输入A.files.length || !输入B.files.length) return alert("请同时选择 A 和 B (Select both A and B)!");

        try {
            const [文本A, 文本B] = await Promise.all([读取文件(输入A.files[0]), 读取文件(输入B.files[0])]);
            const 结果区 = 容器.querySelector('#合并结果-包裹区');
            结果区.style.display = 'flex';
            window.飞行汉化_智能唤起合并(JSON.parse(文本A), JSON.parse(文本B), 输入A.files[0].name);
        } catch(e) { alert("JSON解析致命错误 (Fatal Error): " + e.message); }
    });
}

function 读取文件(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}