// html/assets/js/utils/form-handler.js

/**
 * @fileoverview Common form handling utilities for the project.
 */

/**
 * Collects data from a form element and returns it as an object.
 * Input fields should have a 'name' attribute for FormData to pick them up.
 * For dynamic items or complex structures, ensure names are unique or handle accordingly,
 * or use a custom serialization strategy like serializeDynamicItems.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container element to collect data from.
 * @returns {Object} An object containing form data.
 */
export function getFormData(formOrContainerElement) {
    const data = {};
    // If it's a form, FormData can be used directly for simple cases.
    if (formOrContainerElement.tagName === 'FORM') {
        const formData = new FormData(formOrContainerElement);
        for (const [key, value] of formData.entries()) {
            if (key in data) { // 改用 'in' 操作符
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
    } else {
        // For non-form containers, manually collect data from named inputs
        formOrContainerElement.querySelectorAll('input[name], select[name], textarea[name]').forEach(field => {
            const key = field.name;
            let value;
            if (field.type === 'checkbox') {
                value = field.checked;
             } else if (field.type === 'radio') {
                if (field.checked) {
                    value = field.value;
                } else {
                    return; // 跳過未選中的 radio，不設定預設值
                }
            } else {
                value = field.value;
            }

            if (key in data) { // 改用 'in' 操作符
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });
    }
    return data;
}

/**
 * Validates a form or a container with form fields based on a set of rules.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container element to validate.
 * @param {Object} rules An object where keys are field names and values are rule objects.
 *                       Example rule: { required: true, message: 'Field is mandatory', pattern: /regex/, custom: (value, formData) => errorMsg || null }
 * @returns {{isValid: boolean, errors: Object}} Validation result.
 */
export function validateForm(formOrContainerElement, rules = {}) {
    const errors = {};
    let isValid = true;
    const currentData = getFormData(formOrContainerElement);

    for (const fieldName in rules) {
        const ruleSet = rules[fieldName];
        const value = currentData[fieldName];
        const fieldElement = formOrContainerElement.querySelector(`[name="${fieldName}"]`);

        // 先清除之前的錯誤類別
        if(fieldElement) fieldElement.classList.remove('form-field-error');
        
        if (ruleSet.required) {
            let isEmpty = false;
            if (typeof value === 'string') isEmpty = !value.trim();
            else if (typeof value === 'boolean') isEmpty = (value === false && ruleSet.required === true);
            else if (value === null || value === undefined) isEmpty = true;
            
            if (isEmpty) {
                isValid = false;
                errors[fieldName] = ruleSet.message || `${fieldName} is required.`;
                if(fieldElement) fieldElement.classList.add('form-field-error');
                continue; 
            }
        }

        if (ruleSet.pattern && value && !ruleSet.pattern.test(value)) {
            isValid = false;
            errors[fieldName] = ruleSet.message || `Invalid format for ${fieldName}.`;
            if(fieldElement) fieldElement.classList.add('form-field-error');
            continue;
        }

        if (typeof ruleSet.custom === 'function') {
            const customError = ruleSet.custom(value, currentData);
            if (customError) {
                isValid = false;
                errors[fieldName] = customError;
                if(fieldElement) fieldElement.classList.add('form-field-error');
            }
        }
    }
    
    return { isValid, errors };
}

/**
 * Handles form submission, including validation and callback execution.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container with a submit trigger.
 * @param {HTMLElement} submitTriggerElement The button or element that triggers the submission.
 * @param {Function} submitCallback Callback function to execute on successful submission. Receives form data.
 * @param {Object} [validationRules={}] Optional validation rules.
 * @param {Function} [beforeSubmitCallback=null] Optional async callback before submission (e.g., for confirmation). Should return a Promise resolving to boolean.
 * @param {Function} [afterSubmitCallback=null] Optional callback after successful submission.
 */
export function handleFormSubmit(formOrContainerElement, submitTriggerElement, submitCallback, validationRules = {}, beforeSubmitCallback = null, afterSubmitCallback = null) {
    if (!submitTriggerElement) {
        console.error('Submit trigger element not provided for handleFormSubmit.');
        return;
    }
    submitTriggerElement.addEventListener('click', async function(event) {
        event.preventDefault(); // Prevent default if it's a submit button in a form

        if (typeof beforeSubmitCallback === 'function') {
            try {
                const proceed = await beforeSubmitCallback();
                if (!proceed) {
                    return; // Stop if beforeSubmitCallback returns false or a falsy promise
                }
            } catch (e) {
                console.error("Error in beforeSubmitCallback:", e);
                return; // Stop on error
            }
        }

        // Clear previous errors (optional, depends on desired UX)
        formOrContainerElement.querySelectorAll('.form-field-error').forEach(el => el.classList.remove('form-field-error'));

        const { isValid, errors } = validateForm(formOrContainerElement, validationRules);

        if (isValid) {
            const data = getFormData(formOrContainerElement);
            try {
                await submitCallback(data); // Assume submitCallback might be async
                if (typeof afterSubmitCallback === 'function') {
                    afterSubmitCallback(data);
                }
            } catch (e) {
                console.error("Error in submitCallback or afterSubmitCallback:", e);
                // Potentially display a generic error message to the user
            }
        } else {
            // Basic error display, can be enhanced (e.g., display errors next to fields)
            const errorMessages = Object.entries(errors).map(([field, message]) => `${field}: ${message}`);
            alert('表單驗證失敗:\n' + errorMessages.join('\n'));
            console.error('Validation errors:', errors);
            // Focus first error field (optional)
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                formOrContainerElement.querySelector(`[name="${firstErrorField}"]`)?.focus();
            }
        }
    });
}

/**
 * Clears all input fields, select elements, and textareas within a form or container.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container element.
 */
export function clearForm(formOrContainerElement) {
    formOrContainerElement.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else if (el.tagName === 'SELECT') {
            if (el.options.length > 0) {
                 el.selectedIndex = 0; // Reset to the first option or a default placeholder
            }
        } else {
            el.value = '';
        }
        // Remove error classes if any
        el.classList.remove('form-field-error');
        // Trigger 'input' event for frameworks or listeners that depend on it
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    });
}


