import { app } from "../../scripts/app.js";
import { 挂载翻译面板 } from "./模块_翻译面板.js";
import { 挂载对比面板 } from "./模块_对比面板.js";
import { 挂载视觉翻译面板 } from "./模块_视觉翻译.js"; 

const 支持语言 = ["中文", "英文", "日文", "韩文", "法文", "德文", "西班牙语", "俄语"];

// 【核心机制】：四象限物理隔离模型池，确保文本/视觉、本地/云端绝不串台
const 模型池 = {
    local_text: ["Qwen2.5-3B-Instruct", "Qwen2.5-7B-Instruct"],
    local_vision: [
        "Qwen3-VL-4B-Instruct-FP8", 
        "Qwen3-VL-8B-Instruct-FP8", 
        "Qwen3-VL-4B-Instruct", 
        "Qwen3-VL-8B-Instruct", 
        "MiniCPM-V-4_5-int4", 
        "MiniCPM-V-4_5"
    ],
    cloud_text: [
        "Qwen/Qwen2.5-7B-Instruct", 
        "Qwen/Qwen3-4B-Instruct-2507", 
        "Qwen/Qwen2.5-72B-Instruct"
    ],
    cloud_vision: [
        "Qwen/Qwen2.5-VL-7B-Instruct", 
        "Qwen/Qwen2.5-VL-32B-Instruct", 
        "Qwen/Qwen3-VL-30B-A3B-Instruct"
    ] 
};

// 自动清洗与初始化本地存储，防止旧的报错模型死灰复燃
if (!模型池.local_text.includes(localStorage.getItem('飞行汉化_模型_本地文本'))) localStorage.setItem('飞行汉化_模型_本地文本', 模型池.local_text[0]);
if (!模型池.local_vision.includes(localStorage.getItem('飞行汉化_模型_本地视觉'))) localStorage.setItem('飞行汉化_模型_本地视觉', 模型池.local_vision[0]);
if (!模型池.cloud_text.includes(localStorage.getItem('飞行汉化_模型_云端文本'))) localStorage.setItem('飞行汉化_模型_云端文本', 模型池.cloud_text[0]);
if (!模型池.cloud_vision.includes(localStorage.getItem('飞行汉化_模型_云端视觉'))) localStorage.setItem('飞行汉化_模型_云端视觉', 模型池.cloud_vision[0]);

// 全局缓存状态机
window.飞行汉化缓存 = {
    当前所在Tab: 0,
    当前算力引擎: localStorage.getItem('飞行汉化_算力引擎') || 'local', 
    当前目标语言: localStorage.getItem('飞行汉化_目标语言') || '中文',
    当前模型_本地_文本: localStorage.getItem('飞行汉化_模型_本地文本'),
    当前模型_本地_视觉: localStorage.getItem('飞行汉化_模型_本地视觉'),
    当前模型_云端_文本: localStorage.getItem('飞行汉化_模型_云端文本'),
    当前模型_云端_视觉: localStorage.getItem('飞行汉化_模型_云端视觉'),
    暂存编辑数据: null,
    中断信号: false,
    当前选择的插件: null
};

// 智能计算当前应该使用的模型
Object.defineProperty(window.飞行汉化缓存, '当前模型', {
    get: function() { 
        if (this.当前算力引擎 === 'local') {
            return this.当前所在Tab === 1 ? this.当前模型_本地_视觉 : this.当前模型_本地_文本;
        } else {
            return this.当前所在Tab === 1 ? this.当前模型_云端_视觉 : this.当前模型_云端_文本;
        }
    }
});

