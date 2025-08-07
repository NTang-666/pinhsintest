// html/assets/js/utils/navigation.js

/**
 * @typedef {Object} PageInfo
 * @property {string} id - The ID of the page element.
 * @property {string} [displayClass='active'] - The class used to show the page (e.g., 'active').
 * @property {boolean} [isDisplayClassAdded=true] - True if displayClass shows the page, false if removing it shows the page (like 'hidden').
 */

/**
 * @typedef {Object} TitleUpdate
 * @property {string} elementId - The ID of the title element to update.
 * @property {string | function} content - The new title string, or a function that returns the title string.
 *                                        If a function, it can receive the trigger element and an optional context object.
 */

/**
 * @typedef {Object} NavigationOptions
 * @property {string} [currentPageId] - The ID of the current active page. If not provided, it will be determined from elements with 'activeClass'.
 * @property {boolean} [checkUnsaved=false] - Whether to check for unsaved changes.
 * @property {string} [unsavedChangesContext] - A string key to identify the unsaved changes flag (used with manageUnsavedChanges).
 * @property {boolean} [resetUnsavedOnProceed=true] - If true, resets the unsaved flag for the context when user confirms to proceed.
 * @property {string} [unsavedMessage='您有未儲存的資料，確定要離開嗎？'] - Confirmation message for unsaved changes.
 * @property {Array<TitleUpdate>} [titleUpdates] - Array of title update configurations.
 * @property {function} [beforeNavigate] - Callback function before navigation logic. Can receive (targetPageId, triggerElement, currentContext).
 * @property {function} [afterNavigate] - Callback function after navigation logic. Can receive (targetPageId, triggerElement, currentContext).
 * @property {string} [animationType='simple'] - 'simple' (active/hidden class), 'slide' (transform-based animation).
 * @property {string} [pageSelector='.page'] - Selector for all page elements.
 * @property {string} [activeClass='active'] - Class for active/visible page (for 'simple' animation).
 * @property {string} [hiddenClass='hidden'] - Class for hidden page (used if pages are controlled by adding/removing 'hidden').
 * @property {string} [slideActiveClass='slide-in-active'] - For 'slide' animation.
 * @property {string} [slideInitialTransform='translateX(100%)'] - For 'slide' animation (e.g., for pages sliding in from right).
 * @property {string} [slideTargetTransform='translateX(0%)'] - For 'slide' animation.
 * @property {Object} [currentContext={}] - An object to pass around site-specific data like selectedSite, selectedTemplate etc.
 * @property {string[]} [recordScrollOnLeaveFrom] - Array of page IDs from which scroll position should be recorded upon leaving.
 * @property {string[]} [preserveScrollOnReturnTo] - Array of page IDs for which scroll position should be restored upon returning.
 */

let _navigationContext = {}; // To store site-specific context if needed globally by navigation
const _unsavedChangesFlags = {};
let scrollPositions = {}; // Stores scroll positions for specified pages

/**
 * Sets or gets the unsaved status for a specific context.
 * @param {string} contextKey - The context for the unsaved flag (e.g., 'inspectionForm').
 * @param {boolean} [status] - If provided, sets the status.
 * @returns {boolean|undefined} - The status if getting, or undefined if setting.
 */
export function manageUnsavedChanges(contextKey, status) {
    if (typeof status === 'boolean') {
        _unsavedChangesFlags[contextKey] = status;
        return undefined;
    }
    return _unsavedChangesFlags[contextKey] || false;
}

/**
 * Navigates to a specified page.
 * @param {string} targetPageId - The ID of the page element to navigate to.
 * @param {NavigationOptions} [options={}] - Navigation options.
 * @param {HTMLElement} [triggerElement=null] - The element that triggered the navigation.
 */

export function getCurrentActivePageId(config) {
const activePage = document.querySelector(`${config.pageSelector}.${config.activeClass}`);
return activePage ? activePage.id : null;
}

