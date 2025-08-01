// html/assets/js/utils/chart-utils.js

/**
 * 獲取或創建 SVG 組元素。
 * @param {SVGElement} svgElement - 父 SVG 元素。
 * @param {string} className - 組的 CSS 類名。
 * @param {string} [type='g'] - 要創建的 SVG 元素類型 (例如 'g', 'polyline')。
 * @returns {SVGElement | null} - 獲取或創建的 SVG 組元素，如果 svgElement 無效則返回 null。
 */
export function getOrCreateSVGGroup(svgElement, className, type = 'g') {
    if (!svgElement || typeof svgElement.querySelector !== 'function') {
        console.error('Invalid SVG element provided to getOrCreateSVGGroup');
        return null;
    }
    let group = svgElement.querySelector(`.${className}`);
    if (!group) {
        group = document.createElementNS('http://www.w3.org/2000/svg', type);
        group.classList.add(className);
        // 嘗試將其插入到其他主要繪圖元素之前，或作為最後一個子元素
        const firstPathOrPolyline = svgElement.querySelector('path, polyline, circle, rect');
        if (firstPathOrPolyline) {
            svgElement.insertBefore(group, firstPathOrPolyline);
        } else {
            svgElement.appendChild(group);
        }
    }
    return group;
}

/**
 * 隱藏所有可見的數據 tooltip。
 * @param {string} [tooltipSelector='.data-tooltip.show'] - tooltip 的 CSS 選擇器。
 */
export function hideAllTooltips(tooltipSelector = '.data-tooltip.show') {
    document.querySelectorAll(tooltipSelector).forEach(tooltip => tooltip.classList.remove('show'));
}

/**
 * 創建並定位 tooltip。
 * @param {Object} options - Tooltip 選項。
 * @param {HTMLElement} options.tooltipElement - Tooltip 的 HTML 元素。
 * @param {SVGElement} options.targetElement - Tooltip 目標的 SVG 元素 (例如圓點)。
 * @param {SVGElement} options.svgContainer - SVG 圖表的容器元素。
 * @param {string} options.contentHTML - Tooltip 的 HTML 內容。
 * @param {number} [options.timeout=3000] - Tooltip 自動隱藏的超時時間 (毫秒)。
 */
export function showTooltip({ tooltipElement, targetElement, svgContainer, contentHTML, timeout = 3000 }) {
    if (!tooltipElement || !targetElement || !svgContainer) {
        console.warn('Missing elements for showing tooltip.');
        return;
    }

    tooltipElement.innerHTML = contentHTML;
    tooltipElement.classList.add('show'); // 先顯示以計算尺寸

    const rect = targetElement.getBoundingClientRect();
    const svgContainerRect = svgContainer.getBoundingClientRect();
    
    // 定位 tooltip，使其在目標元素的正上方
    let left = rect.left - svgContainerRect.left + rect.width / 2 - tooltipElement.offsetWidth / 2;
    let top = rect.top - svgContainerRect.top - tooltipElement.offsetHeight - 10; // 10px 間距

    // 邊界檢查，防止 tooltip 超出 SVG 容器
    if (left < 0) left = 0;
    if (left + tooltipElement.offsetWidth > svgContainerRect.width) {
        left = svgContainerRect.width - tooltipElement.offsetWidth;
    }
    if (top < 0) { // 如果上方空間不足，嘗試顯示在下方
        top = rect.bottom - svgContainerRect.top + 10;
        if (top + tooltipElement.offsetHeight > svgContainerRect.height) {
            // 如果下方空間也不足，則盡量貼近目標元素
            top = rect.top - svgContainerRect.top - tooltipElement.offsetHeight / 2 + rect.height / 2;
        }
    }

    tooltipElement.style.left = left + 'px';
    tooltipElement.style.top = top + 'px';
    
    // 清除之前的計時器（如果有）
    if (tooltipElement.hideTimeout) {
        clearTimeout(tooltipElement.hideTimeout);
    }

    if (timeout > 0) {
        tooltipElement.hideTimeout = setTimeout(() => {
            tooltipElement.classList.remove('show');
        }, timeout);
    }
}

/**
 * 繪製折線圖。
 * @param {Object} config - 圖表配置。
 * @param {string} config.svgId - SVG 元素的 ID。
 * @param {string} config.tooltipId - Tooltip 元素的 ID。
 * @param {Array<Object>} config.data - 圖表數據陣列，每個物件應包含 'label' 和 'value'。
 * @param {boolean} config.isLaborChart - 是否為人力圖表 (影響顏色和單位)。
 * @param {Function} [config.onPointClick] - (可選) 點擊數據點時的回調函數。
 */
