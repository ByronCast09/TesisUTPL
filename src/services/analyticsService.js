const API_BASE_URL = '/api/analytics';

export const getAnalyticsMetrics = async (period = 'today', customMonth = null, customYear = null) => {
    try {
        let url = `${API_BASE_URL}/metrics?period=${period}`;
        if (period === 'custom' && customMonth !== null && customYear !== null) {
            url += `&month=${customMonth}&year=${customYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
};

export const getTemporalEvolution = async (period = 'today', customMonth = null, customYear = null) => {
    try {
        let url = `${API_BASE_URL}/temporal?period=${period}`;
        if (period === 'custom' && customMonth !== null && customYear !== null) {
            url += `&month=${customMonth}&year=${customYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching temporal evolution:', error);
        throw error;
    }
};

export const getProvinceData = async (period = 'today', customMonth = null, customYear = null) => {
    try {
        let url = `${API_BASE_URL}/provinces?period=${period}`;
        if (period === 'custom' && customMonth !== null && customYear !== null) {
            url += `&month=${customMonth}&year=${customYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching province data:', error);
        throw error;
    }
};

export const getIntensityDistribution = async (period = 'today', customMonth = null, customYear = null) => {
    try {
        let url = `${API_BASE_URL}/intensity?period=${period}`;
        if (period === 'custom' && customMonth !== null && customYear !== null) {
            url += `&month=${customMonth}&year=${customYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching intensity distribution:', error);
        throw error;
    }
};

export const getWeeklyTrend = async (period = 'today', customMonth = null, customYear = null) => {
    try {
        let url = `${API_BASE_URL}/weekly?period=${period}`;
        if (period === 'custom' && customMonth !== null && customYear !== null) {
            url += `&month=${customMonth}&year=${customYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weekly trend:', error);
        throw error;
    }
};
