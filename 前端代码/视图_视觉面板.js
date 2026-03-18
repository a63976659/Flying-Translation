export const 视觉面板HTML = `
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
        
        <div id="视觉-编辑区" style="display: none; flex-direction: column; flex: 1; min-height: 0; margin-top: 15px; padding: 2px;">
            <h3 style="flex-shrink: 0; color: #38bdf8; font-size: 13px; margin: 0 0 5px 0;"><i class="fas fa-tasks"></i> 代码审查编排 (Code Review)</h3>
            <div id="视觉-编辑器挂载点" style="flex: 1; min-height: 0; overflow: hidden; border-radius: 6px;"></div>
        </div>

        <div id="视觉-日志区" style="flex-shrink: 0; margin-top: 15px; height: 160px; overflow-y: auto; background: #0f172a; color: #38bdf8; font-family: monospace; font-size: 11px; padding: 10px; border-radius: 6px; border: 1px inset rgba(255,255,255,0.05);">
            视觉中枢待命...
        </div>
    </div>
`;