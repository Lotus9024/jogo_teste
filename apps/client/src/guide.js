import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './styles/tokens.css';
import './styles/guide.css';

// The same versioned Markdown serves the repository and the player's library.
const sources = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true });
const documents = Object.entries(sources).map(([path, markdown]) => ({
  key: path.split('/').at(-1).replace(/\.md$/u, ''),
  title: markdown.match(/^#\s+(.+)$/mu)?.[1] ?? path.split('/').at(-1),
  markdown,
}));
const priority = ['GUIA-DO-JOGADOR', 'CATALOGO-DE-CARTAS', 'REVISAO-DAS-REGRAS', 'DESENVOLVIMENTO', 'ARQUITETURA'];
documents.sort((a, b) => {
  const rank = key => priority.includes(key) ? priority.indexOf(key) : priority.length;
  return rank(a.key) - rank(b.key) || a.title.localeCompare(b.title, 'pt-BR');
});
const requested = new URLSearchParams(location.search).get('doc');
const selected = documents.find(document => document.key === requested) ?? documents[0];
const article = document.querySelector('#guide-article');

for (const document of documents) {
  const link = globalThis.document.createElement('a');
  link.href = `?doc=${encodeURIComponent(document.key)}`;
  link.textContent = document.title;
  if (document === selected) link.setAttribute('aria-current', 'page');
  globalThis.document.querySelector('#guide-documents').append(link);
}

if (selected) {
  document.title = `${selected.title} · Tronos em Ruínas`;
  article.innerHTML = DOMPurify.sanitize(marked.parse(selected.markdown));
  const usedIds = new Map();
  for (const heading of article.querySelectorAll('h1, h2, h3, h4')) {
    const base = heading.textContent.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/gu, '-');
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    heading.id = count ? `${base}-${count}` : base;
    if (heading.tagName === 'H2') {
      const link = document.createElement('a');
      link.href = `#${encodeURIComponent(heading.id)}`;
      link.textContent = heading.textContent;
      document.querySelector('#guide-outline').append(link);
    }
  }
  for (const link of article.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (/^[a-z]+:/iu.test(href) || href.startsWith('#')) continue;
    const [path, hash] = href.split('#');
    const key = path.split('/').at(-1)?.replace(/\.md$/u, '');
    if (documents.some(document => document.key === key)) {
      link.href = `?doc=${encodeURIComponent(key)}${hash ? `#${hash}` : ''}`;
    } else {
      const repoPath = path.replace(/^(?:\.\.\/|\.\/)+/u, '');
      link.href = `https://github.com/Lotus9024/jogo_teste/blob/main/${repoPath}${hash ? `#${hash}` : ''}`;
    }
  }
  for (const table of article.querySelectorAll('table')) {
    const scroll = document.createElement('div');
    scroll.className = 'guide-table';
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', 'Tabela; role horizontalmente para ver todas as colunas');
    table.before(scroll);
    scroll.append(table);
  }
  if (location.hash) {
    try { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); } catch { /* Invalid fragment: retain the readable document. */ }
  }
} else {
  article.textContent = 'O guia ainda não está disponível nesta versão.';
}
