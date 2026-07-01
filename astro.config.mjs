import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Плагин Remark для преобразования GitHub-style alerts в HTML-разметку с классами .markdown-alert
function remarkYandexAlerts() {
  return (tree) => {
    function visit(node) {
      if (node.type === 'blockquote') {
        const firstChild = node.children?.[0];
        if (firstChild && firstChild.type === 'paragraph') {
          const firstGrandchild = firstChild.children?.[0];
          if (firstGrandchild && firstGrandchild.type === 'text') {
            const val = firstGrandchild.value;
            const match = val.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\r?\n)?/i);
            if (match) {
              const alertType = match[1].toLowerCase();
              
              // Удаляем маркер [!TYPE] из текста
              firstGrandchild.value = val.slice(match[0].length);
              
              // Превращаем blockquote в div с классами .markdown-alert и .markdown-alert-[type]
              node.type = 'parent';
              node.data = node.data || {};
              node.data.hName = 'div';
              node.data.hProperties = {
                className: `markdown-alert markdown-alert-${alertType}`
              };
              
              // Вставляем p.markdown-alert-title в начало содержимого
              const titleNode = {
                type: 'paragraph',
                data: {
                  hName: 'p',
                  hProperties: {
                    className: 'markdown-alert-title'
                  }
                },
                children: [
                  {
                    type: 'text',
                    value: match[1].toUpperCase()
                  }
                ]
              };
              
              node.children.unshift(titleNode);
            }
          }
        }
      }
      
      if (node.children) {
        node.children.forEach(visit);
      }
    }
    
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://smart-hub.info',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkYandexAlerts],
  }
});

