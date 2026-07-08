/* ===== 牛鞭效应演示器 ===== */
App.register({
    id: 'bullwhip',
    name: '牛鞭效应演示',
    icon: '🐂',
    category: '需求管理',
    order: 10,
    shortDesc: '多级供应链需求放大模拟',
    description: '模拟四级供应链（零售商→批发商→分销商→制造商），直观展示需求信息逐级放大的牛鞭效应。可调节需求波动、提前期、预测方法等参数。',
    fullWidth: true,

    init(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:340px 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">⚙️</span>模拟参数</div>
                    <div class="form-group">
                        <label>模拟周期数</label>
                        <input type="number" id="bw-periods" value="30" min="10" max="200" step="1">
                    </div>
                    <div class="form-group">
                        <label>客户需求均值 d̄ <span class="label-desc">(件/周期)</span></label>
                        <input type="number" id="bw-mean" value="100" min="1" step="any">
                    </div>
                    <div class="form-group">
                        <label>需求标准差 σ <span class="label-desc">(越大波动越大)</span></label>
                        <input type="number" id="bw-sigma" value="20" min="0" step="any">
                    </div>
                    <div class="form-group">
                        <label>各级提前期 L <span class="label-desc">(周期)</span></label>
                        <input type="number" id="bw-leadtime" value="2" min="1" max="10" step="1">
                    </div>
                    <div class="form-group">
                        <label>安全系数 Z</label>
                        <input type="number" id="bw-z" value="1.645" min="0" max="4" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>移动平均期数 <span class="label-desc">(预测用)</span></label>
                        <input type="number" id="bw-ma-n" value="5" min="2" max="20" step="1">
                    </div>
                    <div class="form-group">
                        <label>初始库存 <span class="label-desc">(件)</span></label>
                        <input type="number" id="bw-init-stock" value="500" min="0" step="any">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="BullwhipModule.runSimulation()">▶ 运行模拟</button>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
                        模拟逻辑：每级使用移动平均法预测下游需求，按 order-up-to 策略订货。<br>
                        牛鞭比 = Var(本级订单) / Var(客户需求)
                    </div>
                </div>
                <div id="bw-result"></div>
            </div>
            <div id="bw-chart-area" style="margin-top:20px;"></div>
        `;
    },

    runSimulation() {
        const T = Math.min(200, Math.max(10, parseInt(document.getElementById('bw-periods').value) || 30));
        const mean = parseNum(document.getElementById('bw-mean').value) || 100;
        const sigma = parseNum(document.getElementById('bw-sigma').value) || 20;
        const L = Math.min(10, Math.max(1, parseInt(document.getElementById('bw-leadtime').value) || 2));
        const Z = parseNum(document.getElementById('bw-z').value) || 1.645;
        const nMA = Math.min(20, Math.max(2, parseInt(document.getElementById('bw-ma-n').value) || 5));
        const initStock = parseNum(document.getElementById('bw-init-stock').value) || 500;

        const resultDiv = document.getElementById('bw-result');
        const chartArea = document.getElementById('bw-chart-area');

        // 生成客户需求（正态分布）
        const demand = [];
        for (let t = 0; t < T; t++) {
            // Box-Muller 方法生成正态分布随机数
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
            demand.push(Math.max(10, Math.round(mean + sigma * z)));
        }

        // 四级供应链：[零售商, 批发商, 分销商, 制造商]
        const names = ['零售商 Retailer', '批发商 Wholesaler', '分销商 Distributor', '制造商 Manufacturer'];
        const echelons = 4;

        // 状态追踪
        const orders = Array.from({ length: echelons }, () => []);   // 每级每期的订货量
        const inventory = Array.from({ length: echelons }, () => []);  // 每级每期的库存
        const backorder = Array.from({ length: echelons }, () => []);  // 缺货量
        const inTransit = Array.from({ length: echelons }, () => Array(T).fill(0)); // 在途库存

        // 初始状态
        const stock = Array(echelons).fill(initStock);     // 当前库存
        const bo = Array(echelons).fill(0);                 // 当期缺货

        for (let t = 0; t < T; t++) {
            for (let e = 0; e < echelons; e++) {
                // 1. 到货（之前订货在 L 期后到达）
                if (t >= L && orders[e][t - L] !== undefined) {
                    stock[e] += orders[e][t - L];
                }

                // 2. 满足下游需求
                let downstreamDemand;
                if (e === 0) {
                    downstreamDemand = demand[t]; // 零售商面对客户需求
                } else {
                    downstreamDemand = orders[e - 1][t] !== undefined ? orders[e - 1][t] : mean;
                }

                // 先用库存，不足则缺货
                const fulfilled = Math.min(stock[e], downstreamDemand + bo[e]);
                stock[e] -= fulfilled;
                const newBO = downstreamDemand + bo[e] - fulfilled;
                bo[e] = newBO;
                backorder[e].push(newBO);
                inventory[e].push(stock[e]);

                // 3. 预测下游需求（移动平均）
                let forecast;
                if (e === 0) {
                    const hist = demand.slice(Math.max(0, t - nMA + 1), t + 1);
                    forecast = hist.reduce((s, v) => s + v, 0) / hist.length;
                } else {
                    const hist = orders[e - 1].slice(Math.max(0, t - nMA + 1), t + 1);
                    if (hist.length === 0) forecast = mean;
                    else forecast = hist.reduce((s, v) => s + v, 0) / hist.length;
                }

                // 4. Order-up-to 策略
                const orderUpTo = forecast * (L + 1) + Z * sigma * Math.sqrt(L + 1);
                const orderQty = Math.max(0, Math.round(orderUpTo - stock[e] - (orders[e][t - 1] || 0) + bo[e]));
                orders[e].push(orderQty);
            }
        }

        // 计算牛鞭比
        const demandVar = this._variance(demand);
        const bullwhipRatios = [];
        for (let e = 0; e < echelons; e++) {
            const orderVar = this._variance(orders[e]);
            bullwhipRatios.push(demandVar > 0 ? orderVar / demandVar : 0);
        }

        // ===== 结果展示 =====
        let html = App.createResultCard('模拟结果', '📊');
        html += '<div class="result-grid">';

        // 牛鞭比卡片
        const ratioColors = ['var(--primary)', '#ef4444', '#f59e0b', '#10b981'];
        bullwhipRatios.forEach((ratio, e) => {
            html += '<div class="result-item" style="border-left:3px solid ' + ratioColors[e] + ';">' +
                '<div class="ri-label">' + names[e] + '</div>' +
                '<div class="ri-value">' + fmt(ratio, 2) + '×</div>' +
                '<div style="font-size:11px;color:var(--text-secondary);">牛鞭比</div>' +
                '</div>';
        });
        html += '</div>';

        // 汇总统计
        html += '<div class="result-grid" style="margin-top:12px;">';
        html += '<div class="result-item"><div class="ri-label">客户需求方差</div><div class="ri-value">' + fmt(demandVar, 0) + '</div></div>';
        html += '<div class="result-item"><div class="ri-label">零售商订单方差</div><div class="ri-value">' + fmt(this._variance(orders[0]), 0) + '</div></div>';
        html += '<div class="result-item"><div class="ri-label">制造商订单方差</div><div class="ri-value">' + fmt(this._variance(orders[3]), 0) + '</div></div>';
        html += '<div class="result-item"><div class="ri-label">放大倍数</div><div class="ri-value highlight">' + fmt(bullwhipRatios[3], 2) + '×</div></div>';
        html += '</div>';

        // 牛鞭效应强度评估
        const avgRatio = bullwhipRatios.reduce((a, b) => a + b, 0) / echelons;
        let assessment;
        if (avgRatio < 1.3) assessment = '🟢 牛鞭效应轻微——供应链协调良好';
        else if (avgRatio < 2.5) assessment = '🟡 牛鞭效应明显——建议信息共享或缩短提前期';
        else assessment = '🔴 牛鞭效应严重——需求被显著放大，上游面临巨大库存压力';
        html += '<div class="alert alert-' + (avgRatio < 1.3 ? 'success' : avgRatio < 2.5 ? 'warning' : 'error') + '" style="margin-top:12px;">' +
            assessment + '</div>';

        html += '</div>'; // close result card

        resultDiv.innerHTML = html;

        // ===== 需求曲线图 =====
        this._drawBullwhipChart(demand, orders, names, chartArea);
    },

    _variance(arr) {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length;
    },

    _drawBullwhipChart(demand, orders, names, chartArea) {
        chartArea.innerHTML = '<div class="card"><div class="card-title"><span class="card-icon">📈</span>' +
            '需求波动对比（客户需求 vs 各级订单量）</div>' +
            '<div class="chart-container"><canvas id="bw-canvas"></canvas></div></div>';

        const canvas = document.getElementById('bw-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = chartArea.offsetWidth - 48;
        const height = 360;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const margin = { top: 20, right: 40, bottom: 50, left: 70 };
        const cw = width - margin.left - margin.right;
        const ch = height - margin.top - margin.bottom;
        const T = demand.length;

        // Y轴范围
        const allValues = [...demand];
        for (let e = 0; e < 4; e++) allValues.push(...orders[e]);
        const yMax = Math.max(...allValues) * 1.2;
        const yMin = Math.min(...allValues) * 0.8;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const yPos = (val) => margin.top + ch - ((val - yMin) / (yMax - yMin)) * ch;
        const xPos = (t) => margin.left + (t / (T - 1)) * cw;

        // 网格
        for (let i = 0; i <= 5; i++) {
            const y = margin.top + ch * i / 5;
            ctx.strokeStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + cw, y);
            ctx.stroke();
        }

        // 坐标轴
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + ch);
        ctx.lineTo(margin.left + cw, margin.top + ch);
        ctx.stroke();

        // Y轴标签
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = margin.top + ch * i / 5;
            const val = yMax - (yMax - yMin) * i / 5;
            ctx.fillText(fmt(val, 0), margin.left - 8, y + 4);
        }

        // X轴标签
        ctx.textAlign = 'center';
        const step = Math.max(1, Math.floor(T / 8));
        for (let t = 0; t < T; t += step) {
            const x = xPos(t);
            ctx.fillText((t + 1).toString(), x, margin.top + ch + 16);
        }
        ctx.fillText('周期', margin.left + cw / 2, margin.top + ch + 36);

        // 数据集：依次画客户需求(粗灰) + 4级订单
        const datasets = [
            { data: demand, color: '#94a3b8', width: 3, dash: [6, 3] },
            { data: orders[0], color: '#2563eb', width: 2, dash: [] },
            { data: orders[1], color: '#ef4444', width: 2, dash: [] },
            { data: orders[2], color: '#f59e0b', width: 2, dash: [] },
            { data: orders[3], color: '#10b981', width: 2, dash: [] },
        ];
        const legendLabels = ['客户需求', ...names];

        datasets.forEach((ds, di) => {
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = ds.width;
            if (ds.dash.length > 0) ctx.setLineDash(ds.dash);
            else ctx.setLineDash([]);

            ctx.beginPath();
            for (let t = 0; t < T; t++) {
                const x = xPos(t);
                const y = yPos(ds.data[t]);
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // 图例
            const ly = margin.top + 16 * di;
            ctx.strokeStyle = ds.color;
            ctx.lineWidth = ds.width;
            if (ds.dash.length > 0) ctx.setLineDash(ds.dash);
            ctx.beginPath();
            ctx.moveTo(margin.left + cw - 130, ly);
            ctx.lineTo(margin.left + cw - 100, ly);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            const ratio = di === 0 ? '1.00×' : fmt(this._variance(ds.data) / this._variance(demand), 2) + '×';
            ctx.fillText(legendLabels[di] + ' (' + ratio + ')', margin.left + cw - 94, ly + 4);
        });
    }
});

window.BullwhipModule = App.modules.find(m => m.id === 'bullwhip');
