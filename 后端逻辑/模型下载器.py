import os
import shutil

try:
    from huggingface_hub import snapshot_download
    拥抱脸模块已安装 = True
except ImportError:
    拥抱脸模块已安装 = False

class 模型下载器:
    @staticmethod
    def 获取模型源信息(模型名称):
        """ 解析下载用的 Repo ID """
        if "/" in 模型名称:
            镜像库ID = 模型名称 
            文件夹名 = 模型名称.split("/")[-1]
        else:
            镜像库ID = f"Qwen/{模型名称}"
            文件夹名 = 模型名称
        return 镜像库ID, 文件夹名

    @staticmethod
    def 启动下载(模型名称, 目标基准目录, 强制覆盖=False):
        """ 
        核心下载生成器：可以在网关中被异步调度
        """
        if not 拥抱脸模块已安装:
            yield {"状态": "错误", "信息": "缺少 huggingface_hub 依赖库"}
            return

        镜像库ID, 文件夹名 = 模型下载器.获取模型源信息(模型名称)
        目标目录 = os.path.join(目标基准目录, 文件夹名)

        if 强制覆盖 and os.path.exists(目标目录):
            yield {"状态": "进度", "信息": f"正在清理旧的破损文件..."}
            shutil.rmtree(目标目录)

        yield {"状态": "进度", "信息": f"准备连接镜像站下载: {镜像库ID}..."}
        
        # 强制使用国内高速镜像网络
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

        try:
            # 此处调用阻塞的高速下载 API，实际在网关中应放在 asyncio.to_thread 里运行
            snapshot_download(
                repo_id=镜像库ID,
                local_dir=目标目录,
                local_dir_use_symlinks=False,
                resume_download=True,
                max_workers=8
            )
            yield {"状态": "完成", "信息": "模型下载成功！"}
        except Exception as e:
            错误详情 = str(e)
            if "401" in 错误详情:
                yield {"状态": "错误", "信息": "该模型需要 HuggingFace Token 权限。"}
            else:
                yield {"状态": "错误", "信息": f"下载失败: {错误详情}"}