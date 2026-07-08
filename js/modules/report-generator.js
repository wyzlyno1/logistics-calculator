/* ===== 报告生成器 ===== */
App.register({
    id: 'report-generator',
    name: '报告生成',
    icon: '📄',
    category: '工具',
    order: 11,
    shortDesc: '课程设计报告一键导出',
    description: '将计算结果整理为规范的课程设计报告格式，支持打印和导出。也可手动编辑补充分析文字。',
    fullWidth: true,

    init(container) {
        container.innerHTML = this._buildHTML();
        this._bindEvents(container);
    },

    _buildHTML() {
        return `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start;">
                <div class="card">
                    <div class="card-title"><span class="card-icon">📝</span>报告编辑</div>

                    <div class="form-group">
                        <label>报告标题</label>
                        <input type="text" id="rp-title" value="物流工程课程设计报告" placeholder="报告标题">
                    </div>
                    <div class="form-group">
                        <label>计算模块</label>
                        <select id="rp-module">
                            <option value="EOQ">经济订货批量 (EOQ)</option>
                            <option value="安全库存">安全库存计算</option>
                            <option value="重心法选址">重心法选址</option>
                            <option value="ABC分类">ABC 分类分析</option>
                            <option value="需求预测">需求预测</option>
                            <option value="运输问题">运输问题</option>
                            <option value="EPQ">经济生产批量 (EPQ)</option>
                            <option value="选址分析">选址案例分析</option>
                            <option value="牛鞭效应">牛鞭效应模拟</option>
                            <option value="网络优化">物流网络优化</option>
                            <option value="自定义">自定义</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>已知条件 / 输入数据</label>
                        <textarea id="rp-inputs" rows="5" placeholder="列出已知条件和输入参数..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>计算结果</label>
                        <textarea id="rp-results" rows="5" placeholder="粘贴或输入计算结果..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>分析与结论</label>
                        <textarea id="rp-analysis" rows="4" placeholder="对结果的分析和结论..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>姓名</label>
                        <input type="text" id="rp-author" value="湫" placeholder="姓名">
                    </div>
                    <div class="form-group">
                        <label>学校 / 专业</label>
                        <input type="text" id="rp-school" value="营口理工学院 物流工程专业" placeholder="学校专业">
                    </div>

                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-primary" id="rp-preview">👁️ 预览报告</button>
                        <button class="btn btn-secondary" id="rp-print">🖨️ 打印</button>
                    </div>
                </div>

                <div class="card" id="rp-preview-container">
                    <div class="card-title"><span class="card-icon">👁️</span>报告预览</div>
                    <div id="rp-preview-content" style="font-size:13px; line-height:1.8; color:var(--text-secondary);">
                        <p>在左侧填写内容后点击「预览报告」查看效果。</p>
                        <p style="margin-top:8px;">💡 提示：在其他模块完成计算后，可将计算步骤和结果复制粘贴到左侧编辑区，生成统一的课程设计报告。</p>
                    </div>
                </div>
            </div>
        `;
    },

    _bindEvents(container) {
        document.getElementById('rp-preview').addEventListener('click', () => this._preview());
        document.getElementById('rp-print').addEventListener('click', () => this._print());
    },

    _preview() {
        const title = document.getElementById('rp-title').value || '物流工程课程设计报告';
        const module = document.getElementById('rp-module').value;
        const inputs = document.getElementById('rp-inputs').value.trim();
        const results = document.getElementById('rp-results').value.trim();
        const analysis = document.getElementById('rp-analysis').value.trim();
        const author = document.getElementById('rp-author').value || '湫';
        const school = document.getElementById('rp-school').value || '营口理工学院 物流工程专业';
        const now = new Date();
        const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';

        const preview = document.getElementById('rp-preview-content');
        preview.innerHTML = `
            <div style="text-align:center; margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #1e293b;">
                <h3 style="font-size:18px; margin-bottom:4px;">${this._esc(title)}</h3>
                <p style="font-size:12px; color:#94a3b8;">${this._esc(module)} 模块 · ${dateStr}</p>
            </div>

            <div style="margin-bottom:16px;">
                <p style="font-size:11px; color:#94a3b8;">作者：${this._esc(author)} | ${this._esc(school)}</p>
            </div>

            ${inputs ? `
            <div style="margin-bottom:14px;">
                <h4 style="font-size:14px; margin-bottom:6px;">一、已知条件</h4>
                <p style="white-space:pre-wrap;">${this._esc(inputs)}</p>
            </div>` : ''}

            ${results ? `
            <div style="margin-bottom:14px;">
                <h4 style="font-size:14px; margin-bottom:6px;">二、计算过程与结果</h4>
                <p style="white-space:pre-wrap;">${this._esc(results)}</p>
            </div>` : ''}

            ${analysis ? `
            <div style="margin-bottom:14px;">
                <h4 style="font-size:14px; margin-bottom:6px;">三、分析与结论</h4>
                <p style="white-space:pre-wrap;">${this._esc(analysis)}</p>
            </div>` : ''}

            <div style="margin-top:20px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center;">
                本报告由物流工程计算工具箱生成 · github.com/wyzlyno1/logistics-calculator
            </div>
        `;
    },

    _print() {
        this._preview();
        setTimeout(() => window.print(), 300);
    },

    _esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});

window.ReportModule = App.modules.find(m => m.id === 'report-generator');
