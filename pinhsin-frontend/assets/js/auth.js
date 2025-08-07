/**
 * 品信工務系統認證管理模組
 * 處理登入、登出、權限檢查等功能
 */

export class AuthManager {
    constructor() {
        // 改善 API 依賴檢查
        if (typeof api === 'undefined') {
            console.error('API 客戶端未載入，AuthManager 無法初始化');
            throw new Error('API dependency not found');
        }
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
            const user = await this.api.getCurrentUser();
            if (user && user.success !== false) {
                this.updateUIForAuthenticatedUser();
                return true;
            } else {
                throw new Error('Invalid user data');
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            
            // 檢查是否為網路錯誤
            if (error.name === 'NetworkError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                // 網路錯誤時，如果有本地用戶資訊則允許繼續
                const localUser = this.api.getUserInfo();
                if (localUser) {
                    console.warn('網路錯誤，使用本地用戶資訊');
                    this.updateUIForAuthenticatedUser();
                    return true;
                }
            }
            
            // 其他錯誤或沒有本地資訊，清除認證
            this.api.clearAuth();
            this.showLoginModal();
            return false;
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
     */
    async warmupBackend(onProgress) {
        const MAX_RETRIES = 10; // 減少重試次數
        const RETRY_DELAY = 2000; // 減少間隔時間
        const healthCheckUrl = `${this.api.baseURL.replace('/api', '')}/health`;

        onProgress('正在連接後端服務...');

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                // 使用 AbortController 設置超時
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), RETRY_DELAY - 200);
                
                const response = await fetch(healthCheckUrl, { 
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data && data.data.status === 'healthy') {
                        onProgress('後端服務已連接！');
                        console.log('✅ Backend service is warm and healthy.');
                        return true;
                    }
                }
                
                onProgress(`正在喚醒後端服務... (${i + 1}/${MAX_RETRIES})`);
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`Request ${i + 1} timed out`);
                } else {
                    console.log(`Request ${i + 1} failed:`, error.message);
                }
                onProgress(`服務未就緒，正在重試... (${i + 1}/${MAX_RETRIES})`);
            }
            
            // 最後一次重試失敗後不再等待
            if (i < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }

        console.error('❌ Backend service failed to warm up after multiple retries.');
        onProgress('後端服務連接失敗，請稍後再試或重新整理頁面。');
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

        // 添加登入狀態顯示
        const loginButton = document.getElementById('loginButton');
        const originalText = loginButton.textContent;

        try {
            // 更新按鈕文字顯示預熱狀態
            this.updateLoginButtonText('正在連接服務...');
            
            // 先喚醒後端服務（Render 免費方案會休眠）
            const isBackendReady = await this.warmupBackend((message) => {
                this.updateLoginButtonText(message);
            });
            
            if (!isBackendReady) {
                throw new Error('後端服務無法連接，請稍後再試');
            }
            
            this.updateLoginButtonText('正在驗證...');
            const response = await this.api.login(username, password);
            
            if (response && response.success) {
                this.updateLoginButtonText('登入成功！');
                
                setTimeout(() => {
                    this.hideLoginModal();
                    this.updateUIForAuthenticatedUser();
                    this.showMessage('登入成功！', 'success');
                    
                    // 觸發登入成功事件
                    window.dispatchEvent(new CustomEvent('auth:login', {
                        detail: { user: response.data.user }
                    }));
                    
                    // 如果在管理員頁面，重新初始化管理員面板
                    if (window.location.pathname.includes('/admin.html') || window.location.pathname.includes('admin')) {
                        this.initializeAdminPanel(response.data.user);
                    }
                }, 500);
            } else {
                throw new Error(response.message || '登入失敗');
            }
        } catch (error) {
            let errorMessage = '登入失敗，請稍後再試';
            
            if (error.message) {
                if (error.message.includes('認證失敗') || error.message.includes('密碼錯誤')) {
                    errorMessage = '用戶名或密碼錯誤';
                } else if (error.message.includes('網路') || error.message.includes('連接')) {
                    errorMessage = '網路連接失敗，請檢查網路狀態';
                } else if (error.message.includes('後端服務')) {
                    errorMessage = error.message;
                } else {
                    errorMessage = error.message;
                }
            }
            
            this.showLoginError(errorMessage);
            console.error('Login error:', error);
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * 更新登入按鈕文字
     */
    updateLoginButtonText(text) {
        const loadingSpinner = document.getElementById('loginLoading');
        if (loadingSpinner) {
            // 正確地更新載入文字
            const textElement = loadingSpinner.childNodes[2]; // 第三個節點是文字
            if (textElement && textElement.nodeType === Node.TEXT_NODE) {
                textElement.textContent = text;
            } else {
                // 如果結構不如預期，直接替換內容
                loadingSpinner.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    ${text}
                `;
            }
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
            this.showMessage('需要登入才能使用此功能', 'error');
            this.showLoginModal();
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
            this.showMessage(`需要 ${this.getRoleDisplayName(requiredRole)} 或更高權限`, 'error');
            throw new Error('Insufficient permissions');
        }

        return true;
    }
}

// 創建全域認證管理器實例
let authManager = null;
let initRetryCount = 0;
const MAX_INIT_RETRIES = 50; // 最多重試 5 秒

export function initAuthManager() {
    initRetryCount++;
    
    // 確保 api 已經載入
    if (typeof api !== 'undefined' && api) {
        try {
            authManager = new AuthManager();
            console.log('✅ AuthManager 初始化完成');
            return true;
        } catch (error) {
            console.error('❌ AuthManager 初始化失敗:', error);
            return false;
        }
    } else {
        if (initRetryCount < MAX_INIT_RETRIES) {
            console.warn(`⚠️ API 客戶端未載入，正在重試... (${initRetryCount}/${MAX_INIT_RETRIES})`);
            setTimeout(initAuthManager, 100);
        } else {
            console.error('❌ API 客戶端載入超時，AuthManager 初始化失敗');
        }
        return false;
    }
}

// 確保在 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthManager);
} else {
    // DOM 已經載入完成
    initAuthManager();
}

// 全域認證介面函數
export const auth = {
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
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white; display: flex; align-items: center; justify-content: center;
                    z-index: 10000; font-size: 1.2rem; flex-direction: column; gap: 1rem;
                `;
                overlay.innerHTML = `
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p></p>
                    <small style="opacity: 0.8;">首次載入可能需要較長時間</small>
                `;
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
            // 等待 authManager 初始化
            if (!authManager) {
                showLoading('正在初始化認證系統...');
                
                let waitCount = 0;
                while (!authManager && waitCount < 100) { // 最多等待 10 秒
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitCount++;
                }
                
                if (!authManager) {
                    hideLoading();
                    console.error('AuthManager 初始化超時');
                    if (onFailure) onFailure();
                    return;
                }
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


            // 步驟 3: 優先使用本地用戶資訊，背景驗證 Token
            console.log('開始檢查用戶資訊...');
            let userInfo = authManager.api.getUserInfo(); // 優先使用本地快取
            let tokenValidated = false;
            
            if (userInfo) {
                console.log('使用本地快取的用戶資訊:', userInfo);
                // 背景驗證 Token，不阻塞 UI
                setTimeout(async () => {
                    try {
                        const serverUserInfo = await authManager.api.getCurrentUser();
                        if (serverUserInfo) {
                            console.log('背景 Token 驗證成功，更新本地資訊');
                            // 靜默更新本地用戶資訊（如果有變更）
                            if (JSON.stringify(userInfo) !== JSON.stringify(serverUserInfo)) {
                                localStorage.setItem('user_info', JSON.stringify(serverUserInfo));
                            }
                        }
                    } catch (error) {
                        console.log('背景 Token 驗證失敗，但不影響當前會話:', error.message);
                    }
                }, 1000); // 延遲1秒進行背景驗證
            } else {
                // 沒有本地用戶資訊，必須進行同步驗證
                console.log('無本地用戶資訊，進行同步 Token 驗證...');
                try {
                    userInfo = await authManager.api.getCurrentUser();
                    tokenValidated = true;
                    console.log('同步 Token 驗證結果:', userInfo ? '有效' : '無效', userInfo);
                } catch (error) {
                    console.log('同步 Token 驗證失敗:', error.message);
                }
                
                if (!userInfo) {
                    console.log('Token 驗證失敗且無本地用戶資訊，清除並顯示登入框');
                    authManager.api.logout(); // 清除無效的 Token
                    hideLoading();
                    if (onFailure) onFailure();
                    authManager.showLoginModal();
                    return;
                }
            }

            // 步驟 4: 檢查管理員權限
            if (requireAdmin && userInfo.role !== 'admin') {
                hideLoading();
                console.log(`當前用戶角色: ${userInfo.role}, 需要管理員權限，清除Token並顯示登入框`);
                // 清除非管理員用戶的 Token
                authManager.api.clearAuth();
                if (onFailure) onFailure();
                authManager.showMessage('需要管理員權限，請使用管理員帳號登入', 'error');
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
//if (typeof module !== 'undefined' && module.exports) {
//    module.exports = { AuthManager, auth };
//}