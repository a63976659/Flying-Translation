import os
import shutil
import json

def 确定缓存与输出路径(源码目录绝对路径, 插件根目录):
    """ 为翻译过程生成专用的缓存切片目录 """
    文件夹名称 = os.path.basename(源码目录绝对路径.rstrip(os.sep))
    缓存目录 = os.path.join(插件根目录, "缓存空间", 文件夹名称)
    
    if not os.path.exists(缓存目录): 
        os.makedirs(缓存目录)

    # 尝试寻找官方翻译标准库目录
    父级目录 = os.path.dirname(源码目录绝对路径)
    标准汉化目录 = os.path.join(父级目录, "ComfyUI-Chinese-Translation", "zh-CN", "Nodes")

    if os.path.exists(标准汉化目录):
        最终输出目录 = 标准汉化目录
    else:
        最终输出目录 = os.path.join(插件根目录, "输出成品")
        if not os.path.exists(最终输出目录): 
            os.makedirs(最终输出目录)

    最终文件路径 = os.path.join(最终输出目录, f"{文件夹名称}.json")
    return 缓存目录, 最终文件路径

def 合并分段缓存为成品(缓存目录, 最终文件路径):
    """ 将大模型分块翻译生成的多个 part_X.json 合并为一个成品 """
    合并数据 = {}
    if not os.path.exists(缓存目录): 
        return
    
    文件列表 = [f for f in os.listdir(缓存目录) if f.startswith("part_") and f.endswith(".json")]
    文件列表.sort(key=lambda x: int(x.split('_')[1].split('.')[0]))
    
    for 文件名 in 文件列表:
        try:
            with open(os.path.join(缓存目录, 文件名), "r", encoding="utf-8") as f:
                合并数据.update(json.load(f))
        except: pass
        
    with open(最终文件路径, "w", encoding="utf-8") as f:
        json.dump(合并数据, f, indent=4, ensure_ascii=False)

def 清理所有临时缓存(插件根目录):
    缓存根目录 = os.path.join(插件根目录, "缓存空间")
    if os.path.exists(缓存根目录):
        try:
            shutil.rmtree(缓存根目录)
            os.makedirs(缓存根目录)
            return True, "缓存已清理完毕！"
        except Exception as e:
            return False, str(e)
    return True, "无须清理。"