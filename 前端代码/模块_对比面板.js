import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";

export function 挂载对比面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

    // 引入高度为 100% 的 Flexbox 弹性布局，并在底部加入返回按钮
    容器.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%;">
            <h3 style="flex-shrink: 0; color: #2c3e50; font-size: 14px; border-bottom: 2px solid #eee; padding-bottom: 5px; margin: 0 0 10px 0;">
                <i class="fas fa-layer-group"></i> 覆盖与合并 (Merge & Override)
            </h3>
            <p style="flex-shrink: 0; font-size: 11px; color: #888; margin-bottom: 15px;">将 [补丁文件 B] 的增量翻译无缝插入到 [主文件 A] 中 (Merge B into A).</p>
            
            <div id="传统文件选择区" style="flex-shrink: 0;">
                <div class="飞行汉化-控件组">
                    <label style="color: #555;">主文件 A (Base File):</label>
                    <input type="file" id="合并-输入A" accept=".json" style="padding: 6px; background: #fff; border: 1px solid #ccc; border-radius: 4px; color: #333 !important; width: 100%; box-sizing: border-box;" />
                </div>

                <div class="飞行汉化-控件组" style="margin-top: 10px;">
                    <label style="color: #555;">补丁文件 B (Patch File):</label>
                    <input type="file" id="合并-输入B" accept=".json" style="padding: 6px; background: #fff; border: 1px solid #ccc; border-radius: 4px; color: #333 !important; width: 100%; box-sizing: border-box;" />
                </div>

                <button id="btn-极速合并" class="ft-btn ft-btn-success" style="margin-top: 15px;">
                    <i class="fas fa-bolt"></i> 极速内存合并 (Fast Memory Merge)
                </button>
            </div>
            
            <div id="合并结果-包裹区" style="display: none; flex: 1; flex-direction: column; margin-top: 15px; min-height: 0;">
                <h3 style="flex-shrink: 0; color: #d35400; font-size: 13px; margin: 0 0 10px 0;"><i class="fas fa-eye"></i> 合并结果审查 (Result Review)</h3>
                
                <div id="合并编辑器挂载点" style="flex: 1; overflow: hidden;"></div>
                
                <button id="btn-合并返回" class="ft-btn" style="flex-shrink: 0; background: #eee; color: #333; margin-top: 15px;">
                    <i class="fas fa-arrow-left"></i> 放弃并返回 (Discard & Return)
                </button>
            </div>
        </div>
    `;

    // 【新增】：返回按钮交互逻辑
    容器.querySelector('#btn-合并返回').addEventListener('click', () => {
        // 1. 恢复当前面板为初始状态（隐藏编辑器，显示传统上传区）
        容器.querySelector('#合并结果-包裹区').style.display = 'none';
        容器.querySelector('#传统文件选择区').style.display = 'block';
        
        // 2. 视觉联动：自动把顶部的 Tab 划回到“自动翻译”（第0格）
        const 导航项 = document.querySelectorAll('.导航-项');
        const 滑动轨道 = document.getElementById('主滑动轨道');
        if (导航项.length > 0 && 滑动轨道) {
            导航项.forEach(t => t.classList.remove('激活'));
            导航项[0].classList.add('激活');
            滑动轨道.style.transform = `translateX(0%)`;
        }
    });

    // 暴露全局智能合并函数，供“翻译面板”在遇到同名文件时呼叫
    window.飞行汉化_智能唤起合并 = (旧数据字典, 新数据字典, 原始文件名) => {
        // 1. UI 层视觉跳转：强行把顶部的 Tab 切到第二格（对比合并页面）
        const 导航项 = document.querySelectorAll('.导航-项');
        const 滑动轨道 = document.getElementById('主滑动轨道');
        if (导航项[1] && 滑动轨道) {
            导航项.forEach(t => t.classList.remove('激活'));
            导航项[1].classList.add('激活');
            滑动轨道.style.transform = `translateX(-50%)`;
        }
        
        // 2. 隐藏无关的传统 A/B 文件上传框，腾出全屏空间给合并编辑器
        容器.querySelector('#传统文件选择区').style.display = 'none';
        
        const 结果区 = 容器.querySelector('#合并结果-包裹区');
        结果区.style.display = 'flex'; 
        
        const 挂载点 = 容器.querySelector('#合并编辑器挂载点');
        挂载点.innerHTML = '';
        
        // 3. 执行内存合并：将新数据注入旧数据中
        const 合并后数据 = { ...旧数据字典, ...新数据字典 };
        window.飞行汉化缓存.暂存编辑数据 = 合并后数据;
        
        const 预设文本 = JSON.stringify(合并后数据, null, 4);
        const 编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true);
        挂载点.appendChild(编辑器实例.DOM);
        
        // 发出友好的同名拦截警告
        编辑器实例.提示区.className = 'ft-msg-box warning';
        编辑器实例.提示区.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <b>发现同名汉化文件冲突！</b><br><span style="color:#666; font-size:11px;">已自动为您将刚刚的新翻译合并入了本地存在的旧文件中。请您在此处做最后一次审查确认，点击保存后将强制覆盖旧文件！</span>`;
        
        编辑器实例.DOM.querySelector('.btn-save').addEventListener('click', async () => {
            const btn = 编辑器实例.DOM.querySelector('.btn-save');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在强制覆盖硬盘...';
            
            try {
                const 最终数据 = JSON.parse(编辑器实例.获取内容());
                const 响应 = await fetch('/flying_trans/api/save_file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: 原始文件名,
                        language: 'Merged',
                        data: 最终数据,
                        force_overwrite: true // 【关键指控】：这次授权后端强行覆盖！
                    })
                });
                
                const 结果 = await 响应.json();
                
                if (结果.status === 'success') {
                    编辑器实例.提示区.className = 'ft-msg-box success';
                    编辑器实例.提示区.innerHTML = `<i class="fas fa-check-circle"></i> <b>合并覆写成功!</b><br><span style="color:#666; font-size:10px;">${结果.path}</span>`;
                } else { throw new Error(结果.message); }
                
            } catch(e) {
                编辑器实例.提示区.className = 'ft-msg-box error';
                编辑器实例.提示区.innerHTML = `<i class="fas fa-times-circle"></i> <b>保存失败:</b> ${e.message}`;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> 确认并覆写 (Confirm & Overwrite)';
            }
        });
    };

    // 保留原本的手动文件合并功能
    容器.querySelector('#btn-极速合并').addEventListener('click', async () => {
        const 输入A = 容器.querySelector('#合并-输入A');
        const 输入B = 容器.querySelector('#合并-输入B');
        
        if (!输入A.files.length || !输入B.files.length) {
            return alert("请同时选择 A 和 B (Select both A and B)!");
        }

        try {
            const [文本A, 文本B] = await Promise.all([
                读取文件(输入A.files[0]), 读取文件(输入B.files[0])
            ]);
            
            const 结果区 = 容器.querySelector('#合并结果-包裹区');
            结果区.style.display = 'flex';
            
            // 手动触发合并逻辑，文件名直接借用输入A的文件名
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