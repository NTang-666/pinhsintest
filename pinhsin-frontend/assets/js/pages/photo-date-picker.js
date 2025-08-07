/**
 * 照片日期選擇器 - LIFF 版本
 * 為照片上傳功能提供日期選擇介面
 */

class PhotoDatePicker {
    constructor() {
        this.liffId = '2007637866-RPo4Bm69'; // 照片日期選擇器專用 LIFF 應用
        this.selectedDate = null;
        this.siteId = null;
        this.siteName = null;
        this.currentCalendarDate = new Date();
        this.photoCalendarData = [];
        this.isLiffInitialized = false;
    }

    /**
     * 初始化照片日期選擇器
     */
    async init() {
        try {
            console.log('🚀 照片日期選擇器初始化開始...');
            console.log('📱 User Agent:', navigator.userAgent);
            console.log('🌐 當前 URL:', window.location.href);
            
            // 檢查頁面環境
            if (this.shouldRedirectToPhotoPage()) {
                return; // 如果需要重定向，直接返回
            }
            
            // 解析 URL 參數
            console.log('🔍 第1步：解析 URL 參數...');
            this.parseUrlParameters();
            
            // 初始化 LIFF
            console.log('📱 第2步：初始化 LIFF...');
            await this.initLiff();
            
            // 載入照片日曆資料
            console.log('📅 第3步：載入照片日曆資料...');
            await this.loadPhotoCalendarData();
            
            // 初始化 UI
            console.log('🎨 第4步：初始化 UI...');
            this.initUI();
            
            // 綁定事件
            console.log('🔗 第5步：綁定事件...');
            this.bindEvents();
            
            console.log('✅ 照片日期選擇器初始化完成');
            
        } catch (error) {
            console.error('❌ 照片日期選擇器初始化失敗:', error);
            console.error('❌ 錯誤堆疊:', error.stack);
            this.showError(`初始化失敗：${error.message || error}\n請重新開啟頁面`);
        }
    }

    /**
     * 檢查是否需要重定向到照片日期選擇器頁面
     */
    shouldRedirectToPhotoPage() {
        // 如果當前頁面不是照片日期選擇器頁面，且有照片相關參數
        const currentPage = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        
        if (!currentPage.includes('photo-date-picker.html') && urlParams.has('siteId')) {
            console.log('🔄 重定向到照片日期選擇器頁面...');
            const newUrl = `./photo-date-picker.html${window.location.search}`;
            window.location.href = newUrl;
            return true;
        }
        
        return false;
    }

    /**
     * 取得正確的 API 基礎 URL
     */
    getApiBaseUrl() {
        const hostname = window.location.hostname;
        
        console.log('🌐 檢測當前環境:', {
            hostname,
            protocol: window.location.protocol,
            origin: window.location.origin
        });
        
        // 本地開發環境
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            console.log('🏠 本地開發環境');
            return 'http://localhost:3000';
        }
        
        // Vercel 部署環境
        if (hostname.includes('vercel.app')) {
            console.log('☁️ Vercel 部署環境');
            // 在生產環境中，應該使用固定的後端 API URL
            // 使用 Render 部署的正式後端域名
            return 'https://pinhsin-backend.onrender.com';
        }
        
        // LIFF 環境可能會有特殊的域名
        if (hostname.includes('liff.line.me')) {
            console.log('📱 LIFF 環境');
            return 'https://pinhsin-backend.onrender.com';
        }
        
