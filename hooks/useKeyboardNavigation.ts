import { useEffect } from 'react';

export const useKeyboardNavigation = () => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if modifier keys are pressed
            if (e.ctrlKey || e.altKey || e.metaKey) return;

            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
            
            if (!isInput) return;

            const inputElement = target as HTMLInputElement;

            if (e.key === 'Enter' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                
                // For ArrowLeft/Right, only navigate if cursor is at the boundary
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    if (inputElement.tagName === 'INPUT' && (inputElement.type === 'text' || inputElement.type === 'number' || inputElement.type === 'password' || inputElement.type === 'search' || inputElement.type === 'email' || inputElement.type === 'tel' || inputElement.type === 'url')) {
                        const start = inputElement.selectionStart;
                        const end = inputElement.selectionEnd;
                        const length = inputElement.value.length;
                        
                        if (start !== end) return; // Text is selected, don't navigate
                        
                        // In RTL, ArrowRight moves visually right (towards start of text logically).
                        // ArrowLeft moves visually left (towards end of text logically).
                        // Let's just check boundaries.
                        if (e.key === 'ArrowRight' && start !== 0) return;
                        if (e.key === 'ArrowLeft' && start !== length) return;
                    }
                }

                e.preventDefault();

                // Find all focusable elements
                const focusableElements = Array.from(
                    document.querySelectorAll<HTMLElement>(
                        'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                ).filter(el => {
                    // Filter out elements that are not visible
                    return el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                });

                const currentIndex = focusableElements.indexOf(target);
                if (currentIndex > -1) {
                    let nextIndex = currentIndex;
                    if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.shiftKey)) {
                        nextIndex = currentIndex - 1;
                    } else {
                        nextIndex = currentIndex + 1;
                    }

                    if (nextIndex >= 0 && nextIndex < focusableElements.length) {
                        focusableElements[nextIndex].focus();
                        // If it's an input, maybe select its text
                        const nextEl = focusableElements[nextIndex] as HTMLInputElement;
                        if (nextEl.tagName === 'INPUT' && (nextEl.type === 'text' || nextEl.type === 'number')) {
                            setTimeout(() => nextEl.select(), 0);
                        }
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
};
