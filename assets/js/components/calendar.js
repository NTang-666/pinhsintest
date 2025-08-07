// html/assets/js/components/calendar.js
export class Calendar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Calendar container with id "${containerId}" not found.`);
            return;
        }

        this.options = {
            initialDate: new Date(),
            dayStatusClassProvider: () => '', // (dateStr, day, month, year) => 'class-name'
            onDateClick: () => {}, // (dateStr) => {}
            monthYearDisplayId: 'currentMonthYear',
            prevMonthBtnId: 'prevMonthBtn',
            nextMonthBtnId: 'nextMonthBtn',
            calendarDaysContainerId: 'calendarDays',
            ...options
        };

        this.currentCalendarDate = new Date(this.options.initialDate);
        this.selectedDate = null; // Will be set by the page-specific logic via onDateClick

        this.calendarDaysContainer = document.getElementById(this.options.calendarDaysContainerId);
        this.currentMonthYearEl = document.getElementById(this.options.monthYearDisplayId);
        this.prevMonthBtn = document.getElementById(this.options.prevMonthBtnId);
        this.nextMonthBtn = document.getElementById(this.options.nextMonthBtnId);

       if (!this.calendarDaysContainer) {
            console.error(`Calendar days container with id "${this.options.calendarDaysContainerId}" not found.`);
            return;
        }
        
        if (!this.currentMonthYearEl) {
            console.warn(`Month/Year display element with id "${this.options.monthYearDisplayId}" not found.`);
        }
        
        if (!this.prevMonthBtn || !this.nextMonthBtn) {
            console.warn('Navigation buttons not found. Month navigation will be disabled.');
        }

        this._bindEvents();
        this.render();
    }

    _bindEvents() {
        if (this.prevMonthBtn) {
            this.prevMonthBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
                this.render();
            });
        }

        if (this.nextMonthBtn) {
            this.nextMonthBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
                this.render();
            });
        }
    }

     render() {
        // 更寬鬆的檢查，允許沒有月年顯示元素的情況
        if (!this.calendarDaysContainer) {
            console.error('Calendar days container not available for rendering.');
            return;
        }

        this.calendarDaysContainer.innerHTML = ''; // Clear previous days
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth(); // 0-11

        // 只有在元素存在時才更新月年顯示
        if (this.currentMonthYearEl) {
            this.currentMonthYearEl.textContent = `${year} 年 ${String(month + 1).padStart(2, '0')} 月`;
        }

        // 添加星期標頭
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const weekdayDiv = document.createElement('div');
            weekdayDiv.classList.add('calendar-weekday');
            weekdayDiv.textContent = day;
            this.calendarDaysContainer.appendChild(weekdayDiv);
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day', 'other-month');
            this.calendarDaysContainer.appendChild(dayDiv);
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day');
            dayDiv.textContent = day;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayDiv.dataset.date = dateStr;

            // Apply status classes provided by the user
            const statusClass = this.options.dayStatusClassProvider(dateStr, day, month, year);
            if (statusClass) {
                dayDiv.classList.add(...statusClass.split(' ').filter(Boolean));
            }
            
            // 統一的今日檢查
            const today = new Date();
            const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
            
            // Highlight today
            if (isToday) {
                dayDiv.classList.add('today');
            }

            // Highlight selected date (if managed by this component, or reflect external selection)
            if (this.selectedDate === dateStr) {
                dayDiv.classList.add('selected');
            }

            // 日期禁用邏輯 - 禁用過去日期
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0); // 重置時間為00:00:00
            const currentDate = new Date(year, month, day);
            const isPastDate = currentDate < todayCheck;
            
            // 標記過去日期為禁用（但不包含今日）
            if (isPastDate && !isToday) {
                dayDiv.classList.add('past-date', 'disabled');
            }
            
            // Add click event if not disabled (今日仍可選擇)
            if (!dayDiv.classList.contains('disabled') || isToday) {
                dayDiv.addEventListener('click', () => {
                    // Remove 'selected' from previously selected day (if any)
                    const currentlySelected = this.calendarDaysContainer.querySelector('.calendar-day.selected');
                    if (currentlySelected) {
                        currentlySelected.classList.remove('selected');
                    }
                    // Add 'selected' to clicked day
                    dayDiv.classList.add('selected');
                    this.selectedDate = dateStr; // Internal tracking, primarily for re-render
                    
                    // Call the callback function
                    this.options.onDateClick(dateStr);
                });
            }
            this.calendarDaysContainer.appendChild(dayDiv);
        }

        // Add empty cells for days after the last of the month to fill the grid
        const totalCells = firstDayOfMonth + daysInMonth;
        const remainingCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < remainingCells; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('calendar-day', 'other-month');
            this.calendarDaysContainer.appendChild(dayDiv);
        }
    }

    // Method to externally set the selected date and re-render
    setSelectedDate(dateStr) {
        this.selectedDate = dateStr;
        this.render(); // Re-render to reflect the new selection
    }

    // Method to externally set the current month/year and re-render
    setCurrentDate(date) {
        this.currentCalendarDate = new Date(date);
        this.render();
    }

    // Method to get current displayed month and year
    getCurrentDisplayDate() {
        return new Date(this.currentCalendarDate);
    }
}