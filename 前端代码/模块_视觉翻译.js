import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";
import { 视觉面板HTML } from "./视图_视觉面板.js";
import { 引擎_智能匹配, 引擎_视觉解析, 引擎_扫描主键校准 } from "./业务_视觉引擎.js";

export function 挂载视觉翻译面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

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
    
    // 滑动与结算区控件
    const 滑动窗口 = 容器.querySelector('#视觉-滑动窗口');
    const 滑动轨道 = 容器.querySelector('#视觉-滑动轨道');
    const 挂载点 = 容器.querySelector('#视觉-编辑器挂载点'); 
    const 保存路径文本 = 容器.querySelector('#视觉-保存路径文本');
    const btn打开路径 = 容器.querySelector('#btn-视觉打开路径');
    const btn返回首屏 = 容器.querySelector('#btn-视觉返回首屏');

    const 日志区 = 容器.querySelector('#视觉-日志区'); 
    const btn剪贴板 = 容器.querySelector('#btn-视觉剪贴板');
    const btn重置 = 容器.querySelector('#btn-视觉重置');
    const 输入主键 = 容器.querySelector('#视觉-核对主键');
    const btn扫描主键 = 容器.querySelector('#btn-扫描主键');
    
    let 当前图像Base64 = null; 
    let 全局编辑器实例 = null;
    let 当前全局解析数据 = null; // 用于扫描校准时在内存中重写主键

    const 写日志 = (文本) => { 日志区.innerHTML += `<div>${文本}</div>`; 日志区.scrollTop = 日志区.scrollHeight; };

    const 触发图片上屏 = (file) => {
        if (!file || !file.type.startsWith('image/')) return window.飞行汉化_提示("数据格式非图像！", "error"); 
        const reader = new FileReader();
        reader.onload = (e) => {
            当前图像Base64 = e.target.result;
            预览图.src = 当前图像Base64; 
            预览图.style.display = 'block'; 
            提示文.style.display = 'none';
            btn启动.style.display = 'flex'; 
            btn重置.style.display = 'block';
            匹配区.style.display = 'none'; 
            滑动窗口.style.display = 'none';
            滑动轨道.style.transform = 'translateX(0%)';
            拖拽区.style.height = '160px';
            写日志(`>>> 📸 图像已就绪，等待发送。`);
        };
        reader.readAsDataURL(file);
    };

    拖拽区.addEventListener('click', () => 文件输入.click());
    文件输入.addEventListener('change', (e) => 触发图片上屏(e.target.files[0]));
    拖拽区.addEventListener('dragover', (e) => { e.preventDefault(); 拖拽区.style.borderColor = '#38bdf8'; });
    拖拽区.addEventListener('dragleave', () => { 拖拽区.style.borderColor = '#475569'; });
    拖拽区.addEventListener('drop', (e) => { e.preventDefault(); 拖拽区.style.borderColor = '#475569'; if (e.dataTransfer.files.length) 触发图片上屏(e.dataTransfer.files[0]); });

    btn剪贴板.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageTypes = item.types.filter(type => type.startsWith('image/'));
                if (imageTypes.length > 0) {
                    const blob = await item.getType(imageTypes[0]);
                    触发图片上屏(new File([blob], "clipboard.png", { type: blob.type })); return;
                }
            }
            window.飞行汉化_提示("系统剪贴板中未发现图像", "warning");
        } catch (e) { window.飞行汉化_提示("读取被拒，请允许浏览器读取剪贴板权限", "error"); }
    });

    btn重置.addEventListener('click', () => {
        当前图像Base64 = null; 预览图.src = ''; 预览图.style.display = 'none'; 提示文.style.display = 'block';
        匹配区.style.display = 'none'; btn启动.style.display = 'none'; 
        滑动窗口.style.display = 'none'; 滑动轨道.style.transform = 'translateX(0%)'; 
        btn重置.style.display = 'none'; 拖拽区.style.height = '160px';
        输入插件名.value = ""; 输入归属文件.value = "未归属视觉节点.json"; 
        if(输入主键) 输入主键.value = "";
    });

    btn打开路径.addEventListener('click', async () => {
        const path = 保存路径文本.innerText;
        if (!path) return;
        try { await fetch('/flying_trans/api/open_folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: path }) }); } catch(e) { window.飞行汉化_提示("打开失败，请检查网络", "error"); }
    });

    btn返回首屏.addEventListener('click', () => { btn重置.click(); });

    const 执行智能匹配 = async (keyword) => {
        const 纯净词 = keyword ? keyword.trim() : "";
        if (!纯净词 || 纯净词 === "等待大模型提取或手动输入...") return window.飞行汉化_提示("请输入插件英文名！", "warning"); 
        
        btn重新寻址.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const 结果 = await 引擎_智能匹配(纯净词);
            if (结果.status === 'success' && 结果.matched_folder) { 
                输入归属文件.value = `${结果.matched_folder}.json`; window.飞行汉化_提示(`已关联目录: ${结果.matched_folder}`, "success"); 
            } else { 
                输入归属文件.value = `${纯净词}.json`; window.飞行汉化_提示("未找到完全匹配的目录", "warning"); 
            }
        } catch (e) { 输入归属文件.value = "未归属视觉节点.json"; } finally { btn重新寻址.innerHTML = '智能匹配'; }
    };

    btn重新寻址.addEventListener('click', () => 执行智能匹配(输入插件名.value));

    // 主键扫描与自动替换
    if(btn扫描主键) {
        btn扫描主键.addEventListener('click', async () => {
            const 原提取键名 = 输入主键.value.trim();
            const 插件名 = 输入归属文件.value.replace('.json', '').trim();
            
            if (!原提取键名 || !当前全局解析数据) return window.飞行汉化_提示("暂无提取的节点数据可供校准", "warning");
            if (!插件名 || 插件名 === "未归属视觉节点") return window.飞行汉化_提示("请先完成步骤 2 的归属文件匹配", "warning");

            btn扫描主键.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 扫描中...';
            try {
                const 结果 = await 引擎_扫描主键校准(插件名, 原提取键名);
                if (结果.status === 'success') {
                    const 真实类名 = 结果.matched_key;
                    if (原提取键名 !== 真实类名 && 当前全局解析数据[原提取键名]) {
                        const 节点数据 = 当前全局解析数据[原提取键名];
                        delete 当前全局解析数据[原提取键名];
                        当前全局解析数据[真实类名] = 节点数据;
                        
                        输入主键.value = 真实类名;
                        输入主键.style.color = '#10b981'; 
                        window.飞行汉化_提示(`校准成功！(${结果.method})`, "success");
                        写日志(`<span style="color:#10b981">✔ 主键已从 [${原提取键名}] 修正为底层类名 [${真实类名}]。</span>`);
                        
                        构建保存引擎(JSON.stringify(当前全局解析数据, null, 4), false, 当前全局解析数据);
                    } else {
                        window.飞行汉化_提示("原键名已是底层代码类名，无需替换", "success");
                        输入主键.style.color = '#10b981';
                    }
                } else {
                    window.飞行汉化_提示(结果.message, "warning"); 写日志(`<span style="color:#f39c12">⚠️ 扫描失败: ${结果.message}</span>`);
                }
            } catch (e) { window.飞行汉化_提示("网络或接口异常", "error"); } finally { btn扫描主键.innerHTML = '<i class="fas fa-radar"></i> 扫描源码并替换'; }
        });
    }

    const 构建保存引擎 = (预设文本, 已经是合并模式 = false, 最终数据_纯净版 = null) => {
        挂载点.innerHTML = ''; 
        全局编辑器实例 = 生成高级JSON编辑器DOM(预设文本, true, 已经是合并模式); 
        
        if (已经是合并模式) 全局编辑器实例.更改状态('conflict');
        挂载点.appendChild(全局编辑器实例.DOM);

        if (已经是合并模式 && 全局编辑器实例.btn返回) {
            全局编辑器实例.btn返回.addEventListener('click', () => {
                window.飞行汉化_提示("已放弃合并，恢复至新提取节点状态", "info");
                构建保存引擎(JSON.stringify(最终数据_纯净版, null, 4), false);
            });
        }
        
        const btn保存 = 全局编辑器实例.DOM.querySelector('.btn-save');
        btn保存.addEventListener('click', async () => {
            btn保存.disabled = true;
            btn保存.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在处理硬盘落盘 (Saving...)';
            
            let 保存成功标记 = false; // 核心：拦截 finally 中的错误变红状态

            try {
                const 最终数据 = JSON.parse(全局编辑器实例.获取内容());
                const 响应 = await fetch('/flying_trans/api/save_file', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: 输入归属文件.value, language: window.飞行汉化缓存.当前目标语言, data: 最终数据, force_overwrite: 已经是合并模式, append_mode: false })
                });
                const 结果 = await 响应.json();
                
                if (结果.status === 'success') { 
                    保存成功标记 = true; 
                    全局编辑器实例.更改状态('success'); 
                    window.飞行汉化_提示(已经是合并模式 ? `节点已成功覆写！` : `节点已成功保存！`, "success"); 
                    写日志(`<span style="color:#10b981">✔ 操作成功：已落盘至 ${输入归属文件.value}。</span>`); 
                    
                    // 触发左滑成功界面
                    保存路径文本.innerText = 结果.path;
                    滑动轨道.style.transform = 'translateX(-50%)';
                    
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
                    写日志(`<span style="color:#f39c12">⚠️ 检测到同名文件。旧数据已追加至下方，请手动使用“查重复节点”与“排除已翻译”进行处理。</span>`);
                    
                    构建保存引擎(冲突文本, true, 最终数据);
                } else { 
                    throw new Error(结果.message); 
                }
            } catch (e) { 
                window.飞行汉化_提示(`写入失败: ${e.message}`, "error"); 
                写日志(`<span style="color:#e74c3c">✖ 写入失败: ${e.message}</span>`); 
            } finally {
                if (btn保存.isConnected) {
                    btn保存.disabled = false;
                    btn保存.innerHTML = 已经是合并模式 ? '<i class="fas fa-exclamation-triangle"></i> 确认结果并保存' : '<i class="fas fa-save"></i> 确认结果并保存';
                    // 如果保存失败，才恢复为编辑时的初始状态（冲突或常规）
                    if (!保存成功标记) 全局编辑器实例.更改状态(已经是合并模式 ? 'conflict' : 'default');
                }
            }
        });
    };

    btn启动.addEventListener('click', async () => {
        if (!当前图像Base64) return;
        const 算力模式 = window.飞行汉化缓存.currentComputeMode || window.飞行汉化缓存.当前算力引擎;
        const 当前模型 = window.飞行汉化缓存.当前模型;
        
        btn启动.disabled = true; 
        btn启动.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 任务排队中...';
        写日志(`>>> 🚀 载荷已派发至 ${算力模式 === 'local' ? '本地显卡' : '云端矩阵'} (${当前模型})...`);

        let 排队探测 = null;
        if (算力模式 === 'cloud') {
            const 探测云端 = async () => {
                try {
                    const r = await fetch('/flying_trans/api/cloud_queue');
                    const res = await r.json();
                    if (res.waiting > 0) {
                        if (res.waiting === 1) 写日志(`<span style="color:#38bdf8">☁️ 云端畅通：当前专属通道仅您 1 个视觉任务，正在极速提取...</span>`);
                        else 写日志(`<span style="color:#f39c12">⚠️ 云端拥挤：总计 ${res.waiting} 个任务，您前方还有 ${res.waiting - 1} 人排队中...</span>`);
                    }
                } catch(e) {}
            };
            探测云端(); // 秒发，不再干等 5 秒
            排队探测 = setInterval(探测云端, 5000); 
        }
        
        try {
            const 结果 = await 引擎_视觉解析(算力模式, window.飞行汉化缓存.当前目标语言, 当前模型, 当前图像Base64);
            
            if (排队探测) clearInterval(排队探测);

            if (结果.status === 'success') {
                写日志(`<span style="color:#10b981">✔ 解析完成！请核对。</span>`);
                window.飞行汉化_提示("视觉提取成功", "success");
                
                当前全局解析数据 = 结果.data;
                const 提取的Keys = Object.keys(当前全局解析数据).filter(k => k !== "_plugin_guess");
                if (提取的Keys.length > 0 && 输入主键) {
                    输入主键.value = 提取的Keys[0];
                    输入主键.style.color = '#f39c12'; 
                }
                
                const pluginGuess = 结果.data._plugin_guess || "";
                delete 结果.data._plugin_guess; 
                输入插件名.value = pluginGuess;
                
                匹配区.style.display = 'flex'; 
                拖拽区.style.height = '60px'; 
                
                滑动窗口.style.display = 'flex'; 
                滑动轨道.style.transform = 'translateX(0%)';
                btn启动.style.display = 'none'; 
                
                构建保存引擎(JSON.stringify(结果.data, null, 4), false);
                if (pluginGuess && pluginGuess !== "未找到" && pluginGuess !== "None") await 执行智能匹配(pluginGuess);
            } else { 
                写日志(`<span style="color:#e74c3c">✖ 解析失败: ${结果.message}</span>`); window.飞行汉化_提示("处理失败", "error"); 
            }
        } catch (e) { 
            if (排队探测) clearInterval(排队探测);
            写日志(`<span style="color:#e74c3c">✖ 网络连接超时或云端 Space 响应异常</span>`); 
        } finally { 
            btn启动.disabled = false; 
            btn启动.innerHTML = '<i class="fas fa-satellite-dish"></i> 发送至多模态大模型解析节点'; 
        }
    });
}