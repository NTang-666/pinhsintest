// html/assets/js/pages/dashboard.js
import { drawLineChart, hideAllTooltips } from '../utils/chart-utils.js';
import { GanttChart } from '../components/gantt.js';
import { Sidebar } from '../components/sidebar.js'; // 導入 Sidebar 元件

document.addEventListener('DOMContentLoaded', function() {
    // --- 請款進度表側邊欄初始化 ---
    const unpaidMetricsCardTriggerElement = document.getElementById('unpaidMetricsCardTrigger');
    const unpaidSidebarElement = document.getElementById('unpaidSidebar');
    const closeSidebarButtonElement = document.getElementById('closeSidebarBtn');
    const sidebarOverlayElement = document.getElementById('sidebarOverlay');

    if (unpaidMetricsCardTriggerElement && unpaidSidebarElement && sidebarOverlayElement) {
        new Sidebar({
            sidebarId: 'unpaidSidebar',
            overlayId: 'sidebarOverlay',
            openTriggers: [unpaidMetricsCardTriggerElement],
            closeTriggers: [closeSidebarButtonElement, sidebarOverlayElement]
        });
    } else {
        // console.log("Sidebar elements for 'unpaidSidebar' not found on this page, skipping initialization.");
    }

    // --- 老闆儀表板相關元素 ---
    const laborChartSvg = document.getElementById('laborChartSvg');
    const ganttTimelineBoss = document.getElementById('ganttTimeline'); // 老闆儀表板的甘特圖容器

    // --- 工地儀表板相關元素 ---
    const ganttTimelineHeaderDashboard = document.getElementById('ganttTimelineHeaderDashboard');
    const ganttTasksAreaDashboard = document.getElementById('ganttTasksAreaDashboard');

    // 判斷是否在老闆儀表板或工地儀表板頁面
    const isOnBossDashboard = laborChartSvg || ganttTimelineBoss;
    const isOnSiteDashboard = ganttTimelineHeaderDashboard && ganttTasksAreaDashboard;

    if (!isOnBossDashboard && !isOnSiteDashboard) {
        // console.log("Not on Boss Dashboard or Site Dashboard page, specific dashboard.js logic will not run further.");
        return; // 如果兩個儀表板的關鍵元素都不存在，則不執行後續邏輯
    }
    
    // --- 老闆儀表板甘特圖相關 ---
    if (ganttTimelineBoss) { // 確保只在老闆儀表板的甘特圖元素存在時執行
        const mockBossGanttTasks = [
            { id: 'b_task1', name: '模板組立 (05/27-05/29)', start: '2025-05-27', end: '2025-05-29', category: 'category-1' },
            { id: 'b_task2', name: '鋼筋綁紮 (05/29-06/01)', start: '2025-05-29', end: '2025-06-01', category: 'category-2' },
            { id: 'b_task3', name: '泥作粉光 (06/02-06/04)', start: '2025-06-02', end: '2025-06-04', category: 'category-3' },
        ];

        const ganttConfigBoss = {
            initialScale: 'month', 
            dayWidth: 30, 
            dateFormat: 'MM/DD',
            showTodayMarker: true,
            rowHeight: 28, 
            taskBarPadding: 2,
            taskBarColorLogic: (task) => `gantt-task-${task.category || 'default'}`
        };

        if (document.getElementById('ganttTimeline') && document.getElementById('ganttTasksBoss')) {
             const bossGanttChart = new GanttChart('ganttTimeline', 'ganttTasksBoss', mockBossGanttTasks, ganttConfigBoss);
             bossGanttChart.setViewDate(new Date(2025, 4, 27)); 

            const bossGanttViewBtns = document.querySelectorAll('.gantt-container-card .gantt-view-btn');
            bossGanttViewBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    bossGanttViewBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const scaleText = this.textContent.toLowerCase(); 
                    let newScale = 'month';
                    if (scaleText.includes('週') || scaleText.includes('week')) newScale = 'week';
                    else if (scaleText.includes('日') || scaleText.includes('day')) newScale = 'day';
                    bossGanttChart.setScale(newScale);
                });
            });
        } else {
            // console.warn("Gantt elements for Boss Dashboard (ganttTimeline or ganttTasksBoss) not found, skipping Boss Gantt init.");
        }
    }


    // --- 原有圖表邏輯 (人力與零用金趨勢 - 僅老闆儀表板) ---
    if (laborChartSvg) { 
        const chartState = {
            currentScale: 'day',        // 'day', 'week', 'month'
            currentDate: new Date(2025, 4, 27), // 當前基準日期 (2025年5月27日) - 注意月份是0-indexed
            currentTab: 'labor'         // 'labor', 'pettyCash'
        };

        const mockChartData = {
            labor: { /* ... */ }, // 保留原數據
            pettyCash: { /* ... */ } // 保留原數據
        };
        
        // 補全 mockChartData 的內容，以避免引用錯誤
        mockChartData.labor = {
            daily: [
                { date: '2025-05-27', value: 12, label: '05/27' }, { date: '2025-05-28', value: 15, label: '05/28' }, { date: '2025-05-29', value: 8, label: '05/29' }, { date: '2025-05-30', value: 11, label: '05/30' }, { date: '2025-05-31', value: 13, label: '05/31' }, { date: '2025-06-01', value: 9, label: '06/01' }, { date: '2025-06-02', value: 14, label: '06/02' }
            ],
            weekly: [
                { date: '2025-W21', value: 85, label: 'W21' }, { date: '2025-W22', value: 92, label: 'W22' }, { date: '2025-W23', value: 78, label: 'W23' }, { date: '2025-W24', value: 88, label: 'W24' }
            ],
            monthly: [
                { date: '2025-02', value: 340, label: '2月' }, { date: '2025-03', value: 368, label: '3月' }, { date: '2025-04', value: 312, label: '4月' }, { date: '2025-05', value: 352, label: '5月' }
            ]
        };
        mockChartData.pettyCash = {
            daily: [
                { date: '2025-05-27', value: 0.8, label: '05/27' }, { date: '2025-05-28', value: 1.2, label: '05/28' }, { date: '2025-05-29', value: 0.5, label: '05/29' }, { date: '2025-05-30', value: 0.9, label: '05/30' }, { date: '2025-05-31', value: 1.1, label: '05/31' }, { date: '2025-06-01', value: 0.7, label: '06/01' }, { date: '2025-06-02', value: 1.0, label: '06/02' }
            ],
            weekly: [
                { date: '2025-W21', value: 5.2, label: 'W21' }, { date: '2025-W22', value: 6.1, label: 'W22' }, { date: '2025-W23', value: 4.8, label: 'W23' }, { date: '2025-W24', value: 5.7, label: 'W24' }
            ],
            monthly: [
                { date: '2025-02', value: 21.8, label: '2月' }, { date: '2025-03', value: 24.2, label: '3月' }, { date: '2025-04', value: 19.6, label: '4月' }, { date: '2025-05', value: 22.5, label: '5月' }
            ]
        };


        const tabLaborChart = document.getElementById('tabLaborChart');
        const tabPettyCashChart = document.getElementById('tabPettyCashChart');
        const contentLaborChart = document.getElementById('contentLaborChart');
        const contentPettyCashChart = document.getElementById('contentPettyCashChart');
        const timeScaleBtns = document.querySelectorAll('.time-scale-btn');
        const prevPeriodBtn = document.getElementById('prevPeriod');
        const nextPeriodBtn = document.getElementById('nextPeriod');
        const summaryLabelEl = document.getElementById('summaryLabel');
        const chartSummaryValueEl = document.getElementById('chartSummaryValue');
        const currentPeriodLabelEl = document.getElementById('currentPeriodLabel');

        function updateDashboardChart() {
            const data = mockChartData[chartState.currentTab]?.[chartState.currentScale];
            if (!data) {
                // console.warn(`No data found for tab: ${chartState.currentTab}, scale: ${chartState.currentScale}`);
                drawLineChart({
                    svgId: chartState.currentTab === 'labor' ? 'laborChartSvg' : 'pettyCashChartSvg',
                    tooltipId: chartState.currentTab === 'labor' ? 'laborTooltip' : 'pettyCashTooltip',
                    data: [], 
                    isLaborChart: chartState.currentTab === 'labor'
                });
                updateDashboardSummary(); 
                return;
            }

            drawLineChart({
                svgId: chartState.currentTab === 'labor' ? 'laborChartSvg' : 'pettyCashChartSvg',
                tooltipId: chartState.currentTab === 'labor' ? 'laborTooltip' : 'pettyCashTooltip',
                data: data,
                isLaborChart: chartState.currentTab === 'labor',
            });
            updateDashboardSummary();
        }

        function updateDashboardSummary() {
            if (!summaryLabelEl || !chartSummaryValueEl || !currentPeriodLabelEl) {
                // console.warn("Summary elements not found.");
                return;
            }

            const data = mockChartData[chartState.currentTab]?.[chartState.currentScale];
            if (!data || data.length === 0) {
                summaryLabelEl.textContent = '無資料';
                chartSummaryValueEl.textContent = '';
                currentPeriodLabelEl.textContent = '';
                return;
            }

            const total = data.reduce((sum, item) => sum + item.value, 0);
            const isLabor = chartState.currentTab === 'labor';
            const unit = isLabor ? '人' : '萬元';
            
            let periodText = '';
            let currentPeriodDisplay = '';

            switch(chartState.currentScale) {
                case 'day': periodText = '本週總計'; currentPeriodDisplay = '本週'; break;
                case 'week': periodText = '本月總計'; currentPeriodDisplay = '本月'; break;
                case 'month': periodText = '近4月總計'; currentPeriodDisplay = '近4月'; break;
                default: periodText = '總計'; currentPeriodDisplay = '當前';
            }
            
            summaryLabelEl.textContent = periodText;
            chartSummaryValueEl.textContent = `${total.toFixed(isLabor ? 0 : 1)}${unit}`;
            currentPeriodLabelEl.textContent = currentPeriodDisplay;
        }

        function handleChartTabClick(activeTabButton, inactiveTabButton, activeContentElement, inactiveContentElement, tabType) {
            if (!activeTabButton || !inactiveTabButton || !activeContentElement || !inactiveContentElement) return;
            chartState.currentTab = tabType;
            activeTabButton.classList.add('active');
            inactiveTabButton.classList.remove('active');
            activeContentElement.style.display = 'block';
            inactiveContentElement.style.display = 'none';
            updateDashboardChart();
        }

        function handleTimeScaleChange(scale) {
            chartState.currentScale = scale;
            timeScaleBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.scale === scale));
            updateDashboardChart();
        }

        function navigateTime(direction) { 
            const current = new Date(chartState.currentDate);
            switch(chartState.currentScale) {
                case 'day': current.setDate(current.getDate() + (direction === 'prev' ? -7 : 7)); break;
                case 'week': current.setMonth(current.getMonth() + (direction === 'prev' ? -1 : 1)); break;
                case 'month': current.setMonth(current.getMonth() + (direction === 'prev' ? -4 : 4)); break;
            }
            chartState.currentDate = current;
            // console.log(`Navigated time (${direction}), new date: ${chartState.currentDate.toLocaleDateString()}, scale: ${chartState.currentScale}`);
            updateDashboardChart(); 
        }

        if (tabLaborChart && tabPettyCashChart && contentLaborChart && contentPettyCashChart) {
            tabLaborChart.addEventListener('click', () => handleChartTabClick(tabLaborChart, tabPettyCashChart, contentLaborChart, contentPettyCashChart, 'labor'));
            tabPettyCashChart.addEventListener('click', () => handleChartTabClick(tabPettyCashChart, tabLaborChart, contentPettyCashChart, contentLaborChart, 'pettyCash'));
        }

        timeScaleBtns.forEach(btn => {
            btn.addEventListener('click', () => handleTimeScaleChange(btn.dataset.scale));
        });

        if (prevPeriodBtn) prevPeriodBtn.addEventListener('click', () => navigateTime('prev'));
        if (nextPeriodBtn) nextPeriodBtn.addEventListener('click', () => navigateTime('next'));
        
        document.addEventListener('click', (e) => {
            const chartVisualArea = e.target.closest('.chart-visual-area');
            const tooltip = e.target.closest('.data-tooltip');
            if (!chartVisualArea && !tooltip) hideAllTooltips();
        });

        const activePageForChart = document.querySelector('.page.active'); // Use a different variable name
        if (activePageForChart && activePageForChart.id === 'pageBossDashboard') { // Assuming boss dashboard has this ID or similar
            updateDashboardChart(); // Initial chart render for boss dashboard
        }
    } // 結束 if (laborChartSvg) -- 老闆儀表板圖表邏輯

    // --- 工地儀表板甘特圖初始化 ---
    if (isOnSiteDashboard) {
        const mockSiteGanttTasks = [
            { id: 'site_task1', name: '基礎開挖', start: '2025-06-10', end: '2025-06-15', category: 'foundation' },
            { id: 'site_task2', name: '鋼筋綁紮', start: '2025-06-16', end: '2025-06-22', category: 'structure' },
            { id: 'site_task3', name: '模板組立', start: '2025-06-23', end: '2025-06-28', category: 'structure' },
            { id: 'site_task4', name: '混凝土澆置', start: '2025-06-29', end: '2025-06-30', category: 'structure' },
            { id: 'site_task5', name: '管線配置', start: '2025-07-01', end: '2025-07-10', category: 'mep' },
        ];

        const ganttConfigSite = {
            initialScale: 'month',
            dayWidth: 40,
            dateFormat: 'MM/DD',
            showTodayMarker: true,
            rowHeight: 30,
            taskBarPadding: 4,
            taskBarColorLogic: (task) => {
                const colors = {
                    'foundation': 'gantt-task-cat-foundation',
                    'structure': 'gantt-task-cat-structure',
                    'mep': 'gantt-task-cat-mep',
                    'default': 'gantt-task-default'
                };
                return colors[task.category] || colors['default'];
            }
        };

        const siteGanttChart = new GanttChart('ganttTimelineHeaderDashboard', 'ganttTasksAreaDashboard', mockSiteGanttTasks, ganttConfigSite);
        if (mockSiteGanttTasks.length > 0) {
            siteGanttChart.setViewDate(new Date(mockSiteGanttTasks[0].start));
        } else {
            siteGanttChart.setViewDate(new Date(2025, 5, 1)); // Default to June 1, 2025 (month is 0-indexed)
        }

        const scaleMonthBtn = document.getElementById('ganttScaleMonthBtnDashboard');
        const scaleWeekBtn = document.getElementById('ganttScaleWeekBtnDashboard');
        const scaleDayBtn = document.getElementById('ganttScaleDayBtnDashboard');
        const scaleButtons = [
            { el: scaleMonthBtn, scale: 'month' },
            { el: scaleWeekBtn, scale: 'week' },
            { el: scaleDayBtn, scale: 'day' }
        ];

        scaleButtons.forEach(item => {
            if (item.el) {
                item.el.addEventListener('click', function() {
                    scaleButtons.forEach(btnItem => {
                        if (btnItem.el) {
                            btnItem.el.classList.remove('bg-accent-blue-primary', 'text-white');
                            btnItem.el.classList.add('text-gray-medium');
                        }
                    });
                    this.classList.add('bg-accent-blue-primary', 'text-white');
                    this.classList.remove('text-gray-medium');
                    siteGanttChart.setScale(item.scale);
                });
            }
        });

        const prevPeriodBtnDashboard = document.getElementById('ganttPrevPeriodBtnDashboard');
        const nextPeriodBtnDashboard = document.getElementById('ganttNextPeriodBtnDashboard');

        if (prevPeriodBtnDashboard) {
            prevPeriodBtnDashboard.addEventListener('click', () => {
                siteGanttChart.prevPeriod();
            });
        }
        if (nextPeriodBtnDashboard) {
            nextPeriodBtnDashboard.addEventListener('click', () => {
                siteGanttChart.nextPeriod();
            });
        }
        // Initial render is handled by GanttChart constructor.
    }
}); // 結束 document.addEventListener('DOMContentLoaded', ...)