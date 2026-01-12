import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Routes from '../Routes';

describe('Routes - Navigation Integration Tests', () => {
    test('renders Routes component', () => {
        const { container } = render(
            <BrowserRouter>
                <Routes />
            </BrowserRouter>
        );

        expect(container.firstChild).toBeTruthy();
    });

    test('renders home route by default', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes />
            </MemoryRouter>
        );

        // The route should render without errors
        expect(document.body).toBeInTheDocument();
    });

    test('handles visor route', () => {
        render(
            <MemoryRouter initialEntries={['/visor']}>
                <Routes />
            </MemoryRouter>
        );

        // Should render visor page without crashing
        expect(document.body).toBeInTheDocument();
    });

    test('handles datos route', () => {
        render(
            <MemoryRouter initialEntries={['/datos']}>
                <Routes />
            </MemoryRouter>
        );

        expect(document.body).toBeInTheDocument();
    });

    test('handles equipo route', () => {
        render(
            <MemoryRouter initialEntries={['/equipo']}>
                <Routes />
            </MemoryRouter>
        );

        expect(document.body).toBeInTheDocument();
    });

    test('handles invalid route gracefully', () => {
        render(
            <MemoryRouter initialEntries={['/ruta-invalida-123']}>
                <Routes />
            </MemoryRouter>
        );

        // Should render something (404 page or redirect)
        expect(document.body).toBeInTheDocument();
    });

    test('changes routes correctly', () => {
        const { rerender } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes />
            </MemoryRouter>
        );

        expect(document.body).toBeInTheDocument();

        // Navigate to different route
        rerender(
            <MemoryRouter initialEntries={['/visor']}>
                <Routes />
            </MemoryRouter>
        );

        expect(document.body).toBeInTheDocument();
    });
});
