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

        if (!this.calendarDaysContainer || !this.currentMonthYearEl || !this.prevMonthBtn || !this.nextMonthBtn) {
            console.error('One or more calendar DOM elements are missing. Please check IDs:', 
                this.options.calendarDaysContainerId, 
                this.options.monthYearDisplayId, 
                this.options.prevMonthBtnId, 
                this.options.nextMonthBtnId
            );
            return;
        }

        this._bindEvents();
        this.render();
    }

    _bindEvents() {
        this.prevMonthBtn.addEventListener('click', () => {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
            this.render();
        });

        this.nextMonthBtn.addEventListener('click', () => {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
            this.render();
        });
    }

    render() {
        if (!this.calendarDaysContainer || !this.currentMonthYearEl) return;

        this.calendarDaysContainer.innerHTML = ''; // Clear previous days
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth(); // 0-11

        this.currentMonthYearEl.textContent = `${year} 年 ${String(month + 1).padStart(2, '0')} 月`;

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
            
            // Highlight today
            const today = new Date();
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayDiv.classList.add('today');
            }

            // Highlight selected date (if managed by this component, or reflect external selection)
            if (this.selectedDate === dateStr) {
                dayDiv.classList.add('selected');
            }
            
            // Add click event if not disabled
            if (!dayDiv.classList.contains('disabled')) { // Assuming 'disabled' might be a status class
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