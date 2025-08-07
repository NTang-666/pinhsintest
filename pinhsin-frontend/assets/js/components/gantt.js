/**
 * @typedef {Object} GanttTask
 * @property {string} id - 任務的唯一ID。
 * @property {string} name - 任務名稱。
 * @property {string} start - 開始日期 (YYYY-MM-DD)。
 * @property {string} end - 結束日期 (YYYY-MM-DD)。
 * @property {string} [category] - 任務類別，用於樣式。
 * @property {string} [predecessor] - 前置任務的ID或名稱。
 * @property {number} [progress] - 任務進度 (0-100)。
 * @property {string} [color] - 自定義任務條顏色。
 */

/**
 * @typedef {Object} GanttConfig
 * @property {'day' | 'week' | 'month'} [initialScale='month'] - 初始時間尺度。
 * @property {number} [dayWidth=50] - 甘特圖中每一天的寬度（像素）。
 * @property {string} [dateFormat='MM/DD'] - 日期標頭的格式。
 * @property {function(GanttTask): string} [taskBarColorLogic] - 根據任務返回顏色的函數。
 * @property {function(GanttTask): void} [onTaskClick] - 任務點擊時的回調函數。
 * @property {boolean} [showTodayMarker=true] - 是否顯示「今天」標記線。
 * @property {number} [rowHeight=30] - 每行任務的高度。
 * @property {number} [taskBarPadding=4] - 任務條的內外邊距總和，用於寬度計算。
 */

export class GanttChart {
    /**
     * 創建一個 GanttChart 實例。
     * @param {string} datesHeaderId - 日期標頭容器元素的 ID。
     * @param {string} tasksAreaId - 任務區域容器元素的 ID。
     * @param {GanttTask[]} tasksData - 任務數據數組。
     * @param {Partial<GanttConfig>} config - 甘特圖配置選項。
     */
    constructor(datesHeaderId, tasksAreaId, tasksData = [], config = {}) {
        this.datesHeaderEl = document.getElementById(datesHeaderId);
        this.tasksAreaEl = document.getElementById(tasksAreaId);
        
        if (!this.datesHeaderEl) {
            console.error(`GanttChart: Dates header element with id "${datesHeaderId}" not found.`);
            return;
        }
        
        if (!this.tasksAreaEl) {
            console.error(`GanttChart: Tasks area element with id "${tasksAreaId}" not found.`);
            return;
        }

        this.tasksData = tasksData;

        this.config = {
            initialScale: 'month',
            dayWidth: 50,
            dateFormat: 'MM/DD', // moment.js format MM/DD
            taskBarColorLogic: (task) => `gantt-task-${task.category || 'default'}`,
            onTaskClick: null,
            showTodayMarker: true,
            rowHeight: 30, // Includes top/bottom margin for spacing
            taskBarPadding: 4, // Combined padding/border that affects width calculation
            ...config,
        };

        this.currentScale = this.config.initialScale;
        this.currentViewDate = new Date(); // Default to today, can be overridden
        this.today = new Date(); // Store today's date for the marker

        if (!this.datesHeaderEl || !this.tasksAreaEl) {
            console.error('GanttChart: Dates header or tasks area element not found.');
            return;
        }
        this.initialize();
    }

    initialize() {
        this.render();
    }

    /**
     * 設置甘特圖的當前視圖日期。
     * @param {Date} date - 新的視圖起始日期。
     */
    setViewDate(date) {
        this.currentViewDate = new Date(date);
        this.render();
    }

    /**
     * 設置甘特圖的時間尺度。
     * @param {'day' | 'week' | 'month'} scale - 新的時間尺度。
     */
    setScale(scale) {
        if (['day', 'week', 'month'].includes(scale)) {
            this.currentScale = scale;
            this.render();
        } else {
            console.warn(`GanttChart: Invalid scale "${scale}". Allowed scales are "day", "week", "month".`);
        }
    }

    /**
     * 更新甘特圖的任務數據。
     * @param {GanttTask[]} newTasksData - 新的任務數據數組。
     */
    updateTasks(newTasksData) {
        this.tasksData = newTasksData;
        this.render();
    }
    
