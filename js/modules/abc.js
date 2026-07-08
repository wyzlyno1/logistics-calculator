/* ===== ABC 分类分析模块 ===== */
App.register({
    id: 'abc',
    name: 'ABC 分类分析',
    icon: '📊',
    category: '库存管理',
    order: 4,
    shortDesc: 'ABC分类 + 帕累托图',
    description: '按年消耗金额对库存物品进行 ABC 分类，自动绘制帕累托图。支持自定义分类阈值。',
    fullWidth: true,

    sampleData: [
        { name: 'SKU-001', demand: 12000, cost: 50 },
        { name: 'SKU-002', demand: 8000, cost: 120 },
        { name: 'SKU-003', demand: 25000, cost: 8 },
        { name: 'SKU-004', demand: 3000, cost: 200 },
        { name: 'SKU-005', demand: 15000, cost: 15 },
        { name: 'SKU-006', demand: 5000, cost: 80 },
        { name: 'SKU-007', demand: 40000, cost: 3 },
        { name: 'SKU-008', demand: 6000, cost: 45 },
        { name: 'SKU-009', demand: 2000, cost: 300 },
        { name: 'SKU-010', demand: 10000, cost: 25 },
        { name: 'SKU-011', demand: 18000, cost: 10 },
        { name: 'SKU-012', demand: 800, cost: 500 },
        { name: 'SKU-013', demand: 22000, cost: 6 },
        { name: 'SKU-014', demand: 9000, cost: 35 },
        { name: 'SKU-015', demand: 1500, cost: 150 },
    ],

    init(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>物品数据</div>
                    <div style="margin-bottom:12px;">
                        <button class="btn btn-secondary btn-sm" onclick="ABCModule.addRow()">+ 添加行</button>
                        <button class="btn btn-secondary btn-sm" onclick="ABCModule.loadSample()">📥 加载示例</button>
                        <button class="btn btn-secondary btn-sm" onclick="ABCModule.clearTable()">清空</button>
                    </div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>物品名称</th>
                                    <th>年需求量</th>
                                    <th>单价(元)</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="abc-table-body">
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
                        <div class="form-group">
                            <label>A 类占比%</label>
                            <input type="number" id="abc-a-pct" value="70" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>B 类占比%</label>
                            <input type="number" id="abc-b-pct" value="20" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>C 类占比%</label>
                            <input type="number" id="abc-c-pct" value="10" min="0" max="100" readonly style="background:var(--bg);">
                        </div>
                    </div>
                    <p style="font-size:11px;color:var(--text-muted);">默认：A类累计占70%，B类占20%，C类占10%</p>
                    <button class="btn btn-primary btn-block" onclick="ABCModule.calculate()">计算并分类</button>
                </div>
                <div id="abc-result"></div>
            </div>
            <div id="abc-chart-area" style="margin-top:24px;"></div>
        `;

        this.populateTable(this.sampleData);
    },

    populateTable(data) {
        const tbody = document.getElementById('abc-table-body');
        tbody.innerHTML = '';
        data.forEach(row => this.addRow(row));
    },

    addRow(data = {}) {
        const tbody = document.getElementById('abc-table-body');
        if (!tbody) return;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" value="${data.name || ''}" placeholder="物品名称"></td>
            <td><input type="number" value="${data.demand !== undefined ? data.demand : ''}" step="any" placeholder="0"></td>
            <td><input type="number" value="${data.cost !== undefined ? data.cost : ''}" step="any" placeholder="0"></td>
            <td><button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove()" style="color:var(--error);">删除</button></td>
        `;
        tbody.appendChild(row);
    },

    loadSample() {
        this.populateTable(this.sampleData);
    },

    clearTable() {
        document.getElementById('abc-table-body').innerHTML = '';
        document.getElementById('abc-result').innerHTML = '';
        document.getElementById('abc-chart-area').innerHTML = '';
    },

    readTable() {
        const tbody = document.getElementById('abc-table-body');
        const rows = tbody.querySelectorAll('tr');
        const items = [];
        rows.forEach((row, i) => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value || `物品${i + 1}`;
            const demand = parseNum(inputs[1].value);
            const cost = parseNum(inputs[2].value);
            if (!isNaN(demand) && !isNaN(cost) && demand > 0 && cost > 0) {
                items.push({ name, demand, cost, value: demand * cost });
            }
        });
        return items;
    },

    calculate() {
        let items = this.readTable();
        const resultDiv = document.getElementById('abc-result');
        const chartArea = document.getElementById('abc-chart-area');

        if (items.length < 3) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请至少输入 3 个有效物品（名称、需求量和单价均需填写）</div>';
            return;
        }

        // 按年消耗金额降序排列
        items.sort((a, b) => b.value - a.value);

        const totalValue = items.reduce((s, it) => s + it.value, 0);

        // 计算累计占比
        let cumPct = 0;
        items.forEach((it, i) => {
            it.pct = (it.value / totalValue) * 100;
            cumPct += it.pct;
            it.cumPct = cumPct;
            it.rank = i + 1;
        });

        // 分类阈值
        const aThreshold = parseFloat(document.getElementById('abc-a-pct').value) || 70;
        const bThreshold = parseFloat(document.getElementById('abc-b-pct').value) || 20;

        // 按照值从大到小，决定分类
        // 按累计占比：累计占比 ≤ aThreshold → A类，≤ aThreshold + bThreshold → B类，其余 → C类
        // 但要确保按物品数量也合理
        items.forEach(it => {
            if (it.cumPct - it.pct < aThreshold) {
                // 该物品的累计占比起点 < A阈值 → 包含在A类中
                it.cls = 'A';
            } else if (it.cumPct - it.pct < aThreshold + bThreshold) {
                it.cls = 'B';
            } else {
                it.cls = 'C';
            }
        });

        // 统计
        const aItems = items.filter(it => it.cls === 'A');
        const bItems = items.filter(it => it.cls === 'B');
        const cItems = items.filter(it => it.cls === 'C');

        const aValueSum = aItems.reduce((s, it) => s + it.value, 0);
        const bValueSum = bItems.reduce((s, it) => s + it.value, 0);
        const cValueSum = cItems.reduce((s, it) => s + it.value, 0);

        // ===== 结果展示 =====
        let html = App.createResultCard('分类汇总', '📊');
        html += `<div class="result-grid">`;
        html += this._classSummary('A 类', aItems.length, aValueSum, totalValue, 'var(--error)', '#fef2f2');
        html += this._classSummary('B 类', bItems.length, bValueSum, totalValue, 'var(--warning)', '#fffbeb');
        html += this._classSummary('C 类', cItems.length, cValueSum, totalValue, 'var(--success)', '#ecfdf5');
        html += `</div>`;
        html += `</div>`;

        // 详细表
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-title"><span class="card-icon">📋</span>物品排名明细</div>';
        const detailRows = items.map(it => [
            it.rank,
            it.name,
            fmt(it.demand, 0),
            fmt(it.cost),
            fmt(it.value),
            fmt(it.pct, 1) + '%',
            fmt(it.cumPct, 1) + '%',
            `<span style="font-weight:700; color:${it.cls==='A'?'var(--error)':it.cls==='B'?'var(--warning)':'var(--success)'};">${it.cls}</span>`
        ]);
        html += App.createTable(
            ['排名', '名称', '年需求量', '单价', '年消耗金额', '占比', '累计占比', '分类'],
            detailRows
        );
        html += '</div>';

        resultDiv.innerHTML = html;

        // ===== 绘制帕累托图 =====
        try {
            this.drawParetoChart(items, chartArea);
        } catch (e) {
            chartArea.innerHTML = '<div class="alert alert-warning" style="margin-top:16px;">⚠️ 图表绘制失败：' + e.message + '。数据表格正常可用。</div>';
            console.error('Pareto chart error:', e);
        }
    },

    _classSummary(label, count, valueSum, totalValue, color, bgColor) {
        return `
            <div class="result-item" style="background:${bgColor}; border-left:3px solid ${color};">
                <div class="ri-label">${label}</div>
                <div class="ri-value" style="color:${color};">${count} <small>种</small></div>
                <div style="font-size:12px; color:var(--text-secondary);">
                    金额：${fmt(valueSum)} 元 | 占比：${fmt((valueSum/totalValue)*100, 1)}%
                </div>
            </div>`;
    },

    drawParetoChart(items, container) {
        const totalValue = items.reduce((s, it) => s + it.value, 0);

        container.innerHTML = `
            <div class="card">
                <div class="card-title"><span class="card-icon">📈</span>帕累托图</div>
                <div class="chart-container">
                    <canvas id="pareto-canvas"></canvas>
                </div>
            </div>
        `;

        const canvas = document.getElementById('pareto-canvas');
        const ctx = canvas.getContext('2d');

        // Canvas 尺寸
        const dpr = window.devicePixelRatio || 1;
        const width = container.offsetWidth - 48;
        const height = 320;

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // 边距
        const margin = { top: 20, right: 60, bottom: 60, left: 80 };
        const chartW = width - margin.left - margin.right;
        const chartH = height - margin.top - margin.bottom;

        // 清空
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // 柱宽
        const barGap = Math.max(2, chartW / items.length * 0.3);
        const barW = (chartW - barGap * (items.length + 1)) / items.length;

        // Y轴刻度（左轴：金额）
        const maxValue = Math.max(...items.map(it => it.value));
        const yMax = maxValue * 1.15;

        // 辅助函数
        const xPos = (i) => margin.left + barGap + i * (barW + barGap);
        const yPos = (val) => margin.top + chartH - (val / yMax) * chartH;
        const yPctPos = (pct) => margin.top + chartH - (pct / 100) * chartH;

        // 绘制柱子
        items.forEach((it, i) => {
            const x = xPos(i);
            const h = (it.value / yMax) * chartH;
            const y = margin.top + chartH - h;

            // 颜色
            let color;
            if (it.cls === 'A') color = '#ef4444';
            else if (it.cls === 'B') color = '#f59e0b';
            else color = '#10b981';

            ctx.fillStyle = color;
            ctx.fillRect(x, y, barW, h);

            // 柱顶标签（前10个或间隔显示）
            if (i < 10 || i % Math.ceil(items.length / 8) === 0) {
                ctx.fillStyle = '#64748b';
                ctx.font = '10px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(fmt(it.value, 0), x + barW / 2, y - 4);
            }
        });

        // 绘制累计百分比折线
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        items.forEach((it, i) => {
            const x = xPos(i) + barW / 2;
            const y = yPctPos(it.cumPct);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 百分比数据点
        items.forEach((it, i) => {
            const x = xPos(i) + barW / 2;
            const y = yPctPos(it.cumPct);

            ctx.fillStyle = '#2563eb';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // 左右Y轴
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartH);
        ctx.lineTo(margin.left + chartW, margin.top + chartH);
        ctx.stroke();

        // 左Y轴标签
        ctx.fillStyle = '#64748b';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const val = (yMax / 5) * i;
            const y = yPos(val);
            ctx.fillText(fmt(val, 0), margin.left - 8, y + 4);
            // 网格线
            ctx.strokeStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + chartW, y);
            ctx.stroke();
        }

        // 右Y轴标签（百分比）
        ctx.fillStyle = '#2563eb';
        ctx.textAlign = 'left';
        for (let i = 0; i <= 5; i++) {
            const pct = i * 20;
            const y = yPctPos(pct);
            ctx.fillText(pct + '%', margin.left + chartW + 8, y + 4);
        }

        // A/B 分类阈值线
        const aItems = items.filter(it => it.cls === 'A');
        if (aItems.length > 0) {
            const aX = xPos(aItems.length - 1) + barW;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(aX, margin.top);
            ctx.lineTo(aX, margin.top + chartH);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.fillText('A类', aX - (barW + barGap) / 2, margin.top + chartH + 16);
        }

        const bItems = items.filter(it => it.cls === 'A' || it.cls === 'B');
        if (bItems.length > aItems.length) {
            const bX = xPos(bItems.length - 1) + barW;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(bX, margin.top);
            ctx.lineTo(bX, margin.top + chartH);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.fillText('B类', bX - (barW + barGap) / 2, margin.top + chartH + 16);
        }

        // C 类标签
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.fillText('C类', margin.left + chartW - 20, margin.top + chartH + 16);

        // X轴标签（显示前几个和最后几个）
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        const labelInterval = Math.max(1, Math.floor(items.length / 10));
        items.forEach((it, i) => {
            if (i % labelInterval === 0 || i === items.length - 1) {
                ctx.save();
                ctx.translate(xPos(i) + barW / 2, margin.top + chartH + 14);
                ctx.rotate(-0.5); // 斜体显示
                ctx.fillText(it.name, 0, 0);
                ctx.restore();
            }
        });

        // 图例
        const legendY = margin.top + chartH + 40;
        ctx.font = '11px -apple-system, sans-serif';
        const legend = [
            { label: '年消耗金额 (柱)', color: '#ef4444', x: margin.left },
            { label: '累计占比 (线)', color: '#2563eb', x: margin.left + 200 },
        ];
        legend.forEach(l => {
            ctx.fillStyle = l.color;
            ctx.fillRect(l.x, legendY - 8, 14, 14);
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'left';
            ctx.fillText(l.label, l.x + 20, legendY + 4);
        });
    }
});

window.ABCModule = App.modules.find(m => m.id === 'abc');
