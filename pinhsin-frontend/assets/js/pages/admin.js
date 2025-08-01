/**
 * 品信工務系統管理員後台 JavaScript
 * 管理員功能邏輯和交互處理
 */

class AdminPanel {
    constructor() {
        this.currentPage = 'dashboard';
        this.sidebarCollapsed = false;
        this.theme = localStorage.getItem('admin-theme') || 'light';
        this.users = [];
        this.sites = [];
        this.permissions = [];
        
        // 先綁定事件和設置主題，但不載入數據
        this.bindEvents();
        this.applyTheme();
    }
    
    /**
     * 初始化管理員面板
     */
    init(user) {
        if (user) {
            this.updateUserInfo(user);
        }
        this.loadDashboardData();
    }
    
    /**
     * 綁定事件
     */
    bindEvents() {
        // 側邊欄切換
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // 主題切換
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // 導航點擊
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });
        
        // 視窗大小變化
        window.addEventListener('resize', () => this.handleResize());
        
        // 模態框點擊背景關閉 - 已移除，防止意外關閉編輯視窗
        // document.addEventListener('click', (e) => {
        //     if (e.target.classList.contains('admin-modal')) {
        //         this.closeModal(e.target);
        //     }
        // });
        
        // ESC 鍵關閉模態框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    /**
     * 更新用戶資訊顯示
     */
    updateUserInfo(user) {
        const userInfo = document.querySelector('.admin-header .admin-text-right');
        if (userInfo) {
            userInfo.querySelector('div:first-child').textContent = user.name || '管理員';
            userInfo.querySelector('div:last-child').textContent = user.email || 'admin@pinhsin.com';
        }
    }
    
    /**
     * 切換側邊欄
     */
    toggleSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const isMobile = window.innerWidth <= 1023;
        
        if (isMobile) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
            this.sidebarCollapsed = !this.sidebarCollapsed;
        }
    }
    
    /**
     * 切換主題
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('admin-theme', this.theme);
    }
    
    /**
     * 應用主題
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    /**
     * 切換頁面
     */
    switchPage(page) {
        // 隱藏所有頁面
        document.querySelectorAll('.admin-page').forEach(p => {
            p.classList.remove('active');
        });
        
        // 顯示目標頁面
        const targetPage = document.getElementById(page + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 更新導航狀態
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-page="${page}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // 載入頁面資料
        this.loadPageData(page);
        this.currentPage = page;
        
        // 在手機版自動關閉側邊欄
        if (window.innerWidth <= 1023) {
            document.getElementById('adminSidebar').classList.remove('mobile-open');
        }
    }
    
    /**
     * 載入頁面資料
     */
    async loadPageData(page) {
        try {
            switch (page) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'users':
                    await this.loadUsersData();
                    break;
                case 'employeeManagement':
                    await this.loadEmployeeManagementData();
                    break;
                case 'sites':
                    await this.loadSitesData();
                    break;
                case 'permissions':
                    await this.loadPermissionsData();
                    break;
                case 'system':
                    await this.loadSystemData();
                    break;
                case 'line':
                    await this.loadLineData();
                    break;
            }
        } catch (error) {
            console.error(`載入 ${page} 頁面資料失敗:`, error);
            this.showToast('載入資料失敗', 'error');
        }
    }
    
    /**
     * 載入儀表板資料
     */
    async loadDashboardData() {
        try {
            // 載入統計資料
            const statsResponse = await api.get('/admin/stats');
            if (statsResponse.success) {
                this.updateDashboardStats(statsResponse.data);
            }

            // 載入待處理報告 (基於班表)
            const pendingReportsResponse = await api.get('/admin/reports/pending');
            if (pendingReportsResponse.success) {
                const missingCount = pendingReportsResponse.data.length;
                const missingReportsCard = document.querySelector('#missingReportsCount');
                if(missingReportsCard) missingReportsCard.textContent = missingCount;
            }
            
            // 載入系統狀態
            const systemResponse = await api.get('/admin/system/status');
            if (systemResponse.success) {
                this.updateSystemStatus(systemResponse.data);
            }
            
            // 載入最近活動
            const activityResponse = await api.get('/admin/activity');
            if (activityResponse.success) {
                this.updateRecentActivity(activityResponse.data);
            }
        } catch (error) {
            console.error('載入儀表板資料失敗:', error);
        }
    }
    
    /**
     * 更新系統狀態
     */
    updateSystemStatus(statusData) {
        // 更新系統狀態指示器
        const statusIndicator = document.querySelector('#systemStatus');
        if (statusIndicator) {
            const isHealthy = statusData.api === 'ok' && statusData.database === 'ok';
            statusIndicator.className = `admin-status ${isHealthy ? 'admin-status-active' : 'admin-status-inactive'}`;
            statusIndicator.textContent = isHealthy ? '正常運行' : '異常';
        }

        // 更新資料庫狀態
        const dbStatus = document.querySelector('#dbStatus');
        if (dbStatus) {
            dbStatus.className = `admin-status ${statusData.database === 'ok' ? 'admin-status-active' : 'admin-status-inactive'}`;
            dbStatus.textContent = statusData.database === 'ok' ? '已連接' : '連接異常';
        }
    }

    /**
     * 更新最近活動
     */
    updateRecentActivity(activities) {
        const activityList = document.querySelector('#recentActivity');
        if (!activityList || !Array.isArray(activities)) return;

        activityList.innerHTML = '';
        activities.slice(0, 5).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-content">
                    <span class="activity-text">${activity.description}</span>
                    <span class="activity-time">${new Date(activity.timestamp).toLocaleString('zh-TW')}</span>
                </div>
            `;
            activityList.appendChild(item);
        });
    }

    /**
     * 更新儀表板統計
     */
    updateDashboardStats(stats) {
        // 更新統計卡片
        const statCards = document.querySelectorAll('#dashboardPage .admin-card');
        if (statCards.length >= 3) {
            // 總用戶數
            statCards[0].querySelector('.admin-text-2xl').textContent = stats.totalUsers || '0';
            
            // 修正：缺日報工地（原為活躍工地）
            statCards[1].querySelector('.admin-text-2xl').textContent = stats.missingSites || '0';
            
            // 待處理問題（移除本月日報卡片）
            statCards[2].querySelector('.admin-text-2xl').textContent = stats.pendingIssues || '0';
        }
    }

    /**
     * 載入員工管理資料 (卡片式)
     */
    async loadEmployeeManagementData() {
        try {
            const response = await api.get('/admin/users');
            if (response.success && Array.isArray(response.data)) {
                this.users = response.data;
                this.renderEmployeeCards();
            } else {
                console.warn('員工資料格式不正確或為空:', response);
                this.users = this.getMockUsers(); // 使用模擬資料作為備用
                this.renderEmployeeCards();
            }
        } catch (error) {
            console.error('載入員工資料失敗:', error);
            this.showToast('載入員工資料失敗', 'error');
            this.users = this.getMockUsers(); // 發生錯誤時使用模擬資料
            this.renderEmployeeCards();
        }
    }

    /**
     * 渲染員工卡片
     */
    renderEmployeeCards() {
        const grid = document.getElementById('employeeCardGrid');
        if (!grid) return;

        grid.innerHTML = '';
        if (!Array.isArray(this.users)) {
            console.error('Users data is not an array:', this.users);
            return;
        }

        this.users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'admin-card employee-card';
            card.innerHTML = `
                <div class="admin-card-body">
                    <div class="employee-card-header">
                        <img src="assets/images/default-avatar.png" alt="Avatar" class="employee-avatar" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNkZGRkZGQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iI2ZmZmZmZiIvPgo8cGF0aCBkPSJNMTAgMzBjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4K'">
                        <div class="employee-info">
                            <h4 class="employee-name">${user.name || user.username}</h4>
                            <p class="employee-role">${this.getRoleDisplayName(user.role)}</p>
                        </div>
                        <span class="admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}">${user.is_active ? '啟用' : '停用'}</span>
                    </div>
                    <div class="employee-card-footer">
                        <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="adminPanel.openSettingsModal(${user.id})">設定</button>
                        <button class="admin-btn admin-btn-primary admin-btn-sm" onclick="adminPanel.openEmployeeScheduleModal(${user.id})">班表</button>
                        <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="adminPanel.openPermissionsModal(${user.id})">權限</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    /**
     * 載入用戶資料
     */
    async loadUsersData() {
        try {
            const response = await api.get('/admin/users');
            if (response.success && Array.isArray(response.data)) {
                // API 直接返回用戶陣列在 response.data 中
                this.users = response.data;
                this.renderUsersTable();
            } else {
                console.warn('用戶資料格式不正確:', response);
                // 使用模擬資料
                this.users = this.getMockUsers();
                this.renderUsersTable();
            }
        } catch (error) {
            console.error('載入用戶資料失敗:', error);
            // 使用模擬資料
            this.users = this.getMockUsers();
            this.renderUsersTable();
        }
    }
    
    /**
     * 渲染用戶表格
     */
    renderUsersTable() {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // 修正：確保 this.users 是陣列
        if (!Array.isArray(this.users)) {
            console.error('Users data is not an array:', this.users);
            return;
        }
        
        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="admin-checkbox" data-user-id="${user.id}">
                </td>
                <td class="admin-font-semibold">${user.username}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <span class="admin-status ${this.getRoleStatusClass(user.role)}">
                        ${this.getRoleDisplayName(user.role)}
                    </span>
                </td>
                <td>
                    <span class="admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}">
                        ${user.is_active ? '啟用' : '停用'}
                    </span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="admin-table-actions">
                        <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="adminPanel.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="adminPanel.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    /**
     * 獲取模擬用戶資料
     */
    getMockUsers() {
        return [
            {
                id: 1,
                username: 'admin',
                name: '系統管理員',
                email: 'admin@pinhsin.com',
                role: 'admin',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z'
            },
            {
                id: 2,
                username: 'manager1',
                name: '工地經理1',
                email: 'manager1@pinhsin.com',
                role: 'site-manager',
                is_active: true,
                created_at: '2024-01-15T00:00:00Z'
            },
            {
                id: 3,
                username: 'boss1',
                name: '公司老闆',
                email: 'boss@pinhsin.com',
                role: 'boss',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z'
            },
            {
                id: 4,
                username: 'client1',
                name: '客戶代表',
                email: 'client@example.com',
                role: 'client',
                is_active: false,
                created_at: '2024-02-01T00:00:00Z'
            }
        ];
    }
    
    /**
     * 獲取角色狀態樣式
     */
    getRoleStatusClass(role) {
        const roleClasses = {
            'admin': 'admin-status-danger',
            'boss': 'admin-status-warning',
            'site-manager': 'admin-status-info',
            'client': 'admin-status-active'
        };
        return roleClasses[role] || 'admin-status-info';
    }
    
    /**
     * 獲取角色顯示名稱
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '管理員',
            'boss': '老闆',
            'site-manager': '工地經理',
            'client': '客戶'
        };
        return roleNames[role] || role;
    }
    
    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    /**
     * 編輯用戶
     */
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.openUserModal(user);
        }
    }
    
    /**
     * 刪除用戶
     */
    async deleteUser(userId) {
        if (!confirm('確定要刪除此用戶嗎？此操作無法復原。')) {
            return;
        }
        
        try {
            const response = await api.delete(`/admin/users/${userId}`);
            if (response.success) {
                this.showToast('用戶已刪除', 'success');
                this.loadUsersData();
            } else {
                this.showToast('刪除失敗', 'error');
            }
        } catch (error) {
            console.error('刪除用戶失敗:', error);
            this.showToast('刪除失敗', 'error');
        }
    }
    
    /**
     * 打開用戶模態框
     */
    openUserModal(user = null) {
        const modal = document.getElementById('userModal');
        const form = document.getElementById('userForm');
        const title = modal.querySelector('.admin-modal-title');
        
        if (user) {
            title.textContent = '編輯用戶';
            this.fillUserForm(user);
        } else {
            title.textContent = '新增用戶';
            form.reset();
        }
        
        modal.classList.add('active');
        
        // 設置焦點到第一個輸入框
        setTimeout(() => {
            form.querySelector('input').focus();
        }, 100);
    }
    
    /**
     * 填充用戶表單
     */
    fillUserForm(user) {
        const form = document.getElementById('userForm');
        form.username.value = user.username || '';
        form.name.value = user.name || '';
        form.email.value = user.email || '';
        form.phone.value = user.phone || '';
        form.role.value = user.role || '';
        
        // 編輯時隱藏密碼欄位
        const passwordFields = form.querySelectorAll('input[type="password"]');
        passwordFields.forEach(field => {
            field.closest('.admin-form-group').style.display = 'none';
        });
    }
    
    /**
     * 關閉用戶模態框
     */
    closeUserModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('active');
        
        // 清除表單錯誤
        this.clearFormErrors(document.getElementById('userForm'));
    }
    
    /**
     * 儲存用戶
     */
    async saveUser() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        
        // 驗證表單
        if (!this.validateForm(form)) {
            return;
        }
        
        try {
            const userData = {
                username: formData.get('username'),
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                role: formData.get('role'),
                password: formData.get('password')
            };
            
            const response = await api.post('/admin/users', userData);
            if (response.success) {
                this.showToast('用戶儲存成功', 'success');
                this.closeUserModal();
                this.loadUsersData();
            } else {
                this.showToast('儲存失敗', 'error');
            }
        } catch (error) {
            console.error('儲存用戶失敗:', error);
            this.showToast('儲存失敗', 'error');
        }
    }
    
    /**
     * 驗證表單
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('.admin-form-input, .admin-form-select');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    /**
     * 驗證欄位
     */
    validateField(field) {
        const errorElement = field.parentElement.querySelector('.admin-form-error');
        let isValid = true;
        let errorMessage = '';
        
        // 必填欄位檢查
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            errorMessage = '此欄位為必填項目';
        }
        
        // 郵件格式檢查
        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = '請輸入有效的郵件地址';
            }
        }
        
        // 密碼檢查
        if (field.type === 'password' && field.value) {
            if (field.value.length < 8) {
                isValid = false;
                errorMessage = '密碼至少需要 8 個字元';
            }
        }
        
        // 確認密碼檢查
        if (field.name === 'confirmPassword' && field.value) {
            const password = field.form.password.value;
            if (field.value !== password) {
                isValid = false;
                errorMessage = '密碼確認不符合';
            }
        }
        
        // 顯示錯誤訊息
        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.style.display = isValid ? 'none' : 'block';
        }
        
        // 更新欄位樣式
        field.style.borderColor = isValid ? '' : 'var(--admin-danger)';
        
        return isValid;
    }
    
    /**
     * 清除表單錯誤
     */
    clearFormErrors(form) {
        const errorElements = form.querySelectorAll('.admin-form-error');
        errorElements.forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
        
        const inputs = form.querySelectorAll('.admin-form-input, .admin-form-select');
        inputs.forEach(input => {
            input.style.borderColor = '';
        });
    }
    
    /**
     * 關閉模態框
     */
    closeModal(modal) {
        modal.classList.remove('active');
    }
    
    /**
     * 關閉所有模態框
     */
    closeAllModals() {
        document.querySelectorAll('.admin-modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    /**
     * 處理視窗大小變化
     */
    handleResize() {
        const sidebar = document.getElementById('adminSidebar');
        if (window.innerWidth > 1023) {
            sidebar.classList.remove('mobile-open');
        }
    }
    
    /**
     * 顯示提示訊息
     */
    showToast(message, type = 'info') {
        // 創建提示元素
        const toast = document.createElement('div');
        toast.className = `admin-toast admin-toast-${type}`;
        toast.innerHTML = `
            <div class="admin-toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="admin-toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // 添加到頁面
        document.body.appendChild(toast);
        
        // 自動隱藏
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
        // 點擊關閉
        toast.querySelector('.admin-toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }
    
    /**
     * 獲取提示圖示
     */
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // --- 班表模板管理 ---
    async openScheduleTemplateModal() {
        const modal = document.getElementById('scheduleTemplateModal');
        if (modal) {
            modal.classList.add('active');
            await this.loadScheduleTemplates();
        }
    }

    closeScheduleTemplateModal() {
        const modal = document.getElementById('scheduleTemplateModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async loadScheduleTemplates() {
        try {
            const response = await api.get('/admin/schedule-templates');
            if (response.success && Array.isArray(response.data)) {
                this.renderScheduleTemplatesTable(response.data);
            } else {
                this.showToast('載入班表模板失敗', 'error');
            }
        } catch (error) {
            console.error('載入班表模板失敗:', error);
            this.showToast('載入班表模板失敗', 'error');
        }
    }

    renderScheduleTemplatesTable(templates) {
        const tbody = document.querySelector('#scheduleTemplatesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        templates.forEach(template => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="admin-font-semibold">${template.name}</td>
                <td>${template.type === 'default' ? '預設模板' : '工地專用'}</td>
                <td>${template.description || '-'}</td>
                <td>
                    <div class="admin-table-actions">
                        <button class="admin-btn admin-btn-secondary admin-btn-sm" onclick="adminPanel.openTemplateEditModal(${template.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="adminPanel.deleteTemplate(${template.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    openTemplateEditModal(templateId = null) {
        // TODO: 實作新增/編輯模板的模態框
        console.log('打開模板編輯模態框 for templateId:', templateId);
        this.showToast('此功能開發中', 'info');
    }

    async deleteTemplate(templateId) {
        if (!confirm('確定要刪除此模板嗎？')) return;

        try {
            const response = await api.delete(`/admin/schedule-templates/${templateId}`);
            if (response.success) {
                this.showToast('模板已刪除', 'success');
                this.loadScheduleTemplates(); // 重新載入列表
            } else {
                this.showToast(response.error.message || '刪除失敗', 'error');
            }
        } catch (error) {
            console.error('刪除模板失敗:', error);
            this.showToast('刪除模板失敗', 'error');
        }
    }
    // --- 班表模板管理結束 ---

    // --- 員工個人班表設定 ---
    currentEditingUserId = null;
    currentCalendarDate = new Date();

    async openEmployeeScheduleModal(userId) {
        this.currentEditingUserId = userId;
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const modal = document.getElementById('employeeScheduleModal');
        const title = document.getElementById('employeeScheduleModalTitle');
        title.textContent = `${user.name || user.username} 的班表設定`;

        modal.classList.add('active');
        this.currentCalendarDate = new Date();
        await this.renderCalendar();
        await this.loadTemplatesForSelector();

        // 綁定事件
        document.getElementById('prevMonthBtn').onclick = () => this.changeMonth(-1);
        document.getElementById('nextMonthBtn').onclick = () => this.changeMonth(1);
        document.getElementById('applyTemplateBtn').onclick = () => this.applySelectedTemplate();
    }

    closeEmployeeScheduleModal() {
        const modal = document.getElementById('employeeScheduleModal');
        modal.classList.remove('active');
        this.currentEditingUserId = null;
    }

    async renderCalendar() {
        if (!this.currentEditingUserId) return;

        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        document.getElementById('calendarMonthYear').textContent = `${year}年 ${month + 1}月`;

        const calendarBody = document.getElementById('calendarBody');
        calendarBody.innerHTML = '<div class="loading-spinner"></div>'; // 顯示加載動畫

        try {
            const response = await api.get(`/admin/users/${this.currentEditingUserId}/schedules?month=${year}-${String(month + 1).padStart(2, '0')}`);
            let schedules = {};
            if (response.success && response.data) {
                response.data.forEach(item => {
                    const day = new Date(item.date).getDate();
                    schedules[day] = item.is_work_day;
                });
            }

            calendarBody.innerHTML = '';
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // 填充空白
            for (let i = 0; i < firstDay; i++) {
                calendarBody.innerHTML += `<div class="calendar-day empty"></div>`;
            }

            // 填充日期
            for (let day = 1; day <= daysInMonth; day++) {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                dayElement.textContent = day;
                dayElement.dataset.day = day;

                if (schedules[day] === 1) {
                    dayElement.classList.add('work-day');
                } else if (schedules[day] === 0) {
                    dayElement.classList.add('rest-day');
                } else {
                    dayElement.classList.add('no-data');
                }

                dayElement.onclick = () => this.toggleDayStatus(day, schedules[day]);
                calendarBody.appendChild(dayElement);
            }
        } catch (error) {
            console.error('渲染日曆失敗:', error);
            calendarBody.innerHTML = '<p class="text-danger">載入班表失敗</p>';
        }
    }

    async changeMonth(offset) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + offset);
        await this.renderCalendar();
    }

    async loadTemplatesForSelector() {
        const selector = document.getElementById('scheduleTemplateSelector');
        selector.innerHTML = '<option value="">套用班表模板</option>';
        try {
            const response = await api.get('/admin/schedule-templates');
            if (response.success && Array.isArray(response.data)) {
                response.data.forEach(template => {
                    const option = new Option(`${template.name} (${template.type})`, template.id);
                    selector.add(option);
                });
            }
        } catch (error) {
            console.error('載入模板列表失敗:', error);
        }
    }

    async applySelectedTemplate() {
        const templateId = document.getElementById('scheduleTemplateSelector').value;
        if (!templateId || !this.currentEditingUserId) return;

        try {
            const year = this.currentCalendarDate.getFullYear();
            const month = this.currentCalendarDate.getMonth() + 1;
            const response = await api.post(`/admin/users/${this.currentEditingUserId}/apply-template`, {
                template_id: templateId,
                month: `${year}-${String(month).padStart(2, '0')}`
            });

            if (response.success) {
                this.showToast('模板套用成功', 'success');
                await this.renderCalendar();
            } else {
                this.showToast(response.error.message || '套用失敗', 'error');
            }
        } catch (error) {
            console.error('套用模板失敗:', error);
            this.showToast('套用模板失敗', 'error');
        }
    }

    async toggleDayStatus(day, currentStatus) {
        if (!this.currentEditingUserId) return;

        const newStatus = currentStatus === 1 ? 0 : 1;
        const date = `${this.currentCalendarDate.getFullYear()}-${String(this.currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        try {
            const response = await api.post(`/admin/users/${this.currentEditingUserId}/schedules`, {
                schedules: [{ date: date, is_work_day: newStatus }]
            });

            if (response.success) {
                this.showToast('日期狀態已更新', 'success');
                // 優化：直接更新UI，而不是重新渲染整個日曆
                const dayElement = document.querySelector(`.calendar-day[data-day="${day}"]`);
                if(dayElement) {
                    dayElement.classList.remove('work-day', 'rest-day', 'no-data');
                    dayElement.classList.add(newStatus === 1 ? 'work-day' : 'rest-day');
                    dayElement.onclick = () => this.toggleDayStatus(day, newStatus);
                }
            } else {
                this.showToast(response.error.message || '更新失敗', 'error');
            }
        } catch (error) {
            console.error('更新日期狀態失敗:', error);
            this.showToast('更新日期狀態失敗', 'error');
        }
    }
    // --- 員工個人班表設定結束 ---
    
    /**
     * 載入工地資料
     */
    async loadSitesData() {
        try {
            console.log('載入工地資料');
            const response = await api.get('/admin/sites');
            
            if (response.success) {
                this.sites = response.data;
                this.displaySites();
            } else {
                console.error('載入工地資料失敗:', response.error);
                this.showToast('載入工地資料失敗', 'error');
            }
        } catch (error) {
            console.error('載入工地資料錯誤:', error);
            this.showToast('載入工地資料失敗', 'error');
        }
    }

    /**
     * 顯示工地列表
     */
    displaySites() {
        const container = document.getElementById('sitesContainer');
        if (!container) return;

        if (!this.sites || this.sites.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-building"></i>
                    <p>尚無工地資料</p>
                    <button onclick="adminPanel.openSiteModal()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> 新增工地
                    </button>
                </div>
            `;
            return;
        }

        const sitesHtml = this.sites.map(site => {
            const statusClass = this.getSiteStatusClass(site.status);
            const statusText = this.getSiteStatusText(site.status);
            
            return `
                <div class="site-card" data-site-id="${site.id}">
                    <div class="site-card-header">
                        <h3>${site.name}</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="site-card-body">
                        <div class="site-info">
                            <p><i class="fas fa-map-marker-alt"></i> ${site.address || '未設定地址'}</p>
                            <p><i class="fas fa-user-tie"></i> ${site.manager_name || '未指派主任'}</p>
                            <p><i class="fas fa-users"></i> ${site.user_count} 位用戶</p>
                            ${site.description ? `<p class="site-description">${site.description}</p>` : ''}
                        </div>
                        <div class="site-actions">
                            <button onclick="adminPanel.viewSiteDetails(${site.id})" class="btn btn-sm btn-outline">
                                <i class="fas fa-eye"></i> 詳情
                            </button>
                            <button onclick="adminPanel.editSite(${site.id})" class="btn btn-sm btn-primary">
                                <i class="fas fa-edit"></i> 編輯
                            </button>
                            <button onclick="adminPanel.deleteSite(${site.id})" class="btn btn-sm btn-danger">
                                <i class="fas fa-trash"></i> 刪除
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = sitesHtml;
    }

    /**
     * 取得工地狀態樣式類別
     */
    getSiteStatusClass(status) {
        const statusClasses = {
            'planning': 'status-planning',
            'active': 'status-active',
            'suspended': 'status-suspended',
            'completed': 'status-completed',
            'deleted': 'status-deleted'
        };
        return statusClasses[status] || 'status-unknown';
    }

    /**
     * 取得工地狀態文字
     */
    getSiteStatusText(status) {
        const statusTexts = {
            'planning': '規劃中',
            'active': '進行中',
            'suspended': '暫停',
            'completed': '已完工',
            'deleted': '已刪除'
        };
        return statusTexts[status] || '未知狀態';
    }

    /**
     * 打開工地模態框
     */
    openSiteModal(siteId = null) {
        console.log('打開工地模態框', siteId ? `編輯工地 ID: ${siteId}` : '新增工地');
        
        // 創建模態框 HTML
        const modalHtml = `
            <div class="modal" id="siteModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${siteId ? '編輯工地' : '新增工地'}</h3>
                        <button class="modal-close" onclick="adminPanel.closeSiteModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="siteForm">
                            <div class="form-group">
                                <label for="siteName">工地名稱 *</label>
                                <input type="text" id="siteName" name="name" required>
                            </div>
                            <div class="form-group">
                                <label for="siteAddress">地址</label>
                                <input type="text" id="siteAddress" name="address">
                            </div>
                            <div class="form-group">
                                <label for="siteDescription">描述</label>
                                <textarea id="siteDescription" name="description" rows="3"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="siteStatus">狀態</label>
                                <select id="siteStatus" name="status">
                                    <option value="planning">規劃中</option>
                                    <option value="active">進行中</option>
                                    <option value="suspended">暫停</option>
                                    <option value="completed">已完工</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="siteManager">工地主任</label>
                                <select id="siteManager" name="manager_id">
                                    <option value="">請選擇工地主任</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="adminPanel.closeSiteModal()">取消</button>
                        <button class="btn btn-primary" onclick="adminPanel.saveSite(${siteId})">${siteId ? '更新' : '創建'}</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到頁面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 載入主任選項
        this.loadManagerOptions();
        
        // 如果是編輯模式，載入工地資料
        if (siteId) {
            this.loadSiteData(siteId);
        }
        
        // 顯示模態框
        document.getElementById('siteModal').style.display = 'flex';
    }

    /**
     * 關閉工地模態框
     */
    closeSiteModal() {
        const modal = document.getElementById('siteModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * 載入主任選項
     */
    async loadManagerOptions() {
        const select = document.getElementById('siteManager');
        if (!select) return;
        
        // 從已載入的用戶中篩選主任角色
        const managers = this.users.filter(user => 
            user.role === 'site-manager' || user.role === 'admin'
        );
        
        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager.id;
            option.textContent = `${manager.name} (${manager.username})`;
            select.appendChild(option);
        });
    }

    /**
     * 查看工地詳情
     */
    async viewSiteDetails(siteId) {
        try {
            const response = await api.get(`/admin/sites/${siteId}`);
            if (response.success) {
                const site = response.data.site;
                const users = response.data.users;
                const stats = response.data.stats;
                
                this.showSiteDetailsModal(site, users, stats);
            }
        } catch (error) {
            console.error('載入工地詳情失敗:', error);
            this.showToast('載入工地詳情失敗', 'error');
        }
    }

    /**
     * 顯示工地詳情模態框
     */
    showSiteDetailsModal(site, users, stats) {
        const usersHtml = users.map(user => `
            <li>${user.name} (${user.email}) - ${user.site_role}</li>
        `).join('');
        
        const modalHtml = `
            <div class="modal" id="siteDetailsModal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>工地詳情 - ${site.name}</h3>
                        <button class="modal-close" onclick="document.getElementById('siteDetailsModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="details-grid">
                            <div class="details-section">
                                <h4>基本資訊</h4>
                                <p><strong>地址:</strong> ${site.address || '未設定'}</p>
                                <p><strong>狀態:</strong> ${this.getSiteStatusText(site.status)}</p>
                                <p><strong>主任:</strong> ${site.manager_name || '未指派'}</p>
                                <p><strong>描述:</strong> ${site.description || '無'}</p>
                            </div>
                            <div class="details-section">
                                <h4>統計資料</h4>
                                <p><strong>總日報數:</strong> ${stats.total_reports}</p>
                                <p><strong>待處理日報:</strong> ${stats.pending_reports}</p>
                                <p><strong>已核准日報:</strong> ${stats.approved_reports}</p>
                            </div>
                            <div class="details-section">
                                <h4>用戶權限 (${users.length})</h4>
                                ${users.length > 0 ? `<ul>${usersHtml}</ul>` : '<p>尚無用戶權限</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('siteDetailsModal').style.display = 'flex';
    }
    
    /**
     * 載入權限資料
     */
    async loadPermissionsData() {
        try {
            console.log('載入權限資料');
            const response = await api.get('/admin/permissions');
            
            if (response.success) {
                this.permissions = response.data;
                this.displayPermissions();
            } else {
                console.error('載入權限資料失敗:', response.error);
                this.showToast('載入權限資料失敗', 'error');
            }
        } catch (error) {
            console.error('載入權限資料錯誤:', error);
            this.showToast('載入權限資料失敗', 'error');
        }
    }

    /**
     * 顯示權限列表
     */
    displayPermissions() {
        const container = document.getElementById('permissionsContainer');
        if (!container) return;

        if (!this.permissions || this.permissions.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-key"></i>
                    <p>尚無權限資料</p>
                    <button onclick="adminPanel.openPermissionModal()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> 分配權限
                    </button>
                </div>
            `;
            return;
        }

        const permissionsHtml = this.permissions.map(permission => {
            const roleClass = this.getPermissionRoleClass(permission.permission_role);
            const roleText = this.getPermissionRoleText(permission.permission_role);
            
            return `
                <div class="permission-card" data-permission-id="${permission.id}">
                    <div class="permission-info">
                        <div class="user-info">
                            <h4>${permission.user_name}</h4>
                            <p class="user-email">${permission.user_email}</p>
                            <span class="user-role-badge">${permission.user_role}</span>
                        </div>
                        <div class="site-info">
                            <h4>${permission.site_name}</h4>
                            <span class="permission-role-badge ${roleClass}">${roleText}</span>
                            <p class="permission-meta">
                                由 ${permission.granted_by_name} 於 ${new Date(permission.granted_at).toLocaleDateString()} 授權
                            </p>
                        </div>
                    </div>
                    <div class="permission-actions">
                        <button onclick="adminPanel.editPermission(${permission.id})" class="btn btn-sm btn-primary">
                            <i class="fas fa-edit"></i> 編輯
                        </button>
                        <button onclick="adminPanel.revokePermission(${permission.id})" class="btn btn-sm btn-danger">
                            <i class="fas fa-times"></i> 撤銷
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = permissionsHtml;
    }

    /**
     * 取得權限角色樣式類別
     */
    getPermissionRoleClass(role) {
        const roleClasses = {
            'manager': 'role-manager',
            'editor': 'role-editor',
            'viewer': 'role-viewer'
        };
        return roleClasses[role] || 'role-unknown';
    }

    /**
     * 取得權限角色文字
     */
    getPermissionRoleText(role) {
        const roleTexts = {
            'manager': '管理員',
            'editor': '編輯者',
            'viewer': '檢視者'
        };
        return roleTexts[role] || '未知角色';
    }

    /**
     * 打開用戶設定模態框
     */
    openSettingsModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showToast('找不到用戶資料', 'error');
            return;
        }
        
        console.log('打開用戶設定模態框:', user.name);
        this.showToast(`功能開發中：${user.name} 的設定`, 'info');
        // TODO: 實作用戶設定模態框
    }

    /**
     * 打開權限設定模態框
     */
    async openPermissionsModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showToast('找不到用戶資料', 'error');
            return;
        }
        
        console.log('打開權限設定模態框 for user:', user.name || user.username);
        
        try {
            // 獲取用戶目前的權限
            const response = await api.get(`/admin/users/${userId}/permissions`);
            if (response.success) {
                const userPermissions = response.data.permissions;
                this.showPermissionsModal(user, userPermissions);
            }
        } catch (error) {
            console.error('載入用戶權限失敗:', error);
            this.showToast('載入用戶權限失敗', 'error');
        }
    }

    /**
     * 顯示權限設定模態框
     */
    showPermissionsModal(user, userPermissions) {
        // 取得所有工地列表
        const availableSites = this.sites || [];
        
        const sitesOptionsHtml = availableSites.map(site => {
            const hasPermission = userPermissions.find(p => p.site_id === site.id);
            return `
                <div class="site-permission-item" data-site-id="${site.id}">
                    <div class="site-info">
                        <h5>${site.name}</h5>
                        <p>${site.address || '未設定地址'}</p>
                    </div>
                    <div class="permission-controls">
                        <select class="role-select" ${hasPermission ? '' : 'disabled'}>
                            <option value="viewer" ${hasPermission && hasPermission.permission_role === 'viewer' ? 'selected' : ''}>檢視者</option>
                            <option value="editor" ${hasPermission && hasPermission.permission_role === 'editor' ? 'selected' : ''}>編輯者</option>
                            <option value="manager" ${hasPermission && hasPermission.permission_role === 'manager' ? 'selected' : ''}>管理員</option>
                        </select>
                        <label class="permission-toggle">
                            <input type="checkbox" ${hasPermission ? 'checked' : ''} onchange="adminPanel.toggleSitePermission(${site.id}, this)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
        
        const modalHtml = `
            <div class="modal" id="permissionsModal">
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3>權限設定 - ${user.name}</h3>
                        <button class="modal-close" onclick="adminPanel.closePermissionsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="user-info-section">
                            <p><strong>用戶:</strong> ${user.name} (${user.email})</p>
                            <p><strong>角色:</strong> ${user.role}</p>
                        </div>
                        <h4>工地權限設定</h4>
                        <div class="sites-permissions-list" id="sitesPermissionsList">
                            ${sitesOptionsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="adminPanel.closePermissionsModal()">取消</button>
                        <button class="btn btn-primary" onclick="adminPanel.saveUserPermissions(${user.id})">儲存權限</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('permissionsModal').style.display = 'flex';
    }

    /**
     * 關閉權限設定模態框
     */
    closePermissionsModal() {
        const modal = document.getElementById('permissionsModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * 切換工地權限
     */
    toggleSitePermission(siteId, checkbox) {
        const sitePermissionItem = checkbox.closest('.site-permission-item');
        const roleSelect = sitePermissionItem.querySelector('.role-select');
        
        if (checkbox.checked) {
            roleSelect.disabled = false;
            roleSelect.value = 'viewer'; // 預設為檢視者
        } else {
            roleSelect.disabled = true;
            roleSelect.value = 'viewer';
        }
    }

    /**
     * 儲存用戶權限
     */
    async saveUserPermissions(userId) {
        try {
            const sitesPermissionsList = document.getElementById('sitesPermissionsList');
            const operations = [];
            
            // 獲取當前用戶權限以便比較
            const currentResponse = await api.get(`/admin/users/${userId}/permissions`);
            const currentPermissions = currentResponse.success ? currentResponse.data.permissions : [];
            
            // 檢查每個工地權限設定
            sitesPermissionsList.querySelectorAll('.site-permission-item').forEach(item => {
                const siteId = parseInt(item.dataset.siteId);
                const checkbox = item.querySelector('input[type="checkbox"]');
                const roleSelect = item.querySelector('.role-select');
                
                const currentPermission = currentPermissions.find(p => p.site_id === siteId);
                const isEnabled = checkbox.checked;
                const selectedRole = roleSelect.value;
                
                if (isEnabled && !currentPermission) {
                    // 新增權限
                    operations.push({
                        action: 'grant',
                        user_id: userId,
                        site_id: siteId,
                        role: selectedRole
                    });
                } else if (!isEnabled && currentPermission) {
                    // 撤銷權限
                    operations.push({
                        action: 'revoke',
                        permission_id: currentPermission.id
                    });
                } else if (isEnabled && currentPermission && currentPermission.permission_role !== selectedRole) {
                    // 更新權限角色（先撤銷再新增）
                    operations.push(
                        {
                            action: 'revoke',
                            permission_id: currentPermission.id
                        },
                        {
                            action: 'grant',
                            user_id: userId,
                            site_id: siteId,
                            role: selectedRole
                        }
                    );
                }
            });
            
            if (operations.length === 0) {
                this.showToast('沒有變更需要儲存', 'info');
                this.closePermissionsModal();
                return;
            }
            
            // 執行批量權限操作
            const response = await api.post('/admin/permissions/batch', { operations });
            
            if (response.success) {
                this.showToast('權限設定已儲存', 'success');
                this.closePermissionsModal();
                // 重新載入權限和用戶資料
                await this.loadPermissionsData();
                await this.loadUsersData();
            } else {
                this.showToast('權限設定失敗', 'error');
            }
        } catch (error) {
            console.error('儲存權限設定失敗:', error);
            this.showToast('儲存權限設定失敗', 'error');
        }
    }
    
    /**
     * 載入系統資料
     */
    async loadSystemData() {
        // 將在後續實作
        console.log('載入系統資料');
    }
    
    /**
     * 載入 LINE 資料
     */
    async loadLineData() {
        // 將在後續實作
        console.log('載入 LINE 資料');
    }

    /**
     * 開發階段快速登入
     */
    async quickLogin() {
        try {
            this.showToast('正在嘗試快速登入...', 'info');
            const response = await api.login('admin', 'test123');
            if (response.success) {
                this.showToast('快速登入成功！正在重新載入...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                throw new Error(response.error.message || '登入失敗');
            }
        } catch (error) {
            console.error('快速登入失敗:', error);
            this.showToast(`快速登入失敗: ${error.message}`, 'error');
        }
    }
}

// 全域變數宣告
let adminPanel;

// 全域函數，供 HTML 調用
window.openUserModal = function(user) {
    adminPanel.openUserModal(user);
};

window.closeUserModal = function() {
    adminPanel.closeUserModal();
};

window.saveUser = function() {
    adminPanel.saveUser();
};

// 在頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    // 只有在還沒有實例時才創建
    if (!adminPanel) {
        adminPanel = new AdminPanel();
        console.log('DOM 載入完成，AdminPanel 實例已創建');
    }
});

// 添加 Toast 提示樣式
const style = document.createElement('style');
style.textContent = `
.admin-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 9999;
    max-width: 400px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease;
}
.admin-toast-success { border-left: 4px solid #22c55e; }
.admin-toast-error { border-left: 4px solid #ef4444; }
.admin-toast-warning { border-left: 4px solid #f59e0b; }
.admin-toast-info { border-left: 4px solid #3b82f6; }
.admin-toast-content { flex: 1; display: flex; align-items: center; gap: 8px; }
.admin-toast-close { background: none; border: none; cursor: pointer; padding: 4px; }
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(style);
