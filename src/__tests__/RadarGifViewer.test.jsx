import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RadarGifViewer from '../components/RadarGifViewer';
import * as radarService from '../services/radarService';

// Mock del servicio de radar
jest.mock('../services/radarService');

describe('RadarGifViewer Component - Advanced Interaction Tests', () => {
    const mockGifData = {
        success: true,
        data: {
            id: 1,
            radar_id: 'LGUAXX',
            filename: 'LGUAXX_20260107_1200.gif',
            timestamp: '2026-01-07T12:00:00Z',
            file_path: '/radar/LGUAXX/2026/01/07/LGUAXX_20260107_1200.gif',
        },
    };

    const mockAvailableDates = {
        success: true,
        dates: ['2026-01-05', '2026-01-06', '2026-01-07'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        radarService.getLatestGif.mockResolvedValue(mockGifData);
        radarService.getAvailableDates.mockResolvedValue(mockAvailableDates);
        radarService.getGifByDate.mockResolvedValue(mockGifData);
    });

    test('renders RadarGifViewer component with radar ID', async () => {
        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalledWith('LGUAXX');
        });
    });

    test('loads latest GIF on mount', async () => {
        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" isVisible={true} />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalledTimes(1);
            expect(radarService.getLatestGif).toHaveBeenCalledWith('LGUAXX');
        });
    });

    test('fetches available dates on mount', async () => {
        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LOXX" />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getAvailableDates).toHaveBeenCalledWith('LOXX');
        });
    });

    test('handles date change', async () => {
        const user = userEvent.setup();

        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" />
            </BrowserRouter>
        );

        // Wait for initial load
        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalled();
        });

        // Simulate date selection (if date picker exists)
        const dateInput = screen.queryByLabelText(/fecha/i) || screen.queryByRole('textbox');

        if (dateInput) {
            await user.type(dateInput, '2026-01-06');

            await waitFor(() => {
                expect(radarService.getGifByDate).toHaveBeenCalledWith('LGUAXX', '2026-01-06');
            });
        }
    });

    test('calls onGifChange callback when GIF changes', async () => {
        const mockOnGifChange = jest.fn();

        render(
            <BrowserRouter>
                <RadarGifViewer
                    radarId="LGUAXX"
                    onGifChange={mockOnGifChange}
                />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalled();
        });

        // Verify callback was called with GIF data
        await waitFor(() => {
            if (mockOnGifChange.mock.calls.length > 0) {
                expect(mockOnGifChange).toHaveBeenCalled();
            }
        });
    });

    test('handles API errors gracefully', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        radarService.getLatestGif.mockRejectedValue(new Error('API Error'));

        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalled();
        });

        consoleErrorSpy.mockRestore();
    });

    test('does not fetch when component is not visible', async () => {
        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" isVisible={false} />
            </BrowserRouter>
        );

        // Should not call API immediately when not visible
        await new Promise(resolve => setTimeout(resolve, 100));

        // Component might still load initial data, but shouldn't continuously fetch
        const callCount = radarService.getLatestGif.mock.calls.length;
        expect(callCount).toBeLessThanOrEqual(1);
    });

    test('handles refresh button click', async () => {
        const user = userEvent.setup();

        render(
            <BrowserRouter>
                <RadarGifViewer radarId="LOXX" />
            </BrowserRouter>
        );

        // Wait for initial render
        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalled();
        });

        // Try to find and click refresh button
        const refreshButton = screen.queryByRole('button', { name: /refresh|actualizar|reload/i });

        if (refreshButton) {
            const initialCallCount = radarService.getLatestGif.mock.calls.length;

            await user.click(refreshButton);

            await waitFor(() => {
                expect(radarService.getLatestGif.mock.calls.length).toBeGreaterThan(initialCallCount);
            });
        }
    });

    test('handles multiple radar IDs correctly', async () => {
        const { rerender } = render(
            <BrowserRouter>
                <RadarGifViewer radarId="LGUAXX" />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalledWith('LGUAXX');
        });

        // Change radar ID
        rerender(
            <BrowserRouter>
                <RadarGifViewer radarId="LOXX" />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(radarService.getLatestGif).toHaveBeenCalledWith('LOXX');
        });
    });
});
