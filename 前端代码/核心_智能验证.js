// ==========================================
// 模块：智能JSON验证引擎 (纯逻辑层，无UI依赖)
// ==========================================

export function 智能分析错误位置(error, jsonText) {
    const lines = jsonText.split('\n');
    const errorMessage = error.message;
    
    let lineNumber = 1, columnNumber = 1, actualErrorLine = null, suggestedFix = null, accuracy = "标准";
    
    // 解析原生报错信息中的行号
    const lineMatch = errorMessage.match(/line (\d+)/) || errorMessage.match(/at position (\d+)/);
    if (lineMatch) lineNumber = parseInt(lineMatch[1]);
    
    // 获取当前行和前一行
    const currentLine = lines[lineNumber - 1] || '';
    const prevLine = lines[lineNumber - 2] || '';
    
    // 1. 漏查逗号智能分析 (Missing Comma)
    if (errorMessage.includes('Unexpected token') || errorMessage.includes('Unexpected string') || errorMessage.includes('Expected')) {
        if (currentLine.trim().startsWith('"')) {
            const prevLineTrimmed = prevLine.trim();
            if (prevLineTrimmed.length > 0 && 
                !prevLineTrimmed.endsWith(',') && 
                !prevLineTrimmed.endsWith('{') && 
                !prevLineTrimmed.endsWith('[')) {
                actualErrorLine = lineNumber - 1;
                accuracy = "高 (High)";
                suggestedFix = `在第 ${actualErrorLine} 行末尾缺少逗号 (Missing comma at end of line ${actualErrorLine})`;
                return { reportedLine: lineNumber, actualLine: actualErrorLine, errorMessage, accuracy, suggestedFix, errorType: "missing_comma" };
            }
        }
    }
    
    // 2. 未闭合字符串分析 (Unterminated String)
    if (errorMessage.includes('Unterminated string')) {
        for (let i = lineNumber - 1; i >= 0; i--) {
            const quoteCount = (lines[i].match(/"/g) || []).length;
            if (quoteCount % 2 === 1) { // 奇数个引号
                actualErrorLine = i + 1;
                accuracy = "高 (High)";
                suggestedFix = `第 ${actualErrorLine} 行字符串缺少闭合引号 (Missing closing quote on line ${actualErrorLine})`;
                return { reportedLine: lineNumber, actualLine: actualErrorLine, errorMessage, accuracy, suggestedFix, errorType: "unterminated_string" };
            }
        }
    }
    
    return { reportedLine: lineNumber, actualLine: lineNumber, errorMessage, accuracy: "标准 (Standard)", suggestedFix: null, errorType: "standard" };
}

export function 检测重复行(jsonText, isCaseSensitive = true) {
    const lines = jsonText.split('\n');
    const lineMap = new Map();
    const duplicateLines = [];
    let totalDuplicates = 0;
    
    lines.forEach((line, index) => {
        const lineContent = line.trim();
        // 忽略空行和孤立括号
        if (lineContent.length === 0 || lineContent === '{' || lineContent === '}') return; 
        
        // 【核心修改1】：专门拦截形如 "NodeClass": { 的外层主键行
        const nodeKeyMatch = lineContent.match(/^"([^"]+)"\s*:\s*\{/);
        
        // 如果不是对象起始行，直接跳过
        if (!nodeKeyMatch) return;

        let rawKey = nodeKeyMatch[1];

        // 【核心修改2】：精准剔除 JSON 内部的结构化系统字段！
        // 这样 inputs、widgets、outputs 就再也不会引发误报了
        if (["inputs", "widgets", "outputs"].includes(rawKey.toLowerCase())) {
            return;
        }

        // 提取外层类名，强制转小写并剥离所有下划线与空格用于底层硬核比对
        let compareKey = rawKey.toLowerCase().replace(/[_ ]/g, '');
        
        if (lineMap.has(compareKey)) {
            lineMap.get(compareKey).lines.push(index + 1);
        } else {
            // 记录下这行代码最原始的形态用于高亮反馈
            lineMap.set(compareKey, { original: lineContent, lines: [index + 1] });
        }
    });
    
    lineMap.forEach((data, compareKey) => {
        if (data.lines.length > 1) {
            duplicateLines.push({ content: data.original, lines: data.lines, count: data.lines.length });
            totalDuplicates += data.lines.length;
        }
    });
    
    return { duplicateLines, totalDuplicateGroups: duplicateLines.length, totalDuplicates };
}

export function 快速修复缺失逗号(jsonText, errorAnalysis) {
    if (errorAnalysis.errorType !== "missing_comma") return jsonText;
    const lines = jsonText.split('\n');
    const lineIndex = errorAnalysis.actualLine - 1;
    lines[lineIndex] = lines[lineIndex].replace(/\s*$/, ','); // 在行尾插入逗号
    return lines.join('\n');
}

export function 转义HTML(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}