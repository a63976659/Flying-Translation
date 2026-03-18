import { 生成高级JSON编辑器DOM } from "./组件_代码编辑器.js";

export function 挂载视觉翻译面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

    // 【重排 UI 顺序】：剪贴板 > 图像区 > 发送解析 > 匹配核对区 > 代码审查区
    容器.innerHTML = `
        <div style="display: flex; flex-direction: column; height: 100%;">
            <div style="flex-shrink: 0; display: flex; flex-direction: row; gap: 10px; margin-bottom: 10px; width: 100%;">
                <button id="btn-视觉剪贴板" class="ft-btn" style="flex: 1; background: rgba(56,189,248,0.1); color: #38bdf8; border: 1px dashed #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <i class="fas fa-clipboard"></i> 点击读取剪贴板截图
                </button>
                <button id="btn-视觉重置" class="ft-btn" style="flex: 1; background: rgba(231,76,60,0.1); color: #e74c3c; border: 1px dashed #e74c3c; display: none; white-space: nowrap;">
                    <i class="fas fa-redo"></i> 清空重拍
                </button>
            </div>

            <div id="图像拖拽区" style="flex-shrink: 0; width: 100%; height: 160px; border: 2px dashed #475569; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.1); cursor: pointer; position: relative; overflow: hidden; transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                <input type="file" id="视觉-图像输入" accept="image/*" style="display: none;" />
                <i class="fas fa-camera-retro" id="图像icon" style="font-size: 32px; color: #64748b; margin-bottom: 10px;"></i>
                <span id="拖拽区文本" style="color: #94a3b8; font-size: 12px; font-weight: bold;">或点击这里选择本地图片文件</span>
                <img id="视觉-图像预览" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: #0f172a; display: none;" />
            </div>

            <button id="btn-视觉启动" class="ft-btn ft-btn-primary" style="margin-top: 15px; flex-shrink: 0; display: none;">
                <i class="fas fa-satellite-dish"></i> 发送至多模态大模型解析节点
            </button>

            <div id="视觉-匹配区" style="display: none; flex-direction: column; flex-shrink: 0; margin-top: 15px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.2);">
                <label style="font-size: 11px; color: #94a3b8;">1. 插件名提取 (大模型提取结果，若有误请手动更正):</label>
                <div style="display: flex; gap: 8px; margin-top: 6px; margin-bottom: 10px;">
                    <input type="text" id="视觉-核对插件名" placeholder="等待大模型提取或手动输入..." style="flex: 1; padding: 8px; border: 1px solid #475569; border-radius: 4px; background: rgba(0,0,0,0.5); color: #38bdf8; font-weight: bold; font-size: 12px; outline: none;" />
                    <button id="btn-重新寻址" class="ft-btn" style="padding: 8px 15px; font-size: 11px; background: #475569; color: white; white-space: nowrap;">智能匹配</button>
                </div>
                
                <label style="font-size: 11px; color: #94a3b8;">2. 目标归属文件核对 (确认无误后方可保存):</label>
                <input type="text" id="视觉-归属文件" value="未归属视觉节点.json" style="width: 100%; box-sizing: border-box; padding: 8px; margin-top: 6px; border: 1px solid #10b981; border-radius: 4px; background: rgba(16,185,129,0.1); color: #fff; font-weight: bold; font-size: 12px; outline: none;" />
            </div>
            
            <div id="视觉-编辑区" style="display: none; flex-direction: column; flex: 1; min-height: 0; margin-top: 15px;">
                <h3 style="flex-shrink: 0; color: #38bdf8; font-size: 13px; margin: 0 0 5px 0;"><i class="fas fa-tasks"></i> 代码审查编排</h3>
                <div id="视觉-编辑器挂载点" style="flex: 1; min-height: 0; overflow: hidden; border-radius: 6px;"></div>
                <button id="btn-视觉保存" class="ft-btn ft-btn-success" style="margin-top: 10px; flex-shrink: 0;">
                    <i class="fas fa-save"></i> 确认代码无误，保存并写入硬盘
                </button>
            </div>

            <div id="视觉-日志区" style="flex-shrink: 0; margin-top: 15px; height: 160px; overflow-y: auto; background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 11px; padding: 10px; border-radius: 6px; border: 1px inset rgba(255,255,255,0.05);">
                视觉中枢待命...
            </div>
        </div>
    `;

    // DOM 元素绑定
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
    const btn保存 = 容器.querySelector('#btn-视觉保存');
    const 日志区 = 容器.querySelector('#视觉-日志区'); 
    const btn剪贴板 = 容器.querySelector('#btn-视觉剪贴板');
    const btn重置 = 容器.querySelector('#btn-视觉重置');

    let 当前图像Base64 = null; 
    let 全局编辑器实例 = null;
    let 保存确认状态 = false; // 用于控制两阶段点击（常规保存 -> 发现冲突 -> 确认追加）

    const 写日志 = (文本) => { 
        日志区.innerHTML += `<div>${文本}</div>`; 
        日志区.scrollTop = 日志区.scrollHeight; 
    };

    // 图像装载逻辑
    const 触发图片上屏 = (file) => {
        if (!file || !file.type.startsWith('image/')) { 
            window.飞行汉化_提示("数据格式非图像！", "error"); 
            return; 
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
            
            // 重置保存按钮状态
            保存确认状态 = false;
            btn保存.className = 'ft-btn ft-btn-success';
            btn保存.style.background = '';
            btn保存.innerHTML = '<i class="fas fa-save"></i> 确认代码无误，保存并写入硬盘';

            写日志(`>>> 📸 图像已就绪，等待发送。`);
        };
        reader.readAsDataURL(file);
    };

    // 文件选择与拖拽事件
    拖拽区.addEventListener('click', () => 文件输入.click());
    文件输入.addEventListener('change', (e) => 触发图片上屏(e.target.files[0]));
    拖拽区.addEventListener('dragover', (e) => { e.preventDefault(); 拖拽区.style.borderColor = '#38bdf8'; });
    拖拽区.addEventListener('dragleave', () => 拖拽区.style.borderColor = '#475569');
    拖拽区.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        拖拽区.style.borderColor = '#475569'; 
        if (e.dataTransfer.files.length) 触发图片上屏(e.dataTransfer.files[0]); 
    });

    // 纯净读取剪贴板事件
    btn剪贴板.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            let found = false;
            for (const item of clipboardItems) {
                const imageTypes = item.types.filter(type => type.startsWith('image/'));
                if (imageTypes.length > 0) {
                    const blob = await item.getType(imageTypes[0]);
                    const file = new File([blob], "clipboard.png", { type: blob.type });
                    触发图片上屏(file); 
                    found = true; 
                    break;
                }
            }
            if (!found) window.飞行汉化_提示("系统剪贴板中未发现图像", "warning");
        } catch (e) { 
            window.飞行汉化_提示("读取被拒，请允许浏览器读取剪贴板权限", "error"); 
        }
    });

    // 重置面板事件
    btn重置.addEventListener('click', () => {
        当前图像Base64 = null; 
        预览图.src = ''; 
        预览图.style.display = 'none'; 
        提示文.style.display = 'block';
        
        匹配区.style.display = 'none'; 
        btn启动.style.display = 'none'; 
        编辑区.style.display = 'none';
        btn重置.style.display = 'none'; 
        拖拽区.style.height = '160px';
        
        输入插件名.value = ""; 
        输入归属文件.value = "未归属视觉节点.json";
        
        保存确认状态 = false;
        btn保存.className = 'ft-btn ft-btn-success';
        btn保存.style.background = '';
        btn保存.innerHTML = '<i class="fas fa-save"></i> 确认代码无误，保存并写入硬盘';
    });

    // 智能寻址引擎
    const 执行智能匹配 = async (keyword) => {
        const 纯净词 = keyword ? keyword.trim() : "";
        if (!纯净词 || 纯净词 === "等待大模型提取或手动输入...") { 
            window.飞行汉化_提示("请输入插件英文名！", "warning"); 
            return; 
        }
        
        btn重新寻址.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const 响应 = await fetch('/flying_trans/api/smart_match_plugin', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ keyword: 纯净词 }) 
            });
            const 结果 = await 响应.json();
            
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

    // 核心翻译解析流
    btn启动.addEventListener('click', async () => {
        if (!当前图像Base64) return;
        
        const 算力模式 = window.飞行汉化缓存.当前算力引擎;
        const 当前模型 = window.飞行汉化缓存.当前模型;
        
        btn启动.disabled = true; 
        btn启动.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
        写日志(`>>> 🚀 载荷已派发至 ${算力模式 === 'local' ? '本地显卡' : '云端矩阵'} (${当前模型})...`);
        
        try {
            const 响应 = await fetch('/flying_trans/api/translate', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    compute_mode: 算力模式, 
                    target_language: window.飞行汉化缓存.当前目标语言, 
                    model_name: 当前模型, 
                    image_base64: 当前图像Base64 
                })
            });
            const 结果 = await 响应.json();
            
            if (结果.status === 'success') {
                写日志(`<span style="color:#10b981">✔ 解析完成！请核对。</span>`);
                window.飞行汉化_提示("视觉提取成功", "success");
                
                // 拦截并提取右上角插件名
                const pluginGuess = 结果.data._plugin_guess || "";
                delete 结果.data._plugin_guess; 
                
                输入插件名.value = pluginGuess;
                
                // 调整布局展开匹配和编辑器
                匹配区.style.display = 'flex'; 
                拖拽区.style.height = '60px'; 
                编辑区.style.display = 'flex'; 
                btn启动.style.display = 'none'; 
                
                挂载点.innerHTML = ''; 
                // 【核心修复】：将第二个参数设为 false，彻底关闭编辑器内部自带的默认保存按钮
                全局编辑器实例 = 生成高级JSON编辑器DOM(JSON.stringify(结果.data, null, 4), false); 
                挂载点.appendChild(全局编辑器实例.DOM);
                
                // 自动触发一次智能匹配，提升工作流速度
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

    // 核心追加保存流（二段式确认防覆盖）
    btn保存.addEventListener('click', async () => {
        if (!全局编辑器实例) return;
        
        btn保存.disabled = true; 
        btn保存.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在处理硬盘注入...';
        
        try {
            const 最终数据 = JSON.parse(全局编辑器实例.获取内容());
            const 响应 = await fetch('/flying_trans/api/save_file', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename: 输入归属文件.value, 
                    language: window.飞行汉化缓存.当前目标语言, 
                    data: 最终数据, 
                    force_overwrite: 保存确认状态,  // 第一阶段为false，第二阶段为true
                    append_mode: 保存确认状态       // 如果是强制覆写，则启用增量追加合并模式
                })
            });
            const 结果 = await 响应.json();
            
            if (结果.status === 'success') { 
                window.飞行汉化_提示(保存确认状态 ? `节点已成功追加合并：${结果.path}` : `节点已成功保存：${结果.path}`, "success"); 
                写日志(`<span style="color:#10b981">✔ 操作成功：已落盘至 ${输入归属文件.value}。</span>`); 
                
                // 成功后复原按钮状态
                保存确认状态 = false;
                btn保存.className = 'ft-btn ft-btn-success';
                btn保存.style.background = '';
                btn保存.innerHTML = '<i class="fas fa-save"></i> 确认代码无误，保存并写入硬盘';
                
            } else if (结果.status === 'exists' && !保存确认状态) {
                // 触发二段确认状态
                保存确认状态 = true;
                window.飞行汉化_提示("警告：发现同名文件，请确认是否继续追加！", "warning");
                写日志(`<span style="color:#f39c12">⚠️ 检测到目标目录已存在 ${输入归属文件.value}，请确认是否将当前代码合并追加到该文件中。</span>`);
                
                btn保存.className = 'ft-btn'; 
                btn保存.style.background = '#e74c3c'; // 变红警示
                btn保存.style.color = 'white';
                btn保存.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 发现同名文件，确认代码无误，追加写入硬盘';
                
            } else {
                throw new Error(结果.message); 
            }
            
        } catch (e) { 
            window.飞行汉化_提示(`写入失败: ${e.message}`, "error"); 
            写日志(`<span style="color:#e74c3c">✖ 写入失败: ${e.message}</span>`); 
        } finally { 
            btn保存.disabled = false; 
            if (!保存确认状态) {
                btn保存.innerHTML = '<i class="fas fa-save"></i> 确认代码无误，保存并写入硬盘'; 
            }
        }
    });
}