// html/assets/js/components/sidebar.js
export class Sidebar {
    constructor(options) {
        this.sidebarElement = document.getElementById(options.sidebarId);
        this.overlayElement = document.getElementById(options.overlayId);
        this.openTriggers = options.openTriggers || [];
        this.closeTriggers = options.closeTriggers || [];

        if (!this.sidebarElement || !this.overlayElement) {
            console.warn('Sidebar or overlay element not found for IDs:', options.sidebarId, options.overlayId, '. Sidebar functionality may be affected.');
            return;
        }

        this.init();
    }

    init() {
        // ✅ 初始化事件處理器儲存
        this.boundHandlers = {
            open: [],
            close: [],
            overlayClick: null,
            escapeKey: null
        };

        this.openTriggers.forEach(trigger => {
            const el = (typeof trigger === 'string') ? document.querySelector(trigger) : trigger;
            if (el) {
                // ✅ 修正：儲存事件處理器引用
                const handler = (e) => {
                    e.preventDefault();
                    this.open();
                };
                el.addEventListener('click', handler);
                this.boundHandlers.open.push({ element: el, handler });
            } else {
                console.warn('Open trigger not found:', trigger);
            }
        });

        this.closeTriggers.forEach(trigger => {
            const el = (typeof trigger === 'string') ? document.querySelector(trigger) : trigger;
            if (el) {
                // ✅ 修正：儲存事件處理器引用
                const handler = (e) => {
                    e.preventDefault();
                    this.close();
                };
                el.addEventListener('click', handler);
                this.boundHandlers.close.push({ element: el, handler });
            } else {
                console.warn('Close trigger not found:', trigger);
            }
        });

        // ✅ 修正：儲存 overlay 點擊處理器
        if (this.overlayElement) {
            this.boundHandlers.overlayClick = (e) => {
                e.preventDefault();
                this.close();
            };
            this.overlayElement.addEventListener('click', this.boundHandlers.overlayClick);
        }

        // ✅ 修正：儲存 ESC 鍵處理器
        this.boundHandlers.escapeKey = (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.boundHandlers.escapeKey);
    }

    destroy() {
        // 移除所有事件監聽器
        if (this.boundHandlers) {
            this.boundHandlers.open.forEach(({ element, handler }) => {
                element.removeEventListener('click', handler);
            });

            this.boundHandlers.close.forEach(({ element, handler }) => {
                element.removeEventListener('click', handler);
            });

            if (this.boundHandlers.overlayClick) {
                this.overlayElement.removeEventListener('click', this.boundHandlers.overlayClick);
            }

            if (this.boundHandlers.escapeKey) {
                document.removeEventListener('keydown', this.boundHandlers.escapeKey);
            }
        }

        // 恢復 body 滾動
        document.body.style.overflow = '';
        
        // 清理引用
        this.boundHandlers = null;
    }

    open() {
        if (!this.sidebarElement || !this.overlayElement) return;
        document.body.style.overflow = 'hidden';
        this.overlayElement.classList.add('active');
        this.sidebarElement.classList.add('open');
    }

    close() {
        if (!this.sidebarElement || !this.overlayElement) return;
        document.body.style.overflow = '';
        this.sidebarElement.classList.remove('open');
        this.overlayElement.classList.remove('active');
    }
    /**
     * 檢查側欄是否開啟
     * @returns {boolean}
     */
    isOpen() {
        return this.sidebarElement && this.sidebarElement.classList.contains('open');
    }

    /**
     * 切換側欄狀態
     */
    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }
}