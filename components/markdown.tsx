'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
export default function Markdown({ text }: {
    text: string;
}) { return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: ({ children, ...props }) => <div className="code-wrap"><button aria-label="Copy code" onClick={async (e) => { try {
        await navigator.clipboard.writeText(e.currentTarget.parentElement?.querySelector('pre')?.textContent || '');
        toast.success('Copied');
    }
    catch {
        toast.error('Copy failed');
    } }}><Copy size={13}/> Copy</button><pre {...props}>{children}</pre></div>, a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>, img: ({ alt }) => <span>[{alt || 'Image'}]</span> }}>{text}</ReactMarkdown></div>; }
