import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";

// ==========================================
// 核心逻辑：分块控制与 API 交互
// ==========================================
export async function 执行流式翻译(数据字典, 原文件名, 容器) {
    const 日志区 = 容器.querySelector('#日志区');
    const 进度条 = 容器.querySelector('#进度条');
    const 进度文本 = 容器.querySelector('#进度文本');
    const btn启动 = 容器.querySelector('#btn-启动');
    const btn中断 = 容器.querySelector('#btn-中断');
    
    const 写日志 = (文本) => {
        日志区.innerHTML += `<div>${文本}</div>`;
        日志区.scrollTop = 日志区.scrollHeight;
    };

    const 算力引擎 = window.飞行汉化缓存.当前算力引擎;
    const 语言 = window.飞行汉化缓存.当前目标语言;
    const 模型 = window.飞行汉化缓存.当前模型;
    
    const 键组 = Object.keys(数据字典);
    const 块大小 = 15;
    const 结果池 = {};
    let 是否被强制中断 = false;

    写日志(`<span style="color:#00ccff; font-weight:bold;">>>> 🌐 初始化引擎 [模式: ${算力引擎.toUpperCase()}] | [模型: ${模型}]</span>`);

    for(let i = 0; i < 键组.length; i += 块大小) {
        if (window.飞行汉化缓存.中断信号) {
            是否被强制中断 = true;
            写日志(`<span style="color:#e74c3c; font-weight:bold;">⚠️ 用户手动中断了任务！已提取完毕的部分将被保留。</span>`);
            break; 
        }

        const 切片 = 键组.slice(i, i + 块大小);
        const 请求数据 = {};
        切片.forEach(k => 请求数据[k] = 数据字典[k]);
        
        const 块序号 = Math.floor(i/块大小) + 1;
        写日志(`>>> 🚀 正在发送分块 [${块序号}] 至 ${算力引擎} ...`);

        let 排队探测器 = null;
        if (算力引擎 === 'cloud') {
            const 探测云端 = async () => {
                try {
                    const r = await fetch('/flying_trans/api/cloud_queue');
                    const status = await r.json();
                    if (status.waiting > 0) {
                        if (status.waiting === 1) 写日志(`<span style="color:#38bdf8">☁️ 云端畅通：当前仅您 1 人，正在极速处理...</span>`);
                        else 写日志(`<span style="color:#f39c12">⏳ 云端拥挤：总计 ${status.waiting} 个任务，前方还有 ${status.waiting - 1} 人排队中...</span>`);
                    }
                } catch(e) {}
            };
            探测云端();
            排队探测器 = setInterval(探测云端, 8000); 
        }

        const 超时报警 = setTimeout(() => {
            写日志(`<span style="color:#e74c3c">⚠️ 严重提醒：当前分块响应已超 120 秒，建议稍后重试。</span>`);
        }, 120000); 
        
        try {
            const 响应 = await fetch('/flying_trans/api/translate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ compute_mode: 算力引擎, target_language: 语言, model_name: 模型, data: 请求数据 })
            });
            const 结果 = await 响应.json();
            
            if (排队探测器) clearInterval(排队探测器);
            clearTimeout(超时报警);
            
            if (结果.status === 'success') {
                Object.assign(结果池, 结果.data);
                if (JSON.stringify(请求数据[切片[0]]) === JSON.stringify(结果.data[切片[0]])) {
                    写日志(`<span style="color:#f39c12">⚠️ [分块 ${块序号}] 警告: 模型原样返回了内容，未实质性翻译。</span>`);
                } else {
                    写日志(`<span style="color:#2ecc71">✔ [分块 ${块序号}] 翻译处理成功。</span>`);
                }
            } else {
                Object.assign(结果池, 请求数据); 
                写日志(`<span style="color:#e74c3c">✖ [分块 ${块序号}] 云端/后端报错: ${结果.message} (回退保留原文)</span>`);
            }
        } catch(e) {
            if (排队探测器) clearInterval(排队探测器);
            clearTimeout(超时报警);
            Object.assign(结果池, 请求数据);
            写日志(`<span style="color:#e74c3c">✖ [分块 ${块序号}] 网络致命错误: ${e.message} (回退保留原文)</span>`);
        }
        
        const 进度 = Math.min(100, Math.round(((i + 块大小) / 键组.length) * 100));
        进度条.style.width = `${进度}%`;
        进度文本.innerText = `${进度}%`;
    }

    if (!是否被强制中断) 写日志(`✅ 所有分块处理完毕！正在生成代码编辑器...`);

    try {
        const 缓存文件名 = (是否被强制中断 ? `[已中断备份]_` : `[完整备份]_`) + (原文件名 || "未命名插件.json");
        await fetch('/flying_trans/api/save_cache', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: 缓存文件名, data: 结果池 }) });
    } catch (e) {}

    btn中断.style.display = 'none';
    btn启动.style.display = 'block';
    
    if (Object.keys(结果池).length > 0) {
        window.飞行汉化缓存.暂存编辑数据 = 结果池;
        呼出编辑器窗口(结果池, 原文件名, 语言, 容器);
    }
}

