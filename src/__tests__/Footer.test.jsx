import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../components/Footer';

describe('Footer Component', () => {
    test('renders Footer component without crashing', () => {
        const { container } = render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
        );
        expect(container.firstChild).toBeInTheDocument();
    });

    test('Footer contains content', () => {
        const { container } = render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
        );
        // Verificar que el footer tiene contenido
        expect(container.innerHTML.length).toBeGreaterThan(0);
    });

    test('Footer is rendered as footer element or container', () => {
        const { container } = render(
            <BrowserRouter>
                <Footer />
            </BrowserRouter>
        );
        // Verificar que hay un elemento footer o un contenedor
        const footerElement = container.querySelector('footer') || container.firstChild;
        expect(footerElement).toBeTruthy();
    });
});
