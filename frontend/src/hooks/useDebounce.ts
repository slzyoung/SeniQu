import { useState, useEffect } from 'react';

/**
 * A hook that delays updating a value until after a specified delay has passed
 * since the last time the value was updated.
 * Used for anti-throttling/debouncing user input (e.g., search bars).
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set debouncedValue to value (passed in) after the specified delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cancel the timeout if value changes (also on delay change or unmount)
        // This is how we prevent debouncedValue from updating if value is changed
        // within the delay period.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Only re-call effect if value or delay changes

    return debouncedValue;
}