// 全局悬浮提示系统 (替代原生的 alert)
window.飞行汉化_提示 = (消息内容, 类型 = 'info') => {
    const 颜色表 = { success: '#2ecc71', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
    const 图标表 = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    const toast = document.createElement('div');
    toast.innerHTML = `<i class="fas ${图标表[类型]}"></i> <span>${消息内容}</span>`;
    toast.style.cssText = `
        position: absolute; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px);
        background: rgba(30,30,30,0.95); color: ${颜色表[类型]}; padding: 10px 20px; border-radius: 8px;
        font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        display: flex; align-items: center; gap: 8px; z-index: 9999; opacity: 0; transition: 0.4s;
        border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); pointer-events: none;
    `;
    const 主容器 = document.querySelector('.飞行汉化-主容器') || document.body;
    主容器.appendChild(toast);
    
    setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; toast.style.opacity = '1'; }, 10);
    setTimeout(() => { 
        toast.style.transform = 'translateX(-50%) translateY(-20px)'; 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
};

// 注入全局 CSS 骨架
function 注入骨架样式() {
    if(document.getElementById('ft-main-style')) return;
    
    const link = document.createElement('link'); 
    link.rel = 'stylesheet'; 
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'; 
    document.head.appendChild(link);
    
    const 样式 = document.createElement('style'); 
    样式.id = 'ft-main-style';
    样式.textContent = `
        ::-webkit-scrollbar { width: 8px; height: 8px; } 
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 4px; } 
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 1px solid transparent; background-clip: content-box; } 
        ::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; } 
        
        .飞行汉化-主容器 { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--bg-color, #f5f7fa); color: var(--fg-color, #333); font-family: sans-serif; overflow: hidden; position: relative;} 
        .飞行汉化-顶栏 { flex-shrink: 0; padding: 15px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.1); } 
        
        .飞行汉化-顶栏 h2 { margin: 0 0 10px 0; font-size: 16px; display: flex; align-items: center; gap: 8px; color: #38bdf8; } 
        #btn-关于页面:hover { color: #fff !important; text-shadow: 0 0 8px rgba(56,189,248,0.6); }

        .算力切换器 { display: flex; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 4px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); } 
        .算力按钮 { flex: 1; text-align: center; padding: 6px 0; cursor: pointer; border-radius: 6px; font-size: 12px; color: #94a3b8; transition: 0.3s; } 
        .算力按钮.激活 { background: #38bdf8; color: #fff; font-weight: bold; box-shadow: 0 2px 8px rgba(56,189,248,0.4); } 
        
        .飞行汉化-控件组 { display: flex; flex-direction: column; margin-bottom: 10px; } 
        .飞行汉化-控件组 label { font-size: 12px; color: #cbd5e1; margin-bottom: 4px; } 
        .飞行汉化-下拉框 { padding: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: rgba(0,0,0,0.2); font-size: 12px; width: 100%; color: #fff; outline: none; transition: 0.3s; } 
        .飞行汉化-下拉框:focus { border-color: #38bdf8; } 
        .飞行汉化-下拉框 option { background: #1e293b; color: #fff; } 
        
        .导航-Tab组 { display: flex; background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden; margin-top: 10px; border: 1px solid rgba(255,255,255,0.05); } 
        .导航-项 { flex: 1; text-align: center; padding: 8px 0; cursor: pointer; font-size: 12px; transition: 0.3s; color: #94a3b8; } 
        .导航-项.激活 { background: rgba(255,255,255,0.1); color: #fff; font-weight: bold; border-bottom: 2px solid #38bdf8; } 
        
        .飞行汉化-视窗 { flex: 1; overflow: hidden; position: relative; } 
        .滑动轨道 { width: 300%; height: 100%; display: flex; transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); } 
        .业务面板 { width: 33.333%; height: 100%; padding: 15px; overflow-y: auto; box-sizing: border-box; } 
        
        .ft-btn { padding: 10px 15px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; } 
        .ft-btn-primary { background: #38bdf8; color: #0f172a; } 
        .ft-btn-primary:hover { background: #7dd3fc; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(56,189,248,0.3); } 
        .ft-btn-success { background: #10b981; color: white; } 
        .ft-btn-success:hover { background: #34d399; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    `;
    document.head.appendChild(样式);
}

function 渲染模型选项(容器) {
    const 下拉框 = 容器.querySelector('#选择-翻译模型');
    const 引擎 = window.飞行汉化缓存.当前算力引擎; 
    const tab = window.飞行汉化缓存.当前所在Tab;
    
    let 列表 = []; 
    let 当前选中 = "";
    
    if (引擎 === 'local') { 
        列表 = tab === 1 ? 模型池.local_vision : 模型池.local_text; 
        当前选中 = tab === 1 ? window.飞行汉化缓存.当前模型_本地_视觉 : window.飞行汉化缓存.当前模型_本地_文本; 
    } else { 
        列表 = tab === 1 ? 模型池.cloud_vision : 模型池.cloud_text; 
        当前选中 = tab === 1 ? window.飞行汉化缓存.当前模型_云端_视觉 : window.飞行汉化缓存.当前模型_云端_文本; 
    }
    
    下拉框.innerHTML = 列表.map(模 => `<option value="${模}" ${模 === 当前选中 ? 'selected' : ''}>${模}</option>`).join('');
}

function 构建侧边栏DOM() {
    const 容器 = document.createElement('div'); 
    容器.className = '飞行汉化-主容器';
    const 语言选项HTML = 支持语言.map(语 => `<option value="${语}" ${语 === window.飞行汉化缓存.当前目标语言 ? 'selected' : ''}>${语}</option>`).join('');
    
    容器.innerHTML = `
        <div class="飞行汉化-顶栏">
            <h2 id="btn-关于页面" style="cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: space-between;" title="点击查看工具介绍与作者信息">
                <span><i class="fas fa-satellite-dish"></i> 飞行翻译双语版 <span style="font-size: 11px; opacity: 0.8; font-weight: normal; margin-left: 4px;">(Flying-Translation)</span></span>
                <i class="fas fa-info-circle" style="font-size: 14px; opacity: 0.6;"></i>
            </h2>
            <div class="算力切换器">
                <div class="算力按钮" data-engine="local"><i class="fas fa-laptop-code"></i> 本地终端</div>
                <div class="算力按钮" data-engine="cloud"><i class="fas fa-cloud"></i> 云端矩阵</div>
            </div>
            <div style="display: flex; gap: 10px;">
                <div class="飞行汉化-控件组" style="flex: 1;">
                    <label>运算核心 (Model):</label>
                    <select id="选择-翻译模型" class="飞行汉化-下拉框"></select>
                </div>
                <div class="飞行汉化-控件组" style="flex: 1;">
                    <label>目标语言 (Language):</label>
                    <select id="选择-目标语言" class="飞行汉化-下拉框">${语言选项HTML}</select>
                </div>
            </div>
            <div class="导航-Tab组">
                <div class="导航-项 激活" data-index="0"><i class="fas fa-code"></i> 源码提取</div>
                <div class="导航-项" data-index="1"><i class="fas fa-eye"></i> 视觉解析</div>
                <div class="导航-项" data-index="2"><i class="fas fa-layer-group"></i> 补丁融合</div>
            </div>
        </div>
        <div class="飞行汉化-视窗">
            <div class="滑动轨道" id="主滑动轨道">
                <div class="业务面板" id="面板-翻译"></div>
                <div class="业务面板" id="面板-视觉"></div>
                <div class="业务面板" id="面板-对比"></div>
            </div>
        </div>

        <div id="视图-关于作者" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; z-index: 999; flex-direction: column; padding: 20px; box-sizing: border-box; overflow-y: auto;">
            <button id="btn-返回主界面" class="ft-btn" style="flex-shrink: 0; margin-bottom: 20px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2);">
                <i class="fas fa-arrow-left"></i> 返回主界面
            </button>
            
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
                <h3 style="margin-top: 0; color: #38bdf8; font-size: 15px;"><i class="fas fa-cogs"></i> 工具介绍与优势</h3>
                <p style="font-size: 12px; line-height: 1.8; color: #cbd5e1; margin-bottom: 0;">
                    <b>飞行翻译双语版 (Flying-Translation)</b> 是一款专为 ComfyUI 打造的现代化、多模态本地化辅助引擎，致力于让节点汉化与多语言适配变得前所未有地简单。<br><br>
                    ✨ <b>核心优势：</b><br>
                    1. <b>多模态视觉提取：</b> 截图即可精准翻译提取，独创视觉节点主键扫频校准技术。<br>
                    2. <b>云端本地双擎：</b> 灵活无缝切换本地显卡算力与专属云端矩阵。<br>
                    3. <b>智能 AST 解析：</b> 静态语法树降维解析，一键查重、自动修复防爆错。<br>
                    4. <b>极速内存合并：</b> 安全的增量追加覆写，全方位保护您的翻译进度。
                </p>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="margin-top: 0; color: #10b981; font-size: 15px;"><i class="fas fa-user-astronaut"></i> 作者与交流</h3>
                <p style="font-size: 13px; line-height: 1.8; color: #cbd5e1; margin-bottom: 0;">
                    <b>作者：</b>猪的飞行梦<br>
                    <b>QQ 交流群：</b>202018000<br>
                    <b>获取最新教程与动态：</b><br>
                    <a href="https://space.bilibili.com/2114638644" target="_blank" style="display: inline-block; margin-top: 8px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <img src="https://img.shields.io/badge/bilibili-猪的飞行梦-00A1D6?logo=bilibili&logoColor=white" alt="Bilibili 猪的飞行梦" style="border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                    </a>
                </p>
            </div>
            
            <div style="margin-top: auto; text-align: center; font-size: 10px; color: #64748b; padding-top: 20px;">
                Flying-Translation Engine © 2026
            </div>
        </div>
    `;

    const 算力按钮组 = 容器.querySelectorAll('.算力按钮');
    
    const 更新算力UI = () => {
        算力按钮组.forEach(btn => btn.classList.remove('激活'));
        容器.querySelector(`.算力按钮[data-engine="${window.飞行汉化缓存.当前算力引擎}"]`).classList.add('激活');
        渲染模型选项(容器);
    };
    
    更新算力UI();

    // ==========================================
    // 绑定关于页面切换事件
    // ==========================================
    const btn关于页面 = 容器.querySelector('#btn-关于页面');
    const 视图关于作者 = 容器.querySelector('#视图-关于作者');
    const btn返回主界面 = 容器.querySelector('#btn-返回主界面');

    btn关于页面.addEventListener('click', () => {
        视图关于作者.style.display = 'flex';
        视图关于作者.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards', easing: 'ease-out' });
    });

    btn返回主界面.addEventListener('click', () => {
        const 动画 = 视图关于作者.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards', easing: 'ease-in' });
        动画.onfinish = () => { 视图关于作者.style.display = 'none'; };
    });

    // 绑定算力切换事件
    算力按钮组.forEach(按钮 => {
        按钮.addEventListener('click', (e) => {
            const 目标引擎 = e.currentTarget.getAttribute('data-engine');
            window.飞行汉化缓存.当前算力引擎 = 目标引擎;
            localStorage.setItem('飞行汉化_算力引擎', 目标引擎); 
            更新算力UI();
        });
    });

    // 绑定模型选择事件
    容器.querySelector('#选择-翻译模型').addEventListener('change', (e) => {
        const engine = window.飞行汉化缓存.当前算力引擎; 
        const tab = window.飞行汉化缓存.当前所在Tab;
        const value = e.target.value;
        
        if (engine === 'local') { 
            if (tab === 1) { 
                window.飞行汉化缓存.当前模型_本地_视觉 = value; 
                localStorage.setItem('飞行汉化_模型_本地视觉', value); 
            } else { 
                window.飞行汉化缓存.当前模型_本地_文本 = value; 
                localStorage.setItem('飞行汉化_模型_本地文本', value); 
            }
        } else {
            if (tab === 1) { 
                window.飞行汉化缓存.当前模型_云端_视觉 = value; 
                localStorage.setItem('飞行汉化_模型_云端视觉', value); 
            } else { 
                window.飞行汉化缓存.当前模型_云端_文本 = value; 
                localStorage.setItem('飞行汉化_模型_云端文本', value); 
            }
        }
    });

    // 绑定语言选择事件
    容器.querySelector('#选择-目标语言').addEventListener('change', (e) => { 
        window.飞行汉化缓存.当前目标语言 = e.target.value; 
        localStorage.setItem('飞行汉化_目标语言', e.target.value); 
    });

    // 绑定 Tab 切换事件
    const 导航Tab = 容器.querySelectorAll('.导航-项');
    const 滑动轨道 = 容器.querySelector('#主滑动轨道');
    导航Tab.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            window.飞行汉化缓存.当前所在Tab = index;
            导航Tab.forEach(t => t.classList.remove('激活')); 
            e.currentTarget.classList.add('激活');
            滑动轨道.style.transform = `translateX(-${index * (100/3)}%)`;
            
            // 切换 Tab 时，渲染对应的模型下拉框
            渲染模型选项(容器); 
        });
    });
    
    // 延迟挂载子面板
    setTimeout(() => { 
        挂载翻译面板(容器.querySelector('#面板-翻译')); 
        挂载视觉翻译面板(容器.querySelector('#面板-视觉')); 
        挂载对比面板(容器.querySelector('#面板-对比')); 
    }, 50);
    
    return 容器;
}

