/* ===== 安全库存计算模块 ===== */
App.register({
    id: 'safety-stock',
    name: '安全库存计算',
    icon: '🛡️',
    category: '库存管理',
    order: 2,
    shortDesc: '安全库存、再订货点、服务水平分析',
    description: '根据需求分布和服务水平计算安全库存量与再订货点。支持三种模型：需求不确定、提前期不确定、两者均不确定。',
    fullWidth: false,

    init(container) {
        container.innerHTML = `
            <div class="sub-tabs">
                <div class="sub-tab active" data-tab="ss-demand">需求不确定</div>
                <div class="sub-tab" data-tab="ss-leadtime">提前期不确定</div>
                <div class="sub-tab" data-tab="ss-both">两者均不确定</div>
            </div>
            <div class="sub-tab-content active" id="ss-demand"></div>
            <div class="sub-tab-content" id="ss-leadtime"></div>
            <div class="sub-tab-content" id="ss-both"></div>
        `;

        this.renderDemandModel(document.getElementById('ss-demand'));
        this.renderLeadtimeModel(document.getElementById('ss-leadtime'));
        this.renderBothModel(document.getElementById('ss-both'));

        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    },

    // ===== 模型1: 只有需求不确定 =====
    renderDemandModel(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数 — 需求不确定模型</div>
                    <div class="form-group">
                        <label>平均日需求量 d̄ <span class="label-desc">(件/天)</span></label>
                        <input type="number" id="ss1-d" placeholder="例如：50" step="any">
                    </div>
                    <div class="form-group">
                        <label>日需求标准差 σ<span style="font-size:10px;">d</span> <span class="label-desc">(件/天)</span></label>
                        <input type="number" id="ss1-sigma" placeholder="例如：10" step="any">
                    </div>
                    <div class="form-group">
                        <label>提前期 L <span class="label-desc">(天)</span></label>
                        <input type="number" id="ss1-L" placeholder="例如：7" step="any">
                    </div>
                    <div class="form-group">
                        <label>服务水平</label>
                        <select id="ss1-sl" onchange="SSModule.toggleZInput('ss1')">
                            ${COMMON_SERVICE_LEVELS.map(sl => `<option value="${sl.value}">${sl.label}</option>`).join('')}
                            <option value="custom">自定义 Z 值</option>
                        </select>
                    </div>
                    <div class="form-group" id="ss1-z-group" style="display:none;">
                        <label>Z 值 <span class="label-desc">(标准正态分布)</span></label>
                        <input type="number" id="ss1-Z" placeholder="例如：1.645" step="any">
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
                        当前 Z 值：<strong id="ss1-z-display">1.645</strong>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="SSModule.calcDemandModel()">计算</button>
                </div>
                <div id="ss-demand-result"></div>
            </div>`;
    },

    calcDemandModel() {
        const d = parseNum(document.getElementById('ss1-d').value);
        const sigma = parseNum(document.getElementById('ss1-sigma').value);
        const L = parseNum(document.getElementById('ss1-L').value);
        const slSelect = document.getElementById('ss1-sl').value;

        const resultDiv = document.getElementById('ss-demand-result');

        if (!d || !sigma || !L) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有参数</div>';
            return;
        }
        if (d <= 0 || sigma < 0 || L <= 0) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 需求、提前期必须 > 0，标准差必须 ≥ 0</div>';
            return;
        }

        // 解析 Z 值
        let Z;
        if (slSelect === 'custom') {
            Z = parseNum(document.getElementById('ss1-Z').value);
        } else {
            Z = getZValue(parseFloat(slSelect));
        }

        if (Z === null || isNaN(Z)) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请选择有效的服务水平或输入 Z 值</div>';
            return;
        }

        // 计算
        const sigmaL = sigma * Math.sqrt(L); // 提前期内需求标准差
        const SS = Z * sigmaL;
        const ROP = d * L + SS;
        const avgDemandL = d * L; // 提前期内平均需求

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('安全库存 SS', fmt(SS), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">再订货点 ROP</div><div class="ri-value highlight">${fmt(ROP)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">提前期内平均需求</div><div class="ri-value">${fmt(avgDemandL)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">提前期内需求标准差 σL</div><div class="ri-value">${fmt(sigmaL)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">Z 值（服务水平 ${slSelect === 'custom' ? '自定义' : slSelect + '%'}）</div><div class="ri-value">${fmt(Z, 4)}</div></div>`;
        html += '</div>';
        html += '</div>';

        const steps = [
            {
                label: '确定 Z 值',
                detail: `服务水平 = ${slSelect === 'custom' ? '自定义' : slSelect + '%'} → Z = <strong>${fmt(Z, 4)}</strong>`
            },
            {
                label: '计算提前期内需求标准差 σL',
                detail: `
                    σ<span style="font-size:10px;">L</span> = σ<span style="font-size:10px;">d</span> × √L<br>
                    = <span class="formula">${fmt(sigma)}</span> × √<span class="formula">${fmt(L,0)}</span><br>
                    = <span class="formula">${fmt(sigma)}</span> × <span class="formula">${fmt(Math.sqrt(L))}</span><br>
                    = <strong>${fmt(sigmaL)} 件</strong>
                `
            },
            {
                label: '计算安全库存 SS',
                detail: `
                    SS = Z × σ<span style="font-size:10px;">L</span><br>
                    = <span class="formula">${fmt(Z,4)}</span> × <span class="formula">${fmt(sigmaL)}</span><br>
                    = <strong>${fmt(SS)} 件</strong>
                `
            },
            {
                label: '计算再订货点 ROP',
                detail: `
                    ROP = d̄ × L + SS<br>
                    = <span class="formula">${fmt(d)}</span> × <span class="formula">${fmt(L,0)}</span> + <span class="formula">${fmt(SS)}</span><br>
                    = <span class="formula">${fmt(avgDemandL)}</span> + <span class="formula">${fmt(SS)}</span><br>
                    = <strong>${fmt(ROP)} 件</strong><br>
                    <small style="color:#64748b;">当库存水平降至 ${fmt(ROP)} 件时，发出订货请求</small>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== 模型2: 只有提前期不确定 =====
    renderLeadtimeModel(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数 — 提前期不确定模型</div>
                    <div class="form-group">
                        <label>平均日需求量 d̄ <span class="label-desc">(件/天，确定值)</span></label>
                        <input type="number" id="ss2-d" placeholder="例如：50" step="any">
                    </div>
                    <div class="form-group">
                        <label>平均提前期 L̄ <span class="label-desc">(天)</span></label>
                        <input type="number" id="ss2-L" placeholder="例如：7" step="any">
                    </div>
                    <div class="form-group">
                        <label>提前期标准差 σ<span style="font-size:10px;">L</span> <span class="label-desc">(天)</span></label>
                        <input type="number" id="ss2-sigmaL" placeholder="例如：2" step="any">
                    </div>
                    <div class="form-group">
                        <label>服务水平</label>
                        <select id="ss2-sl" onchange="SSModule.toggleZInput('ss2')">
                            ${COMMON_SERVICE_LEVELS.map(sl => `<option value="${sl.value}">${sl.label}</option>`).join('')}
                            <option value="custom">自定义 Z 值</option>
                        </select>
                    </div>
                    <div class="form-group" id="ss2-z-group" style="display:none;">
                        <label>Z 值</label>
                        <input type="number" id="ss2-Z" placeholder="例如：1.645" step="any">
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
                        当前 Z 值：<strong id="ss2-z-display">1.645</strong>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="SSModule.calcLeadtimeModel()">计算</button>
                </div>
                <div id="ss-leadtime-result"></div>
            </div>`;
    },

    calcLeadtimeModel() {
        const d = parseNum(document.getElementById('ss2-d').value);
        const L = parseNum(document.getElementById('ss2-L').value);
        const sigmaL = parseNum(document.getElementById('ss2-sigmaL').value);
        const slSelect = document.getElementById('ss2-sl').value;

        const resultDiv = document.getElementById('ss-leadtime-result');

        if (!d || !L || !sigmaL) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有参数</div>';
            return;
        }

        let Z;
        if (slSelect === 'custom') {
            Z = parseNum(document.getElementById('ss2-Z').value);
        } else {
            Z = getZValue(parseFloat(slSelect));
        }

        if (Z === null || isNaN(Z)) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请选择有效的服务水平或输入 Z 值</div>';
            return;
        }

        const SS = Z * d * sigmaL;
        const ROP = d * L + SS;

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('安全库存 SS', fmt(SS), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">再订货点 ROP</div><div class="ri-value highlight">${fmt(ROP)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">提前期内平均需求</div><div class="ri-value">${fmt(d * L)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">需求标准差（来自提前期变异）</div><div class="ri-value">${fmt(d * sigmaL)} <small>件</small></div></div>`;
        html += '</div>';
        html += '</div>';

        const steps = [
            {
                label: '计算安全库存',
                detail: `
                    需求确定但提前期不确定时：SS = Z × d̄ × σ<span style="font-size:10px;">L</span><br>
                    SS = <span class="formula">${fmt(Z,4)}</span> × <span class="formula">${fmt(d)}</span> × <span class="formula">${fmt(sigmaL)}</span><br>
                    = <strong>${fmt(SS)} 件</strong>
                `
            },
            {
                label: '计算再订货点',
                detail: `
                    ROP = d̄ × L̄ + SS<br>
                    = <span class="formula">${fmt(d)}</span> × <span class="formula">${fmt(L,0)}</span> + <span class="formula">${fmt(SS)}</span><br>
                    = <strong>${fmt(ROP)} 件</strong>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== 模型3: 需求和提前期均不确定 =====
    renderBothModel(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📋</span>输入参数 — 综合模型</div>
                    <div class="form-group">
                        <label>平均日需求量 d̄ <span class="label-desc">(件/天)</span></label>
                        <input type="number" id="ss3-d" placeholder="例如：50" step="any">
                    </div>
                    <div class="form-group">
                        <label>日需求标准差 σ<span style="font-size:10px;">d</span> <span class="label-desc">(件/天)</span></label>
                        <input type="number" id="ss3-sigma" placeholder="例如：10" step="any">
                    </div>
                    <div class="form-group">
                        <label>平均提前期 L̄ <span class="label-desc">(天)</span></label>
                        <input type="number" id="ss3-L" placeholder="例如：7" step="any">
                    </div>
                    <div class="form-group">
                        <label>提前期标准差 σ<span style="font-size:10px;">L</span> <span class="label-desc">(天)</span></label>
                        <input type="number" id="ss3-sigmaL" placeholder="例如：2" step="any">
                    </div>
                    <div class="form-group">
                        <label>服务水平</label>
                        <select id="ss3-sl" onchange="SSModule.toggleZInput('ss3')">
                            ${COMMON_SERVICE_LEVELS.map(sl => `<option value="${sl.value}">${sl.label}</option>`).join('')}
                            <option value="custom">自定义 Z 值</option>
                        </select>
                    </div>
                    <div class="form-group" id="ss3-z-group" style="display:none;">
                        <label>Z 值</label>
                        <input type="number" id="ss3-Z" placeholder="例如：1.645" step="any">
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
                        当前 Z 值：<strong id="ss3-z-display">1.645</strong>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="SSModule.calcBothModel()">计算</button>
                </div>
                <div id="ss-both-result"></div>
            </div>`;
    },

    calcBothModel() {
        const d = parseNum(document.getElementById('ss3-d').value);
        const sigma = parseNum(document.getElementById('ss3-sigma').value);
        const L = parseNum(document.getElementById('ss3-L').value);
        const sigmaL = parseNum(document.getElementById('ss3-sigmaL').value);
        const slSelect = document.getElementById('ss3-sl').value;

        const resultDiv = document.getElementById('ss-both-result');

        if (!d || !sigma || !L || !sigmaL) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请填写所有参数</div>';
            return;
        }

        let Z;
        if (slSelect === 'custom') {
            Z = parseNum(document.getElementById('ss3-Z').value);
        } else {
            Z = getZValue(parseFloat(slSelect));
        }

        if (Z === null || isNaN(Z)) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请选择有效的服务水平或输入 Z 值</div>';
            return;
        }

        // 综合模型公式
        const sigmaCombined = Math.sqrt(L * sigma * sigma + d * d * sigmaL * sigmaL);
        const SS = Z * sigmaCombined;
        const ROP = d * L + SS;

        let html = App.createResultCard('计算结果', '📊');
        html += App.createResultValue('安全库存 SS', fmt(SS), '件');
        html += '<div class="result-grid">';
        html += `<div class="result-item"><div class="ri-label">再订货点 ROP</div><div class="ri-value highlight">${fmt(ROP)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">提前期内平均需求</div><div class="ri-value">${fmt(d * L)} <small>件</small></div></div>`;
        html += `<div class="result-item"><div class="ri-label">综合标准差 σc</div><div class="ri-value">${fmt(sigmaCombined)} <small>件</small></div></div>`;
        html += '</div>';
        html += '</div>';

        const steps = [
            {
                label: '计算提前期内需求综合标准差 σc',
                detail: `
                    σ<span style="font-size:10px;">c</span> = √(L̄ × σ<span style="font-size:10px;">d</span>² + d̄² × σ<span style="font-size:10px;">L</span>²)<br>
                    = √(<span class="formula">${fmt(L,0)}</span> × <span class="formula">${fmt(sigma)}</span>² + <span class="formula">${fmt(d)}</span>² × <span class="formula">${fmt(sigmaL)}</span>²)<br>
                    = √(<span class="formula">${fmt(L * sigma * sigma)}</span> + <span class="formula">${fmt(d * d * sigmaL * sigmaL)}</span>)<br>
                    = √(<span class="formula">${fmt(L * sigma * sigma + d * d * sigmaL * sigmaL)}</span>)<br>
                    = <strong>${fmt(sigmaCombined)} 件</strong>
                `
            },
            {
                label: '计算安全库存',
                detail: `
                    SS = Z × σ<span style="font-size:10px;">c</span><br>
                    = <span class="formula">${fmt(Z,4)}</span> × <span class="formula">${fmt(sigmaCombined)}</span><br>
                    = <strong>${fmt(SS)} 件</strong>
                `
            },
            {
                label: '计算再订货点',
                detail: `
                    ROP = d̄ × L̄ + SS<br>
                    = <span class="formula">${fmt(d)}</span> × <span class="formula">${fmt(L,0)}</span> + <span class="formula">${fmt(SS)}</span><br>
                    = <strong>${fmt(ROP)} 件</strong>
                `
            }
        ];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== Z 值输入切换 =====
    toggleZInput(prefix) {
        const select = document.getElementById(prefix + '-sl');
        const zGroup = document.getElementById(prefix + '-z-group');
        const zDisplay = document.getElementById(prefix + '-z-display');

        if (select.value === 'custom') {
            zGroup.style.display = 'block';
            zDisplay.textContent = '自定义';
        } else {
            zGroup.style.display = 'none';
            const Z = getZValue(parseFloat(select.value));
            zDisplay.textContent = Z !== null ? fmt(Z, 4) : '—';
        }
    }
});

// 暴露到全局
window.SSModule = App.modules.find(m => m.id === 'safety-stock');
