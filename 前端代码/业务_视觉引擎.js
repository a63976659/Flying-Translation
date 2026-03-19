export async function 引擎_智能匹配(纯净词) {
    const 响应 = await fetch('/flying_trans/api/smart_match_plugin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ keyword: 纯净词 }) 
    });
    return await 响应.json();
}

export async function 引擎_视觉解析(算力模式, 目标语言, 模型名称, 图像Base64) {
    const 响应 = await fetch('/flying_trans/api/translate', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            compute_mode: 算力模式, 
            target_language: 目标语言, 
            model_name: 模型名称, 
            image_base64: 图像Base64 
        })
    });
    return await 响应.json();
}

export async function 引擎_扫描主键校准(插件文件夹名, 提取的主键名) {
    const 响应 = await fetch('/flying_trans/api/calibrate_node_key', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ plugin_folder: 插件文件夹名, extracted_key: 提取的主键名 }) 
    });
    return await 响应.json();
}