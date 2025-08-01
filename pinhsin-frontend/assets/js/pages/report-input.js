/**
 * 品信工務系統 - 日報輸入頁面腳本
 * 整合後端API功能，實現完整的日報管理
 */

/**
 * 條件式載入認證腳本
 * @param {boolean} isLiff - 是否為 LIFF 環境
 */
function loadAuthScriptIfNeeded(isLiff) {
    return new Promise((resolve, reject) => {
        if (isLiff) {
            console.log('🎯 LIFF 環境：跳過載入 auth.js');
            resolve();
            return;
        }
        
        console.log('🔐 非 LIFF 環境：載入 auth.js');
        const script = document.createElement('script');
        script.src = '../assets/js/auth.js';
        script.onload = () => {
            console.log('✅ auth.js 載入完成');
            resolve();
        };
        script.onerror = () => {
            console.error('❌ auth.js 載入失敗');
            reject(new Error('Failed to load auth.js'));
        };
        document.head.appendChild(script);
    });
}

// LIFF 初始化和頁面載入
document.addEventListener('DOMContentLoaded', async function() {
    let isLiffEnvironment = false;
    let liffSiteId = null;
    let liffUserId = null;
    let targetPage = 'pageSelectSite'; // 默認頁面
    
    console.log('🚀 頁面載入開始，檢查LIFF環境...');

    // 解析 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const fromSource = urlParams.get('from'); // line, richmenu 等
    const pageParam = urlParams.get('page'); // site, date, input 等
    liffSiteId = urlParams.get('siteId');

    // 根據來源和參數決定目標頁面
    // 修正：從 Rich Menu 來的總是從工地選擇開始，忽略任何頁面參數
    if (fromSource === 'richmenu') {
        targetPage = 'pageSelectSite';
        console.log('📱 來自 Rich Menu，強制從工地選擇開始');
    } else if (pageParam === 'date') {
        targetPage = 'pageSelectDate';
    } else if (pageParam === 'input') {
        targetPage = 'pageInputReport';
    } else {
        // 默認從工地選擇開始
        targetPage = 'pageSelectSite';
    }

    // 首先檢查是否在 LIFF 環境
    if (typeof liff !== 'undefined') {
        try {
            console.log('🔧 檢測到 LIFF SDK，開始初始化...');
            // 使用正式 LIFF ID 初始化
            await liff.init({ liffId: '2007637866-8KOKBryL' });
            isLiffEnvironment = liff.isInClient();
            console.log('✅ LIFF 初始化完成，isInClient():', isLiffEnvironment);
            
            if (isLiffEnvironment) {
                // 添加 LIFF 環境 CSS 類別
                document.body.classList.add('liff-environment');
                console.log('🎯 LIFF 環境已確認，添加 CSS 類別');
                
                // 獲取 LIFF 用戶資訊
                const profile = await liff.getProfile();
                const liffAccessToken = liff.getAccessToken();
                liffUserId = profile.userId;
                console.log('👤 LIFF 用戶 ID:', liffUserId);
                console.log('📋 LIFF 模式啟動，目標頁面:', targetPage, '預選工地 ID:', liffSiteId);
                
                // 建立跨 Channel 用戶身份對應
                await establishCrossChannelAuth(liffUserId, liffAccessToken);
                
                // 顯示 LIFF 關閉按鈕
                const liffCloseBtn = document.getElementById('liffCloseBtn');
                if (liffCloseBtn) {
                    liffCloseBtn.style.display = 'block';
                    liffCloseBtn.addEventListener('click', () => {
                        if (typeof liff !== 'undefined' && liff.isInClient()) {
                            liff.closeWindow();
                        } else {
                            // 測試環境返回 LINE
                            window.close();
                        }
                    });
                }
                
                // 🔑 LIFF 環境下直接初始化系統，完全跳過認證
                console.log('🔑 LIFF 環境：跳過傳統認證，直接初始化系統');
                const reportInputManager = new ReportInputManager();
                await reportInputManager.init(isLiffEnvironment, liffSiteId, targetPage);
                return; // 🚨 重要：直接返回，不執行後續認證邏輯
            } else {
                console.log('🌐 在瀏覽器中開啟，但有 LIFF SDK');
            }
        } catch (error) {
            console.log('❌ LIFF 初始化失敗:', error);
            isLiffEnvironment = false;
        }
    } else {
        console.log('🌐 未檢測到 LIFF SDK，確定為瀏覽器環境');
    }

    // 🔧 根據環境條件式載入認證腳本
    try {
        await loadAuthScriptIfNeeded(isLiffEnvironment);
    } catch (error) {
        console.error('❌ 載入認證腳本失敗:', error);
        if (!isLiffEnvironment) {
            alert('載入認證模組失敗，請重新整理頁面');
            return;
        }
    }

    // 🔐 只有非 LIFF 環境才需要傳統認證
    if (!isLiffEnvironment) {
        console.log('🔐 非 LIFF 環境，需要傳統認證');
        try {
            // 確保 authManager 已初始化
            if (typeof authManager === 'undefined' || !authManager) {
                console.log('⏳ AuthManager 未初始化，等待...');
                // 等待 AuthManager 初始化
                await new Promise((resolve) => {
                    const checkAuth = () => {
                        if (typeof authManager !== 'undefined' && authManager) {
                            console.log('✅ AuthManager 已就緒');
                            resolve();
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                });
            }
            
            await authManager.requireAuth();
            console.log('✅ 傳統認證成功');
        } catch (error) {
            console.log('❌ 認證失敗，將顯示登入彈窗:', error.message);
            return;
        }
        
        // 初始化日報輸入系統（僅在非 LIFF 環境且認證成功後執行）
        console.log('🎯 初始化日報輸入系統');
        const reportInputManager = new ReportInputManager();
        await reportInputManager.init(isLiffEnvironment, liffSiteId, targetPage);
    }
});

/**
 * 建立跨 Channel 用戶身份對應
 * @param {string} liffUserId - LIFF 獲得的用戶 ID
 */
async function establishCrossChannelAuth(liffUserId, liffAccessToken) {
    try {
        const response = await fetch('/api/line/cross-channel-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                liffUserId: liffUserId,
                liffAccessToken: liffAccessToken,
                channelType: 'liff'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // 儲存跨 Channel 身份驗證資訊
            localStorage.setItem('crossChannelAuth', JSON.stringify({
                liffUserId: liffUserId,
                systemUserId: result.data.systemUserId,
                authToken: result.data.authToken,
                timestamp: Date.now()
            }));
            console.log('跨 Channel 身份驗證成功');
        } else {
            console.warn('跨 Channel 身份驗證失敗:', result.error);
        }
    } catch (error) {
        console.error('跨 Channel 身份驗證錯誤:', error);
    }
}

/**
 * 日報輸入管理器
 */
class ReportInputManager {
    constructor() {
        this.api = api;
        this.reportContext = {
            selectedSite: { id: null, name: '未選擇工地' },
            selectedDate: null,
            currentCalendarDate: new Date(),
            currentReport: null,
            sites: []
        };
        
        this.currentPage = 'pageSelectSite';
        this.calendar = null;
    }

    /**
     * 初始化系統
     * @param {boolean} isLiffEnvironment - 是否為 LIFF 環境
     * @param {string} liffSiteId - LIFF 傳入的工地 ID
     * @param {string} targetPage - 目標頁面 ID
     */
    async init(isLiffEnvironment = false, liffSiteId = null, targetPage = 'pageSelectSite') {
        try {
            // LIFF 環境下先設定預設工地，避免 API 認證問題
            if (isLiffEnvironment) {
                this.reportContext.sites = [
                    { id: 1, name: '工地A：市中心建案', status: 'normal' },
                    { id: 2, name: '工地B：山區別墅區', status: 'pending' }
                ];
            } else {
                await this.loadUserSites();
            }
            
            this.bindEvents();
            this.renderSiteSelection();
            
            // 根據目標頁面和工地 ID 決定初始頁面
            if (targetPage === 'pageInputReport') {
                // 直接跳轉到日報輸入頁面
                if (liffSiteId) {
                    const site = this.reportContext.sites.find(s => s.id == liffSiteId);
                    if (site) {
                        this.reportContext.selectedSite = { id: site.id, name: site.name };
                        this.reportContext.selectedDate = new Date().toISOString().split('T')[0]; // 今日
                        console.log('LIFF 自動選擇工地並跳轉到日報輸入:', site.name);
                        await this.checkExistingReport();
                        this.initReportForm();
                        this.showPage('pageInputReport');
                        return;
                    }
                }
                // 如果沒有工地 ID，降級到工地選擇頁面
                this.showPage('pageSelectSite');
            } else if (isLiffEnvironment && liffSiteId && targetPage === 'pageSelectDate') {
                // LIFF 環境自動選擇工地並跳轉到日期選擇
                const site = this.reportContext.sites.find(s => s.id == liffSiteId);
                if (site) {
                    this.reportContext.selectedSite = { id: site.id, name: site.name };
                    console.log('LIFF 自動選擇工地並跳轉到日期選擇:', site.name);
                    await this.loadSiteReports(site.id);
                    this.initCalendar();
                    this.showPage('pageSelectDate');
                    return;
                } else {
                    console.warn('LIFF 指定的工地 ID 不存在:', liffSiteId);
                }
            }
            
            // 默認顯示指定的目標頁面
            this.showPage(targetPage);
        } catch (error) {
            this.showError('初始化失敗：' + error.message);
        }
    }

    /**
     * 載入用戶可存取的工地
     */
    async loadUserSites() {
        try {
            // 獲取用戶所有可存取的日報（從中提取工地信息）
            const response = await this.api.getDailyReports({ limit: 100 });
            
            if (response.success) {
                // 從日報中提取唯一的工地ID
                const siteIds = [...new Set(response.data.reports.map(report => report.site_id))];
                
                // 建立工地列表（這裡簡化為使用ID，實際應該有工地名稱API）
                this.reportContext.sites = siteIds.map(siteId => ({
                    id: siteId,
                    name: `工地 ${siteId}`,
                    status: 'normal' // 可以根據最新日報狀態判斷
                }));
            }
        } catch (error) {
            console.error('Failed to load sites:', error);
            // 使用預設工地資料
            this.reportContext.sites = [
                { id: 1, name: '工地A：市中心建案', status: 'normal' },
                { id: 2, name: '工地B：山區別墅區', status: 'pending' }
            ];
        }
    }

    /**
     * 綁定事件處理器
     */
    bindEvents() {
        // 工地選擇事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.site-card')) {
                this.handleSiteSelect(e.target.closest('.site-card'));
            }
        });

        // 返回按鈕事件
        document.addEventListener('click', (e) => {
            if (e.target.closest('.back-button')) {
                const targetPage = e.target.closest('.back-button').dataset.targetPage;
                this.showPage(targetPage);
            }
        });

        // 確認日期按鈕
        const confirmDateBtn = document.getElementById('confirmDateBtn');
        if (confirmDateBtn) {
            confirmDateBtn.addEventListener('click', () => this.handleDateConfirm());
        }

        // 日報表單提交
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
        }

        // 複製昨日日報按鈕
        const copyYesterdayBtn = document.getElementById('copyYesterdayBtn');
        if (copyYesterdayBtn) {
            copyYesterdayBtn.addEventListener('click', () => this.handleCopyYesterday());
        }

        // 監聽認證事件
        window.addEventListener('auth:login', () => {
            this.init();
        });

        window.addEventListener('auth:logout', () => {
            this.reportContext = {
                selectedSite: { id: null, name: '未選擇工地' },
                selectedDate: null,
                currentCalendarDate: new Date(),
                currentReport: null,
                sites: []
            };
        });
    }

    /**
     * 渲染工地選擇頁面
     */
    renderSiteSelection() {
        const siteContainer = document.querySelector('#pageSelectSite main');
        if (!siteContainer) return;

        siteContainer.innerHTML = '';

        this.reportContext.sites.forEach(site => {
            const siteCard = document.createElement('div');
            siteCard.className = 'card site-card cursor-pointer hover:bg-gray-50';
            siteCard.dataset.siteId = site.id;
            siteCard.dataset.siteName = site.name;
            
            const statusColor = site.status === 'pending' ? 'bg-yellow-400' : 'bg-green-500';
            const statusText = site.status === 'pending' ? '待填寫日報' : '日報正常';

            siteCard.innerHTML = `
                <h2 class="text-lg font-bold text-main mb-1">${site.name}</h2>
                <p class="text-xs text-secondary flex items-center">
                    <span class="h-2 w-2 ${statusColor} rounded-full mr-1.5"></span>${statusText}
                </p>
            `;

            siteContainer.appendChild(siteCard);
        });
    }

    /**
     * 處理工地選擇
     */
    async handleSiteSelect(siteCard) {
        const siteId = parseInt(siteCard.dataset.siteId);
        const siteName = siteCard.dataset.siteName;

        this.reportContext.selectedSite = { id: siteId, name: siteName };
        
        // 更新標題
        const selectDateTitle = document.getElementById('selectDateTitle');
        if (selectDateTitle) {
            selectDateTitle.textContent = siteName;
        }

        // 載入該工地的日報資料
        await this.loadSiteReports(siteId);

        // 初始化日曆
        this.initCalendar();

        // 切換到日期選擇頁面
        this.showPage('pageSelectDate');
    }

    /**
     * 載入工地日報資料
     */
    async loadSiteReports(siteId) {
        try {
            const response = await this.api.getDailyReports({ 
                site_id: siteId,
                limit: 100 
            });
            
            if (response.success) {
                this.reportContext.siteReports = response.data.reports;
            }
        } catch (error) {
            console.error('Failed to load site reports:', error);
            this.reportContext.siteReports = [];
        }
    }

    /**
     * 初始化日曆
     */
    initCalendar() {
        // HTML 中已經有日曆結構，不需要重新創建
        // 直接初始化日曆數據和事件
        this.renderCalendar();
        this.bindCalendarEvents();
    }

    /**
     * 渲染日曆
     */
    renderCalendar() {
        const currentDate = this.reportContext.currentCalendarDate;
        const monthYear = document.getElementById('currentMonthYear');
        const calendarDays = document.getElementById('calendarDays');
        
        if (monthYear) {
            monthYear.textContent = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
        }

        if (!calendarDays) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDate = new Date(firstDay);
        startDate.setDate(1 - firstDay.getDay());

        calendarDays.innerHTML = '';

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();
            dayElement.dataset.date = date.toISOString().split('T')[0];

            // 判斷日期狀態
            if (date.getMonth() !== month) {
                dayElement.classList.add('other-month');
            } else {
                // 檢查是否有日報
                const hasReport = this.hasReportForDate(date);
                if (hasReport) {
                    dayElement.classList.add('reported');
                } else {
                    dayElement.classList.add('pending');
                }

                // 標記今日
                const today = new Date();
                if (date.toDateString() === today.toDateString()) {
                    dayElement.classList.add('today');
                }

                // 標記選中日期
                if (this.reportContext.selectedDate === dayElement.dataset.date) {
                    dayElement.classList.add('selected');
                }

                // 添加點擊事件
                dayElement.addEventListener('click', () => this.handleDateSelect(dayElement.dataset.date));
            }

            calendarDays.appendChild(dayElement);
        }
    }

    /**
     * 綁定日曆事件
     */
    bindCalendarEvents() {
        const prevBtn = document.getElementById('prevMonthBtn');
        const nextBtn = document.getElementById('nextMonthBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.reportContext.currentCalendarDate.setMonth(this.reportContext.currentCalendarDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.reportContext.currentCalendarDate.setMonth(this.reportContext.currentCalendarDate.getMonth() + 1);
                this.renderCalendar();
            });
        }
    }

    /**
     * 檢查指定日期是否有日報
     */
    hasReportForDate(date) {
        if (!this.reportContext.siteReports) return false;
        
        const dateStr = date.toISOString().split('T')[0];
        return this.reportContext.siteReports.some(report => 
            report.report_date.split('T')[0] === dateStr
        );
    }

    /**
     * 處理日期選擇
     */
    handleDateSelect(dateStr) {
        // 移除之前選中的日期
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // 標記新選中的日期
        const selectedElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }

        this.reportContext.selectedDate = dateStr;

        // 啟用確認按鈕
        const confirmBtn = document.getElementById('confirmDateBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-50');
        }
    }

    /**
     * 處理日期確認
     */
    async handleDateConfirm() {
        if (!this.reportContext.selectedDate) {
            this.showError('請選擇日期');
            return;
        }

        try {
            // 檢查該日期是否已有日報
            await this.checkExistingReport();
            
            // 切換到日報輸入頁面
            this.initReportForm();
            this.showPage('pageInputReport');
        } catch (error) {
            this.showError('載入日報失敗：' + error.message);
        }
    }

    /**
     * 檢查現有日報
     */
    async checkExistingReport() {
        try {
            const response = await this.api.getDailyReports({
                site_id: this.reportContext.selectedSite.id,
                report_date: this.reportContext.selectedDate
            });

            if (response.success && response.data.reports.length > 0) {
                this.reportContext.currentReport = response.data.reports[0];
            } else {
                this.reportContext.currentReport = null;
            }
        } catch (error) {
            console.error('Failed to check existing report:', error);
            this.reportContext.currentReport = null;
        }
    }

    /**
     * 初始化日報表單
     */
    initReportForm() {
        const form = document.getElementById('reportForm');
        if (!form) return;

        const currentReport = this.reportContext.currentReport;
        
        if (currentReport) {
            // 編輯模式：填充現有資料
            this.populateForm(form, currentReport);
        } else {
            // 新建模式：清空表單
            form.reset();
        }

        // 更新頁面標題
        const pageTitle = document.querySelector('#pageReportInput h1');
        if (pageTitle) {
            const mode = currentReport ? '編輯' : '新增';
            pageTitle.textContent = `${mode}日報 - ${this.reportContext.selectedSite.name}`;
        }
    }

    /**
     * 填充表單資料
     */
    populateForm(form, report) {
        // 基本資料
        const weatherSelect = form.querySelector('[name="weather"]');
        if (weatherSelect) weatherSelect.value = report.weather || '';

        const notesTextarea = form.querySelector('[name="daily_notes"]');
        if (notesTextarea) notesTextarea.value = report.daily_notes || '';

        // 工作項目
        if (report.work_items && report.work_items.length > 0) {
            this.populateWorkItems(report.work_items);
        }

        // 材料記錄
        if (report.materials && report.materials.length > 0) {
            this.populateMaterials(report.materials);
        }

        // 人力記錄
        if (report.workers && report.workers.length > 0) {
            this.populateWorkers(report.workers);
        }
    }

    /**
     * 處理日報表單提交
     */
    async handleReportSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const reportData = this.buildReportData(formData);

        try {
            this.showLoading(true);
            
            let response;
            if (this.reportContext.currentReport) {
                // 更新現有日報
                response = await this.api.updateDailyReport(
                    this.reportContext.currentReport.id, 
                    reportData
                );
            } else {
                // 創建新日報
                reportData.site_id = this.reportContext.selectedSite.id;
                reportData.report_date = this.reportContext.selectedDate;
                response = await this.api.createDailyReport(reportData);
            }

            if (response.success) {
                this.showSuccess('日報儲存成功！');
                this.reportContext.currentReport = response.data;
                
                // 可以選擇返回工地選擇或繼續編輯
                setTimeout(() => {
                    this.showPage('pageSelectSite');
                }, 1500);
            }
        } catch (error) {
            this.showError('儲存失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 處理複製昨日日報
     */
    async handleCopyYesterday() {
        if (!this.reportContext.selectedSite.id || !this.reportContext.selectedDate) {
            this.showError('請先選擇工地和日期');
            return;
        }

        try {
            this.showLoading(true, '正在載入昨日日報...');

            const response = await this.api.copyYesterdayReport(
                this.reportContext.selectedSite.id,
                this.reportContext.selectedDate
            );

            if (response.success) {
                if (response.data.hasYesterdayReport) {
                    // 填充昨日日報資料到表單
                    this.populateFormFromYesterday(response.data.yesterdayReport);
                    this.showSuccess(`已複製 ${response.data.yesterdayDate} 的日報內容`);
                } else {
                    this.showInfo(response.data.message || '昨日無日報記錄');
                }
            }
        } catch (error) {
            this.showError('複製昨日日報失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 從昨日日報資料填充表單
     */
    populateFormFromYesterday(yesterdayData) {
        // 填充天氣
        if (yesterdayData.weather) {
            const weatherButtons = document.querySelectorAll('[data-weather]');
            weatherButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.weather === yesterdayData.weather) {
                    btn.classList.add('active');
                }
            });
            
            const weatherInput = document.getElementById('selectedWeatherInput');
            if (weatherInput) {
                weatherInput.value = yesterdayData.weather;
            }
        }

        // 填充工作項目
        if (yesterdayData.workItems && yesterdayData.workItems.length > 0) {
            const workerArea = document.getElementById('workerInputArea');
            if (workerArea) {
                workerArea.innerHTML = '';
                yesterdayData.workItems.forEach((item, index) => {
                    this.addWorkerItem(item, index);
                });
            }
        }

        // 填充材料記錄
        if (yesterdayData.materials && yesterdayData.materials.length > 0) {
            const materialArea = document.getElementById('materialInputArea');
            if (materialArea) {
                materialArea.innerHTML = '';
                yesterdayData.materials.forEach((item, index) => {
                    this.addMaterialItem(item, index);
                });
            }
        }

        // 填充本日記事
        if (yesterdayData.dailyNotes) {
            const dailyNotesTextarea = document.getElementById('dailyNotes');
            if (dailyNotesTextarea) {
                dailyNotesTextarea.value = yesterdayData.dailyNotes;
            }
        }
    }

    /**
     * 添加工作項目到表單
     */
    addWorkerItem(workerData = {}, index = 0) {
        const workerArea = document.getElementById('workerInputArea');
        if (!workerArea) return;

        const workerHtml = this.createWorkerItemHTML(workerData, index);
        workerArea.insertAdjacentHTML('beforeend', workerHtml);
        
        // 綁定新增項目的事件
        const newItem = workerArea.lastElementChild;
        this.bindWorkerItemEvents(newItem);
    }

    /**
     * 添加材料項目到表單
     */
    addMaterialItem(materialData = {}, index = 0) {
        const materialArea = document.getElementById('materialInputArea');
        if (!materialArea) return;

        const materialHtml = this.createMaterialItemHTML(materialData, index);
        materialArea.insertAdjacentHTML('beforeend', materialHtml);
        
        // 綁定新增項目的事件
        const newItem = materialArea.lastElementChild;
        this.bindMaterialItemEvents(newItem);
    }

    /**
     * 建構日報資料
     */
    buildReportData(formData) {
        const data = {
            weather: formData.get('weather'),
            daily_notes: formData.get('daily_notes'),
            work_items: [],
            materials: [],
            workers: []
        };

        // 這裡需要根據實際表單結構來收集工作項目、材料、人力等資料
        // 可以實作動態表單項目的收集邏輯

        return data;
    }

    /**
     * 顯示/隱藏頁面
     */
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }
    }

    /**
     * 顯示錯誤訊息
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * 顯示成功訊息
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * 顯示訊息
     */
    showMessage(message, type = 'info') {
        // 重用authManager的showMessage方法
        if (typeof authManager !== 'undefined') {
            authManager.showMessage(message, type);
        } else {
            alert(message);
        }
    }

    /**
     * 顯示/隱藏載入狀態
     */
    showLoading(show) {
        const submitBtn = document.querySelector('#reportForm [type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = show;
            submitBtn.textContent = show ? '儲存中...' : '儲存日報';
        }
    }
}