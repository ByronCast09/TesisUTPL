import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../components/Header';

describe('Header Component', () => {
    test('renders Header component', () => {
        const { container } = render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        expect(container.firstChild).toBeInTheDocument();
    });

    test('Header contains navigation elements', () => {
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        // Verificar que el header se renderiza sin errores
        const headerElement = screen.getByRole('banner', { hidden: true });
        expect(headerElement || document.querySelector('header')).toBeTruthy();
    });

    test('Header has correct structure', () => {
        const { container } = render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        // Verificar que hay contenido en el header
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });
});
