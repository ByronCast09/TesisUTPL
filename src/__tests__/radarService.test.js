import axios from 'axios';
import {
    getLatestGif,
    getGifByDate,
    getProxyGifUrl,
    getRemoteGifIndex,
    getCurrentRadarStatus,
} from '../services/radarService';

// Mock axios
jest.mock('axios');

describe('Radar Service - API Integration Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('getLatestGif', () => {
        test('successfully fetches latest GIF for radar', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        id: 1,
                        radar_id: 'LGUAXX',
                        filename: 'LGUAXX_20260107_1200.gif',
                        timestamp: '2026-01-07T12:00:00Z',
                        file_path: '/radar/LGUAXX/2026/01/07/LGUAXX_20260107_1200.gif',
                    },
                },
            };

            axios.get.mockResolvedValue(mockResponse);

            const result = await getLatestGif('LGUAXX');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/radar/latest/LGUAXX')
            );
            expect(result.success).toBe(true);
            expect(result.data.radar_id).toBe('LGUAXX');
        });

        test('handles API error gracefully', async () => {
            axios.get.mockRejectedValue(new Error('Network Error'));

            const result = await getLatestGif('LGUAXX');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('handles missing radar ID', async () => {
            const result = await getLatestGif('');

            expect(result.success).toBe(false);
        });
    });

    describe('getGifByDate', () => {
        test('fetches GIF for specific date and radar', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        radar_id: 'LOXX',
                        filename: 'LOXX_20260107_1500.gif',
                        timestamp: '2026-01-07T15:00:00Z',
                    },
                },
            };

            axios.get.mockResolvedValue(mockResponse);

            const result = await getGifByDate('LOXX', '2026-01-07');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/radar/date')
            );
            expect(result.success).toBe(true);
            expect(result.data.radar_id).toBe('LOXX');
        });

        test('handles invalid date format', async () => {
            axios.get.mockRejectedValue(new Error('Invalid date'));

            const result = await getGifByDate('LOXX', 'invalid-date');

            expect(result.success).toBe(false);
        });
    });

    describe('getProxyGifUrl', () => {
        test('constructs correct proxy URL for local files', () => {
            const url = getProxyGifUrl('/radar/LGUAXX/2026/01/07/file.gif', 'LGUAXX');

            expect(url).toContain('/api/radar/proxy');
            expect(url).toContain('radarId=LGUAXX');
        });

        test('handles URLs with special characters', () => {
            const url = getProxyGifUrl(
                '/radar/LOXX/2026/01/07/file name with spaces.gif',
                'LOXX'
            );

            expect(url).toBeDefined();
            expect(url).toContain('LOXX');
        });

        test('returns null for invalid inputs', () => {
            const url = getProxyGifUrl('', '');

            expect(url).toBeNull();
        });
    });

    describe('getRemoteGifIndex', () => {
        test('fetches remote GIF index successfully', async () => {
            const mockIndex = [
                { filename: 'file1.gif', timestamp: '2026-01-07T10:00:00Z' },
                { filename: 'file2.gif', timestamp: '2026-01-07T11:00:00Z' },
            ];

            axios.get.mockResolvedValue({ data: mockIndex });

            const result = await getRemoteGifIndex('LGUAXX');

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/index.json')
            );
            expect(result).toHaveLength(2);
            expect(result[0].filename).toBe('file1.gif');
        });

        test('returns empty array on error', async () => {
            axios.get.mockRejectedValue(new Error('Network Error'));

            const result = await getRemoteGifIndex('LGUAXX');

            expect(result).toEqual([]);
        });
    });

    describe('getCurrentRadarStatus', () => {
        test('fetches current status for all radars', async () => {
            const mockStatus = {
                data: {
                    LGUAXX: { online: true, lastUpdate: '2026-01-07T16:00:00Z' },
                    LOXX: { online: true, lastUpdate: '2026-01-07T16:00:00Z' },
                },
            };

            axios.get.mockResolvedValue(mockStatus);

            const result = await getCurrentRadarStatus();

            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/api/radar/status')
            );
            expect(result.data.LGUAXX).toBeDefined();
            expect(result.data.LOXX).toBeDefined();
        });

        test('handles offline radars', async () => {
            const mockStatus = {
                data: {
                    LGUAXX: { online: false, lastUpdate: null },
                },
            };

            axios.get.mockResolvedValue(mockStatus);

            const result = await getCurrentRadarStatus();

            expect(result.data.LGUAXX.online).toBe(false);
        });
    });
});