/**
 * Adds a dynamic item to a form container.
 * @param {HTMLElement} containerElement The container where the item will be added.
 * @param {string} itemTemplateHtml HTML string for the new item. This HTML should define data-key attributes on its inputs.
 * @param {Function} [eventListenersSetupCallback] Optional callback to set up event listeners for the new item. Receives the new item element.
 * @param {string} [itemSelector=''] Optional selector to identify items for re-indexing or counting.
 * @param {Function} [updateLabelsCallback] Optional callback to update labels/indices of items. Receives container and itemSelector.
 * @returns {HTMLElement | null} The newly added item element (the first child of the parsed template), or null.
 */
export function addDynamicFormItem(containerElement, itemTemplateHtml, eventListenersSetupCallback, itemSelector = '', updateLabelsCallback) {
    if (!containerElement) {
        console.error('Dynamic item container not found.');
        return null;
    }
    
    // Use a temporary div to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = itemTemplateHtml;
    const newItemElement = tempDiv.firstElementChild;

    if (!newItemElement) {
        console.error('Invalid item template HTML or template does not produce a valid element.');
        return null;
    }

    containerElement.appendChild(newItemElement);

    if (typeof eventListenersSetupCallback === 'function') {
        eventListenersSetupCallback(newItemElement);
    }

    if (typeof updateLabelsCallback === 'function' && itemSelector) {
        updateLabelsCallback(containerElement, itemSelector);
    }
    
    if (window.manageUnsavedChanges && typeof window.manageUnsavedChanges === 'function') {
        const pageContextId = containerElement.closest('.page')?.id || containerElement.id || 'dynamicFormContext';
        window.manageUnsavedChanges(pageContextId, true);
    }

    return newItemElement;
}

/**
 * Removes a dynamic form item.
 * @param {HTMLElement} triggerElement The element that triggered the removal (e.g., a remove button).
 * @param {string} itemSelector CSS selector to find the item to remove (e.g., '.worker-item').
 * @param {HTMLElement} [containerElement] Optional. The container of the items, for re-indexing.
 * @param {Function} [updateLabelsCallback] Optional callback to update labels/indices of remaining items.
 */
export function removeDynamicFormItem(triggerElement, itemSelector, containerElement, updateLabelsCallback) {
    const itemToRemove = triggerElement.closest(itemSelector);
    if (itemToRemove) {
        itemToRemove.remove();
        if (containerElement && typeof updateLabelsCallback === 'function' && itemSelector) {
            updateLabelsCallback(containerElement, itemSelector);
        }
        if (window.manageUnsavedChanges && typeof window.manageUnsavedChanges === 'function') {
            const pageContextId = containerElement?.closest('.page')?.id || containerElement?.id || 'dynamicFormContext';
            window.manageUnsavedChanges(pageContextId, true);
        }
    } else {
        console.warn('Item to remove not found with selector:', itemSelector, 'from trigger:', triggerElement);
    }
}

/**
 * Sets the value of a specific form field within a form or container.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container.
 * @param {string} fieldName The 'name' attribute of the field.
 * @param {any} value The value to set.
 */
export function setFormFieldValue(formOrContainerElement, fieldName, value) {
    const field = formOrContainerElement.querySelector(`[name="${fieldName}"]`);
    if (field) {
        if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else if (field.type === 'radio') {
            const specificRadio = formOrContainerElement.querySelector(`[name="${fieldName}"][value="${String(value)}"]`);
            if (specificRadio) specificRadio.checked = true;
            else console.warn(`Radio option for name "${fieldName}" with value "${value}" not found.`);
        } else if (field.tagName === 'SELECT') {
            field.value = String(value);
        } else {
            field.value = value;
        }
        field.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        field.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); // Also dispatch change
    } else {
        console.warn(`Field with name "${fieldName}" not found in setFormFieldValue.`);
    }
}

