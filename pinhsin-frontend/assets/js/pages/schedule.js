import { GanttChart } from '../components/gantt.js';
// 假設 navigation.js 和 form-handler.js 中的相關函數是全局可用的，或者需要適當導入/修改
// import { initializeNavigation, setInitialPage, manageUnsavedChanges } from '../utils/navigation.js';
// import FormHandler from '../utils/form-handler.js'; // 如果 FormHandler 是默認導出

// ✅ 添加：依賴檢查
if (typeof api === 'undefined') {
    console.warn('Schedule: API 客戶端未載入，部分功能可能受限');
}

// 檢查必要的全域函數
if (typeof initializeNavigation === 'undefined') {
    console.error('Schedule: initializeNavigation 函數未載入，請確保 navigation.js 先載入');
}

if (typeof FormHandler === 'undefined') {
    console.error('Schedule: FormHandler 未載入，請確保 form-handler.js 先載入');
}

if (typeof manageUnsavedChanges === 'undefined') {
    console.error('Schedule: manageUnsavedChanges 函數未載入');
}


document.addEventListener('DOMContentLoaded', function() {

    // ✅ 修正：檢查 Supabase 是否可用
    if (typeof supabase === 'undefined') {
        console.error('Supabase SDK 未載入，請確保在 HTML 中正確引入 Supabase CDN');
        return;
    }
    // --- ① 初始化 Supabase ---
    const supabaseUrl = 'https://yssmaiuttfwzddebykqi.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzc21haXV0dGZ3emRkZWJ5a3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NTE5MTQsImV4cCI6MjA2OTUyNzkxNH0.SKMbZH-HjsU08pvhgVNaIy3brwSz8mix1LoWgtE6VVw';
    let supabaseClient;
    try {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase 客戶端初始化成功');
    } catch (error) {
        console.error('❌ Supabase 客戶端初始化失敗:', error);
        return;
    }

    // 抓工地資料並產出卡片
    async function loadSitesForSchedule() {
        const { data, error } = await supabaseClient
            .from('sites')
            .select('id, name, current_task, remaining_days');

        if (error) {
            console.error('讀取工地資料失敗', error);
            return;
        }

        const container = document.querySelector('#pageSelectSiteForSchedule .content-area');
        container.innerHTML = ''; // 清空預設

        data.forEach(site => {
            const card = document.createElement('div');
            card.className = 'card site-schedule-card';
            card.dataset.siteId = site.id;
            card.dataset.siteName = site.name;
            card.innerHTML = `
              <h2 class="text-lg font-bold text-main mb-1">${site.name}</h2>
              <p class="text-xs text-secondary flex items-center">
                <i class="fas fa-tasks fa-fw mr-1.5"></i>目前工項: ${site.current_task || '-'}
              </p>
              <p class="text-xs text-secondary flex items-center">
                <i class="far fa-calendar-alt fa-fw mr-1.5"></i>剩餘工期: ${site.remaining_days ?? '-'} 天
              </p>
              <button class="mt-2 text-sm font-medium text-accent w-full text-right">查看進度表 ></button>
            `;
            container.appendChild(card);
        });
    }

    // 👉 載入工地選單（一定要放在 DOMContentLoaded 裡）
    loadSitesForSchedule();
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

    // ✅ 改善：添加甘特圖初始化錯誤處理
    try {
        ganttChartInstance = new GanttChart('ganttDatesHeader', 'ganttTasksArea', scheduleContext.ganttData, ganttConfig);
        ganttChartInstance.setViewDate(new Date(2025, 4, 27));
        console.log('✅ 甘特圖初始化成功');
    } catch (error) {
        console.error('❌ 甘特圖初始化失敗:', error);
        
        // 顯示錯誤訊息給用戶
        const ganttContainer = document.getElementById('ganttDatesHeader')?.parentElement;
        if (ganttContainer) {
            ganttContainer.innerHTML = `
                <div class="p-4 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle mb-2"></i>
                    <p>甘特圖載入失敗，請重新整理頁面</p>
                    <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-red-500 text-white rounded">重新載入</button>
                </div>
            `;
        }
        return; // 如果甘特圖初始化失敗，停止執行後續邏輯
    }

    //ganttChartInstance = new GanttChart('ganttDatesHeader', 'ganttTasksArea', scheduleContext.ganttData, ganttConfig);
    //ganttChartInstance.setViewDate(new Date(2025, 4, 27)); // 設置初始視圖日期

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
       // ✅ 改善：檢查必要函數是否存在
        if (typeof manageUnsavedChanges === 'function') {
            document.querySelectorAll('#pageAddTask input, #pageAddTask select, #pageAddTask textarea')
                .forEach(input => input.addEventListener('input', () => manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, true)));
        } else {
            console.warn('manageUnsavedChanges 函數未找到，未保存更改檢查將被跳過');
        }

        const saveTaskBtnHeader = document.getElementById('saveTaskBtn');
        const saveTaskBtnFooter = document.getElementById('saveTaskBtnFooter');

        const addTaskValidationRules = {
            taskName: { required: true, message: '工項名稱為必填欄位。' },
            taskStartDate: { required: true, message: '開始日期為必填欄位。' },
            taskEndDate: { required: true, message: '結束日期為必填欄位。' }
        };

        async function addTaskSubmitCallback(formData) {
            try {
                // ✅ 添加：日期驗證
                const startDate = new Date(formData.taskStartDate);
                const endDate = new Date(formData.taskEndDate);
                
                if (endDate < startDate) {
                    alert('結束日期不能早於開始日期');
                    return;
                }

                const newTask = {
                    id: 't' + (scheduleContext.ganttData.length + 1 + Math.floor(Math.random() * 1000)),
                    name: formData.taskName,
                    start: formData.taskStartDate,
                    end: formData.taskEndDate,
                    category: formData.taskCategory || 'cat1',
                    predecessor: formData.taskPredecessor || '',
                    notes: formData.taskNotes || ''
                };
                
                scheduleContext.ganttData.push(newTask);
                
                // ✅ 改善：甘特圖更新錯誤處理
                if (ganttChartInstance) {
                    try {
                        ganttChartInstance.updateTasks(scheduleContext.ganttData);
                        console.log('✅ 甘特圖資料更新成功');
                    } catch (updateError) {
                        console.error('甘特圖資料更新失敗:', updateError);
                        // 即使甘特圖更新失敗，任務仍已添加到資料中
                    }
                } else {
                    console.warn('甘特圖實例不存在，跳過視覺更新');
                }
                
                alert(`工項「${formData.taskName}」已儲存！`);
                
                if (typeof manageUnsavedChanges === 'function') {
                    manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, false);
                }
                
                console.log('新增任務完成:', newTask);
            } catch (error) {
                console.error('新增任務失敗:', error);
                alert('新增任務失敗，請稍後再試');
            }
        }

        // ✅ 改善：FormHandler 存在性檢查
        if (typeof FormHandler !== 'undefined') {
            if (saveTaskBtnHeader) {
                FormHandler.handleFormSubmit(
                    addTaskForm,
                    saveTaskBtnHeader,
                    addTaskSubmitCallback,
                    addTaskValidationRules,
                    null
                );
            }
            if (saveTaskBtnFooter) {
                FormHandler.handleFormSubmit(
                    addTaskForm,
                    saveTaskBtnFooter,
                    addTaskSubmitCallback,
                    addTaskValidationRules,
                    null
                );
            }
        } else {
            console.error('FormHandler 未載入，表單提交功能將無法正常運作');
        }
    }

    function clearAddTaskForm() {
        const formElement = document.getElementById('pageAddTask');
        if (formElement) {
            // ✅ 改善：FormHandler 存在性檢查
            if (typeof FormHandler !== 'undefined') {
                FormHandler.clearForm(formElement);
                FormHandler.setFormFieldValue(formElement, 'taskCategory', 'cat1');
                
                const today = new Date().toISOString().split('T')[0];
                const nextWeekDate = new Date();
                nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                
                FormHandler.setFormFieldValue(formElement, 'taskStartDate', today);
                FormHandler.setFormFieldValue(formElement, 'taskEndDate', nextWeekDate.toISOString().split('T')[0]);
            } else {
                // 手動清空表單
                formElement.reset();
                const categorySelect = formElement.querySelector('[name="taskCategory"]');
                if (categorySelect) categorySelect.value = 'cat1';
                
                const today = new Date().toISOString().split('T')[0];
                const nextWeekDate = new Date();
                nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                
                const startDateInput = formElement.querySelector('[name="taskStartDate"]');
                const endDateInput = formElement.querySelector('[name="taskEndDate"]');
                if (startDateInput) startDateInput.value = today;
                if (endDateInput) endDateInput.value = nextWeekDate.toISOString().split('T')[0];
            }
        }
        
        if (typeof manageUnsavedChanges === 'function') {
            manageUnsavedChanges(UNSAVED_CONTEXT_ADD_TASK, false);
        }
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

// ✅ 添加：ES6 模組導出
export default { scheduleContext: null }; // 導出一個包含上下文的對象
export { GanttChart }; // 重新導出 GanttChart 以供其他模組使用

// ✅ 添加：向後兼容的全域導出
if (typeof window !== 'undefined') {
    window.SchedulePage = {
        ganttChartInstance: null,
        scheduleContext: null
    };
}