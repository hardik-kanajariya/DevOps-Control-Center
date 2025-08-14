import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Custom hook for debouncing values
 * Useful for search inputs and API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 * Useful for scroll events and resize handlers
 */
export function useThrottle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): T {
    const lastCallTime = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();

            if (now - lastCallTime.current >= delay) {
                lastCallTime.current = now;
                return func(...args);
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    lastCallTime.current = Date.now();
                    func(...args);
                }, delay - (now - lastCallTime.current));
            }
        }) as T,
        [func, delay]
    );
}

/**
 * Custom hook for memoizing expensive calculations
 */
export function useExpensiveCalculation<T>(
    calculation: () => T,
    dependencies: React.DependencyList
): T {
    return useMemo(calculation, dependencies);
}

/**
 * Custom hook for virtual scrolling optimization
 */
export function useVirtualization({
    items,
    itemHeight,
    containerHeight,
    overscan = 5
}: {
    items: any[];
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
}) {
    const [scrollTop, setScrollTop] = useState(0);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
        visibleItems,
        totalHeight,
        offsetY,
        startIndex,
        endIndex,
        setScrollTop
    };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
    private static measurements: Map<string, number> = new Map();

    static start(label: string): void {
        this.measurements.set(label, performance.now());
    }

    static end(label: string): number {
        const startTime = this.measurements.get(label);
        if (!startTime) {
            console.warn(`Performance measurement '${label}' was not started`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.measurements.delete(label);

        if (process.env.NODE_ENV === 'development') {
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    static measure<T>(label: string, fn: () => T): T {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    }

    static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
        this.start(label);
        const result = await fn();
        this.end(label);
        return result;
    }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
    private static observers: Set<MutationObserver> = new Set();
    private static intervals: Set<NodeJS.Timeout> = new Set();
    private static eventListeners: Set<{ element: Element; event: string; handler: Function }> = new Set();

    static addMutationObserver(observer: MutationObserver): void {
        this.observers.add(observer);
    }

    static addInterval(interval: NodeJS.Timeout): void {
        this.intervals.add(interval);
    }

    static addEventListener(element: Element, event: string, handler: Function): void {
        this.eventListeners.add({ element, event, handler });
        element.addEventListener(event, handler as EventListener);
    }

    static cleanup(): void {
        // Clean up mutation observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        // Clean up intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();

        // Clean up event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler as EventListener);
        });
        this.eventListeners.clear();
    }
}

/**
 * Hook for monitoring component re-renders
 */
export function useRenderCount(componentName: string): void {
    const renderCount = useRef(0);

    useEffect(() => {
        renderCount.current += 1;
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
        }
    });
}

/**
 * Bundle size analyzer for production builds
 */
export function analyzeBundleSize(): void {
    if (process.env.NODE_ENV === 'production') {
        console.log('Bundle analysis would be available in production build');
    } else {
        console.log('Bundle analysis only available in production mode');
    }
}