// ==========================================
// 编辑器渲染与后端写入流 (引入滑动与结算面板)
// ==========================================
function 呼出编辑器窗口(数据, 原始文件名, 语言, 容器) {
    容器.querySelector('#状态-配置').style.display = 'none';
    const 态编辑器 = 容器.querySelector('#状态-编辑器');
    态编辑器.style.display = 'flex'; 
    
    const 挂载点 = 容器.querySelector('#编辑器挂载点');
    
    // 【核心改进】：动态注入支持左滑过渡的 200% 宽度轨道结构
    挂载点.innerHTML = `
        <div style="display: flex; width: 200%; height: 100%; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);" class="ft-slider-track">
            
            <div style="width: 50%; height: 100%; display: flex; flex-direction: column; padding: 2px;" class="ft-editor-pane"></div>
            
            <div style="width: 50%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: rgba(16,185,129,0.05); border: 1px dashed rgba(16,185,129,0.3); border-radius: 8px;" class="ft-success-pane">
                <i class="fas fa-check-circle" style="font-size: 56px; color: #10b981; margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(16,185,129,0.2));"></i>
                <h2 style="color: #10b981; font-size: 20px; margin: 0 0 15px 0; font-weight: bold;">文件已成功保存</h2>
                <p class="ft-save-path-text" style="color: #cbd5e1; font-size: 11px; text-align: center; word-break: break-all; margin-bottom: 25px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; width: 100%; border: 1px solid rgba(255,255,255,0.05);"></p>
                
                <div style="display: flex; gap: 15px; width: 100%; justify-content: center;">
                    <button class="ft-btn ft-btn-open-path" style="background: #38bdf8; color: #fff; padding: 10px 20px;">
                        <i class="fas fa-folder-open"></i> 打开所在文件夹
                    </button>
                    <button class="ft-btn ft-btn-return" style="background: #475569; color: #fff; padding: 10px 20px;">
                        <i class="fas fa-undo"></i> 返回继续提取
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

    btnReturn.addEventListener('click', () => {
        态编辑器.style.display = 'none';
        容器.querySelector('#状态-配置').style.display = 'block';
        const 进度条 = 容器.querySelector('#进度条');
        const 进度文本 = 容器.querySelector('#进度文本');
        const 日志区 = 容器.querySelector('#日志区');
        if (进度条) 进度条.style.width = '0%';
        if (进度文本) 进度文本.innerText = '0%';
        if (日志区) 日志区.innerHTML = '';
    });

    const 预设文本 = JSON.stringify(数据, null, 4);
    const 编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true);
    editorPane.appendChild(编辑器实例.DOM);

    编辑器实例.DOM.querySelector('.btn-save').addEventListener('click', async () => {
        const btn = 编辑器实例.DOM.querySelector('.btn-save');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在处理保存逻辑...';
        
        let 保存成功标记 = false; // 拦截 finally 错误状态重置

        try {
            const 最终数据 = JSON.parse(编辑器实例.获取内容());
            const 响应 = await fetch('/flying_trans/api/save_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 原始文件名, language: 语言, data: 最终数据, force_overwrite: false }) 
            });
            const 结果 = await 响应.json();
            
            if (结果.status === 'success') {
                保存成功标记 = true;
                编辑器实例.更改状态('success');
                window.飞行汉化_提示("节点已成功保存！", "success");
                
                // 【核心触发】：保存成功后执行左滑过渡
                pathText.innerText = 结果.path;
                track.style.transform = 'translateX(-50%)';

            } else if (结果.status === 'exists') {
                if (window.飞行汉化_智能唤起合并) {
                    window.飞行汉化_智能唤起合并(结果.existing_data, 最终数据, 原始文件名);
                } else {
                    throw new Error("合并引擎未就绪，请刷新重试。");
                }
            } else { 
                throw new Error(结果.message); 
            }
            
        } catch (e) {
            window.飞行汉化_提示(`保存失败: ${e.message}`, "error");
        } finally {
            if (btn.isConnected) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> 确认结果并保存';
                if (!保存成功标记 && 编辑器实例.更改状态) {
                    编辑器实例.更改状态('default'); 
                }
            }
        }
    });
}