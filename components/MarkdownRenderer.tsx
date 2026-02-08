
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  
  const renderTextWithLinks = (text: string) => {
    // Handle Markdown links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = markdownLinkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a 
          key={`md-${match.index}`} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-white bg-blue-600 hover:bg-blue-500 font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-blue-500/40 inline-flex items-center gap-2 text-[10px]"
        >
          <i className="fas fa-external-link-alt"></i>
          {match[1]}
        </a>
      );
      lastIndex = markdownLinkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderContent = () => {
    return lines.map((line, index) => {
      // Table Row Detection
      if (line.includes('|') && !line.includes('---')) {
        const cells = line.split('|').map(c => c.trim()).filter((c, i, arr) => {
            if (i === 0 && c === "") return false;
            if (i === arr.length - 1 && c === "") return false;
            return true;
        });

        const isHeader = lines[index + 1]?.includes('---') || (index > 0 && lines[index-1]?.includes('---'));
        
        return (
          <div key={index} className={`flex border-b border-white/5 transition-colors hover:bg-white/5 items-center ${isHeader ? 'bg-blue-600/10 font-black text-blue-400 border-b-2 border-blue-500/30' : ''}`}>
            {cells.map((cell, i) => (
              <div key={i} className={`flex-1 p-4 text-[11px] min-w-[100px] leading-tight text-center ${isHeader ? 'uppercase tracking-tighter' : 'text-slate-200 font-medium'}`}>
                {renderTextWithLinks(cell)}
              </div>
            ))}
          </div>
        );
      }
      
      // Headers
      if (line.trim().startsWith('###')) {
        return <h3 key={index} className="text-lg font-black text-blue-400 mt-8 mb-4 flex items-center gap-3">
          <div className="w-2 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
          {line.replace('###', '').trim()}
        </h3>;
      }
      if (line.trim().startsWith('##')) {
        return <h2 key={index} className="text-xl font-black text-white mt-10 mb-6 border-r-4 border-blue-600 pr-4 bg-gradient-to-l from-transparent to-blue-600/10 py-3 rounded-l-lg">
          {line.replace('##', '').trim()}
        </h2>;
      }

      // Regular Paragraph or Empty
      if (line.trim().length === 0) return <div key={index} className="h-4"></div>;
      if (line.includes('---') && line.includes('|')) return null;
      
      return <p key={index} className="mb-4 leading-relaxed text-slate-300 font-medium text-[14px]">{renderTextWithLinks(line)}</p>;
    });
  };

  return <div className="markdown-body overflow-x-auto custom-scrollbar select-text pb-6">{renderContent()}</div>;
};

export default MarkdownRenderer;
