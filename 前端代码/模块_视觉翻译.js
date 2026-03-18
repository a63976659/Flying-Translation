import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";
import { 视觉面板HTML } from "./视图_视觉面板.js";
import { 引擎_智能匹配, 引擎_视觉解析 } from "./业务_视觉引擎.js";

export function 挂载视觉翻译面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

    // 载入解耦后的 UI 模板
    容器.innerHTML = 视觉面板HTML;

    const 拖拽区 = 容器.querySelector('#图像拖拽区'); 
    const 文件输入 = 容器.querySelector('#视觉-图像输入');
    const 预览图 = 容器.querySelector('#视觉-图像预览'); 
    const 提示文 = 容器.querySelector('#拖拽区文本');
    const 匹配区 = 容器.querySelector('#视觉-匹配区'); 
    const 输入插件名 = 容器.querySelector('#视觉-核对插件名');
    const 输入归属文件 = 容器.querySelector('#视觉-归属文件'); 
    const btn重新寻址 = 容器.querySelector('#btn-重新寻址');
    const btn启动 = 容器.querySelector('#btn-视觉启动'); 
    const 编辑区 = 容器.querySelector('#视觉-编辑区');
    const 挂载点 = 容器.querySelector('#视觉-编辑器挂载点'); 
    const 日志区 = 容器.querySelector('#视觉-日志区'); 
    const btn剪贴板 = 容器.querySelector('#btn-视觉剪贴板');
    const btn重置 = 容器.querySelector('#btn-视觉重置');

    let 当前图像Base64 = null; 
    let 全局编辑器实例 = null;

    const 写日志 = (文本) => { 
        日志区.innerHTML += `<div>${文本}</div>`; 
        日志区.scrollTop = 日志区.scrollHeight; 
    };

    const 触发图片上屏 = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            return window.飞行汉化_提示("数据格式非图像！", "error"); 
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            当前图像Base64 = e.target.result;
            预览图.src = 当前图像Base64; 
            预览图.style.display = 'block'; 
            提示文.style.display = 'none';
            btn启动.style.display = 'flex'; 
            btn重置.style.display = 'block';
            匹配区.style.display = 'none'; 
            编辑区.style.display = 'none'; 
            拖拽区.style.height = '160px';
            写日志(`>>> 📸 图像已就绪，等待发送。`);
        };
        reader.readAsDataURL(file);
    };

    拖拽区.addEventListener('click', () => 文件输入.click());
    文件输入.addEventListener('change', (e) => 触发图片上屏(e.target.files[0]));
    拖拽区.addEventListener('dragover', (e) => { e.preventDefault(); 拖拽区.style.borderColor = '#38bdf8'; });
    拖拽区.addEventListener('dragleave', () => { 拖拽区.style.borderColor = '#475569'; });
    拖拽区.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        拖拽区.style.borderColor = '#475569'; 
        if (e.dataTransfer.files.length) 触发图片上屏(e.dataTransfer.files[0]); 
    });

    btn剪贴板.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageTypes = item.types.filter(type => type.startsWith('image/'));
                if (imageTypes.length > 0) {
                    const blob = await item.getType(imageTypes[0]);
                    触发图片上屏(new File([blob], "clipboard.png", { type: blob.type })); 
                    return;
                }
            }
            window.飞行汉化_提示("系统剪贴板中未发现图像", "warning");
        } catch (e) { 
            window.飞行汉化_提示("读取被拒，请允许浏览器读取剪贴板权限", "error"); 
        }
    });

    btn重置.addEventListener('click', () => {
        当前图像Base64 = null; 预览图.src = ''; 预览图.style.display = 'none'; 提示文.style.display = 'block';
        匹配区.style.display = 'none'; btn启动.style.display = 'none'; 编辑区.style.display = 'none'; btn重置.style.display = 'none'; 拖拽区.style.height = '160px';
        输入插件名.value = ""; 输入归属文件.value = "未归属视觉节点.json"; 
    });

    const 执行智能匹配 = async (keyword) => {
        const 纯净词 = keyword ? keyword.trim() : "";
        if (!纯净词 || 纯净词 === "等待大模型提取或手动输入...") {
            return window.飞行汉化_提示("请输入插件英文名！", "warning"); 
        }
        
        btn重新寻址.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const 结果 = await 引擎_智能匹配(纯净词);
            if (结果.status === 'success' && 结果.matched_folder) { 
                输入归属文件.value = `${结果.matched_folder}.json`; 
                window.飞行汉化_提示(`已关联目录: ${结果.matched_folder}`, "success"); 
            } else { 
                输入归属文件.value = `${纯净词}.json`; 
                window.飞行汉化_提示("未找到完全匹配的目录", "warning"); 
            }
        } catch (e) { 
            输入归属文件.value = "未归属视觉节点.json"; 
        } finally { 
            btn重新寻址.innerHTML = '智能匹配'; 
        }
    };

    btn重新寻址.addEventListener('click', () => 执行智能匹配(输入插件名.value));

    // 生命周期引擎核心
    const 构建保存引擎 = (预设文本, 已经是合并模式 = false, 最终数据_纯净版 = null) => {
        挂载点.innerHTML = ''; 
        // 传递第三个参数 true，表示要求生成“放弃并返回”按钮
        全局编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true, 已经是合并模式); 
        
        if (已经是合并模式) 全局编辑器实例.更改状态('conflict');
        挂载点.appendChild(全局编辑器实例.DOM);

        // 处理放弃并返回按钮逻辑
        if (已经是合并模式 && 全局编辑器实例.btn返回) {
            全局编辑器实例.btn返回.addEventListener('click', () => {
                window.飞行汉化_提示("已取消合并，恢复至新提取节点状态", "info");
                // 退回到干净的无冲突状态
                构建保存引擎(JSON.stringify(最终数据_纯净版, null, 4), false);
            });
        }
        
        const btn保存 = 全局编辑器实例.DOM.querySelector('.btn-save');
        btn保存.addEventListener('click', async () => {
            btn保存.disabled = true;
            btn保存.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在处理硬盘落盘 (Saving...)';
            
            try {
                const 最终数据 = JSON.parse(全局编辑器实例.获取内容());
                const 响应 = await fetch('/flying_trans/api/save_file', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        filename: 输入归属文件.value, 
                        language: window.飞行汉化缓存.当前目标语言, 
                        data: 最终数据, 
                        force_overwrite: 已经是合并模式, 
                        append_mode: false 
                    })
                });
                const 结果 = await 响应.json();
                
                if (结果.status === 'success') { 
                    全局编辑器实例.更改状态('success'); 
                    window.飞行汉化_提示(已经是合并模式 ? `节点已成功覆写：${结果.path}` : `节点已成功保存：${结果.path}`, "success"); 
                    写日志(`<span style="color:#10b981">✔ 操作成功：已落盘至 ${输入归属文件.value}。</span>`); 
                    
                } else if (结果.status === 'exists' && !已经是合并模式) {
                    const 旧数据 = 结果.existing_data || {};
                    let 新_str = JSON.stringify(最终数据, null, 4).replace(/^\{\s*/, '').replace(/\s*\}\s*$/, '');
                    let 旧_str = JSON.stringify(旧数据, null, 4).replace(/^\{\s*/, '').replace(/\s*\}\s*$/, '');
                    
                    let 冲突文本 = "{\n";
                    if (新_str && 旧_str) 冲突文本 += 新_str + ",\n" + 旧_str;
                    else if (新_str) 冲突文本 += 新_str;
                    else if (旧_str) 冲突文本 += 旧_str;
                    冲突文本 += "\n}";
                    
                    window.飞行汉化_提示("发现同名文件！已追加，请审查合并。", "warning");
                    写日志(`<span style="color:#f39c12">⚠️ 检测到同名文件。旧数据已追加至下方，请手动使用“查重复节点”与“排除已翻译”进行清理，确认无误后再次点击保存。</span>`);
                    
                    // 进入警戒模式，并传入纯净版数据用于撤销返回
                    构建保存引擎(冲突文本, true, 最终数据);
                    
                } else { 
                    throw new Error(结果.message); 
                }
            } catch (e) { 
                window.飞行汉化_提示(`写入失败: ${e.message}`, "error"); 
                写日志(`<span style="color:#e74c3c">✖ 写入失败: ${e.message}</span>`); 
                全局编辑器实例.更改状态(已经是合并模式 ? 'conflict' : 'default');
            } finally {
                if (btn保存.isConnected) {
                    btn保存.disabled = false;
                    全局编辑器实例.更改状态(已经是合并模式 ? 'conflict' : 'default');
                }
            }
        });
    };

    btn启动.addEventListener('click', async () => {
        if (!当前图像Base64) return;
        const 算力模式 = window.飞行汉化缓存.当前算力引擎;
        const 当前模型 = window.飞行汉化缓存.当前模型;
        
        btn启动.disabled = true; 
        btn启动.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
        写日志(`>>> 🚀 载荷已派发至 ${算力模式 === 'local' ? '本地显卡' : '云端矩阵'} (${当前模型})...`);
        
        try {
            const 结果 = await 引擎_视觉解析(算力模式, window.飞行汉化缓存.当前目标语言, 当前模型, 当前图像Base64);
            
            if (结果.status === 'success') {
                写日志(`<span style="color:#10b981">✔ 解析完成！请核对。</span>`);
                window.飞行汉化_提示("视觉提取成功", "success");
                
                const pluginGuess = 结果.data._plugin_guess || "";
                delete 结果.data._plugin_guess; 
                输入插件名.value = pluginGuess;
                
                匹配区.style.display = 'flex'; 
                拖拽区.style.height = '60px'; 
                编辑区.style.display = 'flex'; 
                btn启动.style.display = 'none'; 
                
                构建保存引擎(JSON.stringify(结果.data, null, 4), false);
                
                if (pluginGuess && pluginGuess !== "未找到" && pluginGuess !== "None") {
                    await 执行智能匹配(pluginGuess);
                }
            } else { 
                写日志(`<span style="color:#e74c3c">✖ 解析失败: ${结果.message}</span>`); 
                window.飞行汉化_提示("处理失败", "error"); 
            }
        } catch (e) { 
            写日志(`<span style="color:#e74c3c">✖ 网络阻断: ${e.message}</span>`); 
            window.飞行汉化_提示("网络连接中断或模型无响应", "error"); 
        } finally { 
            btn启动.disabled = false; 
            btn启动.innerHTML = '<i class="fas fa-satellite-dish"></i> 发送至多模态大模型解析节点'; 
        }
    });
}