/* ===== 需求预测方法模块 ===== */
App.register({
    id: 'forecasting',
    name: '需求预测方法',
    icon: '📈',
    category: '需求管理',
    order: 5,
    shortDesc: '移动平均、指数平滑、误差分析',
    description: '多种时间序列预测方法，含 MAD/MSE/MAPE 误差分析。输入历史数据，输出预测值和精度评估。',
    fullWidth: true,

    sampleData: '120, 135, 128, 142, 138, 150, 145, 158, 152, 165, 160, 172',

    init(container) {
        container.innerHTML = `
            <div class="sub-tabs">
                <div class="sub-tab active" data-tab="fc-ma">移动平均法</div>
                <div class="sub-tab" data-tab="fc-wma">加权移动平均</div>
                <div class="sub-tab" data-tab="fc-ses">一次指数平滑</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div>
                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">📋</span>历史数据</div>
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">每行一个值，按时间顺序排列（最早→最晚）</p>
                        <div class="form-group">
                            <textarea id="fc-data" rows="6">${this.sampleData}</textarea>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="FcModule.loadSample()">📥 加载示例</button>
                            <div class="form-group" style="flex:1; margin-bottom:0;">
                                <label>预测期数 <span class="label-desc">(未来多少期)</span></label>
                                <input type="number" id="fc-periods" value="3" min="1" max="20" step="1">
                            </div>
                        </div>
                    </div>

                    <!-- 移动平均参数 -->
                    <div class="card sub-tab-content active" id="fc-ma">
                        <div class="card-title"><span class="card-icon">⚙️</span>参数设置</div>
                        <div class="form-group">
                            <label>移动平均期数 n</label>
                            <input type="number" id="fc-ma-n" value="3" min="2" max="20" step="1">
                        </div>
                        <button class="btn btn-primary btn-block" onclick="FcModule.calcMA()">计算预测</button>
                    </div>

                    <!-- 加权移动平均参数 -->
                    <div class="card sub-tab-content" id="fc-wma">
                        <div class="card-title"><span class="card-icon">⚙️</span>参数设置</div>
                        <div class="form-group">
                            <label>移动期数 n</label>
                            <input type="number" id="fc-wma-n" value="3" min="2" max="10" step="1">
                        </div>
                        <div class="form-group">
                            <label>权重 <span class="label-desc">(逗号分隔，从最近到最远，和应为1)</span></label>
                            <input type="text" id="fc-wma-weights" value="0.5, 0.3, 0.2" placeholder="例如：0.5, 0.3, 0.2">
                        </div>
                        <button class="btn btn-primary btn-block" onclick="FcModule.calcWMA()">计算预测</button>
                    </div>

                    <!-- 指数平滑参数 -->
                    <div class="card sub-tab-content" id="fc-ses">
                        <div class="card-title"><span class="card-icon">⚙️</span>参数设置</div>
                        <div class="form-group">
                            <label>平滑系数 α</label>
                            <input type="number" id="fc-ses-alpha" value="0.3" min="0.01" max="0.99" step="0.01">
                        </div>
                        <p style="font-size:12px;color:var(--text-muted);">α 越大，近期数据权重越大；α 越小，预测越平滑</p>
                        <button class="btn btn-primary btn-block" onclick="FcModule.calcSES()">计算预测</button>
                    </div>
                </div>

                <div id="fc-result"></div>
            </div>
        `;

        // 子标签切换
        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                container.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
                const targetId = tab.dataset.tab;
                // 显示参数面板
                document.getElementById(targetId).classList.add('active');
            });
        });
    },

    loadSample() {
        document.getElementById('fc-data').value = this.sampleData;
    },

    // 读取历史数据
    readData() {
        const raw = document.getElementById('fc-data').value.trim();
        const data = raw.split(/[\n,，\s]+/).map(v => parseNum(v)).filter(v => !isNaN(v));
        return data;
    },

    // 误差计算
    calcErrors(actual, forecast) {
        const errors = [];
        for (let i = 0; i < Math.min(actual.length, forecast.length); i++) {
            if (forecast[i] !== null && forecast[i] !== undefined) {
                errors.push(actual[i] - forecast[i]);
            }
        }
        if (errors.length === 0) return { MAD: null, MSE: null, MAPE: null, errors: [] };

        const MAD = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
        const MSE = errors.reduce((s, e) => s + e * e, 0) / errors.length;
        const MAPE = (errors.reduce((s, e, i) => {
            // actual 值对应 forecast[i] 对应的 actual 值
            return s + Math.abs(e / actual[i + (actual.length - errors.length)]);
        }, 0) / errors.length) * 100;

        return { MAD, MSE, MAPE, errors };
    },

    // 生成结果表格和误差摘要
    renderResults(actual, forecasts, methodName, futureForecasts = []) {
        const periods = parseInt(document.getElementById('fc-periods').value) || 3;

        // 构建预测对照表
        const rows = [];
        const n = actual.length;

        for (let t = 0; t < n; t++) {
            rows.push([
                t + 1,
                fmt(actual[t], 1),
                forecasts[t] !== null ? fmt(forecasts[t], 2) : '—',
                forecasts[t] !== null ? fmt(Math.abs(actual[t] - forecasts[t]), 2) : '—'
            ]);
        }

        // 未来预测
        for (let f = 0; f < futureForecasts.length; f++) {
            rows.push([
                n + f + 1,
                '（未来）',
                `<strong>${fmt(futureForecasts[f], 2)}</strong>`,
                '—'
            ]);
        }

        // 计算误差（只对已有 forecast 的部分）
        const validPairs = [];
        for (let t = 0; t < n; t++) {
            if (forecasts[t] !== null) validPairs.push({ a: actual[t], f: forecasts[t] });
        }

        let errHTML = '';
        if (validPairs.length > 0) {
            const MAD = validPairs.reduce((s, p) => s + Math.abs(p.a - p.f), 0) / validPairs.length;
            const MSE = validPairs.reduce((s, p) => s + (p.a - p.f) ** 2, 0) / validPairs.length;
            const MAPE = validPairs.reduce((s, p) => s + Math.abs((p.a - p.f) / p.a), 0) / validPairs.length * 100;

            errHTML = `
                <div class="card" style="margin-top:16px;">
                    <div class="card-title"><span class="card-icon">📏</span>误差评估</div>
                    <div class="result-grid">
                        <div class="result-item">
                            <div class="ri-label">MAD（平均绝对偏差）</div>
                            <div class="ri-value">${fmt(MAD, 2)}</div>
                        </div>
                        <div class="result-item">
                            <div class="ri-label">MSE（均方误差）</div>
                            <div class="ri-value">${fmt(MSE, 2)}</div>
                        </div>
                        <div class="result-item">
                            <div class="ri-label">MAPE（平均绝对百分比误差）</div>
                            <div class="ri-value">${fmt(MAPE, 2)}%</div>
                        </div>
                        <div class="result-item">
                            <div class="ri-label">RMSE（均方根误差）</div>
                            <div class="ri-value">${fmt(Math.sqrt(MSE), 2)}</div>
                        </div>
                    </div>
                    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">
                        MAPE < 10% → 高精度 | 10-20% → 良好 | 20-50% → 一般 | > 50% → 差
                    </p>
                </div>`;
        }

        let futureHTML = '';
        if (futureForecasts.length > 0) {
            futureHTML = `
                <div class="alert alert-success" style="margin-top:16px;">
                    📊 <strong>未来 ${periods} 期预测：</strong>
                    ${futureForecasts.map((f, i) => `第${i+1}期 = ${fmt(f, 2)}`).join(' | ')}
                </div>`;
        }

        let html = App.createResultCard('预测结果 — ' + methodName, '📈');
        html += App.createTable(
            ['时期', '实际值', '预测值', '绝对误差'],
            rows
        );
        html += '</div>'; // close card
        html += errHTML;
        html += futureHTML;

        return html;
    },

    // ===== 1. 简单移动平均 =====
    calcMA() {
        const data = this.readData();
        const n = parseInt(document.getElementById('fc-ma-n').value) || 3;
        const periods = parseInt(document.getElementById('fc-periods').value) || 3;
        const resultDiv = document.getElementById('fc-result');

        if (data.length < n + 1) {
            resultDiv.innerHTML = `<div class="alert alert-error">⚠️ 数据不足：至少需要 ${n + 1} 期历史数据（n=${n}）</div>`;
            return;
        }

        // 计算历史拟合值
        const forecasts = [];
        for (let t = 0; t < data.length; t++) {
            if (t < n) {
                forecasts.push(null); // 前 n 期无法预测
            } else {
                let sum = 0;
                for (let j = 1; j <= n; j++) sum += data[t - j];
                forecasts.push(sum / n);
            }
        }

        // 未来预测
        const futureForecasts = [];
        let lastN = data.slice(-n);
        for (let f = 0; f < periods; f++) {
            const fc = lastN.reduce((s, v) => s + v, 0) / n;
            futureForecasts.push(fc);
            lastN.shift();
            lastN.push(fc); // 使用预测值继续滚动
        }

        resultDiv.innerHTML = this.renderResults(data, forecasts, `移动平均法 (n=${n})`, futureForecasts);
    },

    // ===== 2. 加权移动平均 =====
    calcWMA() {
        const data = this.readData();
        const n = parseInt(document.getElementById('fc-wma-n').value) || 3;
        const periods = parseInt(document.getElementById('fc-periods').value) || 3;
        const weightsRaw = document.getElementById('fc-wma-weights').value.trim();
        const resultDiv = document.getElementById('fc-result');

        // 解析权重
        const weights = weightsRaw.split(/[,，\s]+/).map(v => parseNum(v)).filter(v => !isNaN(v));

        if (weights.length !== n) {
            resultDiv.innerHTML = `<div class="alert alert-error">⚠️ 权重数量 (${weights.length}) 与移动期数 n (${n}) 不匹配</div>`;
            return;
        }

        const wSum = weights.reduce((s, w) => s + w, 0);
        if (Math.abs(wSum - 1) > 0.01) {
            resultDiv.innerHTML = `<div class="alert alert-warning">⚠️ 权重之和为 ${fmt(wSum)}，不等于 1。将自动归一化。</div>`;
            // 归一化
            for (let i = 0; i < weights.length; i++) weights[i] /= wSum;
        }

        if (data.length < n + 1) {
            resultDiv.innerHTML = `<div class="alert alert-error">⚠️ 数据不足：至少需要 ${n + 1} 期数据</div>`;
            return;
        }

        // 计算
        const forecasts = [];
        for (let t = 0; t < data.length; t++) {
            if (t < n) {
                forecasts.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += weights[j] * data[t - 1 - j]; // weights[0] 是最新一期
                }
                forecasts.push(sum);
            }
        }

        const lastN = data.slice(-n).reverse(); // 最新的在前
        const futureForecasts = [];
        let buf = [...lastN];
        for (let f = 0; f < periods; f++) {
            let sum = 0;
            for (let j = 0; j < n; j++) sum += weights[j] * buf[j];
            futureForecasts.push(sum);
            buf.unshift(sum);
            buf.pop();
        }

        resultDiv.innerHTML = this.renderResults(data, forecasts, `加权移动平均 (n=${n})`, futureForecasts);
    },

    // ===== 3. 一次指数平滑 =====
    calcSES() {
        const data = this.readData();
        const alpha = parseNum(document.getElementById('fc-ses-alpha').value);
        const periods = parseInt(document.getElementById('fc-periods').value) || 3;
        const resultDiv = document.getElementById('fc-result');

        if (isNaN(alpha) || alpha <= 0 || alpha >= 1) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ α 必须在 0~1 之间（不含端点）</div>';
            return;
        }

        if (data.length < 3) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 至少需要 3 期历史数据</div>';
            return;
        }

        // 初始值：使用前两期平均
        const F0 = data[0];
        const forecasts = [null]; // 第一期无预测

        for (let t = 0; t < data.length; t++) {
            if (t === 0) {
                forecasts.push(F0); // 第2期的预测 = F1 = α×D1 + (1-α)×F1
            }
            // Ft+1 = α×Dt + (1-α)×Ft
        }

        // 重新计算
        const fc = [null]; // fc[t] = forecast for period t
        let Ft = F0;
        for (let t = 0; t < data.length; t++) {
            const Ft1 = alpha * data[t] + (1 - alpha) * Ft;
            fc.push(Ft1);
            Ft = Ft1;
        }

        // fc[0]=null, fc[1]=F1(for period 2), ..., fc[n]=F_{n+1}(for period n+1)
        // 要对齐：forecasts[t] 应该是时期 t 的预测值 (t from 0 to n-1)
        // t=0 期：无预测
        // t=1 期：预测值 = fc[1] = F1
        // t=2 期：预测值 = fc[2] = F2
        // ...

        const alignedForecasts = [];
        for (let t = 0; t < data.length; t++) {
            if (t === 0) {
                alignedForecasts.push(null);
            } else {
                alignedForecasts.push(fc[t]);
            }
        }

        // 未来预测
        const futureForecasts = [];
        let lastF = fc[fc.length - 1];
        for (let f = 0; f < periods; f++) {
            futureForecasts.push(lastF); // SES 对未来所有期的预测相同
        }

        resultDiv.innerHTML = this.renderResults(data, alignedForecasts, `一次指数平滑 (α=${alpha})`, futureForecasts);
    }
});

window.FcModule = App.modules.find(m => m.id === 'forecasting');
