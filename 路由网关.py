import os
import json
import asyncio
import aiohttp
from aiohttp import web
import ast
import platform
import subprocess
import shutil
import difflib

from .后端逻辑.大模型客户端 import 大模型客户端
from .后端逻辑.节点解析器 import 节点解析器

# ==========================================
# 核心路径初始化 (支持跨平台)
# ==========================================
当前插件目录 = os.path.dirname(os.path.abspath(__file__))
ComfyUI根目录 = os.path.abspath(os.path.join(当前插件目录, "..", ".."))
模型基础目录 = os.path.abspath(os.path.join(ComfyUI根目录, "models", "LLM"))
缓存根目录 = os.path.join(ComfyUI根目录, "output", "飞行汉化_缓存")

def 确保缓存目录存在():
    if not os.path.exists(缓存根目录): 
        os.makedirs(缓存根目录, exist_ok=True)

# 初始化本地大模型客户端单例
本地引擎实例 = 大模型客户端(模型基础目录)

def 注册路由(app):
    routes = web.RouteTableDef()
    
    # ---------------------------------------------------------
    # API 1: 获取本地可用的 LLM 模型列表
    # ---------------------------------------------------------
    @routes.get("/flying_trans/api/get_models")
    async def 获取本地模型(request):
        模型列表 = []
        if os.path.exists(模型基础目录):
            for 项目名 in os.listdir(模型基础目录):
                完整路径 = os.path.join(模型基础目录, 项目名)
                if os.path.isdir(完整路径) and "config.json" in os.listdir(完整路径):
                    模型列表.append(项目名)
        return web.json_response({"status": "success", "models": 模型列表, "path": 模型基础目录})

    # ---------------------------------------------------------
    # API 2: 获取本地 custom_nodes 下的所有插件列表
    # ---------------------------------------------------------
    @routes.get("/flying_trans/api/get_local_plugins")
    async def 获取本地插件列表(request):
        插件根目录 = os.path.abspath(os.path.join(当前插件目录, ".."))
        列表 = []
        if os.path.exists(插件根目录):
            for 项目名 in os.listdir(插件根目录):
                完整路径 = os.path.join(插件根目录, 项目名)
                if os.path.isdir(完整路径) and not 项目名.startswith(".") and not 项目名.startswith("__"):
                    列表.append(项目名)
        return web.json_response({"status": "success", "plugins": sorted(列表)})

    # ---------------------------------------------------------
    # API 3: 接收前端传来的 Python 源码，使用 AST 提取节点信息
    # ---------------------------------------------------------
    @routes.post("/flying_trans/api/extract_nodes")
    async def 提取节点(request):
        try:
            参数 = await request.json()
            解析器 = 节点解析器()
            代码列表 = 参数.get("files", [])
            for 代码 in 代码列表:
                try: 
                    解析器.visit(ast.parse(代码))
                except Exception: 
                    continue
                    
            if not 解析器.解析结果: 
                return web.json_response({"status": "error", "message": "未提取到有效的 ComfyUI 节点。"})
            
            return web.json_response({"status": "success", "data": 解析器.解析结果})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ---------------------------------------------------------
    # API 4: 服务端直接读取并解析本地插件目录 (极速模式)
    # ---------------------------------------------------------
    @routes.post("/flying_trans/api/extract_local_nodes")
    async def 提取本地节点(request):
        try:
            参数 = await request.json()
            插件名 = 参数.get("plugin_name", "")
            插件路径 = os.path.abspath(os.path.join(当前插件目录, "..", 插件名))
            
            if not os.path.exists(插件路径): 
                return web.json_response({"status": "error", "message": "插件目录不存在。"})
                
            解析器 = 节点解析器()
            for 根, _, 文件在 in os.walk(插件路径):
                for 文件名 in 文件在:
                    if 文件名.endswith('.py'):
                        文件路径 = os.path.join(根, 文件名)
                        # 【补充强化】：增加双重编码兼容，防止含有中文注释的 GBK 文件导致提取中断
                        try:
                            with open(文件路径, 'r', encoding='utf-8') as f: 
                                解析器.visit(ast.parse(f.read()))
                        except UnicodeDecodeError:
                            try:
                                with open(文件路径, 'r', encoding='gbk') as f: 
                                    解析器.visit(ast.parse(f.read()))
                            except: continue
                        except: continue
                            
            if not 解析器.解析结果: 
                return web.json_response({"status": "error", "message": "未提取到有效的 ComfyUI 节点。"})
            
            return web.json_response({"status": "success", "data": 解析器.解析结果})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 5: 核心翻译任务分发
    # ==========================================
    @routes.post("/flying_trans/api/translate")
    async def 执行翻译(request):
        try:
            参数 = await request.json()
            计算模式 = 参数.get("compute_mode", "cloud")
            目标语言 = 参数.get("target_language", "中文")
            待翻译数据 = 参数.get("data", None)
            图像Base64 = 参数.get("image_base64", None)
            模型名称 = 参数.get("model_name", "Qwen/Qwen2.5-VL-7B-Instruct")
            
            if 计算模式 == "cloud":
                async with aiohttp.ClientSession() as session:
                    try:
                        云端请求的模型ID = 模型名称 
                        云端载荷 = {"target_language": 目标语言, "model_id": 云端请求的模型ID}
                        
                        if 待翻译数据: 
                            云端载荷["data"] = 待翻译数据
                        if 图像Base64: 
                            云端载荷["image_base64"] = 图像Base64
                        
                        请求头 = {
                            "Content-Type": "application/json", 
                            "X-API-Key": "Flying-Translatio-API-Key-20260318@!#"
                        }
                        
                        专属云端地址 = "https://zhiwei666-flying-translatio-api.hf.space/api/translate"
                        
                        async with session.post(专属云端地址, json=云端载荷, headers=请求头, timeout=120) as resp:
                            if resp.status == 200: 
                                云端响应 = await resp.json()
                                清洗后数据 = 本地引擎实例._执行规则后处理(云端响应.get("data"), 目标语言)
                                return web.json_response({"status": "success", "data": 清洗后数据})
                            else: 
                                错误文本 = await resp.text()
                                return web.json_response({"status": "error", "message": f"云端异常: {错误文本}"})
                    except asyncio.TimeoutError: 
                        return web.json_response({"status": "error", "message": "请求超时。"})
            
            elif 计算模式 == "local":
                # 定义双向智能搜索目录，优先搜索 prompt_generator，其次搜索 LLM
                if 图像Base64: 
                    def 运行本地视觉推理():
                        搜索目录列表 = [
                            os.path.abspath(os.path.join(ComfyUI根目录, "models", "prompt_generator")),
                            模型基础目录
                        ]
                        return 本地引擎实例.视觉解析(图像Base64, 目标语言, 模型名称, 搜索目录列表, print)
                    
                    最终数据 = await asyncio.to_thread(运行本地视觉推理)
                    return web.json_response({"status": "success", "data": 最终数据})

                if not 待翻译数据: 
                    return web.json_response({"status": "error", "message": "未提供翻译数据"})
                
                def 运行本地推理():
                    本地引擎实例.加载模型(模型名称, print)
                    return 本地引擎实例.分块翻译(待翻译数据, 目标语言, None)
                
                最终数据 = await asyncio.to_thread(运行本地推理)
                return web.json_response({"status": "success", "data": 最终数据})
            else: 
                return web.json_response({"status": "error", "message": "未知模式"})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 6: 智能模糊匹配文件夹 (深度剥离版，专治 ComfyUI 前缀)
    # ==========================================
    @routes.post("/flying_trans/api/smart_match_plugin")
    async def 智能匹配插件(request):
        try:
            关键词 = (await request.json()).get("keyword", "").strip()
            
            if not 关键词 or 关键词.lower() == "unknown" or 关键词 == "等待大模型提取或手动输入...": 
                return web.json_response({"status": "success", "matched_folder": ""})
            
            插件根目录 = os.path.abspath(os.path.join(当前插件目录, ".."))
            所有目录 = [d for d in os.listdir(插件根目录) if os.path.isdir(os.path.join(插件根目录, d))]
            
            最佳匹配 = ""
            最高分 = 0.0
            
            关键词_小写 = 关键词.lower()
            关键词_纯净 = 关键词_小写.replace("comfyui-", "").replace("comfyui_", "").replace("comfyui", "").replace("-", "").replace("_", "").replace(" ", "")
            if not 关键词_纯净: 
                return web.json_response({"status": "success", "matched_folder": ""})
            
            for 目录 in 所有目录:
                目录_小写 = 目录.lower()
                目录_纯净 = 目录_小写.replace("comfyui-", "").replace("comfyui_", "").replace("comfyui", "").replace("-", "").replace("_", "").replace(" ", "")
                
                if 关键词_纯净 in 目录_纯净 or 目录_纯净 in 关键词_纯净:
                    分数 = 0.9 + difflib.SequenceMatcher(None, 关键词_纯净, 目录_纯净).ratio() * 0.1
                else:
                    搜索变体 = [关键词_小写, f"comfyui-{关键词_小写}", f"comfyui_{关键词_小写}"]
                    分数 = max([difflib.SequenceMatcher(None, v, 目录_小写).ratio() for v in 搜索变体])
                
                if 分数 > 最高分: 
                    最高分 = 分数
                    最佳匹配 = 目录
            
            if 最高分 >= 0.4: 
                return web.json_response({"status": "success", "matched_folder": 最佳匹配})
            else: 
                return web.json_response({"status": "success", "matched_folder": ""})
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 7: 接收前端编辑结果，精准覆写本地硬盘 (支持增量追加)
    # ==========================================
    @routes.post("/flying_trans/api/save_file")
    async def 保存文件(request):
        try:
            参数 = await request.json()
            纯文件名 = os.path.basename(参数.get("filename", ""))
            新节点数据 = 参数.get("data", {})
            目标语言 = 参数.get("language", "中文")
            强制覆盖 = 参数.get("force_overwrite", False)
            增量追加 = 参数.get("append_mode", False) 
            
            标准汉化目录 = os.path.join(ComfyUI根目录, "custom_nodes", "ComfyUI-Chinese-Translation", "zh-CN", "Nodes")
            
            if os.path.exists(标准汉化目录) and ("中文" in 目标语言 or "Merged" in 目标语言):
                最终绝对路径 = os.path.join(标准汉化目录, 纯文件名)
            else:
                最终输出目录 = os.path.join(当前插件目录, "输出成品")
                if not os.path.exists(最终输出目录): 
                    os.makedirs(最终输出目录)
                名称部分, 扩展名 = os.path.splitext(纯文件名)
                最终绝对路径 = os.path.join(最终输出目录, f"{名称部分}_{目标语言}{扩展名}")
            
            if not os.path.exists(os.path.dirname(最终绝对路径)): 
                os.makedirs(os.path.dirname(最终绝对路径), exist_ok=True)

            if os.path.exists(最终绝对路径) and 增量追加:
                try:
                    with open(最终绝对路径, "r", encoding="utf-8") as f: 
                        文件内数据 = json.load(f)
                    
                    for 节点键, 节点详情 in 新节点数据.items():
                        if 节点键 in 文件内数据: 
                            del 文件内数据[节点键]
                        文件内数据[节点键] = 节点详情
                        
                    最终写入数据 = 文件内数据
                except Exception: 
                    最终写入数据 = 新节点数据 
            else:
                if os.path.exists(最终绝对路径) and not 强制覆盖:
                    try:
                        with open(最终绝对路径, "r", encoding="utf-8") as f: 
                            旧数据 = json.load(f)
                        return web.json_response({"status": "exists", "existing_data": 旧数据, "path": 最终绝对路径, "message": "发现同名文件"})
                    except Exception: 
                        pass 
                最终写入数据 = 新节点数据

            def 写入硬盘():
                with open(最终绝对路径, "w", encoding="utf-8") as f: 
                    json.dump(最终写入数据, f, indent=4, ensure_ascii=False)
                    
            await asyncio.to_thread(写入硬盘)
            return web.json_response({"status": "success", "path": 最终绝对路径})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 8: 自动保存临时缓存
    # ==========================================
    @routes.post("/flying_trans/api/save_cache")
    async def 写入缓存(request):
        try:
            参数 = await request.json()
            绝对路径 = os.path.join(缓存根目录, 参数.get("filename", "未命名缓存.json"))
            确保缓存目录存在()
            
            def 写硬盘():
                with open(绝对路径, "w", encoding="utf-8") as f: 
                    json.dump(参数.get("data", {}), f, indent=4, ensure_ascii=False)
                    
            await asyncio.to_thread(写硬盘)
            return web.json_response({"status": "success", "path": 绝对路径})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 9: 打开缓存文件夹
    # ==========================================
    @routes.post("/flying_trans/api/open_cache_folder")
    async def 打开缓存文件夹(request):
        try:
            确保缓存目录存在()
            if platform.system() == "Windows": 
                subprocess.Popen(['explorer', os.path.normpath(缓存根目录)])
            elif platform.system() == "Darwin": 
                subprocess.Popen(["open", 缓存根目录])
            else: 
                subprocess.Popen(["xdg-open", 缓存根目录])
                
            return web.json_response({"status": "success"})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 10: 清理缓存文件夹
    # ==========================================
    @routes.post("/flying_trans/api/clean_cache")
    async def 清理缓存(request):
        try:
            if os.path.exists(缓存根目录): 
                shutil.rmtree(缓存根目录)
            确保缓存目录存在()
            return web.json_response({"status": "success", "message": "已彻底清空！"})
        except Exception as e: 
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 11: 物理硬盘级保存与加载代码编辑器的历史记录
    # ==========================================
    @routes.post("/flying_trans/api/history")
    async def 保存编辑器历史(request):
        try:
            参数 = await request.json()
            历史文件路径 = os.path.join(当前插件目录, "editor_history.json")
            
            def 写硬盘():
                with open(历史文件路径, "w", encoding="utf-8") as f:
                    json.dump(参数.get("history", []), f, ensure_ascii=False)
            
            await asyncio.to_thread(写硬盘)
            return web.json_response({"status": "success"})
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)})

    @routes.get("/flying_trans/api/history")
    async def 读取编辑器历史(request):
        try:
            历史文件路径 = os.path.join(当前插件目录, "editor_history.json")
            if os.path.exists(历史文件路径):
                with open(历史文件路径, "r", encoding="utf-8") as f:
                    数据 = json.load(f)
                return web.json_response({"status": "success", "history": 数据})
            return web.json_response({"status": "success", "history": []})
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 12: 探测云端排队状态
    # ==========================================
    @routes.get("/flying_trans/api/cloud_queue")
    async def 获取云端排队状态(request):
        try:
            专属云端地址 = "https://zhiwei666-flying-translatio-api.hf.space/api/queue_status"
            async with aiohttp.ClientSession() as session:
                async with session.get(专属云端地址, timeout=5) as resp:
                    if resp.status == 200:
                        数据 = await resp.json()
                        return web.json_response(数据)
            return web.json_response({"status": "error", "waiting": 0})
        except:
            return web.json_response({"status": "error", "waiting": 0})

    # ==========================================
    # API 13: 视觉节点主键校准 (AST 深度扫描类名与显示名映射)
    # ==========================================
    @routes.post("/flying_trans/api/calibrate_node_key")
    async def 视觉主键校准(request):
        try:
            参数 = await request.json()
            插件文件夹名 = 参数.get("plugin_folder", "").replace(".json", "")
            提取的键名 = 参数.get("extracted_key", "")
            
            插件路径 = os.path.abspath(os.path.join(当前插件目录, "..", 插件文件夹名))
            if not os.path.exists(插件路径):
                return web.json_response({"status": "error", "message": "插件目录不存在，请先确保步骤2归属文件正确。"})
                
            显示名到类名映射 = {}
            类名集合 = set()
            
            class 映射提取器(ast.NodeVisitor):
                def visit_Assign(self, node):
                    try:
                        for target in node.targets:
                            if isinstance(target, ast.Name):
                                if target.id == 'NODE_DISPLAY_NAME_MAPPINGS':
                                    if isinstance(node.value, ast.Dict):
                                        for k, v in zip(node.value.keys, node.value.values):
                                            # 【补充强化】：兼容新老 Python 版本的 AST 语法树 (ast.Constant vs ast.Str)
                                            if isinstance(k, ast.Constant) and isinstance(v, ast.Constant):
                                                显示名到类名映射[v.value] = k.value
                                            elif getattr(ast, 'Str', None) and isinstance(k, ast.Str) and isinstance(v, ast.Str):
                                                显示名到类名映射[v.s] = k.s
                                elif target.id == 'NODE_CLASS_MAPPINGS':
                                    if isinstance(node.value, ast.Dict):
                                        for k in node.value.keys:
                                            if isinstance(k, ast.Constant):
                                                类名集合.add(k.value)
                                            elif getattr(ast, 'Str', None) and isinstance(k, ast.Str):
                                                类名集合.add(k.s)
                    except: pass
                    self.generic_visit(node)
            
            for 根, _, 文件在 in os.walk(插件路径):
                for 文件名 in 文件在:
                    if 文件名.endswith(".py"):
                        文件路径 = os.path.join(根, 文件名)
                        # 【补充强化】：双重编码兼容，防止 GBK 中文导致文件跳过
                        try:
                            with open(文件路径, "r", encoding="utf-8") as f:
                                tree = ast.parse(f.read())
                                映射提取器().visit(tree)
                        except UnicodeDecodeError:
                            try:
                                with open(文件路径, "r", encoding="gbk") as f:
                                    tree = ast.parse(f.read())
                                    映射提取器().visit(tree)
                            except: continue
                        except: continue
            
            if 提取的键名 in 显示名到类名映射:
                return web.json_response({"status": "success", "matched_key": 显示名到类名映射[提取的键名], "method": "精准显示名匹配"})
            
            def 规范化(s): return str(s).replace(" ", "").replace("_", "").lower()
            目标 = 规范化(提取的键名)
            
            for d_name, c_key in 显示名到类名映射.items():
                if 规范化(d_name) == 目标:
                    return web.json_response({"status": "success", "matched_key": c_key, "method": "模糊显示名匹配"})
                    
            for c_key in 类名集合:
                if 规范化(c_key) == 目标:
                    return web.json_response({"status": "success", "matched_key": c_key, "method": "类名直接命中"})
                    
            所有候选 = list(显示名到类名映射.keys()) + list(类名集合)
            if 所有候选:
                最佳 = difflib.get_close_matches(提取的键名, 所有候选, n=1, cutoff=0.6)
                if 最佳:
                    匹配词 = 最佳[0]
                    结果键 = 显示名到类名映射.get(匹配词, 匹配词) # 如果是显示名就转类名，是类名就保持
                    return web.json_response({"status": "success", "matched_key": 结果键, "method": "AI相似度推算"})
                    
            return web.json_response({"status": "fail", "message": "插件源码中未扫描到任何相似的节点名。"})

        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)})

    # ==========================================
    # API 14: 打开指定文件所在的文件夹
    # ==========================================
    @routes.post("/flying_trans/api/open_folder")
    async def 打开指定文件夹(request):
        try:
            参数 = await request.json()
            目标路径 = 参数.get("path", "")
            if os.path.exists(目标路径):
                # 如果是文件，提取它的父级目录；如果是目录，则直接打开
                目录 = os.path.dirname(目标路径) if os.path.isfile(目标路径) else 目标路径
                if platform.system() == "Windows": 
                    subprocess.Popen(['explorer', os.path.normpath(目录)])
                elif platform.system() == "Darwin": 
                    subprocess.Popen(["open", 目录])
                else: 
                    subprocess.Popen(["xdg-open", 目录])
                return web.json_response({"status": "success"})
            return web.json_response({"status": "error", "message": "文件路径不存在"})
        except Exception as e:
            return web.json_response({"status": "error", "message": str(e)})

    app.add_routes(routes)