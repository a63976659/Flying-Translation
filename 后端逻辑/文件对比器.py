import os
import json

class 文件对比器:
    def 提取差异报告(self, 目录A, 目录B, 报告输出路径):
        """ 批量对比文件夹并生成文本差异报告 """
        try:
            文件集A = set([f for f in os.listdir(目录A) if f.endswith('.json')])
            文件集B = set([f for f in os.listdir(目录B) if f.endswith('.json')])

            仅在A中 = list(文件集A - 文件集B)
            仅在B中 = list(文件集B - 文件集A)
            共有文件 = list(文件集A & 文件集B)
            差异文件列表 = []

            for 文件名 in 共有文件:
                路径A = os.path.join(目录A, 文件名)
                路径B = os.path.join(目录B, 文件名)

                大小A = os.path.getsize(路径A)
                大小B = os.path.getsize(路径B)

                if 大小A != 大小B:
                    差异文件列表.append(f"{文件名} (大小不同: {大小A} vs {大小B})")
                else:
                    if not self._比对JSON内容(路径A, 路径B):
                        差异文件列表.append(f"{文件名} (内容不同)")

            with open(报告输出路径, 'w', encoding='utf-8') as 报告文件:
                报告文件.write("=== 飞行汉化：深度差异比对报告 ===\n\n")
                报告文件.write(f"文件夹 A: {目录A}\n")
                报告文件.write(f"文件夹 B: {目录B}\n\n")
                
                报告文件.write(f"--- [仅在 A 存在] ---\n")
                for 项 in sorted(仅在A中): 报告文件.write(f"{项}\n")
                if not 仅在A中: 报告文件.write("(无)\n")
                报告文件.write("\n")

                报告文件.write(f"--- [仅在 B 存在] ---\n")
                for 项 in sorted(仅在B中): 报告文件.write(f"{项}\n")
                if not 仅在B中: 报告文件.write("(无)\n")
                报告文件.write("\n")

                报告文件.write(f"--- [文件冲突内容] ---\n")
                for 项 in sorted(差异文件列表): 报告文件.write(f"{项}\n")
                if not 差异文件列表: 报告文件.write("(无)\n")
            
            return True, 报告输出路径

        except Exception as e:
            return False, str(e)

    def 合并单文件(self, 文件A, 文件B, 输出路径):
        """ 将 文件B 的内容无缝覆盖写入到 文件A 中 """
        try:
            with open(文件A, 'r', encoding='utf-8') as f: 数据A = json.load(f)
            with open(文件B, 'r', encoding='utf-8') as f: 数据B = json.load(f)

            合并后数据 = 数据A.copy()
            合并后数据.update(数据B)

            with open(输出路径, 'w', encoding='utf-8') as f:
                json.dump(合并后数据, f, indent=4, ensure_ascii=False)
            
            return True, 输出路径
        except Exception as e:
            return False, str(e)

    def _比对JSON内容(self, 路径A, 路径B):
        try:
            with open(路径A, 'r', encoding='utf-8') as f: 数据A = json.load(f)
            with open(路径B, 'r', encoding='utf-8') as f: 数据B = json.load(f)
            return 数据A == 数据B
        except:
            return False