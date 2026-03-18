import os
import server
from .路由网关 import 注册路由

# 1. 挂载前端静态资源目录
# ComfyUI 会自动读取该目录下的 js 文件并注入到网页中
WEB_DIRECTORY = "./前端代码"

# 2. 节点注册（因为我们是纯侧边栏工具，不提供传统的工作流节点，所以留空）
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# 3. 将我们的 API 网关挂载到 ComfyUI 的原生 aiohttp 服务上
print(">>> 🚀 [飞行汉化] 正在初始化侧边栏引擎...")
注册路由(server.PromptServer.instance.app)

# 导出 ComfyUI 需要的标准变量
__all__ = ['WEB_DIRECTORY', 'NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']