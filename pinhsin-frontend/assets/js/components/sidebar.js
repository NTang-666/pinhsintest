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
        this.openTriggers.forEach(trigger => {
            const el = (typeof trigger === 'string') ? document.querySelector(trigger) : trigger;
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.open();
                });
            } else {
                console.warn('Open trigger not found:', trigger);
            }
        });

        this.closeTriggers.forEach(trigger => {
            const el = (typeof trigger === 'string') ? document.querySelector(trigger) : trigger;
            if (el) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.close();
                });
            } else {
                console.warn('Close trigger not found:', trigger);
            }
        });
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
}