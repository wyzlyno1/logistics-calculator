/* ===== 物流网络优化可视化 ===== */
App.register({
    id: 'network-optimization',
    name: '物流网络优化',
    icon: '🕸️',
    category: '物流规划',
    order: 8,
    shortDesc: '最短路径 + 最小生成树 + 最大流',
    description: '图论算法可视化。输入节点和边，运行 Dijkstra 最短路径、Prim 最小生成树、Ford-Fulkerson 最大流算法，在图上高亮展示结果。',
    fullWidth: true,

    // 图数据
    nodes: [],
    edges: [],
    nextNodeId: 0,

    init(container) {
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:380px 1fr; gap:24px; align-items:start;">
                <div>
                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">🔧</span>图数据</div>
                        <div style="display:flex; gap:6px; margin-bottom:10px;">
                            <input type="text" id="no-node-name" placeholder="节点名" style="width:80px;" maxlength="4">
                            <button class="btn btn-secondary btn-sm" id="no-add-node">+ 添加节点</button>
                            <button class="btn btn-secondary btn-sm" id="no-sample">📥 示例</button>
                            <button class="btn btn-secondary btn-sm" id="no-clear" style="color:var(--error);">清空</button>
                        </div>
                        <div style="display:flex; gap:6px; margin-bottom:4px;">
                            <select id="no-edge-from" style="width:85px; font-size:12px;"><option value="">起点</option></select>
                            <select id="no-edge-to" style="width:85px; font-size:12px;"><option value="">终点</option></select>
                            <input type="number" id="no-edge-wt" placeholder="权值" style="width:70px; font-size:12px;" step="any">
                            <button class="btn btn-secondary btn-sm" id="no-add-edge">+ 加边</button>
                        </div>
                    </div>

                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">▶️</span>算法</div>
                        <div class="form-group">
                            <label>选择算法</label>
                            <select id="no-algo">
                                <option value="dijkstra">Dijkstra 最短路径</option>
                                <option value="prim">Prim 最小生成树</option>
                                <option value="maxflow">Ford-Fulkerson 最大流</option>
                            </select>
                        </div>
                        <div id="no-algo-params"></div>
                        <button class="btn btn-primary btn-block" onclick="NetOptModule.run()">运行算法</button>
                    </div>

                    <div class="card">
                        <div class="card-title"><span class="card-icon">📋</span>边列表</div>
                        <div id="no-edge-list" style="max-height:200px; overflow-y:auto;"></div>
                    </div>
                </div>

                <div>
                    <div class="card" style="margin-bottom:16px;">
                        <div class="card-title"><span class="card-icon">🖼️</span>网络图</div>
                        <div style="border:1px solid var(--border); border-radius:var(--radius);">
                            <canvas id="no-canvas" style="width:100%; display:block;"></canvas>
                        </div>
                    </div>
                    <div id="no-result"></div>
                </div>
            </div>
        `;

        this._bindEvents(container);
        this._updateAlgoParams();
        this._loadSample();
    },

    _bindEvents(container) {
        document.getElementById('no-add-node').addEventListener('click', () => {
            const input = document.getElementById('no-node-name');
            const name = input.value.trim() || String.fromCharCode(65 + this.nextNodeId);
            this.nodes.push({ id: this.nextNodeId++, name: name, x: 0, y: 0 });
            input.value = '';
            this._refresh();
        });

        document.getElementById('no-add-edge').addEventListener('click', () => {
            const from = parseInt(document.getElementById('no-edge-from').value);
            const to = parseInt(document.getElementById('no-edge-to').value);
            const wt = parseFloat(document.getElementById('no-edge-wt').value);
            if (isNaN(from) || isNaN(to) || isNaN(wt) || from === to) return;
            // 检查重复
            if (this.edges.find(e => e.from === from && e.to === to)) return;
            this.edges.push({ from, to, weight: wt });
            this._refresh();
        });

        document.getElementById('no-sample').addEventListener('click', () => this._loadSample());
        document.getElementById('no-clear').addEventListener('click', () => {
            this.nodes = [];
            this.edges = [];
            this.nextNodeId = 0;
            this._refresh();
            document.getElementById('no-result').innerHTML = '';
        });

        document.getElementById('no-algo').addEventListener('change', () => this._updateAlgoParams());
    },

    _updateAlgoParams() {
        const algo = document.getElementById('no-algo').value;
        const div = document.getElementById('no-algo-params');
        const nodeOpts = this.nodes.map(n => '<option value="' + n.id + '">' + n.name + '</option>').join('');

        if (algo === 'dijkstra') {
            div.innerHTML =
                '<div class="form-row">' +
                '<div class="form-group"><label>起点</label><select id="no-d-start">' + nodeOpts + '</select></div>' +
                '<div class="form-group"><label>终点</label><select id="no-d-end">' + nodeOpts + '</select></div>' +
                '</div>';
        } else if (algo === 'prim') {
            div.innerHTML = '<p style="font-size:12px;color:var(--text-muted);">从所有节点出发，找连接全部节点的最小总权边集。</p>';
        } else if (algo === 'maxflow') {
            div.innerHTML =
                '<div class="form-row">' +
                '<div class="form-group"><label>源点 Source</label><select id="no-mf-s">' + nodeOpts + '</select></div>' +
                '<div class="form-group"><label>汇点 Sink</label><select id="no-mf-t">' + nodeOpts + '</select></div>' +
                '</div>';
        }
    },

    _loadSample() {
        // 经典物流网络示例
        this.nodes = [
            { id: 0, name: 'A', x: 0, y: 0 },
            { id: 1, name: 'B', x: 0, y: 0 },
            { id: 2, name: 'C', x: 0, y: 0 },
            { id: 3, name: 'D', x: 0, y: 0 },
            { id: 4, name: 'E', x: 0, y: 0 },
            { id: 5, name: 'F', x: 0, y: 0 },
        ];
        this.nextNodeId = 6;
        this.edges = [
            { from: 0, to: 1, weight: 4 },
            { from: 0, to: 2, weight: 2 },
            { from: 1, to: 2, weight: 5 },
            { from: 1, to: 3, weight: 10 },
            { from: 2, to: 4, weight: 3 },
            { from: 4, to: 3, weight: 4 },
            { from: 3, to: 5, weight: 11 },
            { from: 4, to: 5, weight: 8 },
        ];
        this._refresh();
        document.getElementById('no-result').innerHTML = '';
    },

    _refresh() {
        // 更新边列表
        const edgeList = document.getElementById('no-edge-list');
        if (this.edges.length === 0) {
            edgeList.innerHTML = '<p style="font-size:12px;color:var(--text-muted);padding:8px;">暂无边</p>';
        } else {
            let html = '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
            this.edges.forEach((e, i) => {
                const fn = this._nodeName(e.from);
                const tn = this._nodeName(e.to);
                html += '<tr><td style="padding:4px 6px;border-bottom:1px solid var(--border);">' +
                    fn + ' → ' + tn + '</td><td style="padding:4px 6px;border-bottom:1px solid var(--border);text-align:right;">' + fmt(e.weight, 0) + '</td>' +
                    '<td style="padding:4px 6px;border-bottom:1px solid var(--border);"><button class="btn btn-secondary btn-sm" style="font-size:10px;color:var(--error);padding:2px 6px;" ' +
                    'onclick="NetOptModule._removeEdge(' + i + ')">×</button></td></tr>';
            });
            html += '</table>';
            edgeList.innerHTML = html;
        }

        // 更新下拉列表
        const nodeNameMap = this.nodes.map(n => '<option value="' + n.id + '">' + n.name + '</option>').join('');
        ['no-edge-from', 'no-edge-to'].forEach(id => {
            const sel = document.getElementById(id);
            if (sel) {
                const val = sel.value;
                sel.innerHTML = '<option value="">—</option>' + nodeNameMap;
                sel.value = val;
            }
        });

        this._updateAlgoParams();
        this._drawGraph();
    },

    _removeEdge(index) {
        this.edges.splice(index, 1);
        this._refresh();
    },

    _nodeName(id) {
        const n = this.nodes.find(n => n.id === id);
        return n ? n.name : '?';
    },

    // ===== 画图 =====
    _drawGraph(highlightedEdges, nodeColors) {
        const canvas = document.getElementById('no-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const parentW = canvas.parentElement.clientWidth;
        const W = parentW || 600;
        const H = 350;

        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2;
        const r = Math.min(W, H) * 0.35;
        const n = this.nodes.length;

        // 节点位置（圆形排列）
        const positions = {};
        this.nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2;
            positions[node.id] = {
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle)
            };
        });

        // 画边
        this.edges.forEach(e => {
            const fp = positions[e.from];
            const tp = positions[e.to];
            if (!fp || !tp) return;

            const isHighlighted = highlightedEdges && highlightedEdges.some(
                h => (h.from === e.from && h.to === e.to) || (h.from === e.to && h.to === e.from)
            );

            ctx.strokeStyle = isHighlighted ? '#2563eb' : '#cbd5e1';
            ctx.lineWidth = isHighlighted ? 3 : 1.5;
            ctx.beginPath();
            ctx.moveTo(fp.x, fp.y);
            ctx.lineTo(tp.x, tp.y);
            ctx.stroke();

            // 权值标签
            const mx = (fp.x + tp.x) / 2;
            const my = (fp.y + tp.y) / 2;
            ctx.fillStyle = isHighlighted ? '#2563eb' : '#64748b';
            ctx.font = (isHighlighted ? 'bold ' : '') + '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(fmt(e.weight, 0), mx, my - 6);
        });

        // 画节点
        this.nodes.forEach(node => {
            const p = positions[node.id];
            if (!p) return;

            const color = (nodeColors && nodeColors[node.id]) ? nodeColors[node.id] : '#2563eb';
            const isSpecial = nodeColors && nodeColors[node.id];

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, isSpecial ? 22 : 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.name, p.x, p.y);
        });

        // 没有边时的提示
        if (this.nodes.length === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('点击「+ 添加节点」或「示例」开始', cx, cy);
        }
    },

    // ===== 算法执行 =====
    run() {
        const algo = document.getElementById('no-algo').value;
        const resultDiv = document.getElementById('no-result');

        if (this.nodes.length < 2) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 至少需要 2 个节点</div>';
            return;
        }
        if (this.edges.length < 1) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 至少需要 1 条边</div>';
            return;
        }

        if (algo === 'dijkstra') this._runDijkstra(resultDiv);
        else if (algo === 'prim') this._runPrim(resultDiv);
        else if (algo === 'maxflow') this._runMaxFlow(resultDiv);
    },

    // ===== Dijkstra =====
    _runDijkstra(resultDiv) {
        const startId = parseInt(document.getElementById('no-d-start').value);
        const endId = parseInt(document.getElementById('no-d-end').value);

        if (isNaN(startId) || isNaN(endId)) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请选择起点和终点</div>';
            return;
        }
        if (startId === endId) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 起点和终点不能相同</div>';
            return;
        }

        // 构建邻接表
        const adj = {};  // nodeId -> [{to, weight}]
        this.nodes.forEach(n => { adj[n.id] = []; });
        this.edges.forEach(e => {
            adj[e.from].push({ to: e.to, weight: e.weight });
            adj[e.to].push({ to: e.from, weight: e.weight }); // 无向图
        });

        // Dijkstra
        const dist = {}, prev = {}, visited = {};
        this.nodes.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
        dist[startId] = 0;

        const unvisited = new Set(this.nodes.map(n => n.id));
        while (unvisited.size > 0) {
            let minDist = Infinity, u = null;
            for (const id of unvisited) {
                if (dist[id] < minDist) { minDist = dist[id]; u = id; }
            }
            if (u === null || dist[u] === Infinity) break;
            if (u === endId) break;

            unvisited.delete(u);
            visited[u] = true;

            for (const { to, weight } of adj[u]) {
                if (!visited[to]) {
                    const alt = dist[u] + weight;
                    if (alt < dist[to]) {
                        dist[to] = alt;
                        prev[to] = u;
                    }
                }
            }
        }

        // 回溯路径
        const path = [];
        let cur = endId;
        while (cur !== null) {
            path.unshift(cur);
            cur = prev[cur];
        }

        if (path[0] !== startId) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 从 ' + this._nodeName(startId) + ' 无法到达 ' + this._nodeName(endId) + '</div>';
            this._drawGraph();
            return;
        }

        // 路径上的边
        const pathEdges = [];
        for (let i = 0; i < path.length - 1; i++) {
            pathEdges.push({ from: path[i], to: path[i + 1] });
        }

        const nodeColors = {};
        nodeColors[startId] = '#10b981';
        nodeColors[endId] = '#ef4444';

        this._drawGraph(pathEdges, nodeColors);

        let html = App.createResultCard('Dijkstra 最短路径', '🛣️');
        html += App.createResultValue('最短距离', fmt(dist[endId], 0), '');
        html += '<p style="font-size:14px; margin-top:8px;">路径：' +
            path.map(id => '<strong>' + this._nodeName(id) + '</strong>').join(' → ') + '</p>';
        html += '</div>';

        // 距离表
        html += '<div class="card" style="margin-top:16px;"><div class="card-title"><span class="card-icon">📋</span>各节点最短距离</div>';
        const sortedNodes = [...this.nodes].sort((a, b) => (dist[a.id] === Infinity ? 1 : 0) - (dist[b.id] === Infinity ? 1 : 0));
        html += App.createTable(
            ['节点', '最短距离', '前驱'],
            sortedNodes.map(n => [n.name, dist[n.id] === Infinity ? '∞' : fmt(dist[n.id], 0), prev[n.id] !== null ? this._nodeName(prev[n.id]) : '—'])
        );
        html += '</div>';

        const steps = [{
            label: '逐步扩展最短路径树',
            detail: '从起点 ' + this._nodeName(startId) + ' 开始，每次选择未访问节点中距离最小的，更新其邻居距离。<br>' +
                '最终找到 ' + this._nodeName(startId) + ' → ' + this._nodeName(endId) + ' 的最短路径：<strong>' + fmt(dist[endId], 0) + '</strong>'
        }];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== Prim MST =====
    _runPrim(resultDiv) {
        if (this.nodes.length < 2) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 至少需要 2 个节点</div>';
            return;
        }

        const adj = {};
        this.nodes.forEach(n => { adj[n.id] = []; });
        this.edges.forEach(e => {
            adj[e.from].push({ to: e.to, weight: e.weight });
            adj[e.to].push({ to: e.from, weight: e.weight });
        });

        const startId = this.nodes[0].id;
        const inTree = new Set();
        const treeEdges = [];
        inTree.add(startId);

        while (inTree.size < this.nodes.length) {
            let minW = Infinity, bestFrom = null, bestTo = null;
            for (const uid of inTree) {
                for (const { to, weight } of adj[uid]) {
                    if (!inTree.has(to) && weight < minW) {
                        minW = weight;
                        bestFrom = uid;
                        bestTo = to;
                    }
                }
            }
            if (bestTo === null) break; // 图不连通
            treeEdges.push({ from: bestFrom, to: bestTo });
            inTree.add(bestTo);
        }

        const totalWeight = treeEdges.reduce((s, e) => s + (this.edges.find(ed =>
            (ed.from === e.from && ed.to === e.to) || (ed.from === e.to && ed.to === e.from)
        )?.weight || 0), 0);

        this._drawGraph(treeEdges, {});

        let html = App.createResultCard('Prim 最小生成树', '🌲');
        html += App.createResultValue('总权值', fmt(totalWeight, 0), '');
        html += '<p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">包含 ' + this.nodes.length + ' 个节点，' + treeEdges.length + ' 条边</p>';
        html += '</div>';

        html += '<div class="card" style="margin-top:16px;"><div class="card-title"><span class="card-icon">📋</span>生成树边集</div>';
        html += App.createTable(
            ['边', '权值'],
            treeEdges.map(e => [
                this._nodeName(e.from) + ' — ' + this._nodeName(e.to),
                fmt(this.edges.find(ed => (ed.from === e.from && ed.to === e.to) || (ed.from === e.to && ed.to === e.from))?.weight || 0, 0)
            ])
        );
        html += '</div>';

        const steps = [{
            label: '从任意节点开始，逐步连接最近节点',
            detail: 'Prim 算法每次选择连接树内和树外节点的最小权边，将其加入生成树。<br>' +
                '共需 ' + (this.nodes.length - 1) + ' 条边连接 ' + this.nodes.length + ' 个节点，总权值：<strong>' + fmt(totalWeight, 0) + '</strong>'
        }];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    },

    // ===== Ford-Fulkerson 最大流 =====
    _runMaxFlow(resultDiv) {
        const sourceId = parseInt(document.getElementById('no-mf-s').value);
        const sinkId = parseInt(document.getElementById('no-mf-t').value);

        if (isNaN(sourceId) || isNaN(sinkId)) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 请选择源点和汇点</div>';
            return;
        }
        if (sourceId === sinkId) {
            resultDiv.innerHTML = '<div class="alert alert-error">⚠️ 源点和汇点不能相同</div>';
            return;
        }

        // 构建容量矩阵（有向图）
        const n = this.nodes.length;
        const idToIndex = {};
        this.nodes.forEach((node, i) => { idToIndex[node.id] = i; });

        const capacity = Array.from({ length: n }, () => Array(n).fill(0));
        this.edges.forEach(e => {
            const fi = idToIndex[e.from];
            const ti = idToIndex[e.to];
            if (fi !== undefined && ti !== undefined) {
                capacity[fi][ti] = e.weight; // 有向容量
                capacity[ti][fi] = 0;       // 反向初始为0
            }
        });

        // Ford-Fulkerson (Edmonds-Karp BFS)
        const flow = Array.from({ length: n }, () => Array(n).fill(0));
        let maxFlow = 0;

        const si = idToIndex[sourceId];
        const ti = idToIndex[sinkId];

        while (true) {
            const parent = Array(n).fill(-1);
            const queue = [si];
            parent[si] = -2;

            // BFS 找增广路径
            while (queue.length > 0 && parent[ti] === -1) {
                const u = queue.shift();
                for (let v = 0; v < n; v++) {
                    if (parent[v] === -1 && capacity[u][v] - flow[u][v] > 1e-10) {
                        parent[v] = u;
                        if (v === ti) break;
                        queue.push(v);
                    }
                }
            }

            if (parent[ti] === -1) break; // 没有增广路径

            // 找瓶颈
            let bottleneck = Infinity;
            for (let v = ti; v !== si; v = parent[v]) {
                const u = parent[v];
                bottleneck = Math.min(bottleneck, capacity[u][v] - flow[u][v]);
            }

            // 更新流
            for (let v = ti; v !== si; v = parent[v]) {
                const u = parent[v];
                flow[u][v] += bottleneck;
                flow[v][u] -= bottleneck;
            }

            maxFlow += bottleneck;
        }

        // 找最小割（从源点可达的节点）
        const reachable = new Set();
        const q = [si];
        reachable.add(si);
        while (q.length > 0) {
            const u = q.shift();
            for (let v = 0; v < n; v++) {
                if (!reachable.has(v) && capacity[u][v] - flow[u][v] > 1e-10) {
                    reachable.add(v);
                    q.push(v);
                }
            }
        }

        // 使用的边（流量>0）
        const usedEdges = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (flow[i][j] > 1e-10) {
                    const fromId = this.nodes[i].id;
                    const toId = this.nodes[j].id;
                    usedEdges.push({ from: fromId, to: toId, flow: flow[i][j] });
                }
            }
        }

        const nodeColors = {};
        nodeColors[sourceId] = '#10b981';
        nodeColors[sinkId] = '#ef4444';
        this._drawGraph(usedEdges, nodeColors);

        // 结果表
        let html = App.createResultCard('Ford-Fulkerson 最大流', '💧');
        html += App.createResultValue('最大流量', fmt(maxFlow, 0), '');
        html += '</div>';

        html += '<div class="card" style="margin-top:16px;"><div class="card-title"><span class="card-icon">📋</span>各边流量</div>';
        html += App.createTable(
            ['边', '容量', '流量', '利用率'],
            usedEdges.map(e => [
                this._nodeName(e.from) + ' → ' + this._nodeName(e.to),
                fmt(this.edges.find(ed => ed.from === e.from && ed.to === e.to)?.weight || 0, 0),
                fmt(e.flow, 1),
                fmt((e.flow / (this.edges.find(ed => ed.from === e.from && ed.to === e.to)?.weight || 1)) * 100, 0) + '%'
            ])
        );
        html += '</div>';

        html += '<div class="alert alert-info" style="margin-top:16px;">源点 <strong>' + this._nodeName(sourceId) +
            '</strong> → 汇点 <strong>' + this._nodeName(sinkId) + '</strong> | 最大流 = <strong>' + fmt(maxFlow, 0) + '</strong></div>';

        const steps = [{
            label: 'Ford-Fulkerson 算法（BFS 增广路径）',
            detail: '每次用 BFS 寻找一条从源点到汇点、容量未用完的路径，沿该路径增加流量。<br>' +
                '当不存在增广路径时，当前流即为最大流。<br>最大流 = <strong>' + fmt(maxFlow, 0) + '</strong>，等于最小割容量。'
        }];
        html += App.createSteps(steps);

        resultDiv.innerHTML = html;
    }
});

window.NetOptModule = App.modules.find(m => m.id === 'network-optimization');
