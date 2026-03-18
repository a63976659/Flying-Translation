import ast

class 节点解析器(ast.NodeVisitor):
    """ 
    抽象语法树 (AST) 解析器：负责从 Python 代码中提取节点信息 
    策略：优先匹配旧版 (INPUT_TYPES)，匹配失败则尝试 V3 新版 (define_schema)
    """
    def __init__(self):
        self.解析结果 = {}

    def visit_ClassDef(self, 类节点):
        节点信息 = { 
            "title": 类节点.name, 
            "inputs": {}, 
            "widgets": {}, 
            "outputs": {}, 
            "description": "",
            "internal_id": None 
        }
        找到旧版格式 = False
        找到新版格式 = False
        
        # 优化点 1：提取类文档字符串 (Docstring) 作为默认的描述
        docstring = ast.get_docstring(类节点)
        if docstring:
            节点信息['description'] = docstring.strip()
        
        for 语句 in 类节点.body:
            if isinstance(语句, ast.Assign):
                for 目标 in 语句.targets:
                    if isinstance(目标, ast.Name):
                        if 目标.id in ['TITLE', 'xTITLE'] and isinstance(语句.value, ast.Constant):
                            节点信息['title'] = 语句.value.value
                        # 优化点 2：提取真实的 DESCRIPTION 变量，覆盖 Docstring
                        if 目标.id in ['DESCRIPTION', 'xDESCRIPTION'] and isinstance(语句.value, ast.Constant):
                            节点信息['description'] = 语句.value.value
                        # (去除了之前错误抓取 CATEGORY 作为描述的代码)

            if isinstance(语句, ast.FunctionDef) or isinstance(语句, ast.AsyncFunctionDef):
                if 语句.name == 'NAME':
                    for 子语句 in 语句.body:
                        if isinstance(子语句, ast.Return) and isinstance(子语句.value, ast.Constant):
                            节点信息['title'] = 子语句.value.value

                if 语句.name == 'INPUT_TYPES':
                    self._解析旧版输入类型(语句, 节点信息)
                    找到旧版格式 = True
                
                elif 语句.name == 'define_schema':
                    self._解析新版架构(语句, 节点信息)
                    找到新版格式 = True

        self._提取输出名称(类节点, 节点信息)

        if 找到旧版格式 or 找到新版格式:
            if not 节点信息.get('title'): 
                节点信息['title'] = 类节点.name
            
            节点键名 = 节点信息.get('internal_id') if 节点信息.get('internal_id') else 类节点.name
            
            if 'internal_id' in 节点信息:
                del 节点信息['internal_id']
                
            self.解析结果[节点键名] = 节点信息
        
        self.generic_visit(类节点)

    def _提取输出名称(self, 类节点, 节点信息):
        for 语句 in 类节点.body:
            if isinstance(语句, ast.Assign):
                for 目标 in 语句.targets:
                    if isinstance(目标, ast.Name) and 目标.id == 'RETURN_NAMES':
                        if isinstance(语句.value, ast.Tuple) or isinstance(语句.value, ast.List):
                            for 元素 in 语句.value.elts:
                                if isinstance(元素, ast.Constant):
                                    节点信息['outputs'][元素.value] = 元素.value

    def _解析旧版输入类型(self, 函数节点, 节点信息):
        try:
            本地字典 = {}
            for 语句 in 函数节点.body:
                if isinstance(语句, ast.Assign) and isinstance(语句.value, ast.Dict):
                    for 目标 in 语句.targets:
                        if isinstance(目标, ast.Name):
                            本地字典[目标.id] = 语句.value
                
                if isinstance(语句, ast.Return):
                    if isinstance(语句.value, ast.Dict):
                        self._从字典节点提取输入(语句.value, 节点信息)
                    elif isinstance(语句.value, ast.Name) and 语句.value.id in 本地字典:
                        self._从字典节点提取输入(本地字典[语句.value.id], 节点信息)
        except: pass

    def _从字典节点提取输入(self, 字典节点, 节点信息):
        控件类型列表 = ["INT", "FLOAT", "STRING", "BOOLEAN"]

        for 键, 值 in zip(字典节点.keys, 字典节点.values):
            if isinstance(键, ast.Constant) and 键.value in ["required", "optional"]:
                if isinstance(值, ast.Dict):
                    for 参数键, 参数值 in zip(值.keys, 值.values):
                        if not isinstance(参数键, ast.Constant): continue
                        
                        参数名称 = 参数键.value
                        分类 = "inputs" 

                        if isinstance(参数值, ast.List):
                            分类 = "widgets" 
                        elif isinstance(参数值, ast.Tuple) and len(参数值.elts) > 0:
                            首元素 = 参数值.elts[0]
                            if isinstance(首元素, ast.Constant) and isinstance(首元素.value, str):
                                类型名 = 首元素.value.upper()
                                if 类型名 in 控件类型列表:
                                    分类 = "widgets"
                                if "seed" in 参数名称.lower() and 类型名 == "INT":
                                    分类 = "widgets"

                        节点信息[分类][参数名称] = 参数名称

    def _解析新版架构(self, 函数节点, 节点信息):
        try:
            for 语句 in 函数节点.body:
                if isinstance(语句, ast.Return):
                    if self._判断是否为架构调用(语句.value):
                        self._从调用中提取新版输入(语句.value, 节点信息)
        except: pass

    def _判断是否为架构调用(self, 节点):
        if not isinstance(节点, ast.Call): return False
        函数 = 节点.func
        if isinstance(函数, ast.Attribute) and 函数.attr == 'Schema': return True
        if isinstance(函数, ast.Name) and 函数.id == 'Schema': return True
        return False

    def _从调用中提取新版输入(self, 调用节点, 节点信息):
        新版控件类型 = ["Int", "Float", "String", "Boolean", "Combo", "Number"]

        for 关键字 in 调用节点.keywords:
            if 关键字.arg == 'inputs':
                if isinstance(关键字.value, ast.List):
                    for 元素 in 关键字.value.elts:
                        if isinstance(元素, ast.Call) and 元素.args:
                            首参 = 元素.args[0]
                            if isinstance(首参, ast.Constant):
                                参数名称 = 首参.value
                                分类 = "inputs"
                                if isinstance(元素.func, ast.Attribute) and 元素.func.attr == 'Input':
                                    if isinstance(元素.func.value, ast.Attribute):
                                        类型名 = 元素.func.value.attr
                                        if 类型名 in 新版控件类型:
                                            分类 = "widgets"
                                节点信息[分类][参数名称] = 参数名称
            
            elif 关键字.arg == 'description':
                if isinstance(关键字.value, ast.Constant):
                    节点信息['description'] = 关键字.value.value
            
            elif 关键字.arg == 'node_id':
                if isinstance(关键字.value, ast.Constant):
                    节点信息['internal_id'] = 关键字.value.value