export const parseDateLocal = (dateString: string): Date => {
    if (!dateString) return new Date();
    // Handle YYYY-MM-DD
    if (dateString.includes('-') && dateString.length === 10) {
        const [y, m, d] = dateString.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    // Fallback for ISO strings or other formats, but prefer local expectation
    const d = new Date(dateString);
    // Adjust if it looks like it was treated as UTC midnight (e.g. 21:00 previous day)
    // But simplistic approach: stick to [y,m,d] decomposition for consistency
    return d;
};

export const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const getTodayString = (): string => {
    return toLocalDateString(new Date());
};
