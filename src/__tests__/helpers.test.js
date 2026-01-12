import { formatDate, formatTime, isValidEmail, capitalize } from '../utils/helpers';

describe('Helper Utilities', () => {
    describe('formatDate', () => {
        test('formats date correctly', () => {
            const date = new Date('2026-01-07');
            const formatted = formatDate(date);
            expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
        });

        test('returns empty string for null date', () => {
            expect(formatDate(null)).toBe('');
        });

        test('returns empty string for undefined date', () => {
            expect(formatDate(undefined)).toBe('');
        });
    });

    describe('formatTime', () => {
        test('formats time correctly', () => {
            const date = new Date('2026-01-07T16:20:00');
            const formatted = formatTime(date);
            expect(formatted).toMatch(/\d{2}:\d{2}/);
        });

        test('returns empty string for null time', () => {
            expect(formatTime(null)).toBe('');
        });
    });

    describe('isValidEmail', () => {
        test('validates correct email', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
        });

        test('rejects invalid email without @', () => {
            expect(isValidEmail('testexample.com')).toBe(false);
        });

        test('rejects invalid email without domain', () => {
            expect(isValidEmail('test@')).toBe(false);
        });

        test('rejects empty email', () => {
            expect(isValidEmail('')).toBe(false);
        });
    });

    describe('capitalize', () => {
        test('capitalizes lowercase text', () => {
            expect(capitalize('hello')).toBe('Hello');
        });

        test('capitalizes uppercase text', () => {
            expect(capitalize('WORLD')).toBe('World');
        });

        test('handles empty string', () => {
            expect(capitalize('')).toBe('');
        });

        test('handles null value', () => {
            expect(capitalize(null)).toBe('');
        });

        test('handles non-string value', () => {
            expect(capitalize(123)).toBe('');
        });
    });
});
