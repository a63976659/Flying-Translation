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
                <div id="合并编辑器挂载点" style="flex: 1; overflow: hidden; padding: 2px;"></div>
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
        挂载点.innerHTML = '';
        
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
        
        // 传递 true 生成带有“放弃并返回”按钮的高级编辑器
        const 编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true, true);
        
        if (编辑器实例.btn返回) {
            编辑器实例.btn返回.addEventListener('click', 回退视图逻辑);
        }
        
        编辑器实例.更改状态('conflict');
        挂载点.appendChild(编辑器实例.DOM);
        
        编辑器实例.提示区.className = 'ft-msg-box warning';
        编辑器实例.提示区.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <b>发现同名文件 / 双文件合并！</b><br><span style="color:#666; font-size:11px;">系统已将【新提取内容】置于上方，【已有文件内容】追加于下方。请点击上方工具栏的<b>“排除已翻译”</b>，自动为您剔除重复项，完美保留旧翻译并只添加新节点！</span>`;
        
        const btn保存 = 编辑器实例.DOM.querySelector('.btn-save');
        btn保存.addEventListener('click', async () => {
            btn保存.disabled = true;
            btn保存.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在保存 (Saving...)';
            
            try {
                const 最终数据 = JSON.parse(编辑器实例.获取内容());
                const 响应 = await fetch('/flying_trans/api/save_file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: 原始文件名,
                        language: 'Merged',
                        data: 最终数据,
                        force_overwrite: true 
                    })
                });
                
                const 结果 = await 响应.json();
                
                if (结果.status === 'success') {
                    编辑器实例.更改状态('success');
                    编辑器实例.提示区.className = 'ft-msg-box success';
                    编辑器实例.提示区.innerHTML = `<i class="fas fa-check-circle"></i> <b>合并覆写成功!</b><br><span style="color:#666; font-size:10px;">${结果.path}</span>`;
                } else { throw new Error(结果.message); }
                
            } catch(e) {
                编辑器实例.更改状态('conflict');
                编辑器实例.提示区.className = 'ft-msg-box error';
                编辑器实例.提示区.innerHTML = `<i class="fas fa-times-circle"></i> <b>保存失败:</b> ${e.message}`;
            } finally {
                btn保存.disabled = false;
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