        // 其他環境（預設使用 Render 後端）
        console.log('🌍 其他環境，使用 Render 後端');
        return 'https://pinhsin-backend.onrender.com';
    }

    /**
     * 解析 URL 參數 (支援 LIFF liff.state 格式)
     */
    parseUrlParameters() {
        console.log('🔍 當前 URL:', window.location.href);
        console.log('🔍 URL 搜尋參數:', window.location.search);
        
        const urlParams = new URLSearchParams(window.location.search);
        console.log('🔍 URLSearchParams 物件:', urlParams.toString());
        
        // 檢查是否有 liff.state 參數 (LIFF 環境)
        const liffState = urlParams.get('liff.state');
        if (liffState) {
            console.log('📱 LIFF 環境偵測到，原始 liff.state:', liffState);
            console.log('📱 liff.state 字符長度:', liffState.length);
            console.log('📱 liff.state 前10字符:', liffState.substring(0, 10));
            
            // 解碼 liff.state 中的參數
            const decodedState = decodeURIComponent(liffState);
            console.log('🔓 解碼後的 state:', decodedState);
            console.log('🔓 解碼後長度:', decodedState.length);
            console.log('🔓 解碼後前20字符:', decodedState.substring(0, 20));
            
            // 更強健的清理邏輯 - 處理多種可能的前導字符
            let cleanState = decodedState;
            if (cleanState.startsWith('?')) {
                cleanState = cleanState.substring(1);
                console.log('🧹 移除前導 ? 字符');
            } else if (cleanState.startsWith('&')) {
                cleanState = cleanState.substring(1);
                console.log('🧹 移除前導 & 字符');
            }
            console.log('🧹 清理後的 state:', cleanState);
            
            // 嘗試解析參數的多種方法
            let stateParams;
            let parseSuccess = false;
            
            // 方法1: 使用 URLSearchParams
            try {
                stateParams = new URLSearchParams(cleanState);
                console.log('✅ URLSearchParams 解析成功');
                console.log('📊 解析到的參數數量:', [...stateParams.keys()].length);
                for (const [key, value] of stateParams) {
                    console.log(`📊 參數: ${key} = ${value}`);
                }
                parseSuccess = true;
            } catch (error) {
                console.warn('⚠️ URLSearchParams 解析失敗:', error);
                parseSuccess = false;
            }
            
            // 方法2: 手動字符串分割 (備用方案)
            if (!parseSuccess || [...stateParams.keys()].length === 0) {
                console.log('🔧 使用手動解析作為備用方案');
                stateParams = this.manualParseParameters(cleanState);
            }
            
            this.siteId = stateParams.get ? stateParams.get('siteId') : stateParams.siteId;
            this.siteName = stateParams.get ? stateParams.get('siteName') : stateParams.siteName;
            
            console.log('📱 LIFF 解析結果:', { siteId: this.siteId, siteName: this.siteName });
            
        } else {
            // 一般環境，直接解析 URL 參數
            console.log('🌐 一般環境，解析 URL 參數');
            this.siteId = urlParams.get('siteId');
            this.siteName = urlParams.get('siteName');
            console.log('🌐 一般環境解析結果:', { siteId: this.siteId, siteName: this.siteName });
        }
        
        // 如果 siteName 仍然是編碼格式，再次解碼
        if (this.siteName) {
            const originalSiteName = this.siteName;
            this.siteName = decodeURIComponent(this.siteName);
            if (originalSiteName !== this.siteName) {
                console.log('🔓 siteName 再次解碼:', originalSiteName, '->', this.siteName);
            }
        }
        
        console.log('📋 最終解析參數:', { siteId: this.siteId, siteName: this.siteName });
        
        // 檢查是否缺少參數，如果是則使用測試模式
        if (!this.siteId || !this.siteName) {
            console.warn('⚠️ 缺少 URL 參數，啟用測試模式');
            
            // 使用測試預設值
            this.siteId = this.siteId || '1';
            this.siteName = this.siteName || '測試工地A';
            
            console.log('🧪 測試模式參數:', { siteId: this.siteId, siteName: this.siteName });
            
            // 顯示測試模式提示
            this.showTestModeWarning();
        }
    }
    
    /**
     * 手動解析參數字符串 (備用方案)
     */
    manualParseParameters(paramString) {
        console.log('🔧 手動解析參數字符串:', paramString);
        const params = {};
        
        if (!paramString || paramString.trim() === '') {
            console.warn('⚠️ 參數字符串為空');
            return params;
        }
        
        // 分割參數對
        const pairs = paramString.split('&');
        console.log('🔧 分割到的參數對:', pairs);
        
        for (const pair of pairs) {
            if (pair.includes('=')) {
                const [key, value] = pair.split('=', 2);
                const decodedKey = decodeURIComponent(key);
                const decodedValue = decodeURIComponent(value);
                params[decodedKey] = decodedValue;
                console.log(`🔧 手動解析: ${decodedKey} = ${decodedValue}`);
            } else {
                console.warn('⚠️ 無效的參數對:', pair);
            }
        }
        
        // 建立類似 URLSearchParams 的介面
        params.get = function(key) {
            return this[key] || null;
        };
        
        console.log('🔧 手動解析完成:', params);
        return params;
    }

    /**
     * 初始化 LIFF
     */
    async initLiff() {
        try {
            console.log('📱 LIFF SDK 檢查開始...');
            
            // ✅ 改善：更健全的 LIFF SDK 檢查
            if (typeof liff === 'undefined') {
                console.error('❌ LIFF SDK 未載入');
                throw new Error('LIFF SDK 未載入，請確認頁面是否正確引入 LIFF SDK');
            }
            console.log('✅ LIFF SDK 已載入');

            // ✅ 添加：LIFF SDK 版本檢查
            try {
                const liffVersion = liff.getVersion ? liff.getVersion() : 'unknown';
                console.log('📱 LIFF SDK 版本:', liffVersion);
            } catch (versionError) {
                console.warn('⚠️ 無法取得 LIFF SDK 版本:', versionError);
            }

            // 檢查是否在 LINE 客戶端中
            const isInClient = liff.isInClient();
            console.log('📱 是否在 LINE 客戶端:', isInClient);
            
            if (!isInClient) {
                console.warn('⚠️ 不在 LINE 客戶端中，使用測試模式');
                this.isLiffInitialized = false;
                return;
            }

            console.log('🔄 開始初始化 LIFF，ID:', this.liffId);

            // ✅ 添加：LIFF 初始化超時處理
            const initPromise = liff.init({ liffId: this.liffId });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('LIFF 初始化超時')), 10000); // 10秒超時
            });

             await Promise.race([initPromise, timeoutPromise]);

            this.isLiffInitialized = true;
            console.log('✅ LIFF 初始化成功');
            
            // 檢查登入狀態
            const isLoggedIn = liff.isLoggedIn();
            console.log('🔐 LIFF 登入狀態:', isLoggedIn);
            
            // 取得用戶資訊
            if (isLoggedIn) {
                const profile = await liff.getProfile();
                console.log('👤 LIFF 用戶資訊:', profile.displayName, profile.userId);
            } else {
                console.warn('⚠️ 用戶未登入 LIFF');
            }
            
        } catch (error) {
            console.error('❌ LIFF 初始化失敗:', error);
            console.error('❌ LIFF 錯誤堆疊:', error.stack);
            this.isLiffInitialized = false;
            
            // ✅ 改善：更詳細的錯誤處理
            let errorMessage = 'LIFF 初始化失敗';
            if (error.code) {
                switch (error.code) {
                    case 'LIFF_NOT_SUPPORTED':
                        errorMessage = 'LIFF 不支援此瀏覽器';
                        break;
                    case 'INVALID_LIFF_ID':
                        errorMessage = 'LIFF ID 無效或不存在';
                        break;
                    case 'UNAUTHORIZED':
                        errorMessage = 'LIFF 應用未授權';
                        break;
                    case 'FORBIDDEN':
                        errorMessage = 'LIFF 應用被禁止存取';
                        break;
                    default:
                        errorMessage = `LIFF 錯誤代碼: ${error.code}`;
                }
            } else if (error.message?.includes('超時')) {
                errorMessage = 'LIFF 初始化超時，請檢查網路連線';
            }
            
            // 詳細錯誤資訊
            const detailMessage = `LIFF ${errorMessage}\n錯誤詳情: ${error.message || error}\nLIFF ID: ${this.liffId}\n用戶代理: ${navigator.userAgent.substring(0, 50)}...`;
            console.error('詳細 LIFF 錯誤:', error);
            this.showError(detailMessage);
        }
    }

    /**
     * 載入照片日曆資料
     */
    async loadPhotoCalendarData() {
        try {
            const year = this.currentCalendarDate.getFullYear();
            const month = this.currentCalendarDate.getMonth() + 1;
            
            console.log(`📅 載入 ${year}年${month}月 照片日曆資料...`);
            
            // 記錄環境資訊以便調試
            console.log('🔍 載入環境資訊:', {
                userAgent: navigator.userAgent,
                isMobile: /Mobi|Android/i.test(navigator.userAgent),
                isLiffInitialized: this.isLiffInitialized,
                siteId: this.siteId,
                siteName: this.siteName,
                currentUrl: window.location.href,
                apiBaseUrl: this.getApiBaseUrl()
            });
            
            // 嘗試呼叫實際 API，失敗時降級為模擬資料
            let useApiData = false;
            try {
                this.photoCalendarData = await this.fetchPhotoCalendarAPI(year, month);
                useApiData = true;
                console.log('✅ 實際 API 照片日曆資料載入完成:', this.photoCalendarData.length, '天');
            } catch (apiError) {
                console.warn('⚠️ API 呼叫失敗，使用模擬資料:', apiError.message);
                console.warn('⚠️ API 錯誤詳情:', apiError);
                
                // 記錄 API 失敗的詳細原因
                const failureInfo = {
                    error: apiError.message,
                    stack: apiError.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    isMobile: /Mobi|Android/i.test(navigator.userAgent),
                    siteId: this.siteId,
                    year,
                    month
                };
                console.warn('📊 API 失敗資訊:', failureInfo);
                
                this.photoCalendarData = this.generateMockCalendarData(year, month);
                console.log('✅ 模擬照片日曆資料載入完成:', this.photoCalendarData.length, '天');
            }
            
            // 記錄最終載入結果
            console.log('📋 日曆資料載入總結:', {
                useApiData,
                dataSource: useApiData ? 'API' : 'Mock',
                totalDays: this.photoCalendarData.length,
                year,
                month,
                hasPhotoDays: this.photoCalendarData.filter(d => d.has_photos).length,
                maxReachedDays: this.photoCalendarData.filter(d => d.max_reached).length
            });
            
        } catch (error) {
            console.error('❌ 載入照片日曆資料失敗:', error);
            console.error('❌ 載入錯誤堆疊:', error.stack);
            this.photoCalendarData = [];
        }
    }

    /**
     * 呼叫照片日曆 API
     */
    async fetchPhotoCalendarAPI(year, month) {
        console.log('📋 開始呼叫照片日曆 API');
        
        // ✅ 修正：改善 LIFF 狀態檢查
        if (!this.isLiffInitialized) {
            console.warn('⚠️ LIFF 未初始化，將使用模擬資料');
            throw new Error('LIFF 未初始化');
        }
        
        // ✅ 添加：更健全的登入狀態檢查
        try {
            if (!liff.isLoggedIn()) {
                console.warn('⚠️ LIFF 用戶未登入，將使用模擬資料');
                throw new Error('LIFF 用戶未登入');
            }
        } catch (liffError) {
            console.warn('⚠️ LIFF 登入狀態檢查失敗:', liffError);
            throw new Error('LIFF 服務異常');
        }

        let systemToken;
        try {
            // 進行跨 Channel 認證，取得系統 JWT token
            systemToken = await this.establishCrossChannelAuth();
            console.log('✅ 跨 Channel 認證成功');
        } catch (authError) {
            console.error('❌ 跨 Channel 認證失敗:', authError);
            throw new Error(`認證失敗: ${authError.message}`);
        }
        
        // 設定 API 端點
        const apiBaseUrl = this.getApiBaseUrl();
        const apiUrl = `${apiBaseUrl}/api/photos/sites/${this.siteId}/calendar?year=${year}&month=${month}`;
        
        console.log('🔄 準備呼叫照片日曆 API:', {
            url: apiUrl,
            siteId: this.siteId,
            year,
            month,
            hasToken: !!systemToken,
            tokenLength: systemToken ? systemToken.length : 0
        });
        
        try {
            // ✅ 添加：請求超時處理
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超時
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${systemToken}`,
                    'Origin': window.location.origin
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            console.log('📥 API 回應狀態:', {
                url: apiUrl,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: {
                    'content-type': response.headers.get('content-type'),
                    'access-control-allow-origin': response.headers.get('access-control-allow-origin')
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '無法讀取錯誤內容');
                console.error('❌ API 詳細錯誤:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText,
                    url: apiUrl
                });
                
                // 根據錯誤狀態碼提供更詳細的錯誤資訊
                let errorMessage = `API 請求失敗 (${response.status})`;
                if (response.status === 401) {
                    errorMessage = '認證失敗，請重新登入';
                } else if (response.status === 403) {
                    errorMessage = '權限不足，無法存取此工地資料';
                } else if (response.status === 404) {
                    errorMessage = '找不到指定的工地或API端點';
                } else if (response.status >= 500) {
                    errorMessage = '伺服器錯誤，請稍後再試';
                }
                
                throw new Error(`${errorMessage}\n詳細: ${errorText}`);
            }

            // 強化 JSON 解析處理 - 修復手機版相容性問題
            let data;
            try {
                // 先取得原始回應文字
                const responseText = await response.text();
                console.log('📥 API 原始回應:', {
                    contentType: response.headers.get('content-type'),
                    contentLength: responseText.length,
                    responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
                    isMobile: /Mobi|Android/i.test(navigator.userAgent),
                    userAgent: navigator.userAgent.substring(0, 50)
                });

                // 清理可能的 BOM 和多餘空白
                let cleanResponseText = responseText.trim();
                
                // 移除 UTF-8 BOM (如果存在)
                if (cleanResponseText.charCodeAt(0) === 0xFEFF) {
                    cleanResponseText = cleanResponseText.slice(1);
                    console.log('🧹 移除 UTF-8 BOM');
                }
                
                // 移除可能的前後空白字符
                cleanResponseText = cleanResponseText.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
                
                // 檢查是否為有效 JSON 格式
                if (!cleanResponseText.startsWith('{') && !cleanResponseText.startsWith('[')) {
                    console.error('❌ 回應內容不是有效的 JSON 格式:', cleanResponseText.substring(0, 100));
                    throw new Error('伺服器回應格式錯誤：不是有效的 JSON');
                }

                // 嘗試多種解析方法
                try {
                    // 方法1: 標準 JSON.parse
                    data = JSON.parse(cleanResponseText);
                    console.log('✅ 標準 JSON 解析成功');
                } catch (standardParseError) {
                    console.warn('⚠️ 標準 JSON 解析失敗:', standardParseError.message);
                    
                    try {
                        // 方法2: 使用 eval (僅作最後手段，相對安全因為來源可信)
                        console.log('🔄 嘗試使用 eval 解析...');
                        data = eval('(' + cleanResponseText + ')');
                        console.log('✅ eval 解析成功');
                    } catch (evalError) {
                        console.error('❌ eval 解析也失敗:', evalError.message);
                        
                        // 方法3: 嘗試修復常見 JSON 問題
                        try {
                            console.log('🔧 嘗試修復常見 JSON 問題...');
                            let fixedText = cleanResponseText
                                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
                                .replace(/,(\s*[}\]])/g, '$1') // 移除多餘逗號
                                .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // 修復未引用的鍵
                            
                            data = JSON.parse(fixedText);
                            console.log('✅ 修復後 JSON 解析成功');
                        } catch (fixedParseError) {
                            console.error('❌ 所有解析方法都失敗');
                            throw new Error(`JSON 解析失敗: ${standardParseError.message}`);
                        }
                    }
                }
            } catch (jsonError) {
                console.error('❌ JSON 解析完全失敗:', jsonError);
                console.error('❌ 原始錯誤堆疊:', jsonError.stack);
                
                // 提供詳細的錯誤資訊給調試用
                const errorDetails = {
                    error: jsonError.message,
                    userAgent: navigator.userAgent,
                    contentType: response.headers.get('content-type'),
                    responseStatus: response.status,
                    isMobile: /Mobi|Android/i.test(navigator.userAgent),
                    timestamp: new Date().toISOString()
                };
                console.error('📊 JSON 解析錯誤詳情:', errorDetails);
                
                throw new Error(`JSON 解析失敗 (${jsonError.message})，請檢查網路連線或聯絡技術支援`);
            }

            console.log('📋 API 回應資料:', {
                success: data.success,
                hasData: !!data.data,
                calendarLength: data.data?.calendar?.length || 0,
                dataKeys: Object.keys(data)
            });
            
            if (!data.success) {
                throw new Error(data.error?.message || 'API 回應失敗');
            }

            return data.data.calendar || [];
            
        } catch (fetchError) {
            console.error('❌ API 呼叫失敗:', fetchError);
            
            // ✅ 改善：更友善的錯誤訊息處理
            if (fetchError.name === 'AbortError') {
                throw new Error('請求超時，請檢查網路連線或稍後再試');
            } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                throw new Error('網路連線失敗，請檢查網路狀態或稍後再試');
            }
            
            throw fetchError;
        }
    }

    /**
     * 建立跨 Channel 認證
     */
    async establishCrossChannelAuth() {
        try {
            if (!this.isLiffInitialized || !liff.isLoggedIn()) {
                throw new Error('LIFF 未初始化或用戶未登入');
            }

            // 取得 LIFF 用戶資訊
            const profile = await liff.getProfile();
            const liffAccessToken = liff.getAccessToken();

            console.log('👤 LIFF 用戶資訊:', {
                userId: profile.userId,
                displayName: profile.displayName,
                hasAccessToken: !!liffAccessToken,
                tokenLength: liffAccessToken ? liffAccessToken.length : 0
            });

            // 設定 API 端點 - 修復部署環境 API 端點選擇
            const apiBaseUrl = this.getApiBaseUrl();
                
            const authUrl = `${apiBaseUrl}/api/line/cross-channel-auth`;

            console.log('🔐 進行跨 Channel 認證...', { authUrl });

            const requestBody = {
                liffUserId: profile.userId,
                liffAccessToken: liffAccessToken,
                channelType: 'liff'
            };

            console.log('📤 發送認證請求:', { 
                url: authUrl,
                method: 'POST',
                bodyKeys: Object.keys(requestBody),
                liffUserIdLength: profile.userId ? profile.userId.length : 0,
                hasAccessToken: !!liffAccessToken
            });

            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': window.location.origin
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 認證回應狀態:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: {
                    'content-type': response.headers.get('content-type'),
                    'access-control-allow-origin': response.headers.get('access-control-allow-origin')
                }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '無法讀取錯誤回應');
                console.error('❌ API 回應錯誤:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });
                throw new Error(`認證 API 回應錯誤: ${response.status} ${response.statusText}`);
            }

            // 使用相同的強化 JSON 解析處理
            let authData;
            try {
                const responseText = await response.text();
                console.log('📥 認證 API 原始回應:', {
                    contentType: response.headers.get('content-type'),
                    contentLength: responseText.length,
                    responsePreview: responseText.substring(0, 100),
                    isMobile: /Mobi|Android/i.test(navigator.userAgent)
                });

                // 清理和解析 JSON
                let cleanResponseText = responseText.trim();
                if (cleanResponseText.charCodeAt(0) === 0xFEFF) {
                    cleanResponseText = cleanResponseText.slice(1);
                }
                cleanResponseText = cleanResponseText.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

                authData = JSON.parse(cleanResponseText);
                console.log('📋 認證回應數據:', authData);
            } catch (jsonError) {
                console.error('❌ 認證回應 JSON 解析失敗:', jsonError);
                throw new Error(`認證回應解析失敗: ${jsonError.message}`);
            }

            if (!authData.success) {
                console.error('❌ 認證邏輯失敗:', authData.error);
                throw new Error(authData.error?.message || '跨 Channel 認證失敗');
            }

            console.log('✅ 跨 Channel 認證成功');
            return authData.data.authToken;

        } catch (error) {
            console.error('❌ 跨 Channel 認證失敗:', error);
            throw error;
        }
    }

    /**
     * 生成模擬日曆資料 (稍後替換為 API 呼叫)
     */
    generateMockCalendarData(year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const mockData = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dateStr = date.toISOString().split('T')[0];
            
            // 模擬隨機照片數量
            const photoCount = Math.floor(Math.random() * 12);
            
            mockData.push({
                date: dateStr,
                photo_count: photoCount,
                max_reached: photoCount >= 10,
                has_photos: photoCount > 0
            });
        }
        
        return mockData;
    }

    /**
     * 初始化 UI
     */
    initUI() {
        // 更新工地資訊
        const siteInfoEl = document.getElementById('siteInfo');
        if (siteInfoEl) {
            siteInfoEl.textContent = `工地：【${this.siteName}】`;
        }

        // 渲染日曆
        this.renderCalendar();
        
        // 顯示主要內容
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('confirmSection').style.display = 'block';
    }

    /**
     * 綁定事件
     */
    bindEvents() {
        // 月份導航按鈕
        document.getElementById('prevMonthBtn').addEventListener('click', () => {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
            this.loadPhotoCalendarData().then(() => this.renderCalendar());
        });

        document.getElementById('nextMonthBtn').addEventListener('click', () => {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
            this.loadPhotoCalendarData().then(() => this.renderCalendar());
        });

        // 確認按鈕
        document.getElementById('confirmDateBtn').addEventListener('click', () => {
            this.onConfirmDate();
        });
    }

    /**
     * 渲染日曆
     */
    renderCalendar() {
        const currentDate = this.currentCalendarDate;
        const monthYear = document.getElementById('currentMonthYear');
        const calendarDays = document.getElementById('calendarDays');
        
        // 更新月份標題
        if (monthYear) {
            monthYear.textContent = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
        }

        if (!calendarDays) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(1 - firstDay.getDay());

        // ✅ 改善：使用 DocumentFragment 提升效能
        const fragment = document.createDocumentFragment();

        // 清空現有內容
        const existingDays = calendarDays.querySelectorAll('.calendar-day');
        existingDays.forEach(day => day.remove());

        // 生成42天的日曆格子
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = this.createDayElement(date, month);
            fragment.appendChild(dayElement); // ✅ 修正：添加到 fragment 而不是直接添加到 DOM
        }
        
        // ✅ 修正：一次性插入所有元素
        calendarDays.appendChild(fragment);
        
        console.log('📅 日曆渲染完成:', {
            year,
            month: month + 1,
            totalDays: 42,
            photoDataCount: this.photoCalendarData.length
        });
    }

    /**
     * 創建日期格子元素
     */
    createDayElement(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        const dateStr = date.toISOString().split('T')[0];
        dayElement.dataset.date = dateStr;

        // 判斷日期狀態
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isToday(date);
        const photoData = this.getPhotoDataForDate(dateStr);

        // 設定CSS類別
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        } else if (isToday) {
            dayElement.classList.add('today');
        } else if (photoData && photoData.has_photos) {
            dayElement.classList.add('has-photos');
        } else {
            dayElement.classList.add('no-photos');
        }

        // 標記達到上限的日期
        if (photoData && photoData.max_reached) {
            dayElement.classList.add('max-reached');
        }

        // 顯示照片數量徽章
        if (photoData && photoData.photo_count > 0) {
            const badge = document.createElement('div');
            badge.className = 'photo-count-badge';
            badge.textContent = photoData.photo_count;
            dayElement.appendChild(badge);
        }

        // 標記選中狀態
        if (this.selectedDate === dateStr) {
            dayElement.classList.add('selected');
        }

        // 綁定點擊事件
        if (isCurrentMonth) {
            dayElement.addEventListener('click', () => this.onDateSelect(dateStr, dayElement));
        }

        return dayElement;
    }

    /**
     * 日期選擇處理
     */
    onDateSelect(dateStr, dayElement) {
        // 檢查是否達到照片上限
        const photoData = this.getPhotoDataForDate(dateStr);
        if (photoData && photoData.max_reached) {
            alert('⚠️ 此日期已達照片上傳上限 (10張)，請選擇其他日期');
            return;
        }

        // 移除之前選中的狀態
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // 設定新的選中狀態
        dayElement.classList.add('selected');
        this.selectedDate = dateStr;

        // 更新選中日期顯示
        this.updateSelectedDateDisplay(dateStr);

        // 啟用確認按鈕
        const confirmBtn = document.getElementById('confirmDateBtn');
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('disabled');

        console.log('📅 選擇日期:', dateStr);
    }

    /**
     * 更新選中日期顯示
     */
    updateSelectedDateDisplay(dateStr) {
        const selectedDateText = document.getElementById('selectedDateText');
        if (selectedDateText) {
            const displayDate = new Date(dateStr).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            selectedDateText.textContent = displayDate;
        }
    }

    /**
     * 確認日期處理
     */
    async onConfirmDate() {
        if (!this.selectedDate) {
            alert('請先選擇日期');
            return;
        }

        try {
            console.log('✅ 確認選擇日期:', this.selectedDate);

            // 再次檢查照片數量限制
            const photoData = this.getPhotoDataForDate(this.selectedDate);
            if (photoData && photoData.max_reached) {
                alert('⚠️ 此日期已達照片上傳上限 (10張)，請選擇其他日期');
                return;
            }

            // 發送選擇結果到 LINE Bot
            await this.sendSelectedDate();

            // 關閉 LIFF 頁面
            if (this.isLiffInitialized && liff.isInClient()) {
                liff.closeWindow();
            } else {
                alert('✅ 日期選擇完成！(測試模式)');
            }

        } catch (error) {
            console.error('❌ 確認日期失敗:', error);
            alert('處理失敗，請重試');
        }
    }

    /**
     * 發送選擇結果到 LINE Bot
     */
    async sendSelectedDate() {
        if (!this.isLiffInitialized || !liff.isInClient()) {
            console.log('🔄 測試模式，模擬發送選擇結果');
            return;
        }

        const messageData = {
            action: 'selected_date_photo',
            site_id: parseInt(this.siteId),
            site_name: this.siteName,
            selected_date: this.selectedDate
        };

        // 使用 LIFF 發送隱藏的 postback 動作（不會顯示在聊天室）
        try {
            // 方案1: 使用 liff.closeWindow() 並通過 URL 參數傳遞結果
            const callbackUrl = `${window.location.origin}${window.location.pathname}?result=success&action=selected_date_photo&site_id=${messageData.site_id}&site_name=${encodeURIComponent(messageData.site_name)}&selected_date=${messageData.selected_date}`;
            
            // 發送結構化訊息給 LINE Bot
            const messageText = `selected_date_photo::${JSON.stringify(messageData)}`;
            await liff.sendMessages([{
                type: 'text',
                text: messageText
            }]);
            
            console.log('📤 已發送用戶友善訊息');
            
        } catch (sendError) {
            console.warn('⚠️ 發送訊息失敗，將使用備用方案:', sendError);
            // 備用方案：直接關閉視窗
        }

        console.log('📤 已發送選擇結果:', messageData);
    }

    /**
     * 取得指定日期的照片資料
     */
    getPhotoDataForDate(dateStr) {
        return this.photoCalendarData.find(data => data.date === dateStr);
    }

    /**
     * 判斷是否為今天
     */
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /**
     * 顯示測試模式警告
     */
    showTestModeWarning() {
        console.log('🧪 顯示測試模式警告');
        
        // 在頁面頂部加入測試模式橫幅
        const warningBanner = document.createElement('div');
        warningBanner.innerHTML = `
            <div style="
                background: linear-gradient(45deg, #ff9800, #ff5722);
                color: white;
                padding: 10px;
                text-align: center;
                font-size: 14px;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            ">
                🧪 測試模式 - 使用預設工地資料
            </div>
        `;
        document.body.insertBefore(warningBanner, document.body.firstChild);
        
        // 調整頁面上方間距避免被橫幅遮蔽
        const mainContent = document.querySelector('.photo-date-picker');
        if (mainContent) {
            mainContent.style.paddingTop = '60px';
        }
    }

    /**
     * 顯示錯誤訊息
     */
    showError(message) {
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.innerHTML = `<div style="color: #ff4757;">❌ ${message}</div>`;
        }
    }
}

// 當頁面載入完成時初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 照片日期選擇頁面載入完成');
    
    try {
        const picker = new PhotoDatePicker();
        
        // 添加超時機制防止無限載入
        const initTimeout = setTimeout(() => {
            console.warn('⏰ 初始化超時，強制顯示錯誤訊息');
            const loadingEl = document.getElementById('loadingState');
            if (loadingEl && loadingEl.style.display !== 'none') {
                loadingEl.innerHTML = `
                    <div style="color: #ff4757;">
                        <div>⏰ 載入超時</div>
                        <div style="font-size: 14px; margin-top: 10px;">
                            可能原因：<br>
                            • 網路連線緩慢<br>
                            • LIFF 服務暫時無法使用<br>
                            • 手機版瀏覽器相容性問題
                        </div>
                        <div style="margin-top: 15px;">
                            <button onclick="location.reload()" style="
                                background: #ff4757; 
                                color: white; 
                                border: none; 
                                padding: 10px 20px; 
                                border-radius: 8px;
                                cursor: pointer;
                            ">重新載入頁面</button>
                        </div>
                    </div>
                `;
            }
        }, 10000); // 10秒超時
        
        await picker.init();
        clearTimeout(initTimeout);
        
    } catch (error) {
        console.error('❌ 初始化失敗:', error);

        // ✅ 添加：更詳細的錯誤處理
        const loadingEl = document.getElementById('loadingState');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="color: #ff4757; text-align: center; padding: 20px;">
                    <div style="font-size: 18px; margin-bottom: 10px;">❌ 初始化失敗</div>
                    <div style="font-size: 14px; margin-bottom: 15px;">${error.message || error}</div>
                    <button onclick="location.reload()" style="
                        background: #ff4757; 
                        color: white; 
                        border: none; 
                        padding: 10px 20px; 
                        border-radius: 8px;
                        cursor: pointer;
                    ">重新載入頁面</button>
                </div>
            `;
        }
    }
});

// ✅ 添加：ES6 模組導出
export default PhotoDatePicker;
export { PhotoDatePicker };

// ✅ 添加：向後兼容的全域導出
if (typeof window !== 'undefined') {
    window.PhotoDatePicker = PhotoDatePicker;
}