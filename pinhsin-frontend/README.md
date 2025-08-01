# 品信工務系統 - 前端

**版本**: v2.4.0  
**更新時間**: 2025-06-27  
**部署平台**: Vercel

---

## 📋 專案概述

品信工務系統的前端界面，提供工地日報管理、照片上傳、工程進度追蹤等功能。支援 LINE LIFF 整合，讓現場人員可透過 LINE 應用程式直接使用系統功能。

## 🏗️ 系統架構

```
前端 (Vercel) ←→ 後端 (Railway) ←→ 資料庫 (Supabase)
```

## 📁 檔案結構

```
├── assets/                # 靜態資源
│   ├── css/              # 樣式檔案
│   │   ├── common.css    # 共用樣式
│   │   ├── components.css # 組件樣式
│   │   └── pages/        # 頁面專用樣式
│   └── js/               # JavaScript 檔案
│       ├── api.js        # API 客戶端
│       ├── auth.js       # 認證管理
│       ├── components/   # UI 組件
│       ├── pages/        # 頁面邏輯
│       └── utils/        # 工具函數
├── pages/                # 頁面檔案
│   ├── report-input.html # 日報輸入頁面
│   ├── boss_dashboard.html # 主管儀表板
│   └── ...              # 其他業務頁面
└── line-entry.html       # LINE LIFF 入口頁面
```

## 🎯 主要功能

### 🔐 用戶認證
- JWT Token 認證
- 角色權限控制 (admin/boss/site-manager/client)
- 自動登入狀態管理

### 📊 日報管理
- 日報建立與編輯
- 工地選擇和權限控制
- 工作項目動態管理
- 即時狀態同步

### 📸 照片管理
- 多檔案上傳
- 圖片預覽和縮圖
- 照片分類和標註
- 批次處理支援

### 📱 LINE LIFF 整合
- 跨 Channel 身份驗證
- Rich Menu 功能整合
- 行動裝置優化介面
- 即時訊息互動

## 🌐 部署資訊

### 開發環境
```bash
# 本地開發伺服器
python3 -m http.server 8080

# 或使用 Node.js
npx http-server -p 8080
```

### 生產環境
- **平台**: Vercel
- **自動部署**: GitHub Push 觸發
- **URL**: https://pin-xin-frontend.vercel.app
- **SSL**: 自動配置

## 🔧 API 連線配置

系統會根據執行環境自動選擇 API 端點：

```javascript
// 開發環境
http://localhost:3000/api

// 生產環境  
https://pin-xin-backend.railway.app/api
```

## 📱 LINE LIFF 配置

- **LIFF ID**: `2007637866-8KOKBryL`
- **入口頁面**: `/line-entry.html`
- **主要功能頁面**: `/pages/report-input.html`
- **URL 參數支援**: `?from=richmenu&page=input`

## 🛠️ 開發指南

### 新增頁面
1. 在 `pages/` 目錄建立 HTML 檔案
2. 在 `assets/css/pages/` 建立對應樣式
3. 在 `assets/js/pages/` 建立頁面邏輯
4. 更新導航選單 (`navigation.js`)

### API 呼叫範例
```javascript
// 初始化 API 客戶端
const api = new ApiClient();

// 登入
const response = await api.login(username, password);

// 取得日報列表
const reports = await api.getDailyReports();

// 上傳照片
const result = await api.uploadPhoto(file, reportId);
```

### 認證檢查
```javascript
// 檢查登入狀態
if (!AuthManager.isLoggedIn()) {
    AuthManager.showLoginModal();
    return;
}

// 檢查權限
if (!AuthManager.hasPermission('CREATE_REPORT')) {
    alert('權限不足');
    return;
}
```

## 🧪 測試

### 功能測試
- 所有頁面載入正常
- API 連線功能正確
- 認證流程完整
- LIFF 整合測試

### 瀏覽器支援
- Chrome 90+
- Safari 14+
- Firefox 88+
- LINE 內建瀏覽器

## 📈 效能優化

- CSS/JS 檔案壓縮
- 圖片自動最佳化 (Vercel)
- CDN 全球分發
- 快取策略優化

## 🔐 安全性

- XSS 防護
- CSRF Token 驗證
- HTTPS 強制重導向
- 內容安全政策 (CSP)

## 📞 技術支援

- **架構文檔**: `/development-docs/`
- **API 文檔**: 後端專案 README
- **部署指南**: `/development-docs/DEPLOYMENT_ARCHITECTURE_PLAN.md`

---

**最後更新**: 2025-06-27  
**維護團隊**: 品信工務系統開發團隊