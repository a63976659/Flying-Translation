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
        const lineContent = line;
        if (lineContent.trim().length === 0 || lineContent.trim() === '{' || lineContent.trim() === '}') return; // 忽略空行和孤立括号
        
        const key = isCaseSensitive ? lineContent : lineContent.toLowerCase();
        if (lineMap.has(key)) lineMap.get(key).push(index + 1);
        else lineMap.set(key, [index + 1]);
    });
    
    lineMap.forEach((lineNumbers, lineContent) => {
        if (lineNumbers.length > 1) {
            duplicateLines.push({ content: lineContent, lines: lineNumbers, count: lineNumbers.length });
            totalDuplicates += lineNumbers.length;
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