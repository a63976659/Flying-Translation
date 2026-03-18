import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";

// ==========================================
// 核心逻辑：分块控制与 API 交互 (带有高级调试日志与中断检测)
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
        
        try {
            const 响应 = await fetch('/flying_trans/api/translate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ compute_mode: 算力引擎, target_language: 语言, model_name: 模型, data: 请求数据 })
            });
            const 结果 = await 响应.json();
            
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
// 编辑器渲染与后端写入流
// ==========================================
function 呼出编辑器窗口(数据, 原始文件名, 语言, 容器) {
    容器.querySelector('#状态-配置').style.display = 'none';
    const 态编辑器 = 容器.querySelector('#状态-编辑器');
    态编辑器.style.display = 'flex'; // 配合外层 flex
    
    const 挂载点 = 容器.querySelector('#编辑器挂载点');
    挂载点.innerHTML = ''; 
    
    const 预设文本 = JSON.stringify(数据, null, 4);
    const 编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true);
    挂载点.appendChild(编辑器实例.DOM);

    编辑器实例.DOM.querySelector('.btn-save').addEventListener('click', async () => {
        const btn = 编辑器实例.DOM.querySelector('.btn-save');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在处理保存逻辑...';
        
        try {
            const 最终数据 = JSON.parse(编辑器实例.获取内容());
            const 响应 = await fetch('/flying_trans/api/save_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: 原始文件名, language: 语言, data: 最终数据, force_overwrite: false }) // 默认不覆盖
            });
            const 结果 = await 响应.json();
            
            if (结果.status === 'success') {
                编辑器实例.提示区.className = 'ft-msg-box success';
                编辑器实例.提示区.innerHTML = `<i class="fas fa-check-circle"></i> <b>保存成功!</b><br><span style="color:#666;">${结果.path}</span>`;
            } else if (结果.status === 'exists') {
                // 【核心跳转】：如果发现同名文件，立刻呼出合并面板！
                if (window.飞行汉化_智能唤起合并) {
                    window.飞行汉化_智能唤起合并(结果.existing_data, 最终数据, 原始文件名);
                } else {
                    throw new Error("合并引擎未就绪，请刷新重试。");
                }
            } else { 
                throw new Error(结果.message); 
            }
            
        } catch (e) {
            编辑器实例.提示区.className = 'ft-msg-box error';
            编辑器实例.提示区.innerHTML = `<i class="fas fa-times-circle"></i> <b>保存失败:</b> ${e.message}`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> 确认并保存';
        }
    });
}