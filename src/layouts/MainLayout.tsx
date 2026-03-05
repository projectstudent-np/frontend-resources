import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CookieConsent from '../components/CookieConsent';
import './MainLayout.css';

const NO_FOOTER_ROUTES = ['/student', '/driver', '/executive', '/admin', '/tickets'];

export default function MainLayout() {
    const { pathname } = useLocation();
    const showFooter = !NO_FOOTER_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

    return (
        <div className="main-layout">
            <Navbar />
            <main className="main-content page-content">
                <Outlet />
            </main>
            {showFooter && <Footer />}
            <CookieConsent />
        </div>
    );
}
