import { useEffect } from 'react';

const SUFFIX = 'NPMG';

export default function usePageTitle(title?: string) {
    useEffect(() => {
        document.title = title ? `${title} - ${SUFFIX}` : `Carteirinha Estudantil ${SUFFIX}`;
    }, [title]);
}
