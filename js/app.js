/* ===== 模块注册器 — UI 方法 =====
   App 核心（modules/register）已在 data.js 中定义。
   此处追加 UI 相关方法。 */

// ===== 追加 UI 方法到已有的 App 对象 =====
Object.assign(App, {

    // 初始化
    init() {
        this.modules.sort((a, b) => (a.order || 99) - (b.order || 99));
        this.renderSidebar();
        this.renderWelcome();
        this.bindEvents();
    },

    // 回到首页
    goHome() {
        this.currentModule = null;
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('welcome').style.display = '';
        document.getElementById('module-container').style.display = 'none';
        window.scrollTo(0, 0);
    },

    // 渲染侧边栏
    renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        const categories = {};

        this.modules.forEach(mod => {
            const cat = mod.category || '其他';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(mod);
        });

        let html = '';
        for (const [cat, mods] of Object.entries(categories)) {
            html += '<div class="nav-category">' + cat + '</div>';
            mods.forEach(mod => {
                html += '<div class="nav-item" data-module="' + mod.id + '">' +
                    '<span class="nav-icon">' + (mod.icon || '📐') + '</span>' +
                    '<span>' + mod.name + '</span></div>';
            });
        }
        nav.innerHTML = html;
    },

    // 渲染欢迎页快捷入口
    renderWelcome() {
        const container = document.getElementById('welcome-modules');
        let html = '';
        this.modules.forEach(mod => {
            html += '<div class="welcome-module-item" data-module="' + mod.id + '">' +
                '<div class="wm-icon">' + (mod.icon || '📐') + '</div>' +
                '<div class="wm-name">' + mod.name + '</div>' +
                '<div class="wm-desc">' + (mod.shortDesc || '') + '</div></div>';
        });
        container.innerHTML = html;
    },

    // 绑定事件
    bindEvents() {
        // 点击侧边栏头部回到首页
        document.getElementById('sidebar-header').addEventListener('click', () => {
            this.goHome();
        });

        document.getElementById('sidebar-nav').addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (item) { this.switchTo(item.dataset.module); }
        });

        document.getElementById('welcome-modules').addEventListener('click', (e) => {
            const item = e.target.closest('.welcome-module-item');
            if (item) { this.switchTo(item.dataset.module); }
        });

        // 首页按钮
        document.getElementById('btn-home').addEventListener('click', () => {
            this.goHome();
        });
    },

    // 切换模块
    switchTo(moduleId) {
        const mod = this.modules.find(m => m.id === moduleId);
        if (!mod) return;

        this.currentModule = moduleId;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduleId);
        });

        document.getElementById('welcome').style.display = 'none';
        document.getElementById('module-container').style.display = 'block';

        document.getElementById('module-title').textContent = (mod.icon || '') + ' ' + mod.name;
        document.getElementById('module-desc').textContent = mod.description || '';

        const body = document.getElementById('module-body');
        if (mod.fullWidth) {
            body.classList.add('full-width');
        } else {
            body.classList.remove('full-width');
        }

        document.getElementById('module-body').innerHTML = '';
        mod.init(document.getElementById('module-body'));

        window.scrollTo(0, 0);
    },

    // 工具：创建输入卡片
    createInputCard(title, icon) {
        icon = icon || '📋';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="card-title"><span class="card-icon">' + icon + '</span>' + title + '</div>';
        return card;
    },

    // 工具：创建结果卡片
    createResultCard(title, icon) {
        icon = icon || '📊';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="card-title"><span class="card-icon">' + icon + '</span>' + title + '</div>';
        return card;
    },

    // 创建关键结果值
    createResultValue(label, value, unit) {
        unit = unit || '';
        return '<div class="result-section">' +
            '<h4>' + label + '</h4>' +
            '<div class="result-value">' + value + ' <small>' + unit + '</small></div>' +
            '</div>';
    },

    // 创建步骤展示
    createSteps(steps) {
        let html = '<div class="steps"><div class="steps-title">📝 计算步骤</div>';
        steps.forEach((step, i) => {
            html += '<div class="step-item">' +
                '<span class="step-label">步骤 ' + (i + 1) + '：' + step.label + '</span>' +
                step.detail + '</div>';
        });
        html += '</div>';
        return html;
    },

    // 创建数据表格
    createTable(headers, rows, options) {
        options = options || {};
        let html = '<div class="data-table-container"><table class="data-table"><thead><tr>';
        headers.forEach(function(h) { html += '<th>' + h + '</th>'; });
        html += '</tr></thead><tbody>';
        rows.forEach(function(row, i) {
            const isHighlight = options.highlightLast && i === rows.length - 1;
            html += '<tr class="' + (isHighlight ? 'highlight-row' : '') + '">';
            row.forEach(function(cell) {
                html += '<td>' + cell + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