export function drawLineChart(config) {
    const { svgId, tooltipId, data, isLaborChart, onPointClick } = config;
    const svg = document.getElementById(svgId);
    const tooltipElement = document.getElementById(tooltipId);

    if (!svg || !tooltipElement) {
        console.warn("SVG or tooltip element not found for chart drawing:", svgId, tooltipId);
        return;
    }
    if (!data || data.length === 0) {
        // 清空圖表內容並返回
        const xAxisLabelsGroup = getOrCreateSVGGroup(svg, 'x-axis-labels-group');
        const dataLine = getOrCreateSVGGroup(svg, 'data-line', 'polyline');
        const dataPointsGroup = getOrCreateSVGGroup(svg, 'data-points-group');

        if(xAxisLabelsGroup) xAxisLabelsGroup.innerHTML = '';
        if(dataLine) dataLine.setAttribute('points', '');
        if(dataPointsGroup) dataPointsGroup.innerHTML = '';
        // 可以考慮顯示 "無數據" 的訊息
        return;
    }


    const xAxisLabelsGroup = getOrCreateSVGGroup(svg, 'x-axis-labels-group');
    const dataLine = getOrCreateSVGGroup(svg, 'data-line', 'polyline');
    const dataPointsGroup = getOrCreateSVGGroup(svg, 'data-points-group');

    if (!xAxisLabelsGroup || !dataLine || !dataPointsGroup) {
        console.error('Failed to get or create SVG groups for chart.');
        return;
    }

    // 設定折線屬性
    dataLine.setAttribute('fill', 'none');
    dataLine.setAttribute('stroke', isLaborChart ? '#007bff' : '#fd7e14');
    dataLine.setAttribute('stroke-width', '2.5');
    dataLine.setAttribute('stroke-linecap', 'round');
    
    xAxisLabelsGroup.innerHTML = ''; // 清空舊標籤
    dataPointsGroup.innerHTML = '';  // 清空舊數據點
    
    const chartAreaWidth = 290; // SVG 內繪圖區域寬度 (340 - 50)
    const chartAreaHeight = 140; // SVG 內繪圖區域高度 (160 - 20)
    const startX = 50; // X 軸起始座標
    const startY = 160; // Y 軸底部座標 (SVG 座標系中，Y向下為正)
    const topPadding = 20; // Y 軸頂部座標

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 0); // 確保 maxValue 不為負
    
    // 處理只有一個數據點的情況，避免除以零或不正確的間距
    const stepX = data.length > 1 ? chartAreaWidth / (data.length - 1) : chartAreaWidth / 2;

    let pointsString = '';
    data.forEach((item, index) => {
        const x = startX + (data.length > 1 ? (index * stepX) : stepX); // 若只有一點，將其置於中間
        
        // 計算 Y 座標，將數據值映射到圖表高度
        // maxValue 為 0 時，所有點都在底部
        const yValueRatio = maxValue > 0 ? (item.value / maxValue) : 0;
        let y = startY - (yValueRatio * chartAreaHeight);
        y = Math.max(topPadding, Math.min(y, startY)); // 限制 Y 在繪圖區域 [topPadding, startY] 內

        pointsString += `${x},${y} `;

        // 創建 X 軸標籤
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', startY + 20); // 標籤位於 X 軸下方
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', '#666');
        text.textContent = item.label;
        xAxisLabelsGroup.appendChild(text);
        
        // 創建數據點 (圓圈)
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', isLaborChart ? '#007bff' : '#fd7e14');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');
        circle.style.cursor = 'pointer';
        
        circle.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止觸發 SVG 容器的點擊事件 (如果有的話)
            hideAllTooltips(); // 點擊新點時先隱藏其他 tooltip

            const unit = isLaborChart ? '人' : '萬元';
            let compareText = '';
            if (index > 0 && data[index-1] != null) { // 確保前一個數據點存在
                const diff = item.value - data[index-1].value;
                const sign = diff >= 0 ? '+' : ''; // 等於0也顯示+
                compareText = `較前期：${sign}${diff.toFixed(isLaborChart ? 0 : 1)}${unit}`;
            }
            
            const tooltipContent = `
                <div><strong>${item.label}</strong></div>
                <div>${isLaborChart ? '人數' : '支出'}：${item.value.toFixed(isLaborChart ? 0 : 1)}${unit}</div>
                ${compareText ? `<div>${compareText}</div>` : ''}
            `;
            
            showTooltip({
                tooltipElement: tooltipElement,
                targetElement: circle,
                svgContainer: svg,
                contentHTML: tooltipContent,
                timeout: 3000 // 3秒後自動隱藏
            });

            if (onPointClick && typeof onPointClick === 'function') {
                onPointClick(item, index, e);
            }
        });
        dataPointsGroup.appendChild(circle);
    });
    
    dataLine.setAttribute('points', pointsString.trim());
}