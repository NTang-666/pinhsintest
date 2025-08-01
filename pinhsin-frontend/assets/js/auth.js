/**
 * 品信工務系統認證管理模組
 * 處理登入、登出、權限檢查等功能
 */

class AuthManager {
    constructor() {
        this.api = api; // 使用全域API客戶端
        this.loginModalId = 'loginModal';
        this.init();
    }

    /**
     * 初始化認證管理器
     */
    init() {
        this.createLoginModal();
        this.bindEvents();
        this.checkAuthStatus();
    }

    /**
     * 創建登入彈窗
     */
    createLoginModal() {
        const modalHTML = `
            <div id="${this.loginModalId}" class="auth-modal-overlay" style="display: none;">
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <i class="fas fa-hard-hat auth-modal-icon"></i>
                        <h2 class="auth-modal-title">品信工務系統登入</h2>
                    </div>
                    
                    <form id="loginForm" class="auth-form">
                        <div class="auth-form-group">
                            <label class="auth-form-label">用戶名</label>
                            <input type="text" id="username" name="username" required
                                   class="auth-form-input"
                                   placeholder="請輸入用戶名">
                        </div>
                        
                        <div class="auth-form-group">
                            <label class="auth-form-label">密碼</label>
                            <input type="password" id="password" name="password" required
                                   class="auth-form-input"
                                   placeholder="請輸入密碼">
                        </div>
                        
                        <div id="loginError" class="auth-error-message" style="display: none;"></div>
                        
                        <div class="auth-form-actions">
                            <button type="submit" id="loginButton" class="auth-login-btn">
                                <span id="loginButtonText">登入</span>
                                <span id="loginLoading" class="auth-loading" style="display: none;">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    登入中...
                                </span>
                            </button>
                        </div>
                    </form>
                    
                    <div class="auth-test-accounts">
                        <p><strong>測試帳號：</strong></p>
                        <p>管理員：admin / test123</p>
                        <p>工地主任：manager1 / test123</p>
                    </div>
                </div>
            </div>
            
            <style>
            .auth-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .auth-modal-content {
                background: white;
                border-radius: 8px;
                padding: 24px;
                width: 400px;
                max-width: 90vw;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }
            
            .auth-modal-header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .auth-modal-icon {
                font-size: 24px;
                color: #1A73E8;
                margin-right: 8px;
            }
            
            .auth-modal-title {
                font-size: 18px;
                font-weight: bold;
                color: #333;
                margin: 0;
            }
            
            .auth-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .auth-form-group {
                display: flex;
                flex-direction: column;
            }
            
            .auth-form-label {
                font-size: 14px;
                font-weight: 500;
                color: #555;
                margin-bottom: 4px;
            }
            
            .auth-form-input {
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.2s;
            }
            
            .auth-form-input:focus {
                outline: none;
                border-color: #1A73E8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
            }
            
            .auth-error-message {
                background-color: #fee;
                border: 1px solid #fcc;
                color: #c33;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .auth-form-actions {
                margin-top: 8px;
            }
            
            .auth-login-btn {
                width: 100%;
                background-color: #1A73E8;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .auth-login-btn:hover {
                background-color: #1557b0;
            }
            
            .auth-login-btn:disabled {
                background-color: #ccc;
                cursor: not-allowed;
            }
            
            .auth-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .auth-test-accounts {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
                line-height: 1.4;
            }
            
            .auth-test-accounts p {
                margin: 2px 0;
            }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * 綁定事件
     */
    bindEvents() {
        // 登入表單提交
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // ESC鍵關閉彈窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideLoginModal();
            }
        });

        // 點擊背景關閉彈窗
        const modal = document.getElementById(this.loginModalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideLoginModal();
                }
            });
        }
    }

    /**
     * 檢查認證狀態
     */
    async checkAuthStatus() {
        if (!this.api.isAuthenticated()) {
            this.showLoginModal();
            return false;
        }

        try {
            // 驗證token是否有效
            await this.api.getCurrentUser();
            this.updateUIForAuthenticatedUser();
            return true;
        } catch (error) {
            if (error instanceof ApiError && error.isAuthError()) {
                this.api.clearAuth();
                this.showLoginModal();
                return false;
            }
            throw error;
        }
    }

    /**
     * 初始化管理員面板（登入成功後調用）
     */
    initializeAdminPanel(user) {
        try {
            console.log('Admin access granted for:', user.username);
            
            // 顯示管理員內容
            const adminLayout = document.querySelector('.admin-layout');
            if (adminLayout) {
                adminLayout.style.setProperty('display', 'flex', 'important');
                console.log('Admin layout displayed');
            }
            
            // 初始化管理員面板
            if (typeof AdminPanel !== 'undefined') {
                window.adminPanel = new AdminPanel();
                window.adminPanel.init(user);
                console.log('Admin panel initialized');
            } else {
                console.warn('AdminPanel class not available');
            }
        } catch (error) {
            console.error('管理員面板初始化失敗:', error);
        }
    }

    /**
     * 預熱後端服務（防止 Render 休眠導致的 CORS 錯誤）
     * @param {function(string)} onProgress - 進度回調函數，用於更新 UI
     * @returns {Promise<boolean>} - 返回服務是否成功喚醒
     */
    async warmupBackend(onProgress) {
        const MAX_RETRIES = 15; // 最多重試 15 次 (45秒)
        const RETRY_DELAY = 3000; // 每次重試間隔 3 秒
        const healthCheckUrl = `${this.api.baseURL.replace('/api', '')}/health`;

        onProgress('正在連接後端服務...');

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(healthCheckUrl, { signal: AbortSignal.timeout(RETRY_DELAY - 500) });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data.status === 'healthy') {
                        onProgress('後端服務已連接！');
                        console.log('✅ Backend service is warm and healthy.');
                        return true;
                    }
                }
                onProgress(`正在喚醒後端服務... (${i + 1}/${MAX_RETRIES})`);
            } catch (error) {
                onProgress(`服務未就緒，正在重試... (${i + 1}/${MAX_RETRIES})`);
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.error('❌ Backend service failed to warm up after multiple retries.');
        onProgress('後端服務連接失敗，請稍後再試。');
        return false;
    }

    /**
     * 處理登入
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            this.showLoginError('請輸入用戶名和密碼');
            return;
        }

        this.setLoginLoading(true);
        this.hideLoginError();

        try {
            // 先喚醒後端服務（Render 免費方案會休眠）
            await this.warmupBackend((message) => {
                console.log('登入預熱:', message);
            });
            
            const response = await this.api.login(username, password);
            
            if (response.success) {
                this.hideLoginModal();
                this.updateUIForAuthenticatedUser();
                this.showMessage('登入成功！', 'success');
                
                // 觸發登入成功事件
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user: response.data.user }
                }));
                
                // 如果在管理員頁面，重新初始化管理員面板
                if (window.location.pathname.includes('/admin.html')) {
                    this.initializeAdminPanel(response.data.user);
                }
            }
        } catch (error) {
            if (error instanceof ApiError) {
                this.showLoginError(error.getUserMessage());
            } else {
                this.showLoginError('登入失敗，請稍後再試');
                console.error('Login error:', error);
            }
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * 登出
     */
    logout() {
        this.api.clearAuth();
        this.showLoginModal();
        this.updateUIForUnauthenticatedUser();
        this.showMessage('已登出', 'info');
        
        // 觸發登出事件
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    /**
     * 顯示登入彈窗
     */
    showLoginModal() {
        const modal = document.getElementById(this.loginModalId);
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('username').focus();
        }
    }

    /**
     * 隱藏登入彈窗
     */
    hideLoginModal() {
        const modal = document.getElementById(this.loginModalId);
        if (modal) {
            modal.style.display = 'none';
            
            // 清空表單
            document.getElementById('loginForm').reset();
            this.hideLoginError();
        }
    }

    /**
     * 顯示登入錯誤
     */
    showLoginError(message) {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * 隱藏登入錯誤
     */
    hideLoginError() {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * 設置登入載入狀態
     */
    setLoginLoading(loading) {
        const button = document.getElementById('loginButton');
        const buttonText = document.getElementById('loginButtonText');
        const loadingSpinner = document.getElementById('loginLoading');
        
        if (button && buttonText && loadingSpinner) {
            button.disabled = loading;
            
            if (loading) {
                buttonText.style.display = 'none';
                loadingSpinner.style.display = 'flex';
            } else {
                buttonText.style.display = 'inline';
                loadingSpinner.style.display = 'none';
            }
        }
    }

    /**
     * 更新已認證用戶的UI
     */
    updateUIForAuthenticatedUser() {
        const userInfo = this.api.getUserInfo();
        if (userInfo) {
            // 更新用戶信息顯示
            this.updateUserInfoDisplay(userInfo);
            
            // 根據角色顯示/隱藏功能
            this.updateRoleBasedUI(userInfo.role);
        }
    }

    /**
     * 更新未認證用戶的UI
     */
    updateUIForUnauthenticatedUser() {
        // 隱藏所有需要認證的UI元素
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(el => el.style.display = 'none');
    }

    /**
     * 更新用戶信息顯示
     */
    updateUserInfoDisplay(userInfo) {
        // 更新頁面中的用戶名顯示
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = userInfo.username;
        });

        // 更新角色顯示
        const roleElements = document.querySelectorAll('[data-user-role]');
        roleElements.forEach(el => {
            el.textContent = this.getRoleDisplayName(userInfo.role);
        });
    }

    /**
     * 根據角色更新UI
     */
    updateRoleBasedUI(role) {
        // 顯示所有認證相關元素
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(el => el.style.display = '');

        // 根據角色顯示/隱藏特定功能
        const adminOnly = document.querySelectorAll('[data-role="admin"]');
        const bossOnly = document.querySelectorAll('[data-role="boss"]');
        const managerOnly = document.querySelectorAll('[data-role="site-manager"]');

        adminOnly.forEach(el => {
            el.style.display = role === 'admin' ? '' : 'none';
        });

        bossOnly.forEach(el => {
            el.style.display = ['admin', 'boss'].includes(role) ? '' : 'none';
        });

        managerOnly.forEach(el => {
            el.style.display = ['admin', 'boss', 'site-manager'].includes(role) ? '' : 'none';
        });
    }

    /**
     * 獲取角色顯示名稱
     */
    getRoleDisplayName(role) {
        const roleNames = {
            'admin': '系統管理員',
            'boss': '老闆',
            'site-manager': '工地主任',
            'client': '客戶'
        };
        return roleNames[role] || role;
    }

    /**
     * 顯示訊息
     */
    showMessage(message, type = 'info') {
        // 可以實作toast訊息或其他通知方式
        const colors = {
            success: 'bg-green-100 text-green-800 border-green-200',
            error: 'bg-red-100 text-red-800 border-red-200',
            info: 'bg-blue-100 text-blue-800 border-blue-200'
        };

        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 px-4 py-2 rounded border ${colors[type]} z-50`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    /**
     * 要求認證檢查
     */
    async requireAuth() {
        if (!await this.checkAuthStatus()) {
            throw new Error('Authentication required');
        }
        return true;
    }

    /**
     * 要求特定角色
     */
    requireRole(requiredRole) {
        const userInfo = this.api.getUserInfo();
        if (!userInfo) {
            throw new Error('Authentication required');
        }

        const roleHierarchy = {
            'admin': 4,
            'boss': 3,
            'site-manager': 2,
            'client': 1
        };

        const userLevel = roleHierarchy[userInfo.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        if (userLevel < requiredLevel) {
            throw new Error('Insufficient permissions');
        }

        return true;
    }
}

// 創建全域認證管理器實例 - 等待 DOM 載入完成
let authManager = null;

// 確保在 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthManager);
} else {
    // DOM 已經載入完成
    initAuthManager();
}

function initAuthManager() {
    // 確保 api 已經載入
    if (typeof api !== 'undefined') {
        authManager = new AuthManager();
        console.log('✅ AuthManager 初始化完成');
    } else {
        console.warn('⚠️ API 客戶端未載入，延遲初始化 AuthManager');
        // 等待一下再嘗試
        setTimeout(initAuthManager, 100);
    }
}

// 全域認證介面函數
const auth = {
    /**
     * 初始化認證檢查
     * @param {Function} onSuccess - 認證成功回呼函數
     * @param {Function} onFailure - 認證失敗回呼函數
     * @param {boolean} requireAdmin - 是否需要管理員權限
     */
    async initializeAuthCheck(onSuccess, onFailure, requireAdmin = false) {
        const loadingOverlayId = 'auth-loading-overlay';

        // 顯示載入提示
        const showLoading = (message) => {
            let overlay = document.getElementById(loadingOverlayId);
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = loadingOverlayId;
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    color: white; display: flex; align-items: center; justify-content: center;
                    z-index: 10000; font-size: 1.2rem; flex-direction: column; gap: 1rem;
                `;
                overlay.innerHTML = `<i class="fas fa-spinner fa-spin fa-2x"></i><p></p>`;
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
            overlay.querySelector('p').textContent = message;
        };

        const hideLoading = () => {
            const overlay = document.getElementById(loadingOverlayId);
            if (overlay) overlay.style.display = 'none';
        };

        try {
            if (!authManager) {
                // ... (等待 authManager 初始化的邏輯保持不變)
            }

            // 步驟 1: 預熱後端
            const isBackendReady = await authManager.warmupBackend(showLoading);

            if (!isBackendReady) {
                // 如果喚醒失敗，顯示錯誤並停止
                // warmupBackend 內部已經更新了提示文字
                if (onFailure) onFailure();
                return;
            }

            // 步驟 2: 檢查本地 Token
            showLoading('正在驗證您的身份...');
            const localToken = localStorage.getItem('auth_token');
            console.log('本地 Token 狀態:', localToken ? '存在' : '不存在', localToken ? localToken.substring(0, 20) + '...' : '');
            
            if (!authManager.api.isAuthenticated()) {
                console.log('本地認證檢查失敗，顯示登入框');
                hideLoading();
                if (onFailure) onFailure();
                authManager.showLoginModal();
                return;
            }

            // 步驟 3: 驗證 Token 有效性
            console.log('開始驗證 Token 有效性...');
            let userInfo;
            try {
                userInfo = await authManager.api.getCurrentUser();
                console.log('Token 驗證結果:', userInfo ? '有效' : '無效', userInfo);
            } catch (error) {
                console.log('Token 驗證過程中出現網路錯誤，但本地 Token 存在，允許繼續使用:', error.message);
                // 如果是網路錯誤且本地有Token，嘗試使用本地用戶資訊
                userInfo = authManager.api.getUserInfo();
                if (userInfo) {
                    console.log('使用本地快取的用戶資訊:', userInfo);
                }
            }
            
            if (!userInfo) {
                console.log('Token 驗證失敗且無本地用戶資訊，清除並顯示登入框');
                authManager.api.logout(); // 清除無效的 Token
                hideLoading();
                if (onFailure) onFailure();
                authManager.showLoginModal();
                return;
            }

            // 步驟 4: 檢查管理員權限
            if (requireAdmin && userInfo.role !== 'admin') {
                hideLoading();
                console.log(`當前用戶角色: ${userInfo.role}, 需要管理員權限，清除Token並顯示登入框`);
                // 清除非管理員用戶的 Token
                authManager.api.logout();
                if (onFailure) onFailure();
                authManager.showMessage('需要管理員權限，請使用管理員帳號登入', 'warning');
                authManager.showLoginModal();
                return;
            }

            // 所有檢查通過
            hideLoading();
            if (onSuccess) {
                onSuccess(userInfo);
            }

        } catch (error) {
            hideLoading();
            console.error('認證檢查失敗:', error);
            if (onFailure) onFailure();
            authManager.showLoginModal();
        }
    },
    
    /**
     * 登出函數
     */
    logout() {
        if (authManager) {
            authManager.logout();
        }
    },
    
    /**
     * 獲取當前用戶信息
     */
    getCurrentUser() {
        return authManager ? authManager.api.getUserInfo() : null;
    },
    
    /**
     * 檢查是否已登入
     */
    isAuthenticated() {
        return authManager ? authManager.api.isAuthenticated() : false;
    }
};

// 導出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
}