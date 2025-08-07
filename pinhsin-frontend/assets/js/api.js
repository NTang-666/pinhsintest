/**
 * 品信工務系統 API 連接工具
 * 遵循 AI_RULES.md：結構化錯誤處理、安全性要求
 */

export class ApiClient {
    constructor() {
        // 後端API基礎URL - 根據環境自動判斷
        this.baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000/api'
            : 'https://pinhsin-backend.onrender.com/api';
        
        // 從localStorage獲取認證token
        this.token = localStorage.getItem('auth_token');
        this.userInfo = this.getUserInfo(); // ✅ 這行正確
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
            
            // 處理非 JSON 回應
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                // 改善錯誤訊息結構
                const errorData = data.error || data || { 
                    message: `HTTP ${response.status}: ${response.statusText}` 
                };
                throw new ApiError(errorData, response.status);
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            
            // 網路錯誤或其他錯誤
            console.error('Network request failed:', error);
            throw new ApiError({
                code: 'NETWORK_ERROR',
                message: '網路連線錯誤，請檢查網路狀態',
                details: error.message
            }, 0);
        }
    }

    // ==================== 認證 API ====================

    /**
     * 用戶登入
     */
    async login(username, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.success && response.data) {
                this.setAuthToken(response.data.token);
                this.setUserInfo(response.data.user);
                console.log('登入成功:', response.data.user);
            } else {
                throw new ApiError({
                    code: 'LOGIN_FAILED',
                    message: response.message || '登入失敗'
                }, 400);
            }

            return response;
        } catch (error) {
            console.error('登入請求失敗:', error);
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError({
                code: 'LOGIN_ERROR',
                message: '登入過程中發生錯誤',
                details: error.message
            }, 500);
        }
    }

    /**
     * 獲取當前用戶信息
     */
    async getCurrentUser() {
        try {
            const response = await this.request('/auth/me');
            
            if (response.success && response.data) {
                this.setUserInfo(response.data);
                return response.data;
            } else {
                console.warn('獲取用戶資訊失敗:', response);
                return null;
            }
        } catch (error) {
            console.error('獲取用戶資訊錯誤:', error);
            
            // 如果是認證錯誤，清除本地認證資訊
            if (error.isAuthError && error.isAuthError()) {
                this.clearAuth();
            }
            
            throw error;
        }
    }

    /**
     * 登出（清除認證信息的別名）
     */
    logout() {
        this.clearAuth();
    }

    /**
     * 帶重試機制的請求方法
     */
    async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                // 如果是認證錯誤或權限錯誤，不要重試
                if (error instanceof ApiError && error.isAuthError()) {
                    throw error;
                }
                if (error instanceof ApiError && error.isPermissionError()) {
                    throw error;
                }
                
                // 最後一次嘗試
                if (attempt === maxRetries) {
                    break;
                }
                
                // 等待後重試（指數退避）
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.warn(`請求失敗，${delay}ms 後重試 (${attempt}/${maxRetries}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
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

    /**
     * 檢查後端連線狀態
     */
    async checkConnection() {
        try {
            // 使用 AbortController 實現超時
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return data.success === true;
            }
            return false;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('後端連線檢查超時');
            } else {
                console.warn('後端連線檢查失敗:', error.message);
            }
            return false;
        }
    }

    /**
     * 檢查網路狀態
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * 檢查用戶權限層級
     */
    hasPermissionLevel(requiredLevel) {
        if (!this.userInfo || !this.userInfo.role) return false;
        
        const roleLevels = {
            'client': 1,
            'site-manager': 2,
            'boss': 3,
            'admin': 4
        };
        
        const userLevel = roleLevels[this.userInfo.role] || 0;
        const required = typeof requiredLevel === 'string' ? roleLevels[requiredLevel] : requiredLevel;
        
        return userLevel >= (required || 0);
    }

    /**
     * 檢查是否可以編輯報告
     */
    canEditReport(report) {
        if (!this.userInfo) return false;
        
        // 管理員和老闆可以編輯所有報告
        if (this.isAdmin() || this.isBoss()) return true;
        
        // 工地主任只能編輯自己工地的報告
        if (this.isSiteManager()) {
            return report.site_id === this.userInfo.site_id;
        }
        
        return false;
    }
}

/**
 * API錯誤類
 */
export class ApiError extends Error {
    constructor(error, statusCode) {
        // 處理不同的錯誤格式
        const errorMessage = typeof error === 'string' ? error : (error.message || '未知錯誤');
        super(errorMessage);
        
        this.name = 'ApiError';
        this.code = error.code || 'UNKNOWN_ERROR';
        this.details = error.details;
        this.remediation = error.remediation;
        this.statusCode = statusCode || 0;
        this.timestamp = new Date().toISOString();
    }

    /**
     * 獲取用戶友好的錯誤訊息
     */
    getUserMessage() {
        // 根據錯誤代碼提供友好訊息
        const friendlyMessages = {
            'NETWORK_ERROR': '網路連線中斷，請檢查網路狀態',
            'AUTHENTICATION_REQUIRED': '請先登入系統',
            'ACCESS_DENIED': '您沒有權限執行此操作',
            'VALIDATION_ERROR': '輸入資料格式錯誤',
            'NOT_FOUND': '找不到指定的資源',
            'SERVER_ERROR': '伺服器錯誤，請稍後再試'
        };
        
        const friendlyMessage = friendlyMessages[this.code] || this.message;
        
        if (this.remediation) {
            return `${friendlyMessage}。${this.remediation}`;
        }
        return friendlyMessage;
    }

    /**
     * 是否為認證錯誤
     */
    isAuthError() {
        return this.statusCode === 401 || 
               this.code === 'AUTHENTICATION_REQUIRED' ||
               this.code === 'TOKEN_EXPIRED';
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

    /**
     * 是否為網路錯誤
     */
    isNetworkError() {
        return this.code === 'NETWORK_ERROR' || this.statusCode === 0;
    }

    /**
     * 轉換為日誌格式
     */
    toLogFormat() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

// 創建全域API客戶端實例
const api = new ApiClient();

// 添加請求攔截器
const originalRequest = api.request;
api.request = async function(endpoint, options = {}) {
    // 請求前攔截
    console.log(`API Request: ${options.method || 'GET'} ${endpoint}`);
    
    // 添加請求 ID 用於追蹤
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    try {
        const result = await originalRequest.call(this, endpoint, options);
        const duration = Date.now() - startTime;
        console.log(`API Success [${requestId}]: ${duration}ms`);
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`API Error [${requestId}]: ${duration}ms`, error);
        throw error;
    }
};

// 全域錯誤處理改善
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof ApiError) {
        console.error('未處理的 API 錯誤:', event.reason.toLogFormat());
        
        // 如果是認證錯誤，提示用戶重新登入
        if (event.reason.isAuthError()) {
            api.clearAuth();
            
            // 避免在登入頁面重複提示
            if (!window.location.pathname.includes('login')) {
                alert('登入已過期，請重新登入');
                // 這裡可以加入重定向邏輯
                // window.location.href = '/login.html';
            }
        }
        
        // 阻止錯誤冒泡到控制台
        event.preventDefault();
    }
});

// 網路狀態監聽
window.addEventListener('online', () => {
    console.log('網路已恢復連線');
});

window.addEventListener('offline', () => {
    console.log('網路連線中斷');
});

// 導出供其他模組使用
//if (typeof module !== 'undefined' && module.exports) {
//    module.exports = { ApiClient, ApiError };
//}