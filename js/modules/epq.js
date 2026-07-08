/* ===== 经济生产批量 (EPQ) 模块 ===== */
App.register({
    id: 'epq',
    name: '经济生产批量 (EPQ)',
    icon: '🏭',
    category: '库存管理',
    order: 7,
    shortDesc: '生产批量优化、最大库存计算',
    description: '计算最优生产批量、生产周期、最大库存量及年总成本。适用于边生产边消耗的自制件场景。',
    fullWidth: false,

    init(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数</div>
                    <div class="form-group">
                        <label>年需求率 D <span class="label-desc">(件/年)</span></label>
                        <input type="number" id="epq-D" placeholder="例如：12000" step="any">
                    </div>
                    <div class="form-group">
                        <label>每次生产准备成本 S <span class="label-desc">(元/次)</span></label>
                        <input type="number" id="epq-S" placeholder="例如：500" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位年持有成本 H <span class="label-desc">(元/件·年)</span></label>
                        <input type="number" id="epq-H" placeholder="例如：8" step="any">
                    </div>
                    <div class="form-group">
                        <label>日生产率 p <span class="label-desc">(件/天)</span></label>
                        <input type="number" id="epq-p" placeholder="例如：100" step="any">
                    </div>
                    <div class="form-group">
                        <label>年工作天数 <span class="label-desc">(天)</span></label>
                        <input type="number" id="epq-days" placeholder="例如：250" value="250" step="any">
                    </div>
                    <div class="form-group">
                        <label>单位生产成本 C <span class="label-desc">(元/件，选填)</span></label>
                        <input type="number" id="epq-C" placeholder="不填则不计算生产成本" step="any">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="EPQModule.calculate()">计算</button>
                </div>
                <div id="epq-result"></div>
            </div>`;
    },

    calculate() {
        const D = parseNum(document.getElementById('epq-D').value);
        const S = parseNum(document.getElementById('epq-S').value);
        const H = parseNum(document.getElementById('epq-H').value);
        const p = parseNum(document.getElementById('epq-p').value);
        const workDays = parseNum(document.getElementById('epq-days').value) || 250;
        const C = parseNum(document.getElementById('epq-C').value) || 0;

        const resultDiv = document.getElementById('epq-result');

        if (!D || !S || !H || !p) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有必填参数（D、S、H、p）</div>';
            return;
        }

        const d = D / workDays; // 日需求率

        if (p <= d) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 生产率 p 必须大于需求率 d（当前 d = ' + fmt(d) + ' 件/天）。否则无法积累库存。</div>';
            return;
        }

        if (D <= 0 || S <= 0 || H <= 0 || p <= 0) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 所有参数必须大于 0</div>';
            return;
        }

        // EPQ 公式
        const rho = d / p; // 需求与生产率之比
        const denom = H * (1 - rho);
        const Qstar = Math.sqrt(2 * D * S / denom);
        const IMax = Qstar * (1 - rho); // 最大库存量
        const tRun = Qstar / p; // 生产运行时间（天）
        const tCycle = Qstar / d; // 生产周期（天）
        const N = D / Qstar; // 年生产次数
        const setupCost = N * S;
        const holdCost = (IMax / 2) * H;
        const productCost = C > 0 ? D * C : 0;
        const TC = setupCost + holdCost + productCost;

        // 比较 EOQ（不做生产批量优化的情况）
        const eoq = Math.sqrt(2 * D * S / H);

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('最优生产批量 Q*', fmt(Qstar), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">最大库存量 I_max</div><div class="ri-value highlight">${fmt(IMax)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年生产次数</div><div class="ri-value">${fmt(N)} <small>次</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">生产运行时间</div><div class="ri-value">${fmt(tRun)} <small>天</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">生产周期</div><div class="ri-value">${fmt(tCycle)} <small>天</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年准备成本</div><div class="ri-value">${fmt(setupCost)} <small>元</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">年持有成本</div><div class="ri-value">${fmt(holdCost)} <small>元</small></div></div>`;
        if (C > 0) {
            html += `<div class="result-item"><div class="ri-label">年生产成本</div><div class="ri-value">${fmt(productCost)} <small>元</small></div></div>`;
        }
        html += `<div class="result-item"><div class="ri-label">年总成本</div><div class="ri-value highlight">${fmt(TC)} <small>元</small></div></div>`;
        html += `</div>`;
        html += '</div>';

        // 对比提示
        html += `<div class="alert alert-info" style="margin-top:16px;">`;
        html += `💡 <strong>与 EOQ 对比：</strong>若忽略边生产边消耗（按 EOQ），Q* = ${fmt(eoq)} 件。`;
        html += `EPQ 批量更大（因为库存积累速度慢于采购入库），最大库存量 I_max = ${fmt(IMax)} < EOQ 的平均库存 ${fmt(eoq/2)}。`;
        html += `</div>`;

        // 计算步骤
        const steps = [
            {
                label: '计算日需求率 d',
                detail: `
                    d = D / 年工作天数<br>
                    d = <span class="formula">${fmt(D,0)}</span> / <span class="formula">${fmt(workDays,0)}</span><br>
                    d = <strong>${fmt(d)} 件/天</strong>
                `
            },
            {
                label: '验证可行性',
                detail: `
                    生产率 p = <span class="formula">${fmt(p)}</span> > 需求率 d = <span class="formula">${fmt(d)}</span> ✅<br>
                    ρ = d/p = <span class="formula">${fmt(rho, 4)}</span>（生产期间消耗比例）
                `
            },
            {
                label: '计算最优生产批量 Q*',
                detail: `
                    Q* = √(2DS / [H(1 - d/p)])<br>
                    Q* = √(2 × <span class="formula">${fmt(D,0)}</span> × <span class="formula">${fmt(S)}</span> / [<span class="formula">${fmt(H)}</span> × (1 - <span class="formula">${fmt(rho,4)}</span>)])<br>
                    Q* = √(<span class="formula">${fmt(2*D*S,0)}</span> / <span class="formula">${fmt(denom)}</span>)<br>
                    Q* = <strong>${fmt(Qstar)} 件</strong>
                `
            },
            {
                label: '计算最大库存量 I_max',
                detail: `
                    I_max = Q* × (1 - d/p)<br>
                    I_max = <span class="formula">${fmt(Qstar)}</span> × <span class="formula">${fmt(1 - rho, 4)}</span><br>
                    I_max = <strong>${fmt(IMax)} 件</strong><br>
                    <small style="color:#64748b;">生产结束时达到最大库存。此后库存以日需求率 d 消耗。</small>
                `
            },
            {
                label: '计算年总成本',
                detail: `
                    年准备成本 = N × S = <span class="formula">${fmt(N)}</span> × <span class="formula">${fmt(S)}</span> = <span class="formula">${fmt(setupCost)}</span> 元<br>
                    年持有成本 = (I_max/2) × H = <span class="formula">${fmt(IMax/2)}</span> × <span class="formula">${fmt(H)}</span> = <span class="formula">${fmt(holdCost)}</span> 元<br>
                    ${C > 0 ? `年生产成本 = D × C = ${fmt(productCost)} 元<br>` : ''}
                    TC = <strong>${fmt(TC)} 元</strong>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    }
});

window.EPQModule = App.modules.find(m => m.id === 'epq');
