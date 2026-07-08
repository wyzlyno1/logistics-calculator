/* ===== 经济订货批量 (EOQ) 模块 ===== */
App.register({
    id: 'eoq',
    name: '经济订货批量 (EOQ)',
    icon: '📦',
    category: '库存管理',
    order: 1,
    shortDesc: '计算最优订货量、年总成本、再订货点',
    description: '基于经典 EOQ 模型，计算使年库存总成本最小的订货批量。支持基本 EOQ、数量折扣分析和允许缺货模型。',
    fullWidth: false,

    init(container) {
        // 子标签切换
        container.innerHTML = `
            <div class="sub-tabs">
                <div class="sub-tab active" data-tab="eoq-basic">基本 EOQ</div>
                <div class="sub-tab" data-tab="eoq-discount">数量折扣</div>
                <div class="sub-tab" data-tab="eoq-shortage">允许缺货</div>
            </div>
            <div class="sub-tab-content active" id="eoq-basic"></div>
            <div class="sub-tab-content" id="eoq-discount"></div>
            <div class="sub-tab-content" id="eoq-shortage"></div>
        `;

        this.renderBasic(document.getElementById('eoq-basic'));
        this.renderDiscount(document.getElementById('eoq-discount'));
        this.renderShortage(document.getElementById('eoq-shortage'));

        // 子标签切换事件
        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    },

    // ===== 基本 EOQ =====
    renderBasic(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数</div>
                    <div class="form-group">
                        <label>年需求量 D <span class="label-desc">(件/年)</span></label>
                        <input type="number" id="eoq-D" placeholder="例如：12000" step="any">
                    </div>
                    <div class="form-group">
                        <label>每次订货成本 S <span class="label-desc">(元/次)</span></label>
                        <input type="number" id="eoq-S" placeholder="例如：200" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位年持有成本 H <span class="label-desc">(元/件·年)</span></label>
                        <input type="number" id="eoq-H" placeholder="例如：5" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位采购成本 C <span class="label-desc">(元/件，选填)</span></label>
                        <input type="number" id="eoq-C" placeholder="不填则不计算采购成本" step="any">
                    </div>
                    <div class="form-group">
                        <label>提前期 L <span class="label-desc">(天，选填)</span></label>
                        <input type="number" id="eoq-L" placeholder="用于计算再订货点" step="any">
                    </div>
                    <div class="form-group">
                        <label>年工作天数 <span class="label-desc">(天)</span></label>
                        <input type="number" id="eoq-days" placeholder="365" value="365" step="any">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="EOQModule.calcBasic()">计算</button>
                </div>
                <div id="eoq-basic-result"></div>
            </div>`;
    },

    calcBasic() {
        const D = parseNum(document.getElementById('eoq-D').value);
        const S = parseNum(document.getElementById('eoq-S').value);
        const H = parseNum(document.getElementById('eoq-H').value);
        const C = parseNum(document.getElementById('eoq-C').value) || 0;
        const L = parseNum(document.getElementById('eoq-L').value) || 0;
        const workDays = parseNum(document.getElementById('eoq-days').value) || 365;

        const resultDiv = document.getElementById('eoq-basic-result');

        if (!D || !S || !H) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写年需求量 D、订货成本 S、持有成本 H（必填项）</div>';
            return;
        }

        if (D <= 0 || S <= 0 || H <= 0) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 所有参数必须大于 0</div>';
            return;
        }

        // 计算
        const Qstar = Math.sqrt(2 * D * S / H);
        const N = D / Qstar;
        const orderCost = (D / Qstar) * S;
        const holdCost = (Qstar / 2) * H;
        const purchaseCost = C > 0 ? D * C : 0;
        const TC = orderCost + holdCost + purchaseCost;
        const T = workDays / N; // 订货周期（天）
        const d = D / workDays; // 日需求量
        const ROP = d * L; // 再订货点

        // 构建结果
        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('最优订货量 Q*', fmt(Qstar), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">年订货次数 N</div><div class="ri-value">${fmt(N)} <small>次</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">订货周期 T</div><div class="ri-value">${fmt(T)} <small>天</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年订货成本</div><div class="ri-value">${fmt(orderCost)} <small>元</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年持有成本</div><div class="ri-value">${fmt(holdCost)} <small>元</small></div></div>`;
        if (C > 0) {
            html += `<div class="result-item"><div class="ri-label">年采购成本</div><div class="ri-value">${fmt(purchaseCost)} <small>元</small></div></div>`;
        }
        html += `<div class="result-item"><div class="ri-label">年总成本 TC</div><div class="ri-value highlight">${fmt(TC)} <small>元</small></div></div>`;
        if (L > 0) {
            html += `<div class="result-item"><div class="ri-label">日需求量 d</div><div class="ri-value">${fmt(d)} <small>件/天</small></div></div>`;
            html += `<div class="result-item"><div class="ri-label">再订货点 ROP</div><div class="ri-value highlight">${fmt(ROP)} <small>件</small></div></div>`;
        }
        html += '</div>';
        html += '</div>'; // close result card

        // 计算步骤
        let steps = [
            {
                label: '计算最优订货量 Q*',
                detail: `
                    Q* = √(2DS/H)<br>
                    Q* = √(2 × <span class="formula">${fmt(D,0)}</span> × <span class="formula">${fmt(S)}</span> / <span class="formula">${fmt(H)}</span>)<br>
                    Q* = √(<span class="formula">${fmt(2*D*S,0)}</span>)<br>
                    Q* = <strong>${fmt(Qstar)} 件</strong>
                `
            },
            {
                label: '计算年订货次数 N',
                detail: `
                    N = D/Q*<br>
                    N = <span class="formula">${fmt(D,0)}</span> / <span class="formula">${fmt(Qstar)}</span><br>
                    N = <strong>${fmt(N)} 次/年</strong>
                `
            },
            {
                label: '计算年订货成本',
                detail: `
                    年订货成本 = N × S<br>
                    = <span class="formula">${fmt(N)}</span> × <span class="formula">${fmt(S)}</span><br>
                    = <strong>${fmt(orderCost)} 元</strong>
                `
            },
            {
                label: '计算年持有成本',
                detail: `
                    年持有成本 = (Q*/2) × H<br>
                    = (<span class="formula">${fmt(Qstar)}</span> / 2) × <span class="formula">${fmt(H)}</span><br>
                    = <strong>${fmt(holdCost)} 元</strong>
                `
            },
            {
                label: '计算年总成本',
                detail: `
                    TC = 订货成本 + 持有成本${C > 0 ? ' + 采购成本' : ''}<br>
                    TC = <span class="formula">${fmt(orderCost)}</span> + <span class="formula">${fmt(holdCost)}</span>${C > 0 ? ` + <span class="formula">${fmt(purchaseCost)}</span>` : ''}<br>
                    TC = <strong>${fmt(TC)} 元</strong>
                `
            }
        ];

        if (L > 0) {
            steps.push({
                label: '计算再订货点 ROP',
                detail: `
                    d = D / 年工作天数 = <span class="formula">${fmt(D,0)}</span> / <span class="formula">${fmt(workDays)}</span> = <span class="formula">${fmt(d)}</span> 件/天<br>
                    ROP = d × L<br>
                    ROP = <span class="formula">${fmt(d)}</span> × <span class="formula">${fmt(L)}</span><br>
                    ROP = <strong>${fmt(ROP)} 件</strong><br>
                    <small style="color:#64748b;">当库存降至 ${fmt(ROP)} 件时，发出订货请求</small>
                `
            });
        }

        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== 数量折扣 EOQ =====
    renderDiscount(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数</div>
                    <div class="form-group">
                        <label>年需求量 D <span class="label-desc">(件/年)</span></label>
                        <input type="number" id="eod-D" placeholder="例如：12000" step="any">
                    </div>
                    <div class="form-group">
                        <label>每次订货成本 S <span class="label-desc">(元/次)</span></label>
                        <input type="number" id="eod-S" placeholder="例如：200" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位年持有成本比例 I <span class="label-desc">(小数，如 0.2 表示20%)</span></label>
                        <input type="number" id="eod-I" placeholder="例如：0.2" step="any">
                    </div>
                    <p style="font-size:12px; color:#64748b; margin-bottom:12px;">
                        折扣方案（每行：最低订货量, 单价）<br>
                        示例：<br>0, 10.00<br>1000, 9.50<br>2000, 9.00
                    </p>
                    <div class="form-group">
                        <textarea id="eod-tiers" rows="5" placeholder="0, 10.00&#10;1000, 9.50&#10;2000, 9.00"></textarea>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="EOQModule.calcDiscount()">计算</button>
                </div>
                <div id="eoq-discount-result"></div>
            </div>`;
    },

    calcDiscount() {
        const D = parseNum(document.getElementById('eod-D').value);
        const S = parseNum(document.getElementById('eod-S').value);
        const I = parseNum(document.getElementById('eod-I').value);
        const tiersRaw = document.getElementById('eod-tiers').value.trim();

        const resultDiv = document.getElementById('eoq-discount-result');

        if (!D || !S || !I || !tiersRaw) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有参数</div>';
            return;
        }

        // 解析折扣方案
        const tiers = tiersRaw.split('\n').map(line => {
            const parts = line.split(/[,，\s]+/);
            return { qty: parseNum(parts[0]), price: parseNum(parts[1]) };
        }).filter(t => !isNaN(t.qty) && !isNaN(t.price))
          .sort((a, b) => a.qty - b.qty);

        if (tiers.length < 2) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请至少输入两个折扣层级</div>';
            return;
        }

        // 对每个价格层级计算可行 Q*
        const results = tiers.map((tier, i) => {
            const H = tier.price * I; // H = I × C
            let Q = Math.sqrt(2 * D * S / H);

            // 判断 Q 是否在可行区间
            const lower = tier.qty;
            const upper = i < tiers.length - 1 ? tiers[i + 1].qty - 1 : Infinity;

            let feasibleQ = Q;
            let note = '';
            if (Q < lower) {
                feasibleQ = lower;
                note = `Q*(${fmt(Q)}) 低于该区间下限，调整为 ${fmt(lower)}`;
            } else if (Q > upper) {
                feasibleQ = null; // 不可行
                note = `Q*(${fmt(Q)}) 高于该区间上限，不可行`;
            } else {
                note = `可行区间 [${fmt(lower)}, ${upper === Infinity ? '∞' : fmt(upper)}]`;
            }

            const TC = feasibleQ !== null
                ? (D / feasibleQ) * S + (feasibleQ / 2) * H + D * tier.price
                : Infinity;

            return { tier: i + 1, qtyMin: lower, price: tier.price, H, Q, feasibleQ, TC, note };
        });

        // 找最低总成本方案
        const best = results.filter(r => r.feasibleQ !== null).reduce((a, b) => a.TC < b.TC ? a : b);

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('最优订货量 Q*', fmt(best.feasibleQ), '件');
        html += `<p style="font-size:13px;color:var(--text-secondary);">单价：${fmt(best.price)} 元/件 | 年总成本：${fmt(best.TC)} 元</p>`;
        html += '</div>';

        // 各层级对比表
        html += '<div class="card" style="margin-top:16px;"><div class="card-title"><span class="card-icon">📋</span>各层级对比</div>';
        html += App.createTable(
            ['层级', '最低订货量', '单价', 'H=I×C', 'Q* 理论值', '可行订货量', '年总成本', '备注'],
            results.map(r => [
                r.tier,
                fmt(r.qtyMin, 0),
                fmt(r.price),
                fmt(r.H),
                fmt(r.Q),
                r.feasibleQ !== null ? `<strong>${fmt(r.feasibleQ)}</strong>` : '—',
                r.TC !== Infinity ? fmt(r.TC) : '—',
                `<small>${r.note}</small>`
            ]),
            { highlightLast: false }
        );
        html += '</div>';

        // 步骤
        let steps = [
            {
                label: '计算各价格层级的理论 Q*',
                detail: results.map(r =>
                    `层级${r.tier}（C=${fmt(r.price)}，H=I×C=${fmt(r.I||I)}×${fmt(r.price)}=${fmt(r.H)}）：Q* = √(2DS/H) = √(2×${fmt(D,0)}×${fmt(S)}/${fmt(r.H)}) = <strong>${fmt(r.Q)}</strong>`
                ).join('<br><br>')
            },
            {
                label: '调整到可行区间并比较总成本',
                detail: `
                    ${results.map(r => {
                        if (r.feasibleQ === null) return `层级${r.tier}：不可行，排除`;
                        const orderCost = (D / r.feasibleQ) * S;
                        const holdCost = (r.feasibleQ / 2) * r.H;
                        const purchaseCost = D * r.price;
                        return `层级${r.tier}（Q=${fmt(r.feasibleQ)}，C=${fmt(r.price)}）：<br>
                            TC = 订货成本 + 持有成本 + 采购成本<br>
                            = ${fmt(orderCost)} + ${fmt(holdCost)} + ${fmt(purchaseCost)}<br>
                            = <strong>${fmt(r.TC)} 元</strong>`;
                    }).join('<br><br>')}
                    <br><br>
                    ✅ 最低总成本为 <strong>${fmt(best.TC)} 元</strong>，对应订货量 <strong>Q* = ${fmt(best.feasibleQ)} 件</strong>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== 允许缺货 EOQ =====
    renderShortage(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数</div>
                    <div class="form-group">
                        <label>年需求量 D <span class="label-desc">(件/年)</span></label>
                        <input type="number" id="eos-D" placeholder="例如：12000" step="any">
                    </div>
                    <div class="form-group">
                        <label>每次订货成本 S <span class="label-desc">(元/次)</span></label>
                        <input type="number" id="eos-S" placeholder="例如：200" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位年持有成本 H <span class="label-desc">(元/件·年)</span></label>
                        <input type="number" id="eos-H" placeholder="例如：5" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位年缺货成本 B <span class="label-desc">(元/件·年)</span></label>
                        <input type="number" id="eos-B" placeholder="例如：10" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位采购成本 C <span class="label-desc">(元/件，选填)</span></label>
                        <input type="number" id="eos-C" placeholder="不填则不计算采购成本" step="any">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="EOQModule.calcShortage()">计算</button>
                </div>
                <div id="eoq-shortage-result"></div>
            </div>`;
    },

    calcShortage() {
        const D = parseNum(document.getElementById('eos-D').value);
        const S = parseNum(document.getElementById('eos-S').value);
        const H = parseNum(document.getElementById('eos-H').value);
        const B = parseNum(document.getElementById('eos-B').value);
        const C = parseNum(document.getElementById('eos-C').value) || 0;

        const resultDiv = document.getElementById('eoq-shortage-result');

        if (!D || !S || !H || !B) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有必填参数</div>';
            return;
        }

        // 允许缺货 EOQ 公式
        const fac = (H + B) / B;
        const Qstar = Math.sqrt(2 * D * S / H) * Math.sqrt(fac);
        const Smax = Qstar * (B / (H + B)); // 最大库存量
        const shortage = Qstar - Smax; // 最大缺货量
        const holdCost = (Smax * Smax) / (2 * Qstar) * H;
        const orderCost = (D / Qstar) * S;
        const shortageCost = ((Qstar - Smax) * (Qstar - Smax)) / (2 * Qstar) * B;
        const purchaseCost = C > 0 ? D * C : 0;
        const TC = orderCost + holdCost + shortageCost + purchaseCost;
        const N = D / Qstar;

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('最优订货量 Q*', fmt(Qstar), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">最大库存量 S_max</div><div class="ri-value highlight">${fmt(Smax)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">最大缺货量</div><div class="ri-value" style="color:var(--warning);">${fmt(shortage)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年订货次数</div><div class="ri-value">${fmt(N)} <small>次</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年订货成本</div><div class="ri-value">${fmt(orderCost)} <small>元</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年持有成本</div><div class="ri-value">${fmt(holdCost)} <small>元</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年缺货成本</div><div class="ri-value">${fmt(shortageCost)} <small>元</small></div></div>`;
        if (C > 0) {
            html += `<div class="result-item"><div class="ri-label">年采购成本</div><div class="ri-value">${fmt(purchaseCost)} <small>元</small></div></div>`;
        }
        html += `<div class="result-item"><div class="ri-label">年总成本</div><div class="ri-value highlight">${fmt(TC)} <small>元</small></div></div>`;
        html += '</div>';
        html += '</div>';

        // 步骤
        const steps = [
            {
                label: '计算修正因子',
                detail: `
                    (H+B)/B = (<span class="formula">${fmt(H)}</span> + <span class="formula">${fmt(B)}</span>) / <span class="formula">${fmt(B)}</span> = <strong>${fmt(fac)}</strong>
                `
            },
            {
                label: '计算最优订货量 Q*',
                detail: `
                    Q* = √(2DS/H) × √((H+B)/B)<br>
                    Q* = √(2 × <span class="formula">${fmt(D,0)}</span> × <span class="formula">${fmt(S)}</span> / <span class="formula">${fmt(H)}</span>) × √(<span class="formula">${fmt(fac)}</span>)<br>
                    Q* = <span class="formula">${fmt(Math.sqrt(2*D*S/H))}</span> × <span class="formula">${fmt(Math.sqrt(fac))}</span><br>
                    Q* = <strong>${fmt(Qstar)} 件</strong>
                `
            },
            {
                label: '计算最大库存量 S_max',
                detail: `
                    S_max = Q* × B/(H+B)<br>
                    S_max = <span class="formula">${fmt(Qstar)}</span> × <span class="formula">${fmt(B)}</span> / <span class="formula">${fmt(H+B)}</span><br>
                    S_max = <strong>${fmt(Smax)} 件</strong>
                `
            },
            {
                label: '计算年总成本',
                detail: `
                    TC = 订货成本 + 持有成本 + 缺货成本${C > 0 ? ' + 采购成本' : ''}<br>
                    = ${fmt(orderCost)} + ${fmt(holdCost)} + ${fmt(shortageCost)}${C > 0 ? ` + ${fmt(purchaseCost)}` : ''}<br>
                    = <strong>${fmt(TC)} 元</strong>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    }
});

// 暴露 calcBasic 到全局作用域（onclick 需要）
window.EOQModule = App.modules.find(m => m.id === 'eoq');