export function navigateTo(targetPageId, options = {}, triggerElement = null) {
    const defaults = {
        checkUnsaved: false,
        unsavedChangesContext: null,
        resetUnsavedOnProceed: true,
        unsavedMessage: '您有未儲存的資料，確定要離開嗎？',
        titleUpdates: [],
        beforeNavigate: null,
        afterNavigate: null,
        animationType: 'simple',
        pageSelector: '.page',
        activeClass: 'active',
        hiddenClass: 'hidden',
        slideActiveClass: 'slide-in-active',
        slideInitialTransform: 'translateX(100%)',
        slideTargetTransform: 'translateX(0%)',
        currentContext: _navigationContext,
        recordScrollOnLeaveFrom: [],
        preserveScrollOnReturnTo: [],
    };
    const config = { ...defaults, ...options };

    // Store scroll position for the current page if it's in recordScrollOnLeaveFrom
    const departingPageId = _navigationContext.currentPageId || getCurrentActivePageId(config);
    
    // 如果目標頁面就是當前頁面，不需要導航
    if (departingPageId === targetPageId) {
        return;
    }

    // 儲存滾動位置
    if (departingPageId && config.recordScrollOnLeaveFrom.includes(departingPageId)) {
        scrollPositions[departingPageId] = window.scrollY;
    }

    if (config.checkUnsaved && config.unsavedChangesContext && manageUnsavedChanges(config.unsavedChangesContext)) {
        if (!confirm(config.unsavedMessage)) {
            return; // User cancelled navigation
        }
        if (config.resetUnsavedOnProceed) {
            manageUnsavedChanges(config.unsavedChangesContext, false);
        }
    }

    if (typeof config.beforeNavigate === 'function') {
        if (config.beforeNavigate(targetPageId, triggerElement, config.currentContext) === false) {
            return; // beforeNavigate hook cancelled navigation
        }
    }

    const allPages = document.querySelectorAll(config.pageSelector);
    const targetPageElement = document.getElementById(targetPageId);

    if (!targetPageElement) {
        console.error(`Navigation error: Target page with ID "${targetPageId}" not found.`);
        return;
    }

    allPages.forEach(page => {
        const isTarget = page.id === targetPageId;
        if (isTarget) {
            page.classList.add(config.activeClass);
            page.classList.remove(config.hiddenClass);
        } else {
            page.classList.remove(config.activeClass);
            page.classList.add(config.hiddenClass);
        }
    });

    if (config.titleUpdates && config.titleUpdates.length > 0) {
        config.titleUpdates.forEach(tu => {
            const titleEl = document.getElementById(tu.elementId);
            if (titleEl) {
                let newTitle = '';
                if (typeof tu.content === 'function') {
                    // Pass triggerElement and currentContext to the title function
                    newTitle = tu.content(triggerElement, config.currentContext);
                } else {
                    newTitle = tu.content;
                }
                titleEl.textContent = newTitle;
            }
        });
    }

    _navigationContext.currentPageId = targetPageId; // Update context

    // Restore scroll position or scroll to top
    if (config.preserveScrollOnReturnTo && config.preserveScrollOnReturnTo.includes(targetPageId) && scrollPositions[targetPageId] !== undefined) {
        window.scrollTo(0, scrollPositions[targetPageId]);
        // console.log(`Restored scroll for ${targetPageId} to ${scrollPositions[targetPageId]}`);
        // Optionally, clear the stored position after restoring to prevent re-using stale scroll data
        // if you want it to only restore once per "return trip".
        // delete scrollPositions[targetPageId];
    } else {
        window.scrollTo(0, 0);
    }

    if (typeof config.afterNavigate === 'function') {
        config.afterNavigate(targetPageId, triggerElement, config.currentContext);
    }
}

/**
 * Initializes navigation for a page based on a configuration array.
 * @param {Array<Object>} navConfigs - Array of navigation configurations.
 * Each config object should have:
 *  - triggerSelector: CSS selector for the trigger element(s).
 *  - targetPageId: ID of the page to navigate to.
 *  - options: (Optional) NavigationOptions for this specific trigger.
 *  - eventType: (Optional) Event type, defaults to 'click'.
 *  - passDatasetToOptions: (Optional) Array of objects like {datasetKey: 'sitename', optionKey: 'siteNameForTitle'}
 *                          to pass dataset attributes from trigger to options for dynamic content.
 */
export function initializeNavigation(navConfigs, initialContext = {}) {
    _navigationContext = { ..._navigationContext, ...initialContext };

    navConfigs.forEach(config => {
        const triggers = document.querySelectorAll(config.triggerSelector);
        triggers.forEach(trigger => {
            trigger.addEventListener(config.eventType || 'click', function(event) {
                event.preventDefault();
                let navOptions = JSON.parse(JSON.stringify(config.options || {})); // Deep copy options

                // Update currentContext before navigation attempt
                navOptions.currentContext = { ..._navigationContext };

                if (config.passDatasetToOptions && Array.isArray(config.passDatasetToOptions)) {
                    config.passDatasetToOptions.forEach(map => {
                        if (this.dataset[map.datasetKey]) {
                            // Store in a temporary part of context or directly if simple
                            navOptions.currentContext[map.optionKey] = this.dataset[map.datasetKey];
                        }
                    });
                }
                navigateTo(config.targetPageId, navOptions, this);
            });
        });
    });
}

/**
 * Helper to set the initial page ID in the navigation context.
 * Call this once when a multi-page HTML document loads.
 * @param {string} pageId
 */
export function setInitialPage(pageId) {
    _navigationContext.currentPageId = pageId;
    const targetPageElement = document.getElementById(pageId);
    if (targetPageElement) {
        // 使用固定的選擇器，不依賴 dataset
        document.querySelectorAll('.page').forEach(p => {
            if (p.id === pageId) {
                p.classList.add('active');
                if (p.classList.contains('hidden')) {
                    p.classList.remove('hidden');
                }
            } else {
                p.classList.remove('active');
                if (!p.classList.contains('hidden')) {
                    p.classList.add('hidden');
                }
            }
        });
    }
}