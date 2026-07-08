/* ===== 选址案例分析器 ===== */
App.register({
    id: 'location-analysis',
    name: '选址案例分析',
    icon: '🏢',
    category: '物流规划',
    order: 6,
    shortDesc: '因素评分法 + 盈亏平衡法',
    description: '综合选址决策工具。因素评分法对多个备选地址进行加权打分排序，盈亏平衡法基于成本结构对比最优选址。与重心法互补。',
    fullWidth: true,

    init(container) {
        container.innerHTML = `
            <div class="sub-tabs">
                <div class="sub-tab active" data-tab="la-factor">因素评分法</div>
                <div class="sub-tab" data-tab="la-breakeven">盈亏平衡法</div>
            </div>
            <div class="sub-tab-content active" id="la-factor"></div>
            <div class="sub-tab-content" id="la-breakeven"></div>
        `;

        this.renderFactorMethod(document.getElementById('la-factor'));
        this.renderBreakevenMethod(document.getElementById('la-breakeven'));

        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    },

    // ==================== 因素评分法 ====================
    renderFactorMethod(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card" style="grid-column:1/-1;">
                    <div class="card-title"><span class="card-icon">📋</span>备选地址与评分因素</div>
                    <div class="form-row" style="margin-bottom:14px;">
                        <div class="form-group">
                            <label>备选地址数</label>
                            <input type="number" id="la-f-locations" value="3" min="2" max="8" step="1">
                        </div>
                        <div class="form-group">
                            <label>评分因素数</label>
                            <input type="number" id="la-f-factors" value="5" min="2" max="10" step="1">
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom:16px;">
                        <button class="btn btn-secondary btn-sm" id="la-f-build">生成矩阵</button>
                        <button class="btn btn-secondary btn-sm" id="la-f-sample">📥 加载示例</button>
                    </div>
                    <div id="la-f-matrix"></div>
                    <button class="btn btn-primary btn-block" style="margin-top:12px;" onclick="LocationModule.calcFactor()">计算评分</button>
                </div>
                <div id="la-f-result" style="grid-column:1/-1;"></div>
            </div>
        `;

        document.getElementById('la-f-build').addEventListener('click', () => this._buildFactorMatrix());
        document.getElementById('la-f-sample').addEventListener('click', () => this._loadFactorSample());
        this._loadFactorSample();
    },

    _loadFactorSample() {
        document.getElementById('la-f-locations').value = 3;
        document.getElementById('la-f-factors').value = 5;
        this._buildFactorMatrix();
        // 填示例数据
        const sampleFactors = ['交通便利性', '劳动力成本', '地价', '市场接近度', '政策优惠'];
        const sampleWeights = [0.25, 0.20, 0.15, 0.25, 0.15];
        const sampleScores = [
            [85, 70, 60, 90, 75],  // 地址A
            [75, 80, 75, 70, 80],  // 地址B
            [65, 90, 85, 60, 65],  // 地址C
        ];
        const locNames = ['地址 A', '地址 B', '地址 C'];

        setTimeout(() => {
            sampleFactors.forEach((f, j) => {
                const el = document.getElementById('la-f-name-' + j);
                if (el) el.value = f;
                const wEl = document.getElementById('la-f-weight-' + j);
                if (wEl) wEl.value = sampleWeights[j];
            });
            sampleScores.forEach((row, i) => {
                const nEl = document.getElementById('la-f-locname-' + i);
                if (nEl) nEl.value = locNames[i];
                row.forEach((score, j) => {
                    const el = document.getElementById('la-f-score-' + i + '-' + j);
                    if (el) el.value = score;
                });
            });
        }, 100);
    },

    _buildFactorMatrix() {
        const nLoc = Math.min(8, Math.max(2, parseInt(document.getElementById('la-f-locations').value) || 3));
        const nFac = Math.min(10, Math.max(2, parseInt(document.getElementById('la-f-factors').value) || 5));
        const container = document.getElementById('la-f-matrix');

        let html = '<div class="data-table-container"><table class="data-table"><thead><tr>';
        html += '<th>评分因素</th><th>权重</th>';
        for (let i = 0; i < nLoc; i++) html += '<th>地址 ' + (i + 1) + '</th>';
        html += '</tr></thead><tbody>';

        for (let j = 0; j < nFac; j++) {
            html += '<tr>';
            html += '<td><input type="text" id="la-f-name-' + j + '" style="width:110px;" placeholder="因素' + (j+1) + '"></td>';
            html += '<td><input type="number" id="la-f-weight-' + j + '" style="width:70px;" step="0.01" min="0" max="1" placeholder="0.20"></td>';
            for (let i = 0; i < nLoc; i++) {
                html += '<td><input type="number" id="la-f-score-' + i + '-' + j + '" style="width:70px;" step="any" placeholder="0-100"></td>';
            }
            html += '</tr>';
        }

        // 地址名行
        html += '<tr style="background:var(--bg);"><td><strong>地址名称</strong></td><td></td>';
        for (let i = 0; i < nLoc; i++) {
            html += '<td><input type="text" id="la-f-locname-' + i + '" style="width:80px;" placeholder="地址' + String.fromCharCode(65+i) + '"></td>';
        }
        html += '</tr>';

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    calcFactor() {
        const nLoc = Math.min(8, Math.max(2, parseInt(document.getElementById('la-f-locations').value) || 3));
        const nFac = Math.min(10, Math.max(2, parseInt(document.getElementById('la-f-factors').value) || 5));
        const resultDiv = document.getElementById('la-f-result');

        // 读取因素名称和权重
        const factors = [];
        const weights = [];
        let weightSum = 0;
        for (let j = 0; j < nFac; j++) {
            const name = document.getElementById('la-f-name-' + j);
            const weight = document.getElementById('la-f-weight-' + j);
            factors.push(name ? (name.value || '因素' + (j+1)) : '因素' + (j+1));
            const w = weight ? (parseNum(weight.value) || 0) : 0;
            weights.push(w);
            weightSum += w;
        }

        if (Math.abs(weightSum) < 1e-10) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请至少为一个因素设置权重大于 0</div>';
            return;
        }
        if (Math.abs(weightSum - 1) > 0.02) {
            resultDiv.innerHTML = '<div class="alert alert-warning">⚠️ 权重之和为 ' + fmt(weightSum) + '，不等于 1。将自动归一化。</div>';
            for (let j = 0; j < nFac; j++) weights[j] /= weightSum;
        }

        // 读取评分和地址名
        const locNames = [];
        const scores = [];
        for (let i = 0; i < nLoc; i++) {
            const nEl = document.getElementById('la-f-locname-' + i);
            locNames.push(nEl ? (nEl.value || '地址 ' + (i+1)) : '地址 ' + (i+1));
            scores[i] = [];
            for (let j = 0; j < nFac; j++) {
                const el = document.getElementById('la-f-score-' + i + '-' + j);
                scores[i][j] = el ? (parseNum(el.value) || 0) : 0;
            }
        }

        // 计算加权总分
        const totals = [];
        for (let i = 0; i < nLoc; i++) {
            let total = 0;
            for (let j = 0; j < nFac; j++) {
                total += scores[i][j] * weights[j];
            }
            totals.push({ index: i, name: locNames[i], total: total });
        }
        totals.sort((a, b) => b.total - a.total);

        // 结果展示
        let html = App.createResultCard('因素评分法结果', '🏆');
        html += App.createResultValue('最优选址', totals[0].name, '得分：' + fmt(totals[0].total, 1));

        html += '<div class="result-grid">';
        totals.forEach((t, rank) => {
            let color = rank === 0 ? 'var(--primary)' : rank === 1 ? 'var(--warning)' : 'var(--text-secondary)';
            html += '<div class="result-item">' +
                '<div class="ri-label">第' + (rank+1) + '名</div>' +
                '<div class="ri-value" style="color:' + color + ';">' + t.name + ' <small>' + fmt(t.total, 1) + '分</small></div>' +
                '</div>';
        });
        html += '</div>';
        html += '</div>';

        // 详细评分表
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-title"><span class="card-icon">📋</span>评分明细</div>';
        const headers = ['因素 (权重)'];
        for (let i = 0; i < nLoc; i++) headers.push(locNames[i]);
        const rows = [];
        for (let j = 0; j < nFac; j++) {
            const row = [factors[j] + ' (' + fmt(weights[j]*100, 0) + '%)'];
            for (let i = 0; i < nLoc; i++) row.push(fmt(scores[i][j], 0));
            rows.push(row);
        }
        rows.push(['<strong>加权总分</strong>'].concat(totals.map(t => '<strong>' + fmt(t.total, 1) + '</strong>')));
        html += App.createTable(headers, rows, { highlightLast: true });
        html += '</div>';

        // 步骤
        const steps = [
            {
                label: '确定评分因素与权重',
                detail: factors.map((f, j) => f + '：权重 = ' + fmt(weights[j]*100, 0) + '%').join('<br>') +
                    '<br>权重之和 = ' + fmt(weights.reduce((a,b)=>a+b,0)*100, 0) + '%'
            },
            {
                label: '对每个地址逐项评分（百分制）',
                detail: '参见下方评分明细表'
            },
            {
                label: '计算加权总分并排序',
                detail: totals.map((t, k) =>
                    '第' + (k+1) + '名：<strong>' + t.name + '</strong> = ' +
                    factors.map((f, j) => fmt(scores[t.index][j], 0) + '×' + fmt(weights[j]*100,0) + '%').join(' + ') +
                    ' = <strong>' + fmt(t.total, 1) + ' 分</strong>'
                ).join('<br>')
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ==================== 盈亏平衡法 ====================
    renderBreakevenMethod(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数</div>
                    <div class="form-group">
                        <label>预期年产量 Q <span class="label-desc">(件/年)</span></label>
                        <input type="number" id="la-be-Q" placeholder="例如：10000" step="any">
                    </div>
                    <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                        每个备选地址的成本结构（每行格式：名称, 年固定成本, 单位变动成本）<br>
                        示例：<br>地址A, 500000, 25<br>地址B, 350000, 40<br>地址C, 200000, 55
                    </p>
                    <div class="form-group">
                        <textarea id="la-be-data" rows="6" placeholder="地址A, 500000, 25&#10;地址B, 350000, 40&#10;地址C, 200000, 55"></textarea>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="LocationModule.calcBreakeven()">计算</button>
                </div>
                <div id="la-be-result"></div>
            </div>
            <div id="la-be-chart" style="margin-top:16px;"></div>
        `;
    },

    calcBreakeven() {
        const Q = parseNum(document.getElementById('la-be-Q').value);
        const dataRaw = document.getElementById('la-be-data').value.trim();
        const resultDiv = document.getElementById('la-be-result');
        const chartDiv = document.getElementById('la-be-chart');

        if (!Q || Q <= 0) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写预期年产量 Q</div>';
            return;
        }
        if (!dataRaw) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写备选地址的成本数据</div>';
            return;
        }

        // 解析数据
        const locations = dataRaw.split('\n').map(line => {
            const parts = line.split(/[,，\s]+/);
            return { name: parts[0], fc: parseNum(parts[1]), vc: parseNum(parts[2]) };
        }).filter(l => l.name && !isNaN(l.fc) && !isNaN(l.vc));

        if (locations.length < 2) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请至少输入两个有效地址</div>';
            return;
        }

        // 计算各地址在给定 Q 下的总成本
        locations.forEach(l => {
            l.tc = l.fc + l.vc * Q;
        });
        locations.sort((a, b) => a.tc - b.tc);

        const best = locations[0];

        // 两两计算盈亏平衡点
        const breakpoints = [];
        for (let i = 0; i < locations.length; i++) {
            for (let j = i + 1; j < locations.length; j++) {
                const a = locations[i];
                const b = locations[j];
                if (Math.abs(a.vc - b.vc) > 1e-10) {
                    const qBE = (b.fc - a.fc) / (a.vc - b.vc);
                    if (qBE > 0) {
                        breakpoints.push({ q: qBE, a: a.name, b: b.name });
                    }
                }
            }
        }
        breakpoints.sort((x, y) => x.q - y.q);

        let html = App.createResultCard('盈亏平衡法结果', '💰');
        html += App.createResultValue('最优选址', best.name, '年总成本：' + fmt(best.tc, 0) + '元');

        html += '<div class="result-grid">';
        locations.forEach((l, i) => {
            const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            html += '<div class="result-item">' +
                '<div class="ri-label">' + icon + ' ' + l.name + '</div>' +
                '<div class="ri-value">' + fmt(l.tc, 0) + ' <small>元/年</small></div>' +
                '<div style="font-size:11px;color:var(--text-secondary);">固定 ' + fmt(l.fc, 0) + ' + 变动 ' + fmt(l.vc) + '×' + fmt(Q, 0) + '</div>' +
                '</div>';
        });
        html += '</div>';
        html += '</div>';

        // 盈亏平衡点
        if (breakpoints.length > 0) {
            html += '<div class="card" style="margin-top:16px;">';
            html += '<div class="card-title"><span class="card-icon">⚖️</span>盈亏平衡点分析</div>';
            const bpRows = breakpoints.map(bp => [bp.a + ' ↔ ' + bp.b, fmt(bp.q, 0) + ' 件']);
            html += App.createTable(['地址对', '平衡点产量'], bpRows);
            html += '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">' +
                '当产量跨越平衡点时，总成本更低的选址会发生变化。</p>';
            html += '</div>';
        }

        const steps = [
            {
                label: '计算各选址的年总成本',
                detail: locations.map(l =>
                    l.name + '：TC = FC + VC×Q = ' + fmt(l.fc, 0) + ' + ' + fmt(l.vc) + '×' + fmt(Q, 0) +
                    ' = <strong>' + fmt(l.tc, 0) + ' 元</strong>'
                ).join('<br>')
            },
            {
                label: '比较总成本，选出最优',
                detail: '在年产量 Q=' + fmt(Q, 0) + ' 时，<strong>' + best.name + '</strong> 总成本最低：' + fmt(best.tc, 0) + ' 元<br>' +
                    '比第二名节省：' + fmt(locations[1].tc - best.tc, 0) + ' 元/年'
            }
        ];
        if (breakpoints.length > 0) {
            steps.push({
                label: '寻找盈亏平衡点',
                detail: breakpoints.map(bp =>
                    bp.a + ' 与 ' + bp.b + '：q = (FC₂-FC₁)/(VC₁-VC₂) = <strong>' + fmt(bp.q, 0) + ' 件</strong>'
                ).join('<br>') + '<br><small style="color:#64748b;">产量低于平衡点选固定成本低的，高于平衡点选变动成本低的</small>'
            });
        }
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;

        // 绘制成本对比图
        this._drawBECanvas(locations, Q, breakpoints, chartDiv);
    },

    _drawBECanvas(locations, Q, chartDiv) {
        chartDiv.innerHTML = '<div class="card"><div class="card-title"><span class="card-icon">📈</span>成本对比图</div>' +
            '<div class="chart-container"><canvas id="be-canvas"></canvas></div></div>';

        const canvas = document.getElementById('be-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = chartDiv.offsetWidth - 48;
        const height = 300;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const margin = { top: 20, right: 40, bottom: 50, left: 80 };
        const cw = width - margin.left - margin.right;
        const ch = height - margin.top - margin.bottom;

        // 找出最大成本（在 Q 处）
        const maxTC = Math.max(...locations.map(l => l.fc + l.vc * Q));
        const yMax = maxTC * 1.2;

        // 画布背景
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const yPos = (val) => margin.top + ch - (val / yMax) * ch;
        const xPos = (q) => margin.left + (q / Q) * cw;

        // 网格线
        for (let i = 0; i <= 5; i++) {
            const y = yPos(yMax * i / 5);
            ctx.strokeStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + cw, y);
            ctx.stroke();
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(fmt(yMax * i / 5, 0), margin.left - 8, y + 4);
        }

        // 坐标轴
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + ch);
        ctx.lineTo(margin.left + cw, margin.top + ch);
        ctx.stroke();

        // X轴标签
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 4; i++) {
            const q = Q * i / 4;
            const x = xPos(q);
            ctx.fillText(fmt(q, 0), x, margin.top + ch + 18);
        }
        ctx.fillText('产量 (件)', margin.left + cw / 2, margin.top + ch + 38);

        // 画每条成本线
        const colors = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        locations.forEach((l, i) => {
            const color = colors[i % colors.length];

            // 线
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(margin.left, yPos(l.fc));
            ctx.lineTo(margin.left + cw, yPos(l.fc + l.vc * Q));
            ctx.stroke();

            // Q 位置的点
            const qX = xPos(Q);
            const qY = yPos(l.tc);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(qX, qY, 5, 0, Math.PI * 2);
            ctx.fill();

            // 标签
            ctx.fillStyle = color;
            ctx.font = 'bold 12px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(l.name + ' (' + fmt(l.tc, 0) + ')', qX + 8, qY - 8);

            // 图例
            const ly = margin.top + 16 * i;
            ctx.fillStyle = color;
            ctx.fillRect(margin.left + cw - 100, ly, 12, 12);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(l.name + ': TC=' + fmt(l.fc, 0) + '+' + fmt(l.vc) + 'Q', margin.left + cw - 84, ly + 10);
        });

        // 当前 Q 竖线
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(xPos(Q), margin.top);
        ctx.lineTo(xPos(Q), margin.top + ch);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Q=' + fmt(Q, 0), xPos(Q), margin.top - 6);
    }
});

window.LocationModule = App.modules.find(m => m.id === 'location-analysis');