    /**
     * 格式化日期。
     * @param {Date} date - 要格式化的日期。
     * @param {string} format - 格式字串 (例如 'MM/DD', 'YYYY-MM-DD')。
     * @returns {string} 格式化後的日期字串。
     */
    formatDate(date, format) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        if (format === 'MM/DD') {
            return `${month}/${day}`;
        }
        if (format === 'YYYY-MM-DD') {
            return `${year}-${month}-${day}`;
        }
        // Add more formats if needed
        return date.toLocaleDateString(); // Default
    }


    render() {
        if (!this.datesHeaderEl || !this.tasksAreaEl) return;
        
        // 驗證任務數據
        if (!Array.isArray(this.tasksData)) {
            console.warn('GanttChart: tasksData should be an array');
            this.tasksData = [];
        }

        this.datesHeaderEl.innerHTML = '';
        this.tasksAreaEl.innerHTML = ''; // Clear previous tasks and today marker

        const viewStartDate = new Date(this.currentViewDate);
        let daysToShow;

        switch (this.currentScale) {
            case 'day':
                daysToShow = 7;
                break;
            case 'week':
                daysToShow = 14;
                break;
            case 'month':
            default:
                daysToShow = 30; // Default to 30 days for a month view
                break;
        }

        // Render Date Headers
        for (let i = 0; i < daysToShow; i++) {
            const currentDate = new Date(viewStartDate);
            currentDate.setDate(viewStartDate.getDate() + i);
            const dayMarker = document.createElement('div');
            dayMarker.classList.add('gantt-day-marker'); // Generic class, specific styling in page CSS
            dayMarker.textContent = this.formatDate(currentDate, this.config.dateFormat);
            dayMarker.style.width = `${this.config.dayWidth}px`;
            this.datesHeaderEl.appendChild(dayMarker);
        }
        this.datesHeaderEl.style.width = `${daysToShow * this.config.dayWidth}px`;
        this.tasksAreaEl.style.minWidth = `${daysToShow * this.config.dayWidth}px`;


        // Render Tasks
        this.tasksData.forEach((task, index) => {
            const taskStartDate = new Date(task.start);
            const taskEndDate = new Date(task.end);
            
            // Adjust taskEndDate to be inclusive for duration calculation
            const inclusiveTaskEndDate = new Date(taskEndDate);

            const viewEndDate = new Date(viewStartDate);
            viewEndDate.setDate(viewStartDate.getDate() + daysToShow - 1);

            // Check if task is within the current view window at all
            if (inclusiveTaskEndDate < viewStartDate || taskStartDate > viewEndDate) {
                return; // Task is completely out of view
            }

            // Calculate offset and duration in days relative to the viewStartDate
            const offsetDays = Math.max(0, Math.floor((taskStartDate - viewStartDate) / (1000 * 60 * 60 * 24)));
            
            const visibleStart = taskStartDate < viewStartDate ? viewStartDate : taskStartDate;
            const visibleEnd = inclusiveTaskEndDate > viewEndDate ? viewEndDate : inclusiveTaskEndDate;
            
            let durationDays = Math.ceil((visibleEnd - visibleStart) / (1000 * 60 * 60 * 24)) + 1;
            durationDays = Math.max(1, durationDays); // Ensure at least 1 day width

            const taskBar = document.createElement('div');
            taskBar.classList.add('gantt-task-bar');
            
            // Apply category-based or custom color styling
            if (task.color) {
                taskBar.style.backgroundColor = task.color;
            } else if (this.config.taskBarColorLogic) {
                const colorClass = this.config.taskBarColorLogic(task);
                if (colorClass) taskBar.classList.add(colorClass);
            }

            taskBar.textContent = task.name;
            taskBar.title = `${task.name} (${this.formatDate(taskStartDate, 'YYYY-MM-DD')} - ${this.formatDate(taskEndDate, 'YYYY-MM-DD')})`;
            taskBar.dataset.taskId = task.id;

            taskBar.style.position = 'absolute'; // Tasks are absolutely positioned within tasksAreaEl
            taskBar.style.top = `${index * this.config.rowHeight}px`;
            taskBar.style.left = `${offsetDays * this.config.dayWidth}px`;
            taskBar.style.width = `${durationDays * this.config.dayWidth - this.config.taskBarPadding}px`;
            taskBar.style.height = `${this.config.rowHeight - this.config.taskBarPadding}px`; // Allow for some margin
            taskBar.style.lineHeight = `${this.config.rowHeight - this.config.taskBarPadding}px`;


            if (this.config.onTaskClick && typeof this.config.onTaskClick === 'function') {
                taskBar.addEventListener('click', () => this.config.onTaskClick(task));
            }

            this.tasksAreaEl.appendChild(taskBar);
        });
        
        // Adjust height of tasks area based on number of tasks
        this.tasksAreaEl.style.height = `${this.tasksData.length * this.config.rowHeight}px`;

        // Render "Today" Marker
        if (this.config.showTodayMarker) {
            this.renderTodayMarker(viewStartDate, daysToShow);
        }
    }

    renderTodayMarker(viewStartDate, daysToShow) {
        const today = new Date(this.today);
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        
        const viewStart = new Date(viewStartDate);
        viewStart.setHours(0, 0, 0, 0);
        const viewStartMs = viewStart.getTime();

        const viewEndDate = new Date(viewStart);
        viewEndDate.setDate(viewStart.getDate() + daysToShow - 1);
        const viewEndMs = viewEndDate.getTime();


        if (todayMs >= viewStartMs && todayMs <= viewEndMs) {
            const offsetDays = Math.floor((todayMs - viewStartMs) / (1000 * 60 * 60 * 24));
            const todayLine = document.createElement('div');
            todayLine.classList.add('gantt-today-marker');
            todayLine.style.position = 'absolute';
            todayLine.style.left = `${offsetDays * this.config.dayWidth + (this.config.dayWidth / 2)}px`; // Center in the day
            todayLine.style.top = '0';
            todayLine.style.bottom = '0'; // Or height: 100%
            todayLine.style.width = '2px'; // Or as defined in CSS
            // todayLine.style.backgroundColor = 'red'; // Or as defined in CSS
            this.tasksAreaEl.appendChild(todayLine); // Append to tasks area so it overlays tasks
        }
    }

    /**
     * Moves the Gantt chart view to the previous period based on the current scale.
     */
    prevPeriod() {
        switch (this.currentScale) {
            case 'month':
                this.currentViewDate.setMonth(this.currentViewDate.getMonth() - 1);
                break;
            case 'week':
                this.currentViewDate.setDate(this.currentViewDate.getDate() - 7);
                break;
            case 'day':
                this.currentViewDate.setDate(this.currentViewDate.getDate() - 1);
                break;
        }
        this.render();
    }

    /**
     * Moves the Gantt chart view to the next period based on the current scale.
     */
    nextPeriod() {
        switch (this.currentScale) {
            case 'month':
                this.currentViewDate.setMonth(this.currentViewDate.getMonth() + 1);
                break;
            case 'week':
                this.currentViewDate.setDate(this.currentViewDate.getDate() + 7);
                break;
            case 'day':
                this.currentViewDate.setDate(this.currentViewDate.getDate() + 1);
                break;
        }
        this.render();
    }
}