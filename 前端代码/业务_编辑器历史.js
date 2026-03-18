// ==========================================
// 模块：代码编辑器历史记录接口 (纯网络层)
// ==========================================

export async function 引擎_读取历史记录() {
    try {
        const 响应 = await fetch('/flying_trans/api/history');
        return await 响应.json();
    } catch (e) {
        return null;
    }
}

export async function 引擎_同步历史记录(活跃记录数组) {
    try {
        await fetch('/flying_trans/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: 活跃记录数组 })
        });
    } catch (e) {
        console.warn("历史记录云端同步失败", e);
    }
}