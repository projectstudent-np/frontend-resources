import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import './CommandPalette.css';

interface PaletteItem {
    label: string;
    description?: string;
    path: string;
    action?: string;
    icon: 'nav' | 'page' | 'link';
}

function getNavItems(role: string, isLoggedIn: boolean): PaletteItem[] {
    const items: PaletteItem[] = [];

    if (isLoggedIn) {
        const dashRoute: Record<string, string> = {
            student: '/student',
            driver: '/driver',
            executive: '/executive',
            admin: '/admin',
        };

        items.push({ label: 'Painel', description: 'Ir para o painel principal', path: dashRoute[role] ?? '/student', icon: 'nav' });
        items.push({ label: 'Perfil', description: 'Gerenciar informações pessoais', path: '#profile', action: 'open-profile', icon: 'nav' });
    } else {
        items.push({ label: 'Perfil', description: 'Entrar na sua conta', path: '/access', icon: 'nav' });
    }

    items.push({ label: 'Ajuda', description: 'Canais de ajuda e suporte', path: '/help', icon: 'nav' });

    return items;
}

function getPageItems(role: string): PaletteItem[] {
    const items: PaletteItem[] = [];

    if (role === 'student') {
        items.push(
            { label: 'Minha Carteirinha', description: 'Visualizar carteirinha estudantil', path: '/student', icon: 'page' },
            { label: 'Solicitar Carteirinha', description: 'Iniciar pedido de carteirinha', path: '/student/request', icon: 'page' },
        );
    }

    if (role === 'driver') {
        items.push(
            { label: 'Scanner QR Code', description: 'Validar carteirinha por câmera', path: '/driver', icon: 'page' },
        );
    }

    if (role === 'executive' || role === 'admin') {
        items.push(
            { label: 'Gerenciar Solicitações', description: 'Aprovar ou rejeitar carteirinhas', path: '/executive', icon: 'page' },
        );
    }

    if (role === 'admin') {
        items.push(
            { label: 'Gerenciar Usuários', description: 'Administrar contas do sistema', path: '/admin', icon: 'page' },
        );
    }

    items.push(
        { label: 'Cookies', description: 'Política de cookies do site', path: '/cookies', icon: 'link' },
        { label: 'Termos de uso', description: 'Termos e condições de uso', path: '/terms', icon: 'link' },
        { label: 'Aviso de privacidade', description: 'Política de privacidade', path: '/privacy', icon: 'link' },
    );

    return items;
}

const NAV_ICON = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const PAGE_ICON = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

const LINK_ICON = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

const ICON_MAP = { nav: NAV_ICON, page: PAGE_ICON, link: LINK_ICON };

interface Props {
    open: boolean;
    onClose: () => void;
    onOpenProfile?: () => void;
}

export default function CommandPalette({ open, onClose, onOpenProfile }: Props) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const isLoggedIn = !!user;
    const role = user?.role ?? 'student';

    const allItems = [...getNavItems(role, isLoggedIn), ...getPageItems(role)];

    // Deduplicate by path
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
    });

    const filtered = query.trim()
        ? uniqueItems.filter((item) => {
            const q = query.toLowerCase();
            return item.label.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
        })
        : uniqueItems;

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.children[selectedIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    const handleSelect = useCallback((item: PaletteItem) => {
        onClose();
        if (item.action === 'open-profile') {
            onOpenProfile?.();
            return;
        }
        if (location.pathname !== item.path) {
            navigate(item.path);
        }
    }, [navigate, onClose, location.pathname, onOpenProfile]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((i) => (i + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!open) return null;

    return createPortal(
        <div className="cmd-palette-overlay" onClick={onClose}>
            <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
                <div className="cmd-palette-header">
                    <svg className="cmd-palette-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className="cmd-palette-input"
                        placeholder="Buscar página ou ação..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <kbd className="cmd-palette-kbd">Esc</kbd>
                </div>

                <div className="cmd-palette-list" ref={listRef}>
                    {filtered.length === 0 ? (
                        <div className="cmd-palette-empty">Nenhum resultado encontrado</div>
                    ) : (
                        filtered.map((item, i) => (
                            <button
                                key={item.path}
                                className={`cmd-palette-item${i === selectedIndex ? ' cmd-palette-item-active' : ''}${location.pathname === item.path ? ' cmd-palette-item-current' : ''}`}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <span className="cmd-palette-item-icon">{ICON_MAP[item.icon]}</span>
                                <div className="cmd-palette-item-text">
                                    <span className="cmd-palette-item-label">{item.label}</span>
                                    {item.description && <span className="cmd-palette-item-desc">{item.description}</span>}
                                </div>
                                {location.pathname === item.path && (
                                    <span className="cmd-palette-item-badge">Atual</span>
                                )}
                            </button>
                        ))
                    )}
                </div>

                <div className="cmd-palette-footer">
                    <span><kbd>↑↓</kbd> navegar</span>
                    <span><kbd>↵</kbd> abrir</span>
                    <span><kbd>Esc</kbd> fechar</span>
                </div>
            </div>
        </div>,
        document.body
    );
}
