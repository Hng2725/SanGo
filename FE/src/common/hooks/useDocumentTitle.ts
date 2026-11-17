import { useEffect } from 'react';
export function useDocumentTitle(title: string): void { useEffect(() => { const old = document.title; document.title = `${title} | SanGo`; return () => { document.title = old; }; }, [title]); }
