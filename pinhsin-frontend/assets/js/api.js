/**
 * 品信工務系統 API 連接工具
 * 遵循 AI_RULES.md：結構化錯誤處理、安全性要求
 */

class ApiClient {
    constructor() {
        // 後端API基礎URL - 根據環境自動判斷
        this.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000/api'
            : 'https://pinhsin-backend.onrender.com/api';
        
        // 從localStorage獲取認證token
        this.token = localStorage.getItem('auth_token');
        this.userInfo = this.getUserInfo();
    }

    /**
     * 設置認證token
     */
    setAuthToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    /**
     * 清除認證信息
     */
    clearAuth() {
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
    }

    /**
     * 獲取用戶信息
     */
    getUserInfo() {
        const userInfoStr = localStorage.getItem('user_info');
        return userInfoStr ? JSON.parse(userInfoStr) : null;
    }

    /**
     * 設置用戶信息
     */
    setUserInfo(userInfo) {
        this.userInfo = userInfo;
        localStorage.setItem('user_info', JSON.stringify(userInfo));
    }

    /**
     * 通用HTTP請求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // 添加認證token
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.error || { message: 'Network error' }, response.status);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            
            // 網路錯誤或其他錯誤
            throw new ApiError({
                code: 'NETWORK_ERROR',
                message: '網路連線錯誤',
                details: error.message
            }, 0);
        }
    }

    // ==================== 認證 API ====================

    /**
     * 用戶登入
     */
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (response.success) {
            this.setAuthToken(response.data.token);
            this.setUserInfo(response.data.user);
        }

        return response;
    }

    /**
     * 獲取當前用戶信息
     */
    async getCurrentUser() {
        const response = await this.request('/auth/me');
        
        if (response.success) {
            this.setUserInfo(response.data);
            return response.data;
        }
        
        return null;
    }

    /**
     * 登出（清除認證信息的別名）
     */
    logout() {
        this.clearAuth();
    }

    /**
     * GET 請求的簡化方法
     */
    async get(endpoint) {
        return await this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST 請求的簡化方法
     */
    async post(endpoint, data) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT 請求的簡化方法
     */
    async put(endpoint, data) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE 請求的簡化方法
     */
    async delete(endpoint) {
        return await this.request(endpoint, { method: 'DELETE' });
    }

    // ==================== 日報 API ====================

    /**
     * 獲取日報列表
     */
    async getDailyReports(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/daily-reports${queryString ? '?' + queryString : ''}`;
        return await this.request(endpoint);
    }

    /**
     * 獲取日報詳情
     */
    async getDailyReport(reportId) {
        return await this.request(`/daily-reports/${reportId}`);
    }

    /**
     * 創建新日報
     */
    async createDailyReport(reportData) {
        return await this.request('/daily-reports', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
    }

    /**
     * 更新日報
     */
    async updateDailyReport(reportId, reportData) {
        return await this.request(`/daily-reports/${reportId}`, {
            method: 'PUT',
            body: JSON.stringify(reportData)
        });
    }

    /**
     * 部分更新日報
     */
    async patchDailyReport(reportId, partialData) {
        return await this.request(`/daily-reports/${reportId}`, {
            method: 'PATCH',
            body: JSON.stringify(partialData)
        });
    }

    /**
     * 提交日報審核
     */
    async submitDailyReport(reportId) {
        return await this.request(`/daily-reports/${reportId}/submit`, {
            method: 'POST'
        });
    }

    /**
     * 審核日報
     */
    async approveDailyReport(reportId, notes = '') {
        return await this.request(`/daily-reports/${reportId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ notes })
        });
    }

    /**
     * 更新日報狀態
     */
    async updateDailyReportStatus(reportId, status, notes = '') {
        return await this.request(`/daily-reports/${reportId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, notes })
        });
    }

    /**
     * 複製昨日日報內容
     */
    async copyYesterdayReport(siteId, date) {
        const params = new URLSearchParams({
            site_id: siteId,
            date: date
        });
        return await this.request(`/daily-reports/copy-yesterday?${params.toString()}`);
    }

    // ==================== 照片管理 API ====================

    /**
     * 獲取日報照片列表
     */
    async getReportPhotos(reportId) {
        return await this.request(`/daily-reports/${reportId}/photos`);
    }

    /**
     * 獲取照片上傳令牌
     */
    async getUploadToken(reportId) {
        return await this.request(`/daily-reports/${reportId}/photos/upload-token`, {
            method: 'POST'
        });
    }

    /**
     * 刪除照片
     */
    async deletePhoto(reportId, photoId) {
        return await this.request(`/daily-reports/${reportId}/photos/${photoId}`, {
            method: 'DELETE'
        });
    }

    // ==================== 工具方法 ====================

    /**
     * 檢查是否已登入
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * 檢查用戶權限
     */
    hasRole(role) {
        return this.userInfo && this.userInfo.role === role;
    }

    /**
     * 檢查是否為管理員
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * 檢查是否為老闆
     */
    isBoss() {
        return this.hasRole('boss');
    }

    /**
     * 檢查是否為工地主任
     */
    isSiteManager() {
        return this.hasRole('site-manager');
    }
}

/**
 * API錯誤類
 */
class ApiError extends Error {
    constructor(error, statusCode) {
        super(error.message || '未知錯誤');
        this.name = 'ApiError';
        this.code = error.code;
        this.details = error.details;
        this.remediation = error.remediation;
        this.statusCode = statusCode;
    }

    /**
     * 獲取用戶友好的錯誤訊息
     */
    getUserMessage() {
        if (this.remediation) {
            return `${this.message}。${this.remediation}`;
        }
        return this.message;
    }

    /**
     * 是否為認證錯誤
     */
    isAuthError() {
        return this.statusCode === 401 || this.code === 'AUTHENTICATION_REQUIRED';
    }

    /**
     * 是否為權限錯誤
     */
    isPermissionError() {
        return this.statusCode === 403 || this.code === 'ACCESS_DENIED';
    }

    /**
     * 是否為驗證錯誤
     */
    isValidationError() {
        return this.statusCode === 400 || this.code === 'VALIDATION_ERROR';
    }
}

// 創建全域API客戶端實例
const api = new ApiClient();

// 全域錯誤處理
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof ApiError) {
        console.error('API Error:', event.reason);
        
        // 如果是認證錯誤，重定向到登入頁面
        if (event.reason.isAuthError()) {
            api.clearAuth();
            // 這裡可以加入重定向邏輯
            alert('登入已過期，請重新登入');
        }
    }
});

// 導出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiClient, ApiError };
}