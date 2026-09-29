'use client';
import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { api } from '@/lib/client';
import Markdown from './markdown';
export default function Translated({ text, source, target, enabled, ready, markdown = false, onClick }: {
    text: string;
    source: string;
    target: string;
    enabled: boolean;
    ready: boolean;
    markdown?: boolean;
    onClick?: () => void;
}) {
    const [translated, setTranslated] = useState(''), [original, setOriginal] = useState(false), [error, setError] = useState(false);
    useEffect(() => { let active = true; setTranslated(''); setError(false); setOriginal(false); if (enabled && ready && source !== target)
        api('translate', { text, source, target }).then(r => { if (active && r.translated)
            setTranslated(r.text); }).catch(() => { if (active)
            setError(true); }); return () => { active = false; }; }, [text, source, target, enabled, ready]);
    const value = translated && !original ? translated : text;
    return <><div>{onClick ? <button className="translated-title" onClick={onClick}>{value}</button> : markdown ? <Markdown text={value}/> : value}</div>{translated && <button className="translation" onClick={() => setOriginal(!original)}><Languages size={12}/> Translated from {({ ko: 'Korean', en: 'English', ja: 'Japanese' } as Record<string, string>)[source]} · {original ? '번역 보기' : '원문 보기'}</button>}{error && <small className="muted">번역을 불러오지 못해 원문을 표시합니다.</small>}</>;
}
