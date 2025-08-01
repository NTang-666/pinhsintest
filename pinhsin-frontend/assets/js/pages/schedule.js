import { GanttChart } from '../components/gantt.js';
// 假設 navigation.js 和 form-handler.js 中的相關函數是全局可用的，或者需要適當導入/修改
// import { initializeNavigation, setInitialPage, manageUnsavedChanges } from '../utils/navigation.js';
// import FormHandler from '../utils/form-handler.js'; // 如果 FormHandler 是默認導出

document.addEventListener('DOMContentLoaded', function() {
    // 僅當在工程進度表頁面時才執行
    const ganttDatesHeaderEl = document.getElementById('ganttDatesHeader');
    const ganttTasksAreaEl = document.getElementById('ganttTasksArea');

    if (!ganttDatesHeaderEl || !ganttTasksAreaEl) {
        // console.log("Not on Schedule page or Gantt elements missing, schedule.js will not run Gantt logic.");
        return;
    }

    // --- 狀態變數 ---
    let scheduleContext = {
        selectedSite: { id: null, name: null }, // 將由 navigation.js 填充
        ganttData: [
            { id: 't1', name: '模板組立', start: '2025-05-27', end: '2025-05-30', category: 'cat1', predecessor: '' },
            { id: 't2', name: '鋼筋綁紮', start: '2025-05-29', end: '2025-06-02', category: 'cat1', predecessor: '模板組立' },
            { id: 't3', name: '泥作粉光', start: '2025-06-03', end: '2025-06-07', category: 'cat2', predecessor: '鋼筋綁紮' },
            { id: 't4', name: '水電配管', start: '2025-06-01', end: '2025-06-05', category: 'cat3', predecessor: '鋼筋綁紮' },
            { id: 't5', name: '鷹架拆除', start: '2025-06-06', end: '2025-06-08', category: 'cat4', predecessor: '泥作粉光' },
        ],
        // currentGanttScale and ganttCurrentDate will be managed by GanttChart instance
    };
    const UNSAVED_CONTEXT_ADD_TASK = 'addTaskForm_schedule'; // 確保上下文名稱唯一

    // --- DOM 元素 (頁面特定) ---
    const overlay = document.getElementById('overlay');
    const taskDetailTableBody = document.getElementById('taskDetailTableBody');
    const searchBarArea = document.getElementById('searchBarArea');
    const ganttPageTitle = document.getElementById('ganttPageTitle');

    // --- 甘特圖實例化 ---
    let ganttChartInstance = null;

    const ganttConfig = {
        initialScale: 'month',
        dayWidth: 50, // 與 HTML 中預期的一致
        dateFormat: 'MM/DD',
        showTodayMarker: true, // 工程進度表通常需要今日標記
        rowHeight: 30,
        taskBarPadding: 4,
        taskBarColorLogic: (task) => `gantt-task-${task.category || 'cat1'}`, // 與 HTML class 匹配
        onTaskClick: (task) => {
            const clickedTask = scheduleContext.ganttData.find(t => t.id === task.id);
            if (clickedTask && taskDetailTableBody) {
                taskDetailTableBody.innerHTML = `
                    <tr><td class="p-2 font-medium text-main text-base" colspan="4">${clickedTask.name}</td></tr>
                    <tr><td class="p-2 text-secondary text-sm">開始日期</td><td class="p-2 text-main text-sm" colspan="3">${clickedTask.start}</td></tr>
                    <tr><td class="p-2 text-secondary text-sm">結束日期</td><td class="p-2 text-main text-sm" colspan="3">${clickedTask.end}</td></tr>
                    <tr><td class="p-2 text-secondary text-sm">分類代碼</td><td class="p-2 text-main text-sm" colspan="3">${clickedTask.category}</td></tr>
                    <tr><td class="p-2 text-secondary text-sm">前置作業</td><td class="p-2 text-main text-sm" colspan="3">${clickedTask.predecessor || '-'}</td></tr>
                `;
                openSidePanel('taskListPanel');
            }
        }
    };

    ganttChartInstance = new GanttChart('ganttDatesHeader', 'ganttTasksArea', scheduleContext.ganttData, ganttConfig);
    ganttChartInstance.setViewDate(new Date(2025, 4, 27)); // 設置初始視圖日期

    // --- 甘特圖控制事件監聽 ---
    document.querySelectorAll('.gantt-scale-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gantt-scale-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ganttChartInstance.setScale(this.dataset.scale);
        });
    });

    document.getElementById('ganttPrevPeriodBtn')?.addEventListener('click', () => {
        ganttChartInstance.prevPeriod();
    });

    document.getElementById('ganttNextPeriodBtn')?.addEventListener('click', () => {
        ganttChartInstance.nextPeriod();
    });

    // --- 側邊面板控制 (保留原有，因為 navigation.js 的 panel control 可能不完全適用) ---
    function openSidePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.add('active');
            if (overlay) overlay.classList.add('active');
        }
    }

    function closeSidePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove('active');
        if (!document.querySelector('.side-panel.active')) {
             if (overlay) overlay.classList.remove('active');
        }
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            document.querySelectorAll('.side-panel.active').forEach(p => closeSidePanel(p.id));
        });
    }
    document.querySelectorAll('.close-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => closeSidePanel(btn.dataset.panelId));
    });
    
    document.getElementById('showTaskListPanelBtn')?.addEventListener('click', () => {
        renderTaskDetailTable(); // 確保在打開前渲染最新的數據
        openSidePanel('taskListPanel');
    });
    document.getElementById('showPaymentSchedulePanelBtn')?.addEventListener('click', () => {
        openSidePanel('paymentSchedulePanel');
    });
    document.getElementById('searchTaskBtn')?.addEventListener('click', () => {
        if (searchBarArea) searchBarArea.classList.toggle('hidden');
    });

    // --- 任務詳細列表渲染 ---
    function renderTaskDetailTable() {
        if (!taskDetailTableBody) return;
        taskDetailTableBody.innerHTML = '';
        if (scheduleContext.ganttData.length === 0) {
            taskDetailTableBody.innerHTML = '<tr><td colspan="4" class="p-2 text-center text-gray-500">目前沒有工項資料。</td></tr>';
            return;
        }
        scheduleContext.ganttData.forEach(task => {
            const row = taskDetailTableBody.insertRow();
            row.insertCell().textContent = task.name;
            row.insertCell().textContent = task.start.substring(5); // MM-DD
            row.insertCell().textContent = task.end.substring(5);   // MM-DD
            row.insertCell().textContent = task.predecessor || '-';
            row.querySelectorAll('td').forEach(td => td.classList.add('p-2', 'border-b', 'border-gray-200', 'text-sm'));
        });
    }
    
    // --- 表單相關邏輯 (新增任務) ---
    const addTaskForm = document.getElementById('pageAddTask');
    if (addTaskForm) {
        document.querySelectorAll('#pageAddTask input, #pageAddTask select, #pageAddTask textarea')
            .forEach(input => input.addEventListener('input', () => manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, true)));

        const saveTaskBtnHeader = document.getElementById('saveTaskBtn');
        const saveTaskBtnFooter = document.getElementById('saveTaskBtnFooter');

        const addTaskValidationRules = {
            taskName: { required: true, message: '工項名稱為必填欄位。' },
            taskStartDate: { required: true, message: '開始日期為必填欄位。' },
            taskEndDate: { required: true, message: '結束日期為必填欄位。' }
        };

        async function addTaskSubmitCallback(formData) {
            const newTask = {
                id: 't' + (scheduleContext.ganttData.length + 1 + Math.floor(Math.random() * 1000)),
                name: formData.taskName,
                start: formData.taskStartDate,
                end: formData.taskEndDate,
                category: formData.taskCategory,
                predecessor: formData.taskPredecessor,
                notes: formData.taskNotes
            };
            scheduleContext.ganttData.push(newTask);
            ganttChartInstance.updateTasks(scheduleContext.ganttData); // 更新甘特圖實例的數據並重新渲染
            alert(`工項「${formData.taskName}」已儲存！(模擬)`);
            manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, false);
            // 導航回 pageGanttMain 的邏輯應由 navigation.js 處理，
            // 這裡確保數據已更新且 unsaved flag 已清除。
        }
        
        if (saveTaskBtnHeader) {
            FormHandler.handleFormSubmit(
                addTaskForm,
                saveTaskBtnHeader,
                addTaskSubmitCallback,
                addTaskValidationRules,
                null // beforeSubmit
            );
        }
        if (saveTaskBtnFooter) {
             FormHandler.handleFormSubmit(
                addTaskForm,
                saveTaskBtnFooter,
                addTaskSubmitCallback,
                addTaskValidationRules,
                null // beforeSubmit
            );
        }
    }

    function clearAddTaskForm() {
        const formElement = document.getElementById('pageAddTask');
        if (formElement) {
            FormHandler.clearForm(formElement);
            FormHandler.setFormFieldValue(formElement, 'taskCategory', 'cat1');
            const today = new Date().toISOString().split('T')[0];
            const nextWeekDate = new Date();
            nextWeekDate.setDate(nextWeekDate.getDate() + 7);
            FormHandler.setFormFieldValue(formElement, 'taskStartDate', today);
            FormHandler.setFormFieldValue(formElement, 'taskEndDate', nextWeekDate.toISOString().split('T')[0]);
        }
        manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, false);
    }

    // --- 導航設定 (從 HTML 移至此處，並與 scheduleContext 集成) ---
    // 假設 navigation.js 和 form-handler.js 中的 manageUnsavedChanges, FormHandler.handleFormSubmit 等是全局可用的
    // 如果不是，需要正確導入或調整。
    // 全局的 _navigationContext 和 _formHandlerContext 也需要能被訪問。
    // 為了簡化，這裡假設 navigation.js 和 form-handler.js 的核心功能已正確設置。

    const navConfigs = [
        {
            triggerSelector: '.site-schedule-card', // 來自 pageSelectSiteForSchedule
            targetPageId: 'pageGanttMain',
            options: {
                currentContext: scheduleContext, // 傳遞 scheduleContext
                beforeNavigate: (targetPageId, triggerEl, context) => {
                    context.selectedSite.id = triggerEl.dataset.siteId;
                    context.selectedSite.name = triggerEl.dataset.siteName;
                    if (ganttChartInstance) {
                        ganttChartInstance.setViewDate(new Date(2025, 4, 27)); // 重置日期
                        // 如果需要根據不同工地加載不同數據：
                        // context.ganttData = fetchSiteSpecificData(context.selectedSite.id);
                        // ganttChartInstance.updateTasks(context.ganttData);
                    }
                },
                afterNavigate: (targetPageId, triggerEl, context) => {
                    if (ganttPageTitle) {
                        ganttPageTitle.textContent = `${context.selectedSite.name || '未選擇工地'} - 進度表`;
                    }
                    if (ganttChartInstance) ganttChartInstance.render(); // 確保甘特圖在導航後渲染
                },
                recordScrollOnLeaveFrom: ['pageSelectSiteForSchedule']
            }
        },
        {
            triggerSelector: '#pageGanttMain .back-button',
            targetPageId: 'pageSelectSiteForSchedule',
            options: {
                currentContext: scheduleContext,
                preserveScrollOnReturnTo: ['pageSelectSiteForSchedule']
            }
        },
        {
            triggerSelector: '#addTaskBtn',
            targetPageId: 'pageAddTask',
            options: {
                currentContext: scheduleContext,
                animationType: 'slide',
                afterNavigate: clearAddTaskForm // 清空表單
            }
        },
        {
            triggerSelector: '#pageAddTask .back-button', // 返回按鈕
            targetPageId: 'pageGanttMain',
            options: {
                currentContext: scheduleContext,
                animationType: 'slide',
                checkUnsaved: true,
                unsavedChangesContext: UNSAVED_CONTEXT_ADD_TASK,
                slideInitialTransform: 'translateX(0%)',
                slideTargetTransform: 'translateX(100%)'
            }
        },
        { // 表頭保存按鈕
            triggerSelector: '#saveTaskBtn',
            targetPageId: 'pageGanttMain',
            options: {
                currentContext: scheduleContext,
                animationType: 'slide',
                slideInitialTransform: 'translateX(0%)',
                slideTargetTransform: 'translateX(100%)',
                beforeNavigate: () => { // 只有在表單提交成功 (無未保存更改) 時才導航
                    return !manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, undefined, true);
                }
            }
        },
        { // 表尾保存按鈕
            triggerSelector: '#saveTaskBtnFooter',
            targetPageId: 'pageGanttMain',
            options: {
                currentContext: scheduleContext,
                animationType: 'slide',
                slideInitialTransform: 'translateX(0%)',
                slideTargetTransform: 'translateX(100%)',
                beforeNavigate: () => {
                    return !manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, undefined, true);
                }
            }
        }
    ];
    
    // 初始化導航 (假設 setInitialPage 和 initializeNavigation 是全局可用的)
    const initialPageId = document.querySelector('.page.active')?.id || 'pageSelectSiteForSchedule';
    if (typeof setInitialPage === 'function') setInitialPage(initialPageId, scheduleContext);
    if (typeof initializeNavigation === 'function') initializeNavigation(navConfigs, scheduleContext);


    // 如果初始頁面是甘特圖主頁，確保甘特圖被渲染
    if (initialPageId === 'pageGanttMain' && ganttChartInstance) {
         // 需要確保 selectedSite 有值，否則 ganttPageTitle 會是 "未選擇工地"
         // 這裡假設如果直接加載 pageGanttMain，可能需要一個默認的工地或從某處獲取
         if (ganttPageTitle && !scheduleContext.selectedSite.name) {
             // 模擬一個默認工地，如果直接進入此頁面
             scheduleContext.selectedSite.name = "預設工地"; 
             ganttPageTitle.textContent = `${scheduleContext.selectedSite.name} - 進度表`;
         }
         ganttChartInstance.render();
    } else if (initialPageId === 'pageSelectSiteForSchedule') {
        // 如果在選擇工地頁面，可能不需要立即做什麼特別的關於甘特圖的事情
    }


    // 未保存更改提示
    window.addEventListener('beforeunload', function (e) {
        if (manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, undefined, true)) { // 檢查是否有未保存的更改
            const confirmationMessage = '您有未儲存的工項資料，確定要離開嗎？';
            (e || window.event).returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
});