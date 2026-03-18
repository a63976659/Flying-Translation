import os
import json
import gc
import base64
from io import BytesIO

# 延迟加载，避免阻塞 ComfyUI 的启动过程
torch = None
AutoModelForCausalLM = None
AutoTokenizer = None
AutoProcessor = None
Image = None

class 大模型客户端:
    def __init__(self, 模型基础目录):
        self.模型基础目录 = 模型基础目录
        self.模型实例 = None
        self.分词器 = None  # 在视觉模式下，这里存放的是 Processor
        self.当前加载模型名 = None

    def 加载模型(self, 模型名称, 日志回调函数=print):
        global torch, AutoModelForCausalLM, AutoTokenizer
        
        if not 模型名称: 
            raise Exception("未选择模型")
            
        if self.模型实例 is not None and self.当前加载模型名 == 模型名称:
            日志回调函数(f">>> 模型 {模型名称} 已在显存中，就绪。")
            return

        模型路径 = os.path.join(self.模型基础目录, 模型名称)
        if not os.path.exists(模型路径):
            raise Exception(f"模型路径不存在，请检查是否已下载: {模型路径}")

        if torch is None:
            日志回调函数(">>> 正在初始化 PyTorch 环境...")
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

        if self.模型实例 is not None:
            self.清理显存()

        日志回调函数(f">>> 正在挂载本地大模型: {模型名称}...")
        self.分词器 = AutoTokenizer.from_pretrained(模型路径, trust_remote_code=True)
        if self.分词器.pad_token is None: 
            self.分词器.pad_token = self.分词器.eos_token
            
        self.模型实例 = AutoModelForCausalLM.from_pretrained(
            模型路径, 
            device_map="auto", 
            torch_dtype="auto", 
            trust_remote_code=True
        )
        self.当前加载模型名 = 模型名称
        日志回调函数(">>> ✅ 模型加载成功！")

    def 分块翻译(self, 数据块, 目标语言, 进度回调函数=None):
        """
        核心翻译引擎：加入了强效 One-Shot 示例，彻底解决 title 不翻译和保守幻觉
        """
        system_prompt = f"""
你是一个专业的 ComfyUI 插件本地化翻译专家。任务是将 JSON 文件中的英文字符串（Value）翻译成 {目标语言}。

【核心规则】
1. 绝对禁止修改 JSON 的键名（Key）！只能翻译键值（Value）。
2. "inputs", "widgets", "outputs" 结构内部必须保留键名。
3. 【强制翻译 title】"title" 和 "description" 是面向用户的展示字段，哪怕是驼峰命名（如 IntLiteral, LoadImage），也必须拆分为通顺的 {目标语言}！绝不能照抄英文。
4. 【强制意译变量】对于带下划线、数字（如 image_1）或全大写（如 BATCH_SIZE）的变量，必须意译（如“图像 1”、“批次大小”）。
5. 【保留术语】"clip", "vae", "latent", "lora", "cond", "uncond", "seed", "step" 必须保留原样。
6. 中文语境下："mask" 统一译为 "遮罩"；"image" 统一译为 "图像"。
7. 必须且只能输出合法的 JSON 代码，绝不要包含 ```json 等 Markdown 标记或解释！

【翻译参考示例】
输入:
{{
  "IntLiteral": {{
    "title": "IntLiteral",
    "inputs": {{"image_1": "image_1", "mask": "mask"}},
    "widgets": {{"seed": "seed", "resize_mode": "resize_mode"}},
    "outputs": {{"IMAGE": "IMAGE", "LATENT": "LATENT"}},
    "description": "Category: Logic"
  }}
}}
输出:
{{
  "IntLiteral": {{
    "title": "整数文本",
    "inputs": {{"image_1": "图像 1", "mask": "遮罩"}},
    "widgets": {{"seed": "seed", "resize_mode": "缩放模式"}},
    "outputs": {{"IMAGE": "图像", "LATENT": "LATENT"}},
    "description": "类别: 逻辑"
  }}
}}
"""
        user_prompt = f"请将以下 JSON 的内容翻译为 {目标语言}（保持 Key 严格不变）：\n{json.dumps(数据块, indent=2, ensure_ascii=False)}"
        
        messages = [
            {"role": "system", "content": system_prompt}, 
            {"role": "user", "content": user_prompt}
        ]
        
        text = self.分词器.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.分词器([text], return_tensors="pt").to(self.模型实例.device)
        
        if 进度回调函数: 进度回调函数("thinking")
            
        generated_ids = self.模型实例.generate(
            inputs.input_ids, 
            attention_mask=inputs.attention_mask,
            max_new_tokens=4096, 
            temperature=0.1,  
            pad_token_id=self.分词器.eos_token_id
        )
        
        if 进度回调函数: 进度回调函数("done")

        ids = [out[len(inp):] for inp, out in zip(inputs.input_ids, generated_ids)]
        content = self.分词器.batch_decode(ids, skip_special_tokens=True)[0]
        
        # 鲁棒的 JSON 提取逻辑
        if "```" in content: 
            content = content.split("```json")[-1].split("```")[0].strip()
            if not content: content = content.split("```")[-1].split("```")[0].strip()
        elif "{" in content: 
            content = content[content.find("{"):content.rfind("}")+1]
            
        if not content.endswith("}"): content += "}"
        
        try: 
            result = json.loads(content)
        except Exception as e: 
            try: result = json.loads(content + "}")
            except: raise Exception(f"大模型生成的 JSON 格式损坏: {str(e)}")
        
        return self._执行规则后处理(result, 目标语言)

    # ==========================================
    # 新增核心：本地多模态视觉推理分支
    # ==========================================
    def 视觉解析(self, 图像Base64, 目标语言, 模型名称, 视觉模型目录, 日志回调函数=print):
        global torch, AutoModelForCausalLM, AutoProcessor, Image
        if torch is None:
            import torch
            from transformers import AutoModelForCausalLM, AutoProcessor
            from PIL import Image

        # 1. 图像解码与准备
        if "," in 图像Base64: 
            图像Base64 = 图像Base64.split(",")[1]
        img_data = base64.b64decode(图像Base64)
        image = Image.open(BytesIO(img_data)).convert("RGB")

        # 2. 模型挂载
        模型路径 = os.path.join(视觉模型目录, 模型名称)
        if not os.path.exists(模型路径): 
            raise Exception(f"未在 prompt_generator 目录找到视觉模型: {模型名称}")

        if self.当前加载模型名 != 模型名称:
            self.清理显存()
            日志回调函数(f">>> 正在将多模态视觉模型载入显存: {模型名称}...")
            
            # MiniCPM 与 Qwen-VL 在加载时存在底层差异
            if "MiniCPM" in 模型名称:
                # 面向 MiniCPM 的特供加载模式
                self.模型实例 = AutoModelForCausalLM.from_pretrained(模型路径, trust_remote_code=True, torch_dtype=torch.float16, device_map="auto")
                self.模型实例.eval()
                self.分词器 = AutoProcessor.from_pretrained(模型路径, trust_remote_code=True)
            else:
                # 面向 Qwen2-VL/Qwen3-VL 的通用加载模式
                self.分词器 = AutoProcessor.from_pretrained(模型路径, trust_remote_code=True)
                self.模型实例 = AutoModelForCausalLM.from_pretrained(模型路径, device_map="auto", torch_dtype="auto", trust_remote_code=True)
                self.模型实例.eval()
            self.当前加载模型名 = 模型名称

        sys_prompt = f"""你是一个 ComfyUI 节点解析专家。分析用户提供的截图并翻译为 {目标语言}。
【严格规则】：
1. 提取图像右上角带背景色的小字，放入外层 "_plugin_guess" 字段中。
2. 左上角的大字是真实类名，作为主 Key。
3. 左侧是 inputs，右侧是 outputs，中间输入框是 widgets。
4. 必须且只输出 JSON 代码块！
【输出规范】：
{{
  "_plugin_guess": "右上角插件名",
  "节点类名": {{ "title": "节点中文名", "inputs": {{...}}, "widgets": {{...}}, "outputs": {{...}}, "description": "描述..." }}
}}"""

        # 3. 针对不同模型的架构，构造特定的多模态 Prompt
        try:
            if "MiniCPM" in 模型名称:
                # MiniCPM 专属对话结构
                msgs = [{"role": "user", "content": [image, sys_prompt + "\n请提取图片中节点信息并转为标准JSON。"]}]
                content = self.模型实例.chat(image=None, msgs=msgs, tokenizer=self.分词器)
                
            else:
                # Qwen-VL 通用对话结构
                messages = [
                    {"role": "system", "content": [{"type": "text", "text": sys_prompt}]},
                    {"role": "user", "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": "请提取图中节点信息并翻译为JSON。"}
                    ]}
                ]
                text = self.分词器.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
                inputs = self.分词器(text=[text], images=[image], padding=True, return_tensors="pt").to(self.模型实例.device)
                
                generated_ids = self.模型实例.generate(**inputs, max_new_tokens=4096)
                generated_ids_trimmed = [out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)]
                content = self.分词器.batch_decode(generated_ids_trimmed, skip_special_tokens=True)[0]
                
        except Exception as err:
            raise Exception(f"显卡推理崩溃，可能是显存不足或模型架构不兼容。底层错误: {str(err)}")

        # 4. JSON 抽离器
        if "```" in content: 
            content = content.split("```json")[-1].split("```")[0].strip()
        elif "{" in content: 
            content = content[content.find("{"):content.rfind("}")+1]
        if not content.endswith("}"): 
            content += "}"

        try:
            result = json.loads(content)
        except Exception as e:
            try: 
                result = json.loads(content + "}")
            except: 
                raise Exception(f"多模态模型输出JSON破损: {str(e)}\n原始内容: {content[:150]}...")

        return self._执行规则后处理(result, 目标语言)

    def _执行规则后处理(self, 数据, 目标语言):
        是否为中文 = "中文" in 目标语言

        def 递归替换(obj):
            if isinstance(obj, dict): return {k: 递归替换(v) for k, v in obj.items()}
            elif isinstance(obj, list): return [递归替换(i) for i in obj]
            elif isinstance(obj, str):
                val = obj
                if 是否为中文:
                    if "掩码" in val: val = val.replace("掩码", "遮罩")
                    if "蒙版" in val: val = val.replace("蒙版", "遮罩")
                    if "normalized" in val.lower(): val = val.replace("Normalized", "标准化").replace("normalized", "标准化")
                    if "latent" in val.lower() and "可选" not in val:
                        if any(x in val for x in ["潜在", "潜空间"]): return "Latent"
                    if val in ["Mask", "mask"]: return "遮罩"
                    if val in ["Image", "image", "图片"]: return "图像"
                return val
            return obj
            
        return 递归替换(数据)

    def 清理显存(self):
        global torch
        if torch:
            self.模型实例 = None
            self.分词器 = None
            self.当前加载模型名 = None
            torch.cuda.empty_cache()
            gc.collect()
            print(">>> 🧹 GPU 显存已清理释放")