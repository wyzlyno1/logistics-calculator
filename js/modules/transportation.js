/* ===== 运输问题求解模块 ===== */
App.register({
    id: 'transportation',
    name: '运输问题求解',
    icon: '🚚',
    category: '物流规划',
    order: 7,
    shortDesc: '最小元素法 + 伏格尔法 + 位势法',
    description: '求解运输问题的初始可行方案，使用位势法判断最优性，闭回路法调整至最优解。',
    fullWidth: true,

    // 状态
    nRows: 3,
    nCols: 4,
    supply: [],
    demand: [],
    costs: [],
    solution: [],
    optimal: false,

    init(container) {
        this.nRows = 3;
        this.nCols = 4;
        container.innerHTML = this._buildHTML();
        this._bindEvents(container);
        this._renderMatrix();
        this._loadSample();
    },

    _buildHTML() {
        return `
            <div style="display:grid; grid-template-columns:360px 1fr; gap:24px; align-items:start;">
                <div>
                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">⚙️</span>问题规模</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>产地数 m</label>
                                <input type="number" id="tp-rows" value="3" min="1" max="10" step="1">
                            </div>
                            <div class="form-group">
                                <label>销地数 n</label>
                                <input type="number" id="tp-cols" value="4" min="1" max="10" step="1">
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm btn-block" id="tp-resize">更新矩阵大小</button>
                    </div>

                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">📋</span>运价矩阵 & 供需量</div>
                        <div id="tp-matrix-container"></div>
                    </div>

                    <div class="card">
                        <div class="card-title"><span class="card-icon">▶️</span>求解</div>
                        <button class="btn btn-primary btn-block" id="tp-solve-min">最小元素法求初始解</button>
                        <button class="btn btn-secondary btn-block" style="margin-top:8px;" id="tp-solve-vogel">伏格尔法 (Vogel) 求初始解</button>
                        <button class="btn btn-secondary btn-block" style="margin-top:8px; background:var(--primary-dark); color:#fff;" id="tp-optimize">位势法检验 + 闭回路调整至最优</button>
                    </div>
                </div>

                <div id="tp-result"></div>
            </div>
        `;
    },

    _bindEvents(container) {
        container.querySelector('#tp-resize').addEventListener('click', () => {
            this.nRows = parseInt(document.getElementById('tp-rows').value) || 3;
            this.nCols = parseInt(document.getElementById('tp-cols').value) || 4;
            this.nRows = Math.max(1, Math.min(10, this.nRows));
            this.nCols = Math.max(1, Math.min(10, this.nCols));
            document.getElementById('tp-rows').value = this.nRows;
            document.getElementById('tp-cols').value = this.nCols;
            this._renderMatrix();
        });

        container.querySelector('#tp-solve-min').addEventListener('click', () => this._solve('min-cost'));
        container.querySelector('#tp-solve-vogel').addEventListener('click', () => this._solve('vogel'));
        container.querySelector('#tp-optimize').addEventListener('click', () => this._optimize());
    },

    _renderMatrix() {
        const container = document.getElementById('tp-matrix-container');
        const m = this.nRows;
        const n = this.nCols;

        let html = '<div class="data-table-container"><table class="data-table"><thead><tr>';
        html += '<th></th>';
        for (let j = 0; j < n; j++) html += `<th>销地 B${j + 1}</th>`;
        html += '<th>供应量</th>';
        html += '</tr></thead><tbody>';

        for (let i = 0; i < m; i++) {
            html += '<tr>';
            html += `<td><strong>产地 A${i + 1}</strong></td>`;
            for (let j = 0; j < n; j++) {
                const val = (this.costs[i] && this.costs[i][j] !== undefined) ? this.costs[i][j] : '';
                html += `<td><input type="number" id="tp-c-${i}-${j}" value="${val}" step="any" style="width:70px;" placeholder="0"></td>`;
            }
            const sVal = this.supply[i] !== undefined ? this.supply[i] : '';
            html += `<td><input type="number" id="tp-s-${i}" value="${sVal}" step="any" style="width:80px;" placeholder="0"></td>`;
            html += '</tr>';
        }

        // 需求量行
        html += '<tr style="background:var(--bg);">';
        html += '<td><strong>需求量</strong></td>';
        for (let j = 0; j < n; j++) {
            const dVal = this.demand[j] !== undefined ? this.demand[j] : '';
            html += `<td><input type="number" id="tp-d-${j}" value="${dVal}" step="any" style="width:70px;" placeholder="0"></td>`;
        }
        html += '<td></td></tr>';

        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    _loadSample() {
        // 经典例题：3×4 运输问题
        const sampleCosts = [
            [3, 11, 3, 10],
            [1, 9, 2, 8],
            [7, 4, 10, 5]
        ];
        const sampleSupply = [7, 4, 9];
        const sampleDemand = [3, 6, 5, 6];

        this.costs = sampleCosts;
        this.supply = sampleSupply;
        this.demand = sampleDemand;

        for (let i = 0; i < this.nRows; i++) {
            for (let j = 0; j < this.nCols; j++) {
                const el = document.getElementById(`tp-c-${i}-${j}`);
                if (el) el.value = sampleCosts[i] ? (sampleCosts[i][j] !== undefined ? sampleCosts[i][j] : '') : '';
            }
            const sEl = document.getElementById(`tp-s-${i}`);
            if (sEl) sEl.value = sampleSupply[i] !== undefined ? sampleSupply[i] : '';
        }
        for (let j = 0; j < this.nCols; j++) {
            const dEl = document.getElementById(`tp-d-${j}`);
            if (dEl) dEl.value = sampleDemand[j] !== undefined ? sampleDemand[j] : '';
        }
    },

    // 读取矩阵
    _readMatrix() {
        const m = this.nRows;
        const n = this.nCols;
        const costs = [];
        const supply = [];
        const demand = [];

        for (let i = 0; i < m; i++) {
            costs[i] = [];
            for (let j = 0; j < n; j++) {
                const el = document.getElementById(`tp-c-${i}-${j}`);
                costs[i][j] = el ? (parseNum(el.value) || 0) : 0;
            }
            const sEl = document.getElementById(`tp-s-${i}`);
            supply[i] = sEl ? (parseNum(sEl.value) || 0) : 0;
        }
        for (let j = 0; j < n; j++) {
            const dEl = document.getElementById(`tp-d-${j}`);
            demand[j] = dEl ? (parseNum(dEl.value) || 0) : 0;
        }

        this.costs = costs;
        this.supply = supply;
        this.demand = demand;

        return { m, n, costs, supply, demand };
    },

    // ===== 平衡检查 =====
    _checkBalance(supply, demand) {
        const sumS = supply.reduce((a, b) => a + b, 0);
        const sumD = demand.reduce((a, b) => a + b, 0);
        return { balanced: Math.abs(sumS - sumD) < 1e-10, sumS, sumD };
    },

    // ===== 最小元素法 =====
    _minCostMethod(costs, supply, demand) {
        const m = costs.length;
        const n = costs[0].length;
        const sol = Array.from({ length: m }, () => Array(n).fill(null));
        const s = [...supply];
        const d = [...demand];
        const remaining = [];

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                remaining.push({ i, j, cost: costs[i][j] });
            }
        }
        remaining.sort((a, b) => a.cost - b.cost);

        for (const { i, j } of remaining) {
            if (s[i] <= 1e-10 || d[j] <= 1e-10) continue;
            const alloc = Math.min(s[i], d[j]);
            sol[i][j] = alloc;
            s[i] -= alloc;
            d[j] -= alloc;
        }

        return sol;
    },

    // ===== 伏格尔法 =====
    _vogelMethod(costs, supply, demand) {
        const m = costs.length;
        const n = costs[0].length;
        const sol = Array.from({ length: m }, () => Array(n).fill(null));
        const s = [...supply];
        const d = [...demand];
        const activeRows = new Set([...Array(m)].map((_, i) => i));
        const activeCols = new Set([...Array(n)].map((_, j) => j));

        while (activeRows.size > 0 && activeCols.size > 0) {
            // 计算每行/列的罚数
            let maxPenalty = -1;
            let bestCell = null;
            let bestType = ''; // 'row' or 'col'

            // 行罚数
            for (const i of activeRows) {
                const rowCosts = [];
                for (const j of activeCols) rowCosts.push({ j, cost: costs[i][j] });
                rowCosts.sort((a, b) => a.cost - b.cost);

                const penalty = rowCosts.length > 1 ? rowCosts[1].cost - rowCosts[0].cost : rowCosts[0].cost;
                if (penalty > maxPenalty || (penalty === maxPenalty && rowCosts[0].cost < (bestCell ? costs[bestCell.i][bestCell.j] : Infinity))) {
                    maxPenalty = penalty;
                    bestCell = { i, j: rowCosts[0].j };
                    bestType = 'row';
                }
            }

            // 列罚数
            for (const j of activeCols) {
                const colCosts = [];
                for (const i of activeRows) colCosts.push({ i, cost: costs[i][j] });
                colCosts.sort((a, b) => a.cost - b.cost);

                const penalty = colCosts.length > 1 ? colCosts[1].cost - colCosts[0].cost : colCosts[0].cost;
                if (penalty > maxPenalty) {
                    maxPenalty = penalty;
                    bestCell = { i: colCosts[0].i, j };
                    bestType = 'col';
                }
            }

            if (!bestCell) break;

            const { i, j } = bestCell;
            const alloc = Math.min(s[i], d[j]);
            sol[i][j] = (sol[i][j] || 0) + alloc;
            s[i] -= alloc;
            d[j] -= alloc;

            if (s[i] <= 1e-10) activeRows.delete(i);
            if (d[j] <= 1e-10) activeCols.delete(j);
        }

        return sol;
    },

    // ===== MODI (位势法) =====
    _modiMethod(costs, sol) {
        const m = costs.length;
        const n = costs[0].length;
        const u = Array(m).fill(null);
        const v = Array(n).fill(null);
        u[0] = 0;

        // 迭代求解 ui, vj
        let changed = true;
        while (changed) {
            changed = false;
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    if (sol[i][j] !== null) {
                        if (u[i] !== null && v[j] === null) {
                            v[j] = costs[i][j] - u[i];
                            changed = true;
                        } else if (v[j] !== null && u[i] === null) {
                            u[i] = costs[i][j] - v[j];
                            changed = true;
                        }
                    }
                }
            }
        }

        // 计算检验数 Δij = cij - ui - vj
        const deltas = Array.from({ length: m }, () => Array(n).fill(null));
        let allNonNeg = true;
        let minDelta = Infinity;
        let enterCell = null;

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (sol[i][j] === null && u[i] !== null && v[j] !== null) {
                    deltas[i][j] = costs[i][j] - u[i] - v[j];
                    if (deltas[i][j] < -1e-10) {
                        allNonNeg = false;
                        if (deltas[i][j] < minDelta) {
                            minDelta = deltas[i][j];
                            enterCell = { i, j };
                        }
                    }
                }
            }
        }

        return { u, v, deltas, optimal: allNonNeg, enterCell };
    },

    // ===== 闭回路法 =====
    _findClosedPath(sol, startI, startJ) {
        const m = sol.length;
        const n = sol[0].length;

        // 收集已占用单元格
        const occupied = new Set();
        for (let i = 0; i < m; i++)
            for (let j = 0; j < n; j++)
                if (sol[i][j] !== null) occupied.add(`${i},${j}`);
        occupied.add(`${startI},${startJ}`);

        // DFS 找回路
        const path = [{ i: startI, j: startJ }];
        const visited = new Set();

        const dfs = (i, j, dir) => {
            // dir: 'row' means next move is along the row (change column), 'col' means along column (change row)
            if (path.length > 1 && i === startI && j === startJ) return true;

            const key = `${i},${j},${dir}`;
            if (visited.has(key)) return false;
            visited.add(key);

            if (dir === 'row') {
                // 沿行移动：找同行的占用格
                for (let jj = 0; jj < n; jj++) {
                    if (jj === j) continue;
                    if (!occupied.has(`${i},${jj}`)) continue;
                    if (jj === startJ && i === startI && path.length > 2) {
                        // 回到起点
                        return true;
                    }
                    path.push({ i, j: jj });
                    if (dfs(i, jj, 'col')) return true;
                    path.pop();
                }
            } else {
                // 沿列移动：找同列的占用格
                for (let ii = 0; ii < m; ii++) {
                    if (ii === i) continue;
                    if (!occupied.has(`${ii},${j}`)) continue;
                    if (ii === startI && j === startJ && path.length > 2) {
                        return true;
                    }
                    path.push({ i: ii, j });
                    if (dfs(ii, j, 'row')) return true;
                    path.pop();
                }
            }

            return false;
        };

        if (dfs(startI, startJ, 'row')) return path;
        return null;
    },

    // ===== 闭回路调整 =====
    _adjustByClosedPath(sol, path) {
        // path[0] 是入基格，交替取 θ 的最小值
        let theta = Infinity;
        for (let k = 1; k < path.length; k += 2) {
            const { i, j } = path[k];
            if (sol[i][j] !== null && sol[i][j] < theta) {
                theta = sol[i][j];
            }
        }

        if (theta === Infinity) return false;

        for (let k = 0; k < path.length; k++) {
            const { i, j } = path[k];
            if (k % 2 === 0) {
                // 加 θ
                sol[i][j] = (sol[i][j] || 0) + theta;
            } else {
                // 减 θ
                sol[i][j] -= theta;
                if (Math.abs(sol[i][j]) < 1e-10) sol[i][j] = null;
            }
        }

        return true;
    },

    // ===== 计算总成本 =====
    _totalCost(costs, sol) {
        let total = 0;
        for (let i = 0; i < costs.length; i++) {
            for (let j = 0; j < costs[0].length; j++) {
                if (sol[i][j] !== null) {
                    total += costs[i][j] * sol[i][j];
                }
            }
        }
        return total;
    },

    // ===== 求解初始解 =====
    _solve(method) {
        const { costs, supply, demand } = this._readMatrix();
        const m = this.nRows;
        const n = this.nCols;

        const balance = this._checkBalance(supply, demand);
        let resultDiv = document.getElementById('tp-result');

        let workingCosts, workingSupply, workingDemand, sol;

        if (!balance.balanced) {
            resultDiv.innerHTML = `<div class="alert alert-warning">
                ⚠️ 供需不平衡：总供应 = ${fmt(balance.sumS)}，总需求 = ${fmt(balance.sumD)}，差 ${fmt(balance.sumS - balance.sumD)}。
                将自动添加虚拟${balance.sumS < balance.sumD ? '产地' : '销地'}（运价为 0）。
            </div>`;
            // 添加虚拟行/列
            if (balance.sumS < balance.sumD) {
                workingCosts = costs.concat([Array(n).fill(0)]);
                workingSupply = supply.concat([balance.sumD - balance.sumS]);
                workingDemand = [...demand];
            } else {
                workingCosts = costs.map(row => row.concat([0]));
                workingSupply = [...supply];
                workingDemand = demand.concat([balance.sumS - balance.sumD]);
            }
        } else {
            workingCosts = costs.map(r => [...r]);
            workingSupply = [...supply];
            workingDemand = [...demand];
        }

        if (method === 'min-cost') {
            sol = this._minCostMethod(workingCosts, workingSupply, workingDemand);
        } else {
            sol = this._vogelMethod(workingCosts, workingSupply, workingDemand);
        }

        // 如果加了虚拟行/列，截断回原始大小
        if (!balance.balanced) {
            sol = sol.slice(0, m).map(row => row.slice(0, n));
        }

        this.solution = sol;
        this.optimal = false;

        const totalCost = this._totalCost(costs, sol);
        const methodName = method === 'min-cost' ? '最小元素法' : '伏格尔法 (Vogel)';
        resultDiv.innerHTML = this._renderSolution(costs, supply, demand, sol, methodName, totalCost, null, null);
    },

    // ===== 优化至最优解 =====
    _optimize() {
        if (!this.solution || this.solution.length === 0) {
            document.getElementById('tp-result').innerHTML =
                '<div class="alert alert-error">⚠️ 请先使用最小元素法或伏格尔法求解初始方案</div>';
            return;
        }

        const { costs, supply, demand } = this._readMatrix();
        let sol = this.solution.map(row => [...row]);
        let iter = 0;
        const maxIter = 50;
        const history = [];

        while (iter < maxIter) {
            const modiResult = this._modiMethod(costs, sol);
            if (modiResult.optimal) {
                this.optimal = true;
                break;
            }

            if (!modiResult.enterCell) break;

            const { i, j } = modiResult.enterCell;
            const path = this._findClosedPath(sol, i, j);
            if (!path) break;

            history.push({
                iter: iter + 1,
                enterCell: modiResult.enterCell,
                delta: modiResult.deltas[i][j],
                path: [...path],
                theta: Math.min(...path.filter((_, k) => k % 2 === 1).map(p => sol[p.i][p.j] || Infinity))
            });

            const adjusted = this._adjustByClosedPath(sol, path);
            if (!adjusted) break;

            iter++;
        }

        const totalCost = this._totalCost(costs, sol);
        this.solution = sol;

        document.getElementById('tp-result').innerHTML =
            this._renderSolution(costs, supply, demand, sol, '最优解（位势法检验通过）', totalCost, history, iter);
    },

    // ===== 渲染结果 =====
    _renderSolution(costs, supply, demand, sol, title, totalCost, history, iterCount) {
        const m = costs.length;
        const n = costs[0].length;

        let html = App.createResultCard(title, '🚚');
        html += App.createResultValue('总运输成本', fmt(totalCost), '元');

        // 解矩阵
        html += '<div style="margin-top:16px;">';
        html += '<div class="data-table-container"><table class="data-table"><thead><tr>';
        html += '<th></th>';
        for (let j = 0; j < n; j++) html += `<th>B${j + 1}</th>`;
        html += '<th>供应量</th>';
        html += '</tr></thead><tbody>';

        for (let i = 0; i < m; i++) {
            html += '<tr>';
            html += `<td><strong>A${i + 1}</strong></td>`;
            for (let j = 0; j < n; j++) {
                if (sol[i][j] !== null) {
                    html += `<td style="background:#dbeafe; text-align:center; font-weight:600;">
                        ${fmt(sol[i][j])}<br><small style="color:#64748b;">(${costs[i][j]})</small></td>`;
                } else {
                    html += `<td style="text-align:center; color:#cbd5e1;">—<br><small>(${costs[i][j]})</small></td>`;
                }
            }
            html += `<td><strong>${fmt(supply[i])}</strong></td>`;
            html += '</tr>';
        }

        // 需求量行
        html += '<tr style="background:var(--bg);"><td><strong>需求量</strong></td>';
        for (let j = 0; j < n; j++) {
            html += `<td><strong>${fmt(demand[j])}</strong></td>`;
        }
        html += '<td></td></tr>';

        html += '</tbody></table></div>';
        html += '</div>';
        html += '</div>';

        // 优化历史
        if (history && history.length > 0) {
            html += '<div class="card" style="margin-top:16px;">';
            html += `<div class="card-title"><span class="card-icon">🔄</span>优化过程 (共 ${iterCount} 次迭代)</div>`;
            history.forEach(h => {
                html += `
                    <div class="step-item">
                        <span class="step-label">第 ${h.iter} 次调整</span>
                        入基格：(${h.enterCell.i + 1}, ${h.enterCell.j + 1})，检验数 = ${fmt(h.delta)}<br>
                        闭回路：${h.path.map(p => `(${p.i+1},${p.j+1})`).join(' → ')}<br>
                        调整量 θ = ${fmt(h.theta)}
                    </div>`;
            });
            html += '</div>';
        } else if (this.solution && this.solution.length > 0 && !this.optimal) {
            // 可以进一步优化
            html += '<div class="alert alert-info" style="margin-top:16px;">';
            html += '💡 点击「位势法检验 + 闭回路调整至最优」可继续优化至最优解。';
            html += '</div>';
        } else if (this.optimal) {
            html += '<div class="alert alert-success" style="margin-top:16px;">';
            html += '✅ 当前解已是最优解，所有非基变量的检验数 ≥ 0。';
            html += '</div>';
        }

        return html;
    }
});

window.TransModule = App.modules.find(m => m.id === 'transportation');