/**
 * Gets the value of a specific form field within a form or container.
 * @param {HTMLFormElement | HTMLElement} formOrContainerElement The form or container.
 * @param {string} fieldName The 'name' attribute of the field.
 * @returns {any | null} The value of the field, or null if not found.
 */
export function getFormFieldValue(formOrContainerElement, fieldName) {
    const field = formOrContainerElement.querySelector(`[name="${fieldName}"]`);
    if (field) {
        if (field.type === 'checkbox') {
            return field.checked;
        }
        if (field.type === 'radio') {
            const checkedRadio = formOrContainerElement.querySelector(`[name="${fieldName}"]:checked`);
            return checkedRadio ? checkedRadio.value : null;
        }
        return field.value;
    }
    console.warn(`Field with name "${fieldName}" not found in getFormFieldValue.`);
    return null;
}

/**
 * Serializes dynamic items within a container into an array of objects.
 * Each item is expected to have input fields with 'data-key' attributes for mapping.
 * @param {HTMLElement} containerElement The container holding the dynamic items.
 * @param {string} itemSelector CSS selector for each dynamic item.
 * @returns {Array<Object>} An array of objects, each representing an item.
 */
export function serializeDynamicItems(containerElement, itemSelector) {
    const items = [];
    if (!containerElement) {
        console.error("Container element not provided for serializeDynamicItems");
        return items;
    }

    containerElement.querySelectorAll(itemSelector).forEach(itemElement => {
        const itemData = {};
        let hasMeaningfulData = false; // Flag to check if item has actual data
        itemElement.querySelectorAll('input[data-key], select[data-key], textarea[data-key]').forEach(field => {
            const key = field.dataset.key;
            let value;
            if (field.type === 'checkbox') {
                value = field.checked;
            } else if (field.type === 'number') {
                value = parseFloat(field.value);
                if (isNaN(value)) value = field.value.trim() ? field.value : 0; // Keep original string if not a number but has content, else 0
            } else {
                value = field.value.trim();
            }
            itemData[key] = value;
            if (value && value !== 0 && value !== false) { // Check for non-empty, non-zero, non-false values
                hasMeaningfulData = true;
            }
        });
        // Only add if itemData has meaningful data (e.g., name is present, or count/quantity > 0)
        // This condition might need to be more specific based on the item type.
        if (hasMeaningfulData || (itemData.name || (itemData.count !== undefined && itemData.count > 0) || (itemData.quantity !== undefined && itemData.quantity > 0))) {
             items.push(itemData);
        }
    });
    return items;
}

/**
 * Populates dynamic items in a container from an array of data objects.
 * @param {HTMLElement} containerElement The container to populate.
 * @param {string} itemSelector CSS selector for identifying items (used by addDynamicFormItem and updateLabels).
 * @param {Array<Object>} dataArray Array of data objects for the items. If empty or null, may render one empty template.
 * @param {Function} createItemHtmlFunction Function that takes item data and index, and returns HTML string for one item.
 * @param {Function} [eventListenersSetupCallback] Optional callback to set up event listeners for each new item.
 * @param {Function} [updateLabelsCallback] Optional callback to update labels/indices of items.
 */
export function populateDynamicItems(containerElement, itemSelector, dataArray, createItemHtmlFunction, eventListenersSetupCallback, updateLabelsCallback) {
    if (!containerElement) {
        console.error("Container element not provided for populateDynamicItems");
        return;
    }
    containerElement.innerHTML = ''; // Clear existing items

    const itemsToRender = (dataArray && dataArray.length > 0) ? dataArray : [{}]; // Render at least one empty template if no data

    itemsToRender.forEach((itemData, index) => {
        const itemHtml = createItemHtmlFunction(itemData, index); // Pass full itemData
        const newItemElement = addDynamicFormItem(
            containerElement, 
            itemHtml, 
            eventListenersSetupCallback, // This will be called by addDynamicFormItem
            itemSelector, 
            null // updateLabelsCallback will be called once at the end
        );

        if (newItemElement) {
            // Populate fields within the newly added item using data-key
            Object.keys(itemData).forEach(key => {
                const field = newItemElement.querySelector(`[data-key="${key}"]`);
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = Boolean(itemData[key]);
                    } else if (field.type === 'radio') {
                        // Radio population needs to find the specific radio button by value
                        const radioToSelect = newItemElement.querySelector(`[data-key="${key}"][value="${itemData[key]}"]`);
                        if (radioToSelect) radioToSelect.checked = true;
                    }
                    else {
                        field.value = itemData[key] === undefined || itemData[key] === null ? '' : itemData[key];
                    }
                }
            });
        }
    });

    if (typeof updateLabelsCallback === 'function' && itemSelector) {
        updateLabelsCallback(containerElement, itemSelector);
    }
}

// Make functions available globally or export if using modules
//window.FormHandler = {
//    getFormData,
//    validateForm,
//    handleFormSubmit,
//    clearForm,
//    addDynamicFormItem,
//    removeDynamicFormItem,
//    setFormFieldValue,
//    getFormFieldValue,
//    serializeDynamicItems,
//    populateDynamicItems
//};

console.log('form-handler.js v1.0 loaded');