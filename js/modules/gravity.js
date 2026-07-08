/* ===== 重心法选址模块 ===== */
App.register({
    id: 'gravity',
    name: '重心法选址',
    icon: '📍',
    category: '物流规划',
    order: 5,
    shortDesc: '多需求点最优选址计算',
    description: '基于重心法求解单设施最优选址。输入各需求点坐标和需求量，计算总运输成本最小的选址坐标。支持迭代优化。',
    fullWidth: true,

    init(container) {
        // 初始示例数据
        const sampleData = [
            { name: '需求点 A', x: 3, y: 8, w: 2000 },
            { name: '需求点 B', x: 8, y: 2, w: 3000 },
            { name: '需求点 C', x: 2, y: 5, w: 2500 },
            { name: '需求点 D', x: 6, y: 4, w: 1000 },
            { name: '需求点 E', x: 8, y: 8, w: 1500 },
        ];

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>需求点数据</div>
                    <div style="margin-bottom:12px;">
                        <button class="btn btn-secondary btn-sm" onclick="GravityModule.addRow()">+ 添加行</button>
                        <button class="btn btn-secondary btn-sm" onclick="GravityModule.loadSample()">📥 加载示例</button>
                        <button class="btn btn-secondary btn-sm" onclick="GravityModule.clearTable()">清空</button>
                    </div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>名称</th>
                                    <th>X 坐标</th>
                                    <th>Y 坐标</th>
                                    <th>需求量 Wi (吨)</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="gravity-table-body">
                            </tbody>
                        </table>
                    </div>
                    <div class="form-group" style="margin-top:12px;">
                        <label>迭代次数 <span class="label-desc">(越多越精确，建议 10-50)</span></label>
                        <input type="number" id="gravity-iterations" value="20" min="0" max="200" step="1">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="GravityModule.calculate()">计算最优选址</button>
                </div>
                <div id="gravity-result"></div>
            </div>
        `;

        // 加载示例数据
        this.populateTable(sampleData);
    },

    populateTable(data) {
        const tbody = document.getElementById('gravity-table-body');
        tbody.innerHTML = '';
        data.forEach((row, i) => {
            this.addRow(row);
        });
    },

    addRow(data = {}) {
        const tbody = document.getElementById('gravity-table-body');
        if (!tbody) return;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" value="${data.name || ''}" placeholder="点${tbody.children.length + 1}"></td>
            <td><input type="number" value="${data.x !== undefined ? data.x : ''}" step="any" placeholder="0"></td>
            <td><input type="number" value="${data.y !== undefined ? data.y : ''}" step="any" placeholder="0"></td>
            <td><input type="number" value="${data.w !== undefined ? data.w : ''}" step="any" placeholder="1000"></td>
            <td><button class="btn btn-secondary btn-sm" onclick="this.closest('tr').remove()" style="color:var(--error);">删除</button></td>
        `;
        tbody.appendChild(row);
    },

    loadSample() {
        const sampleData = [
            { name: '需求点 A', x: 3, y: 8, w: 2000 },
            { name: '需求点 B', x: 8, y: 2, w: 3000 },
            { name: '需求点 C', x: 2, y: 5, w: 2500 },
            { name: '需求点 D', x: 6, y: 4, w: 1000 },
            { name: '需求点 E', x: 8, y: 8, w: 1500 },
        ];
        this.populateTable(sampleData);
    },

    clearTable() {
        document.getElementById('gravity-table-body').innerHTML = '';
        document.getElementById('gravity-result').innerHTML = '';
    },

    // 读取表格数据
    readTable() {
        const tbody = document.getElementById('gravity-table-body');
        const rows = tbody.querySelectorAll('tr');
        const points = [];
        rows.forEach((row, i) => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value || `点${i + 1}`;
            const x = parseNum(inputs[1].value);
            const y = parseNum(inputs[2].value);
            const w = parseNum(inputs[3].value);
            if (!isNaN(x) && !isNaN(y) && !isNaN(w) && w > 0) {
                points.push({ name, x, y, w });
            }
        });
        return points;
    },

    calculate() {
        const points = this.readTable();
        const iterations = parseInt(document.getElementById('gravity-iterations').value) || 20;
        const resultDiv = document.getElementById('gravity-result');

        if (points.length < 2) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请至少输入 2 个有效需求点（坐标和需求量均需填写）</div>';
            return;
        }

        // ===== 1. 基本重心法 =====
        let sumW = 0, sumWX = 0, sumWY = 0;
        points.forEach(p => {
            sumW += p.w;
            sumWX += p.w * p.x;
            sumWY += p.w * p.y;
        });
        const X0 = sumWX / sumW;
        const Y0 = sumWY / sumW;

        // 初始总成本
        let cost0 = 0;
        points.forEach(p => {
            cost0 += p.w * Math.sqrt((p.x - X0) ** 2 + (p.y - Y0) ** 2);
        });

        // ===== 2. 迭代优化 =====
        let Xk = X0, Yk = Y0;
        const iterHistory = [{ iter: 0, x: X0, y: Y0, cost: cost0 }];

        for (let k = 1; k <= iterations; k++) {
            let sumWD = 0, sumWDX = 0, sumWDY = 0;
            let hasZeroDist = false;

            points.forEach(p => {
                const d = Math.sqrt((p.x - Xk) ** 2 + (p.y - Yk) ** 2);
                if (d < 1e-10) {
                    hasZeroDist = true;
                    return;
                }
                const wd = p.w / d;
                sumWD += wd;
                sumWDX += wd * p.x;
                sumWDY += wd * p.y;
            });

            if (hasZeroDist || sumWD === 0) break;

            Xk = sumWDX / sumWD;
            Yk = sumWDY / sumWD;

            // 计算当前总成本
            let costK = 0;
            points.forEach(p => {
                costK += p.w * Math.sqrt((p.x - Xk) ** 2 + (p.y - Yk) ** 2);
            });

            iterHistory.push({ iter: k, x: Xk, y: Yk, cost: costK });

            // 收敛判断：成本变化极小
            const prevCost = iterHistory[k - 1].cost;
            if (Math.abs(prevCost - costK) < 1e-10) {
                break;
            }
            if (prevCost > 1e-10 && Math.abs(prevCost - costK) / prevCost < 1e-8 && k > 5) {
                break;
            }
        }

        const lastIter = iterHistory[iterHistory.length - 1];
        const improvement = ((cost0 - lastIter.cost) / cost0 * 100);

        // ===== 构建结果 HTML =====
        let html = App.createResultCard('基本重心法结果', '📍');
        html += `<div class="result-grid">`;
        html += `<div class="result-item"><div class="ri-label">X 坐标</div><div class="ri-value">${fmt(X0)}</div></div>`;
        html += `<div class="result-item"><div class="ri-label">Y 坐标</div><div class="ri-value">${fmt(Y0)}</div></div>`;
        html += `<div class="result-item"><div class="ri-label">总加权距离</div><div class="ri-value">${fmt(cost0)} <small>吨·单位距离</small></div></div>`;
        html += `</div>`;
        html += `</div>`;

        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-title"><span class="card-icon">🎯</span>迭代优化结果</div>';
        html += App.createResultValue('最优选址', `(${fmt(lastIter.x)}, ${fmt(lastIter.y)})`, '');
        html += `<div class="result-grid">`;
        html += `<div class="result-item"><div class="ri-label">总运输成本</div><div class="ri-value highlight">${fmt(lastIter.cost)} <small>吨·距离</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">迭代次数</div><div class="ri-value">${lastIter.iter} <small>次</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">相比基本重心法</div><div class="ri-value" style="color:var(--success);">↓ ${fmt(improvement)}%</div></div>`;
        html += `</div>`;
        html += `</div>`;

        // 各点到最优选址的距离和成本
        html += '<div class="card" style="margin-top:16px;">';
        html += '<div class="card-title"><span class="card-icon">📋</span>各需求点明细</div>';
        const detailRows = points.map(p => {
            const dist = Math.sqrt((p.x - lastIter.x) ** 2 + (p.y - lastIter.y) ** 2);
            const cost = p.w * dist;
            return [
                p.name,
                `(${fmt(p.x)}, ${fmt(p.y)})`,
                fmt(p.w, 0),
                fmt(dist),
                fmt(cost)
            ];
        });
        detailRows.push([
            '<strong>合计</strong>',
            '',
            `<strong>${fmt(sumW, 0)}</strong>`,
            '',
            `<strong>${fmt(lastIter.cost)}</strong>`
        ]);
        html += App.createTable(
            ['需求点', '坐标', '需求量(吨)', '到选址距离', '加权距离'],
            detailRows,
            { highlightLast: true }
        );
        html += '</div>';

        // 计算步骤
        const steps = [
            {
                label: '基本重心法：计算初始选址',
                detail: `
                    X₀ = Σ(Wi × Xi) / ΣWi<br>
                    = ${points.map(p => `${fmt(p.w,0)}×${fmt(p.x)}`).join(' + ')}<br>
                    &nbsp;&nbsp;&nbsp; / (${points.map(p => fmt(p.w,0)).join(' + ')})<br>
                    = <span class="formula">${fmt(sumWX)}</span> / <span class="formula">${fmt(sumW,0)}</span><br>
                    = <strong>${fmt(X0)}</strong><br><br>
                    Y₀ = Σ(Wi × Yi) / ΣWi<br>
                    = <strong>${fmt(Y0)}</strong><br><br>
                    初始总成本 = Σ(Wi × di) = <strong>${fmt(cost0)}</strong>
                `
            },
            {
                label: `迭代优化（共 ${lastIter.iter} 次）`,
                detail: `
                    每轮迭代用当前坐标到各点的距离倒数加权：<br>
                    X_new = Σ(Wi×Xi/di) / Σ(Wi/di)<br>
                    Y_new = Σ(Wi×Yi/di) / Σ(Wi/di)<br><br>
                    收敛结果：X = <strong>${fmt(lastIter.x)}</strong>, Y = <strong>${fmt(lastIter.y)}</strong><br>
                    总成本从 ${fmt(cost0)} 降至 ${fmt(lastIter.cost)}（下降 ${fmt(improvement)}%）
                `
            },
            {
                label: '选址结论',
                detail: `
                    最优设施选址坐标为 <strong>(${fmt(lastIter.x)}, ${fmt(lastIter.y)})</strong><br>
                    最小化总运输成本为 <strong>${fmt(lastIter.cost)}</strong> 吨·单位距离<br>
                    <small style="color:#64748b;">注：重心法假设运输成本与距离和运量成正比，使用直线距离（欧氏距离）</small>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    }
});

window.GravityModule = App.modules.find(m => m.id === 'gravity');
