/* ===== 共享数据 & 模块注册器 ===== */

// ===== App 核心（必须在模块文件之前定义，让模块能注册进来）=====
const App = {
    modules: [],
    currentModule: null,

    register(module) {
        this.modules.push(module);
    },
};

// 标准正态分布 Z 值表（常用服务水平）
const Z_TABLE = {
    // 服务水平%: Z值
    50.00: 0.000,
    60.00: 0.253,
    70.00: 0.524,
    75.00: 0.674,
    80.00: 0.842,
    84.13: 1.000,
    85.00: 1.036,
    90.00: 1.282,
    91.00: 1.341,
    92.00: 1.405,
    93.00: 1.476,
    94.00: 1.555,
    95.00: 1.645,
    96.00: 1.751,
    97.00: 1.881,
    97.50: 1.960,
    98.00: 2.054,
    99.00: 2.326,
    99.50: 2.576,
    99.87: 3.000,
    99.90: 3.090,
    99.99: 3.719
};

// 常用服务水平列表（用于下拉框）
const COMMON_SERVICE_LEVELS = [
    { value: 90, label: '90%' },
    { value: 95, label: '95%' },
    { value: 97, label: '97%' },
    { value: 98, label: '98%' },
    { value: 99, label: '99%' },
    { value: 99.5, label: '99.5%' }
];

// 获取 Z 值（线性插值）
function getZValue(serviceLevel) {
    const sl = serviceLevel / 100; // 转成小数
    const keys = Object.keys(Z_TABLE).map(Number).sort((a, b) => a - b);

    // 精确匹配
    if (Z_TABLE[sl * 100] !== undefined) {
        return Z_TABLE[sl * 100];
    }

    // 线性插值
    for (let i = 0; i < keys.length - 1; i++) {
        if (sl * 100 > keys[i] && sl * 100 < keys[i + 1]) {
            const t = (sl * 100 - keys[i]) / (keys[i + 1] - keys[i]);
            return Z_TABLE[keys[i]] + t * (Z_TABLE[keys[i + 1]] - Z_TABLE[keys[i]]);
        }
    }

    return null; // 超出范围
}

// 数值格式化
function fmt(num, decimals = 2) {
    if (num === Infinity || num === -Infinity || isNaN(num)) return '—';
    return Number(num).toFixed(decimals);
}

// 解析数字（处理中文逗号等）
function parseNum(str) {
    if (typeof str === 'number') return str;
    if (!str) return NaN;
    return parseFloat(str.replace(/[,，]/g, '').trim());
}