let 全局侧边栏DOM = null;
app.registerExtension({
    name: "comfyui.flying_translation",
    async setup(app) {
        注入骨架样式();
        if (!全局侧边栏DOM) { 
            全局侧边栏DOM = 构建侧边栏DOM(); 
            全局侧边栏DOM.style.width = '100%'; 
            全局侧边栏DOM.style.height = '100%'; 
        }
        
        if (app.extensionManager && app.extensionManager.registerSidebarTab) {
            app.extensionManager.registerSidebarTab({
                id: "flying-translation-sidebar", 
                title: "飞行汉化", 
                icon: "pi pi-globe", 
                type: "custom",
                render: (container) => {
                    container.innerHTML = ''; 
                    container.appendChild(全局侧边栏DOM);
                    setTimeout(() => {
                        // 自动滚动到底部和选中项
                        const 日志区 = 全局侧边栏DOM.querySelector('#日志区'); 
                        if (日志区) 日志区.scrollTop = 日志区.scrollHeight;
                        const 视觉日志区 = 全局侧边栏DOM.querySelector('#视觉-日志区'); 
                        if (视觉日志区) 视觉日志区.scrollTop = 视觉日志区.scrollHeight;
                        
                        const 插件列表 = 全局侧边栏DOM.querySelector('#选择-本地插件');
                        if (插件列表 && 插件列表.selectedIndex >= 0 && 插件列表.options[插件列表.selectedIndex]) {
                            插件列表.scrollTop = 插件列表.options[插件列表.selectedIndex].offsetTop - 40;
                        }
                    }, 50);
                }
            });
        }
    }
});