import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

describe('App Component', () => {
    test('renders App component without crashing', () => {
        render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
        // Verify that the component renders
        expect(document.body).toBeInTheDocument();
    });

    test('renders Routes component', () => {
        const { container } = render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
        // Check that the container has content
        expect(container.firstChild).toBeTruthy();
    });
});
