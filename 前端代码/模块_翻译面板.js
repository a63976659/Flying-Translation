import { 执行流式翻译 } from "./业务_翻译引擎.js";

export function 挂载翻译面板(容器目标) {
    const 容器 = typeof 容器目标 === 'string' ? document.getElementById(容器目标) : 容器目标;
    if (!容器) return;

    容器.innerHTML = `
        <div id="状态-配置" style="display: flex; flex-direction: column; height: 100%;">
            <div class="飞行汉化-控件组" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                <label style="color: #cbd5e1; flex-shrink: 0;">🎯 选取要翻译的插件目录:</label>
                
                <input type="text" id="搜索-本地插件" placeholder="🔍 检索关键词..." style="flex-shrink: 0; width: 100%; padding: 8px 10px; margin-top: 5px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; box-sizing: border-box; font-size: 12px; outline: none; background: rgba(0,0,0,0.3); color: #fff !important; transition: 0.3s;" />
                
                <div style="display: flex; gap: 8px; margin-top: 8px; flex: 1; min-height: 0;">
                    <select id="选择-本地插件" size="6" style="flex: 2; padding: 4px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: rgba(0,0,0,0.2); color: #e2e8f0 !important; outline: none; height: 100%;">
                        <option value="">扫描节点拓扑中...</option>
                    </select>
                    
                    <input type="file" id="输入-文件夹" webkitdirectory directory multiple style="display: none;" />
                    
                    <button id="btn-选择外部" class="ft-btn" style="flex: 1; background: rgba(56,189,248,0.1); border: 1px dashed #38bdf8; color: #38bdf8; padding: 8px; height: 100%;">
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; height: 100%;">
                            <i class="fas fa-folder-open" style="font-size: 24px;"></i>
                            <span>外部装载</span>
                        </div>
                    </button>
                </div>
                <p id="所选目标提示" style="flex-shrink: 0; font-size: 11px; color: #10b981; margin-top: 8px; margin-bottom: 0; font-weight: bold;">就绪：直读本地挂载目录</p>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 15px; flex-shrink: 0;">
                <button id="btn-启动" class="ft-btn ft-btn-primary" style="flex: 3;">
                    <i class="fas fa-rocket"></i> 提取节点并启动翻译
                </button>
                <button id="btn-中断" class="ft-btn" style="flex: 1; background: #e74c3c; color: white; display: none;">
                    <i class="fas fa-stop-circle"></i> 紧急停机
                </button>
            </div>
            
            <div id="进度容器" style="display: none; margin-top: 15px; flex-shrink: 0;">
                <div style="font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between;">
                    <span>执行状态:</span><span id="进度文本">0%</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-top: 5px; overflow: hidden;">
                    <div id="进度条" style="width: 0%; height: 100%; background: #38bdf8; transition: 0.3s; box-shadow: 0 0 10px #38bdf8;"></div>
                </div>
            </div>
            
            <div id="日志区" style="flex-shrink: 0; margin-top: 15px; height: 240px; overflow-y: auto; background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 11px; padding: 10px; border-radius: 6px; border: 1px inset rgba(255,255,255,0.05);">
                翻译中枢待命...
            </div>

            <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px; flex-shrink: 0;">
                <button id="btn-打开缓存" class="ft-btn" style="flex: 1; background: rgba(255,255,255,0.05); color: #cbd5e1; font-size: 11px;">
                    <i class="fas fa-folder-open"></i> 缓存视界
                </button>
                <button id="btn-清空缓存" class="ft-btn" style="flex: 1; background: rgba(231,76,60,0.1); color: #e74c3c; font-size: 11px;">
                    <i class="fas fa-trash-alt"></i> 清空矩阵残存
                </button>
            </div>
        </div>

        <div id="状态-编辑器" style="display: none; flex-direction: column; height: 100%;">
            <h3 style="flex-shrink: 0; color: #38bdf8; font-size: 14px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin: 0 0 10px 0;">
                <i class="fas fa-edit"></i> 代码审查编排 (Review & Edit)
            </h3>
            
            <div id="编辑器挂载点" style="flex: 1; min-height: 0; overflow: hidden; margin-top: 5px; border-radius: 6px;"></div>
            
            <button id="btn-返回" class="ft-btn" style="flex-shrink: 0; background: #334155; color: #f8fafc; margin-top: 15px;">
                <i class="fas fa-arrow-left"></i> 丢弃缓存并退回
            </button>
        </div>
    `;

    const btn启动 = 容器.querySelector('#btn-启动'); 
    const btn中断 = 容器.querySelector('#btn-中断');
    const 搜索框 = 容器.querySelector('#搜索-本地插件'); 
    const 下拉列表 = 容器.querySelector('#选择-本地插件');
    const 文件夹输入 = 容器.querySelector('#输入-文件夹'); 
    const btn外部 = 容器.querySelector('#btn-选择外部');
    const 提示文本 = 容器.querySelector('#所选目标提示'); 
    const 日志区 = 容器.querySelector('#日志区');
    
    let 当前模式 = "local"; 
    let 完整插件列表 = []; 
    let 确认清理状态 = false;

    const 写日志 = (文本) => { 
        日志区.innerHTML += `<div>${文本}</div>`; 
        日志区.scrollTop = 日志区.scrollHeight; 
    };

    const 渲染列表 = (列表数据) => {
        if (列表数据.length === 0) { 
            下拉列表.innerHTML = '<option value="" disabled>探测器未发现目标</option>'; 
            return; 
        }
        下拉列表.innerHTML = 列表数据.map(p => `<option value="${p}" style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.05);">${p}</option>`).join('');
        if (window.飞行汉化缓存.当前选择的插件) {
            下拉列表.value = window.飞行汉化缓存.当前选择的插件; 
        } else {
            下拉列表.selectedIndex = -1;
        }
    };

    // 1. 初始化扫描本地插件目录
    fetch('/flying_trans/api/get_local_plugins').then(r => r.json()).then(data => {
        if (data.status === 'success' && data.plugins.length > 0) { 
            完整插件列表 = data.plugins; 
            渲染列表(完整插件列表); 
        }
    }).catch(e => { 
        下拉列表.innerHTML = '<option value="">网络获取失败</option>'; 
    });

    // 2. 搜索过滤功能
    搜索框.addEventListener('input', (e) => { 
        渲染列表(完整插件列表.filter(p => p.toLowerCase().includes(e.target.value.toLowerCase()))); 
    });
    搜索框.addEventListener('focus', () => 搜索框.style.borderColor = '#38bdf8');
    搜索框.addEventListener('blur', () => 搜索框.style.borderColor = 'rgba(255,255,255,0.1)');
    
    // 3. 外部目录加载
    btn外部.addEventListener('click', () => 文件夹输入.click());

    下拉列表.addEventListener('change', () => {
        if(!下拉列表.value) return; 
        当前模式 = "local"; 
        window.飞行汉化缓存.当前选择的插件 = 下拉列表.value; 
        文件夹输入.value = ""; 
        提示文本.innerText = `就绪：直读本地挂载目录 [${下拉列表.value}]`; 
        提示文本.style.color = "#10b981";
    });

    文件夹输入.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            当前模式 = "external"; 
            提示文本.innerText = `重定向：分析外部挂载卷 [${e.target.files[0].webkitRelativePath.split('/')[0]}]`; 
            提示文本.style.color = "#f39c12";
            下拉列表.selectedIndex = -1; 
            window.飞行汉化缓存.当前选择的插件 = null;
        }
    });

    // 4. 翻译控制管线
    btn中断.addEventListener('click', () => { 
        window.飞行汉化缓存.中断信号 = true; 
        btn中断.disabled = true; 
        btn中断.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 停机序列执行中...'; 
    });

    btn启动.addEventListener('click', async () => {
        if (当前模式 === "local" && (!下拉列表.value || 下拉列表.selectedIndex === -1)) { 
            window.飞行汉化_提示("请先锁定目标节点包", "warning"); 
            return; 
        }
        if (当前模式 === "external" && !文件夹输入.files.length) { 
            window.飞行汉化_提示("外部挂载卷空载", "error"); 
            return; 
        }
        
        window.飞行汉化缓存.中断信号 = false; 
        btn启动.style.display = 'none'; 
        btn中断.style.display = 'block'; 
        btn中断.disabled = false; 
        btn中断.innerHTML = '<i class="fas fa-stop-circle"></i> 紧急停机';
        
        容器.querySelector('#进度容器').style.display = 'block';
        let 提取的JSON结构 = null; 
        let 导出文件名 = "";

        try {
            // A. 提取 AST 结构
            if (当前模式 === "local") {
                导出文件名 = `${下拉列表.value}.json`; 
                写日志(`>>> 引擎扫描: ${下拉列表.value}...`);
                const 响应 = await fetch('/flying_trans/api/extract_local_nodes', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ plugin_name: 下拉列表.value }) 
                });
                const 结果 = await 响应.json(); 
                if (结果.status !== 'success') throw new Error(结果.message);
                提取的JSON结构 = 结果.data;
            } else {
                const pyFiles = Array.from(文件夹输入.files).filter(f => f.name.endsWith('.py'));
                if (pyFiles.length === 0) throw new Error("目标区域未发现神经元代码 (.py)");
                
                导出文件名 = `${文件夹输入.files[0].webkitRelativePath.split('/')[0] || "Unknown"}.json`; 
                写日志(`>>> 解析源码文件 x${pyFiles.length}...`);
                
                const pythonCodes = await Promise.all(pyFiles.map(file => new Promise(resolve => { 
                    const reader = new FileReader(); 
                    reader.onload = e => resolve(e.target.result); 
                    reader.readAsText(file); 
                })));
                
                const 响应 = await fetch('/flying_trans/api/extract_nodes', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ files: pythonCodes }) 
                });
                const 结果 = await 响应.json(); 
                if (结果.status !== 'success') throw new Error(结果.message);
                提取的JSON结构 = 结果.data;
            }
            
            写日志(`>>> AST树构建完毕，捕获节点 x${Object.keys(提取的JSON结构).length}，启动多语言编译...`);
            
            // B. 委派至翻译业务引擎
            执行流式翻译(提取的JSON结构, 导出文件名, 容器);
            
        } catch (e) {
            写日志(`<span style="color:#e74c3c">节点崩塌: ${e.message}</span>`); 
            window.飞行汉化_提示("提取失败", "error");
            btn中断.style.display = 'none'; 
            btn启动.style.display = 'block';
        }
    });

    // 5. 缓存管理
    容器.querySelector('#btn-返回').addEventListener('click', () => { 
        容器.querySelector('#状态-编辑器').style.display = 'none'; 
        容器.querySelector('#状态-配置').style.display = 'flex'; 
    });
    
    容器.querySelector('#btn-打开缓存').addEventListener('click', async () => { 
        try { 
            await fetch('/flying_trans/api/open_cache_folder', { method: 'POST' }); 
            window.飞行汉化_提示("缓存视界已在系统顶层展开", "info"); 
        } catch (e) { 
            window.飞行汉化_提示("指令被系统拒绝", "error"); 
        } 
    });

    // 双击防误触清空机制
    const btn清空 = 容器.querySelector('#btn-清空缓存');
    btn清空.addEventListener('click', async () => {
        if (!确认清理状态) {
            确认清理状态 = true; 
            btn清空.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 再次点击执行物理抹除'; 
            btn清空.style.background = '#e74c3c'; 
            btn清空.style.color = 'white';
            
            setTimeout(() => { 
                确认清理状态 = false; 
                btn清空.innerHTML = '<i class="fas fa-trash-alt"></i> 清空矩阵残存'; 
                btn清空.style.background = 'rgba(231,76,60,0.1)'; 
                btn清空.style.color = '#e74c3c'; 
            }, 3000);
            return;
        }
        
        try { 
            await fetch('/flying_trans/api/clean_cache', { method: 'POST' }); 
            window.飞行汉化_提示("底层缓存已彻底粉碎", "success"); 
            写日志(`<span style="color:#e74c3c">>>> 缓存空间已被物理抹除。</span>`); 
        } catch (e) { 
            window.飞行汉化_提示("权限受限", "error"); 
        }
        
        确认清理状态 = false; 
        btn清空.innerHTML = '<i class="fas fa-trash-alt"></i> 清空矩阵残存'; 
        btn清空.style.background = 'rgba(231,76,60,0.1)'; 
        btn清空.style.color = '#e74c3c';
    });
}