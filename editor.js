        document.addEventListener('DOMContentLoaded', function () {
            // Hide loading spinner when page is loaded
            const loadingElement = document.getElementById('loading');
            loadingElement.style.display = 'none';

            // Simple markdown mode that tags code and math sections with more specific classes
            CodeMirror.defineMode("markdownWithCodeMath", function (config) {
                // Get the underlying markdown mode
                const markdownMode = CodeMirror.getMode(config, "markdown");

                // Create an overlay that catches code and math
                const overlay = {
                    startState: function () {
                        return {
                            inCodeBlock: false,
                            inMathBlock: false,
                            inMath: false
                        };
                    },
                    token: function (stream, state) {
                        // Code blocks
                        if (stream.match(/^```/)) {
                            state.inCodeBlock = !state.inCodeBlock;
                            return "comment";
                        }

                        if (state.inCodeBlock) {
                            stream.skipToEnd();
                            return "comment";
                        }

                        // Math blocks
                        if (stream.match(/^\$\$/)) {
                            state.inMathBlock = !state.inMathBlock;
                            return state.inMathBlock ? "math-block formatting-math" : "math-block formatting-math";
                        }

                        if (state.inMathBlock) {
                            stream.skipToEnd();
                            return "math-block";
                        }

                        // Inline math
                        if (stream.match(/^\$/)) {
                            state.inMath = !state.inMath;
                            return state.inMath ? "math-inline formatting-math" : "math-inline formatting-math";
                        }

                        if (state.inMath) {
                            // Look for closing $
                            let match = stream.match(/^[^\$]+\$/, false);
                            if (match) {
                                // Consume up to but not including the closing $
                                stream.match(/^[^\$]+/);
                                return "math-inline";
                            } else {
                                stream.skipToEnd();
                                return "math-inline";
                            }
                        }

                        // If we're not in a special section, skip this token
                        stream.skipToEnd();
                        return null;
                    }
                };

                return CodeMirror.overlayMode(markdownMode, overlay);
            });

            // Define available editor themes
            const editorThemes = {
                'default': {
                    theme: 'default',
                    isDark: false
                },
                'material': {
                    theme: 'material',
                    isDark: true
                },
                'dracula': {
                    theme: 'dracula',
                    isDark: true
                },
                'nord': {
                    theme: 'nord',
                    isDark: true
                },
                'solarized': {
                    theme: 'solarized',
                    isDark: false
                },
                'ayu-dark': {
                    theme: 'ayu-dark',
                    isDark: true
                },
                'idea': {
                    theme: 'idea',
                    isDark: false
                },
                'xq-light': {
                    theme: 'xq-light',
                    isDark: false
                },
                'auto': {
                    theme: 'default', // Will be changed based on dark mode
                    isDark: false,
                    isAuto: true
                }
            };

            const maxFileBytes = 10 * 1024 * 1024;
            const maxPreviewLength = 500000;

            // Initialize state variables
            let currentTheme = localStorage.getItem('editorTheme') || 'default';
            let isDarkMode = localStorage.getItem('darkMode') === 'enabled';
            let currentViewMode = localStorage.getItem('viewMode') || 'split';

            const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
                mode: "markdownWithCodeMath",
                lineNumbers: false,
                lineWrapping: true,
                scrollbarStyle: null,
                direction: 'rtl',
                rtlMoveVisually: true,
                theme: getEditorTheme(),
                autofocus: true,
                inputStyle: 'contenteditable',
                specialChars: /[\u0000-\u001f\u007f-\u009f\u00ad\u061C\u200E\u200F\u2028\u2029\ufeff\u2066\u2067\u2068\u2069]/,
                extraKeys: {
                    'Enter': 'newlineAndIndentContinueMarkdownList'
                }
            });

            const preview = document.getElementById('preview');
            const previewScroller = preview.parentElement;
            let syncedEditorTop;
            let syncedPreviewTop;

            function syncScroll(fromEditor) {
                if (currentViewMode !== 'split') return;

                const editorScroll = editor.getScrollInfo();
                const editorRange = editorScroll.height - editorScroll.clientHeight;
                const previewRange = previewScroller.scrollHeight - previewScroller.clientHeight;
                if (editorRange <= 0 || previewRange <= 0) return;

                if (fromEditor) {
                    previewScroller.scrollTop = editorScroll.top / editorRange * previewRange;
                    syncedPreviewTop = previewScroller.scrollTop;
                } else {
                    editor.scrollTo(null, previewScroller.scrollTop / previewRange * editorRange);
                    syncedEditorTop = editor.getScrollInfo().top;
                }
            }

            editor.on('scroll', () => {
                const top = editor.getScrollInfo().top;
                if (top !== syncedEditorTop) syncScroll(true);
                syncedEditorTop = undefined;
            });
            previewScroller.addEventListener('scroll', () => {
                if (previewScroller.scrollTop !== syncedPreviewTop) syncScroll(false);
                syncedPreviewTop = undefined;
            });

            const editorWrapper = editor.getWrapperElement();
            editorWrapper.dir = editor.getOption('direction');
            let directionShortcutPending = false;

            // Wait for release so Ctrl+Shift shortcuts with a third key still work.
            editorWrapper.addEventListener('keydown', (event) => {
                if (event.key !== 'Control' && event.key !== 'Shift') {
                    directionShortcutPending = false;
                } else if (!event.repeat) {
                    directionShortcutPending = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;
                }
            }, true);

            editorWrapper.addEventListener('keyup', (event) => {
                if (!directionShortcutPending || (event.key !== 'Control' && event.key !== 'Shift')) return;
                directionShortcutPending = false;
                event.preventDefault();
                const direction = editor.getOption('direction') === 'rtl' ? 'ltr' : 'rtl';
                editorWrapper.dir = direction;
                editor.setOption('direction', direction);
            }, true);

            function cancelDirectionShortcut() {
                directionShortcutPending = false;
            }

            editorWrapper.addEventListener('focusout', cancelDirectionShortcut);
            window.addEventListener('blur', cancelDirectionShortcut);

            // Add direct event listener to handle keyboard shortcuts
            editorWrapper.addEventListener('keydown', function (e) {
                // Check for keyboard shortcuts
                if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                    e.preventDefault(); // Prevent default browser behavior
                    applyBoldFormatting(editor);
                }
                else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                    e.preventDefault();
                    applyItalicFormatting(editor);
                }
                else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    applyLinkFormatting(editor);
                }
                else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveDocument();
                }
                else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                    e.preventDefault();
                    openDocument();
                }
            });

            // Specific formatting functions
            function applyBoldFormatting(cm) {
                const selection = cm.getSelection();
                const from = cm.getCursor('from');
                const to = cm.getCursor('to');

                if (selection) {
                    // Check if selection is already bold (surrounded by **)
                    if (selection.startsWith('**') && selection.endsWith('**')) {
                        // Remove formatting
                        cm.replaceSelection(selection.substring(2, selection.length - 2));
                    } else {
                        // Add bold formatting
                        cm.replaceSelection(`**${selection}**`);
                        // Keep the same text selected
                        cm.setSelection(
                            { line: from.line, ch: from.ch },
                            { line: to.line, ch: to.ch + 4 }
                        );
                    }
                } else {
                    // No selection, insert placeholder
                    cm.replaceSelection('**טקסט מודגש**');
                    // Position cursor between the asterisks
                    const cursor = cm.getCursor();
                    cm.setCursor({ line: cursor.line, ch: cursor.ch - 2 });
                }

                // Ensure focus remains on editor
                cm.focus();

                // Force update preview
                updatePreview();
            }

            // Similar functions for italic and link formatting
            function applyItalicFormatting(cm) {
                // Implementation similar to bold but with single asterisk
                const selection = cm.getSelection();
                const from = cm.getCursor('from');
                const to = cm.getCursor('to');

                if (selection) {
                    if (selection.startsWith('*') && selection.endsWith('*')) {
                        cm.replaceSelection(selection.substring(1, selection.length - 1));
                    } else {
                        cm.replaceSelection(`*${selection}*`);
                        cm.setSelection(
                            { line: from.line, ch: from.ch },
                            { line: to.line, ch: to.ch + 2 }
                        );
                    }
                } else {
                    cm.replaceSelection('*טקסט נטוי*');
                    const cursor = cm.getCursor();
                    cm.setCursor({ line: cursor.line, ch: cursor.ch - 1 });
                }

                cm.focus();
                updatePreview();
            }

            function applyLinkFormatting(cm) {
                const selection = cm.getSelection();
                const from = cm.getCursor('from');

                if (selection) {
                    cm.replaceSelection(`[${selection}](http://example.com)`);
                } else {
                    cm.replaceSelection('[טקסט קישור](http://example.com)');
                    // Position cursor to edit the link text
                    const cursor = cm.getCursor();
                    const linkTextLength = 'טקסט קישור'.length;
                    cm.setCursor({ line: cursor.line, ch: cursor.ch - (linkTextLength + 18) });
                }

                cm.focus();
                updatePreview();
            }

            // Function to get the correct editor theme based on current settings
            function getEditorTheme() {
                const themeInfo = editorThemes[currentTheme];

                // If auto theme, pick based on dark mode
                if (themeInfo.isAuto) {
                    return isDarkMode ? 'material' : 'default';
                }

                // update toggle icon
                const themeToggle = document.getElementById('theme-toggle');
                themeToggle.setAttribute('aria-pressed', isDarkMode);
                themeToggle.setAttribute('data-active', isDarkMode);
                themeToggle.classList.toggle('active', isDarkMode);
                themeToggle.querySelector('.toggle-handle').style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
                themeToggle.querySelector('.toggle-handle').style.boxShadow = isDarkMode ? '0 0 5px rgba(255, 255, 255, 0.2)' : '0 0 5px rgba(0, 0, 0, 0.2)';
                themeToggle.querySelector('.toggle-handle').style.transition = 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease';
                themeToggle.querySelector('.toggle-handle').style.transition = 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease';
                themeToggle.querySelector('.toggle-handle').style.transition = 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease';

                // update primary color based on specific theme - each theme has its own primary color
                const primaryColors = [
                    '#007bff', // default
                    '#2196F3', // material
                    '#FF79C6', // dracula
                    '#88C0D0', // nord
                    '#268bd2', // solarized
                    '#7aa2f7', // ayu-dark
                    '#007bff', // idea
                    '#007bff', // xq-light
                ];
                const themeIndex = Object.keys(editorThemes).indexOf(currentTheme);
                const primaryColor = primaryColors[themeIndex];
                document.documentElement.style.setProperty('--primary', primaryColor);
                document.documentElement.style.setProperty('--primary-light', primaryColor + 'CC');
                document.documentElement.style.setProperty('--primary-dark', primaryColor + 'FF');
                document.documentElement.style.setProperty('--primary-color-hover', primaryColor + 'CC');
                document.documentElement.style.setProperty('--primary-color-active', primaryColor + 'FF');
                document.documentElement.style.setProperty('--primary-color-disabled', primaryColor + 'AA');
                document.documentElement.style.setProperty('--primary-color-active', primaryColor + 'FF');
                document.documentElement.style.setProperty('--primary-color-disabled', primaryColor + 'AA');
                document.documentElement.style.setProperty('--primary-color-active', primaryColor + 'FF');
                document.documentElement.style.setProperty('--primary-color-disabled', primaryColor + 'AA');
                document.documentElement.style.setProperty('--primary-color-active', primaryColor + 'FF');
                return themeInfo.theme;
            }

            // Set up the view mode
            setViewMode(currentViewMode);

            // Sample content
            const sampleContent = `# עורך Markdown Right-to-Left (RTL)

ברוך הבא לעורך Markdown המודרני בעברית. עורך זה תומך בכל תכונות Markdown ובנוסחאות מתמטיות, עם ממשק מינימליסטי בהשראת מוצרי Apple.

## תכונות המערכת

* עיצוב נקי ומודרני בהשראת מוצרי Apple
* תמיכה מלאה בעברית (RTL)
* עיצוב טקסט **מודגש**, *נטוי* ו~~קו חוצה~~
* תמיכה ברשימות ממוספרות ולא ממוספרות
* אפשרות להוספת [קישורים](https://dorpascal.com) ותמונות
* תחביר קוד עם הדגשת תחביר
* מצב כהה ובהיר עם מגוון ערכות נושא לעורך

## תמיכה בנוסחאות מתמטיות

ניתן להשתמש בנוסחאות מתמטיות בתוך השורה כמו $E = mc^2$ או בתור בלוק:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## קוד מקור

\`\`\`javascript
// דוגמת קוד בג'אווהסקריפט
function hello() {
    console.log("שלום עולם!");
    return true;
}

// טיפול באירועים
document.addEventListener('click', function() {
    const message = "נלחץ כפתור!";
    console.log(message);
});
\`\`\`

## טבלאות

| שם      | גיל | עיר         |
|---------|-----|-------------|
| ישראל   | 30  | תל אביב     |
| שרה     | 25  | ירושלים     |
| דוד     | 40  | חיפה        |

## רשימת משימות

- [x] עיצוב מודרני
- [x] תמיכה בנוסחאות מתמטיות
- [x] עימוד קוד
- [ ] ייצוא ל-PDF
- [ ] תמיכה בתמונות מקומיות

נסה לערוך את הטקסט ולראות את התצוגה המקדימה בזמן אמת!`;

            editor.setValue(sampleContent);

            // Configure Marked renderer for RTL
            const renderer = new marked.Renderer();

            // Custom table renderer for RTL tables
            renderer.table = function (header, body) {
                return `<table class="rtl-table" dir="rtl">\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table>\n`;
            };

            // Custom list renderer for RTL lists
            renderer.list = function (body, ordered, start) {
                const type = ordered ? 'ol' : 'ul';
                const startAttr = (ordered && start && start !== 1) ? ` start="${start}"` : '';
                return `<${type}${startAttr} dir="rtl">${body}</${type}>`;
            };

            // Custom list item renderer for RTL
            renderer.listitem = function (text, task, checked) {
                if (task) {
                    return `<li style="direction: rtl; text-align: right;"><input type="checkbox" ${checked ? 'checked' : ''} disabled> <span>${text}</span></li>`;
                }
                return `<li style="direction: rtl; text-align: right;">${text}</li>`;
            };

            // Custom code block renderer to ensure LTR
            renderer.code = function (code, infostring, escaped) {
                const lang = (infostring || '').match(/\S*/)[0];

                // Add explicit LTR direction to code blocks
                return `<pre dir="ltr" style="direction: ltr; text-align: left;"><code class="language-${escape(lang)}">${escaped ? code : escape(code)}</code></pre>`;
            };

            // Custom inline code renderer
            renderer.codespan = function (code) {
                return `<code dir="ltr" style="direction: ltr;">${code}</code>`;
            };

            // Keep raw HTML and external resources from running as part of a document.
            renderer.html = escape;
            const renderImage = renderer.image.bind(renderer);
            renderer.image = function (href, title, text) {
                if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(href)) {
                    return renderImage(href, title, text);
                }
                try {
                    const url = new URL(href, document.baseURI);
                    if (!['http:', 'https:'].includes(url.protocol)) return text;
                    if (url.origin === location.origin) return renderImage(href, title, text);
                    return `<a href="${escape(url.href)}">${text || 'פתיחת תמונה חיצונית'}</a>`;
                } catch {
                    return text;
                }
            };

            // Setup Marked
            marked.setOptions({
                renderer: renderer,
                headerIds: true,
                gfm: true,
                breaks: false,
                pedantic: false,
                sanitize: false,
                smartLists: true,
                smartypants: false,
                xhtml: false
            });

            // Helper function to escape HTML
            function escape(html) {
                return html
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function renderMath(token) {
                try {
                    return katex.renderToString(token.text, {
                        displayMode: token.displayMode,
                        throwOnError: false,
                        trust: false,
                        maxSize: 20
                    });
                } catch (error) {
                    return `<span class="katex-error">${escape(error.message)}</span>`;
                }
            }

            marked.use({
                extensions: [{
                    name: 'mathBlock',
                    level: 'block',
                    start(source) { return source.indexOf('$$'); },
                    tokenizer(source) {
                        const match = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(source);
                        if (match) return { type: 'mathBlock', raw: match[0], text: match[1], displayMode: true };
                    },
                    renderer: renderMath
                }, {
                    name: 'mathInline',
                    level: 'inline',
                    start(source) { return source.indexOf('$'); },
                    tokenizer(source) {
                        const match = /^\$([^\n$]+?)\$/.exec(source);
                        if (match) return { type: 'mathInline', raw: match[0], text: match[1], displayMode: false };
                    },
                    renderer: renderMath
                }]
            });

            function renderMarkdown(markdown) {
                if (markdown.length > maxPreviewLength) {
                    const message = document.createElement('p');
                    message.textContent = 'המסמך ארוך מדי לתצוגה מקדימה או להדפסה.';
                    return message;
                }
                return DOMPurify.sanitize(marked.parse(markdown), {
                    ADD_TAGS: ['math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac'],
                    RETURN_DOM_FRAGMENT: true
                });
            }

            let mermaidLoader;
            let diagramId = 0;
            let previewDiagramTimer;
            let previewVersion = 0;

            function loadMermaid() {
                if (!mermaidLoader) {
                    mermaidLoader = new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        const asset = document.querySelector('meta[name="mermaid-script"]');
                        script.src = asset.content;
                        if (asset.dataset.integrity) {
                            script.integrity = asset.dataset.integrity;
                            script.crossOrigin = 'anonymous';
                        }
                        script.onload = () => {
                            try {
                                window.mermaid.initialize({
                                    startOnLoad: false,
                                    securityLevel: 'strict',
                                    htmlLabels: false,
                                    suppressErrorRendering: true
                                });
                                resolve(window.mermaid);
                            } catch (error) {
                                script.remove();
                                reject(error);
                            }
                        };
                        script.onerror = () => {
                            script.remove();
                            reject(new Error('Mermaid failed to load'));
                        };
                        document.head.append(script);
                    }).catch(error => {
                        mermaidLoader = undefined;
                        throw error;
                    });
                }
                return mermaidLoader;
            }

            async function renderMermaidSvg(mermaid, source) {
                // Measure in the same LTR context as the preview and print output.
                const measurement = document.createElement('div');
                measurement.className = 'mermaid-measurement';
                measurement.dir = 'ltr';
                measurement.setAttribute('aria-hidden', 'true');
                document.body.append(measurement);

                try {
                    await document.fonts.ready;
                    const { svg } = await mermaid.render(`markdown-mermaid-${++diagramId}`, source, measurement);
                    const isolated = measurement.attachShadow({ mode: 'closed' });
                    isolated.append(DOMPurify.sanitize(svg, {
                        USE_PROFILES: { svg: true, svgFilters: true },
                        RETURN_DOM_FRAGMENT: true
                    }));
                    const chart = isolated.querySelector('svg');
                    if (!chart) throw new Error('Mermaid did not return an SVG');
                    await document.fonts.ready;
                    fitMermaidSvg(chart);

                    // SVG loaded as an image cannot apply its styles to the page.
                    const image = document.createElement('img');
                    image.alt = chart.querySelector('title')?.textContent || 'תרשים Mermaid';
                    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(chart));
                    return image;
                } finally {
                    measurement.remove();
                }
            }

            function fitMermaidSvg(chart) {
                const viewBox = chart.viewBox.baseVal;
                if (viewBox.width <= 0 || viewBox.height <= 0) return;

                // Include any artwork extending past Mermaid's original viewport.
                const bounds = chart.getBBox();
                const left = Math.min(viewBox.x, bounds.x - 2);
                const top = Math.min(viewBox.y, bounds.y - 2);
                const right = Math.max(viewBox.x + viewBox.width, bounds.x + bounds.width + 2);
                const bottom = Math.max(viewBox.y + viewBox.height, bounds.y + bounds.height + 2);
                const width = right - left;
                const height = bottom - top;

                chart.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);
                chart.setAttribute('width', width);
                chart.setAttribute('height', height);
                chart.style.removeProperty('max-width');
            }

            async function renderMermaid(container) {
                const blocks = container.querySelectorAll('pre > code.language-mermaid');
                for (const code of blocks) {
                    if (!code.isConnected) continue;

                    const diagram = code.ownerDocument.createElement('div');
                    diagram.className = 'mermaid-diagram';
                    diagram.dir = 'ltr';
                    try {
                        const mermaid = await loadMermaid();
                        if (!code.isConnected) continue;
                        diagram.append(await renderMermaidSvg(mermaid, code.textContent));
                    } catch {
                        diagram.className = 'mermaid-error';
                        diagram.dir = 'rtl';
                        const message = code.ownerDocument.createElement('p');
                        message.textContent = 'לא ניתן להציג את תרשים Mermaid.';
                        diagram.append(message, code.parentElement.cloneNode(true));
                    }
                    if (code.isConnected) code.parentElement.replaceWith(diagram);
                }
            }

            function updatePreview() {
                const markdown = editor.getValue();
                const previousTop = previewScroller.scrollTop;
                preview.replaceChildren(renderMarkdown(markdown));
                previewScroller.scrollTop = previousTop;
                syncedPreviewTop = previewScroller.scrollTop;
                syncScroll(true);

                const version = ++previewVersion;
                clearTimeout(previewDiagramTimer);
                previewDiagramTimer = setTimeout(async () => {
                    await renderMermaid(preview);
                    if (version === previewVersion) syncScroll(true);
                }, 200);
                updateStats(markdown);
            }

            // Function to update document stats
            function updateStats(text) {
                const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
                const chars = text.length;
                const cursor = editor.getCursor();

                document.getElementById('stats').innerHTML = `<i class="fa-solid fa-chart-simple"></i> ${words} מילים | ${chars} תווים`;
                document.getElementById('cursor-position').innerHTML = `<i class="fa-solid fa-location-dot"></i> שורה ${cursor.line + 1}, עמודה ${cursor.ch + 1}`;
            }

            // Function to insert markdown syntax
            function insertMarkdown(cm, type) {
                const selection = cm.getSelection();
                let replacement = '';

                switch (type) {
                    case 'bold':
                        replacement = `**${selection || 'טקסט מודגש'}**`;
                        break;
                    case 'italic':
                        replacement = `*${selection || 'טקסט נטוי'}*`;
                        break;
                    case 'strikethrough':
                        replacement = `~~${selection || 'טקסט עם קו חוצה'}~~`;
                        break;
                    case 'heading1':
                        replacement = `# ${selection || 'כותרת ראשית'}`;
                        break;
                    case 'heading2':
                        replacement = `## ${selection || 'כותרת משנית'}`;
                        break;
                    case 'heading3':
                        replacement = `### ${selection || 'כותרת שלישית'}`;
                        break;
                    case 'link':
                        replacement = `[${selection || 'טקסט קישור'}](http://example.com)`;
                        break;
                    case 'image':
                        replacement = `![${selection || 'תיאור תמונה'}](http://example.com/image.jpg)`;
                        break;
                    case 'code':
                        replacement = selection ? `\`${selection}\`` : "```\nקוד כאן\n```";
                        break;
                    case 'blockquote':
                        replacement = `> ${selection || 'ציטוט'}`;
                        break;
                    case 'bulletList':
                        replacement = `* ${selection || 'פריט ברשימה'}`;
                        break;
                    case 'numberedList':
                        replacement = `1. ${selection || 'פריט ברשימה'}`;
                        break;
                    case 'taskList':
                        replacement = `- [ ] ${selection || 'משימה לביצוע'}`;
                        break;
                    case 'inlineMath':
                        replacement = `$${selection || 'E = mc^2'}$`;
                        break;
                    case 'blockMath':
                        replacement = `$$\n${selection || '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'}\n$$`;
                        break;
                    case 'table':
                        replacement = `| כותרת 1 | כותרת 2 | כותרת 3 |\n| ------- | ------- | ------- |\n| תוכן 1  | תוכן 2  | תוכן 3  |\n| תוכן 4  | תוכן 5  | תוכן 6  |`;
                        break;
                    default:
                        replacement = selection;
                }

                cm.replaceSelection(replacement);
                updatePreview();
            }

            // Function to set the view mode
            function setViewMode(mode) {
                console.log('Setting view mode to:', mode);
                // Check if mode is valid
                if (!mode) {
                    console.log('Invalid view mode:', mode);
                    mode = 'split'; // Default to split if invalid
                }
                const appContainer = document.querySelector('.app-container');
                const viewBtns = document.querySelectorAll('.view-mode-btn');

                // Update container data attribute
                appContainer.setAttribute('data-view-mode', mode);

                // Update active button
                viewBtns.forEach(btn => {
                    if (btn.getAttribute('data-mode') === mode) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                // Store in localStorage
                localStorage.setItem('viewMode', mode);
                currentViewMode = mode;

                // Refresh editor when switching view modes
                setTimeout(() => {
                    editor.refresh();
                    updatePreview();
                }, 100);
            }

            // Function to set dark mode
            function setDarkMode(enabled) {
                const themeToggle = document.getElementById('theme-toggle');

                // Update dark mode state
                isDarkMode = enabled;

                // Update toggle visual state
                themeToggle.setAttribute('data-active', enabled);
                themeToggle.setAttribute('aria-pressed', enabled);

                // Set body data-theme attribute
                if (enabled) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('darkMode', 'enabled');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.removeItem('darkMode');
                }

                // Update editor theme if using auto theme
                if (editorThemes[currentTheme].isAuto) {
                    editor.setOption('theme', getEditorTheme());
                }

                // update page color-theme meta tag
                const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', enabled ? '#121212' : '#ffffff');
                }
            }
            // Find and Replace Functionality
            (function () {
                // Elements
                const findBtn = document.getElementById('find-btn');
                const replaceBtn = document.getElementById('replace-btn');

                // Open find dialog using CodeMirror's built-in search
                findBtn.addEventListener('click', function () {
                    editor.execCommand('find');
                });

                // Open replace dialog using CodeMirror's built-in replace
                replaceBtn.addEventListener('click', function () {
                    editor.execCommand('replace');
                });

                // Add keyboard shortcuts to the editor configuration
                editor.setOption('extraKeys', Object.assign(editor.getOption('extraKeys') || {}, {
                    'Ctrl-F': 'find',
                    'Cmd-F': 'find',
                    'Ctrl-H': 'replace',
                    'Cmd-H': 'replace'
                }));

                // Add some additional CSS to make the search dialog RTL-friendly
                const style = document.createElement('style');
                style.textContent = `
        .CodeMirror-dialog {
            direction: rtl;
            background-color: var(--card) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
            border-radius: var(--border-radius-md) !important;
            box-shadow: var(--shadow-md);
            padding: var(--spacing-sm);
            z-index: 30;
            left: 50% !important;
            transform: translateX(-50%) !important;
            font-size: 16px !important;
        }

        .CodeMirror-dialog input {
            width: 100%;
            padding: var(--spacing-xs) var(--spacing-sm);
            border: 1px solid var(--border) !important;
            border-radius: var(--border-radius-sm) !important;
            background-color: var(--surface-1) !important;
            color: var(--text-primary) !important;
            font-size: 16px !important;
        }

        .CodeMirror-dialog-top {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            margin-top: var(--spacing-md);
        }

        .CodeMirror-dialog input {
            direction: rtl;
            background-color: var(--surface-1);
            color: var(--text-primary);
            border: 1px solid var(--border);
            border-radius: var(--border-radius-sm);
            padding: var(--spacing-xs) var(--spacing-sm);
            margin-right: var(--spacing-sm);
        }

        .CodeMirror-searching {
            background-color: var(--primary-light);
        }

        .CodeMirror-dialog button {
            background-color: var(--surface-1);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            border-radius: var(--border-radius-sm);
            padding: var(--spacing-xs) var(--spacing-sm);
            margin-right: var(--spacing-xs);
            cursor: pointer;
            transition: all var(--transition-fast);
        }

        .CodeMirror-dialog button:hover {
            background-color: var(--primary-light);
            color: var(--primary);
        }
    `;
                document.head.appendChild(style);
            })();
            // Function to set editor theme
            function setEditorTheme(themeName) {
                if (!editorThemes[themeName]) return;

                // Update active theme
                currentTheme = themeName;

                // Update editor theme
                editor.setOption('theme', getEditorTheme());

                // Store in localStorage
                localStorage.setItem('editorTheme', themeName);

                // Update theme option UI
                document.querySelectorAll('.theme-option').forEach(option => {
                    if (option.getAttribute('data-theme') === themeName) {
                        option.classList.add('active');
                    } else {
                        option.classList.remove('active');
                    }
                });
            }

            // Add event listeners to toolbar buttons
            document.querySelectorAll('.btn[data-command]').forEach(button => {
                button.addEventListener('click', function () {
                    const command = this.getAttribute('data-command');
                    insertMarkdown(editor, command);
                    editor.focus();
                });
            });

            // View mode buttons
            document.querySelectorAll('.view-mode-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const mode = this.getAttribute('data-mode');
                    setViewMode(mode);
                });
            });

            // Theme dropdown toggle
            const themeBtn = document.getElementById('theme-select-btn');
            const themeSelector = document.querySelector('.theme-selector');

            themeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                themeSelector.classList.toggle('open');
            });

            // Close theme dropdown when clicking outside
            document.addEventListener('click', function (e) {
                if (!themeSelector.contains(e.target)) {
                    themeSelector.classList.remove('open');
                }
            });

            // Theme options
            document.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', function () {
                    const theme = this.getAttribute('data-theme');
                    setEditorTheme(theme);
                    themeSelector.classList.remove('open');
                });
            });

            // Set active theme option
            document.querySelectorAll('.theme-option').forEach(option => {
                if (option.getAttribute('data-theme') === currentTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });

            const hideToolbarBtn = document.querySelector('.hide-toolbar-btn');
            const toolbar = document.querySelector('.toolbar');

            // Make sure elements exist before adding event listeners
            if (hideToolbarBtn && toolbar) {
                // Force initial state
                const savedState = localStorage.getItem('hideToolbar') === 'true';

                // Apply initial state immediately
                if (savedState) {
                    toolbar.classList.add('hidden');
                    hideToolbarBtn.classList.add('active');
                    hideToolbarBtn.setAttribute('aria-pressed', 'true');
                    hideToolbarBtn.querySelector('i').classList.remove('fa-chevron-up');
                    hideToolbarBtn.querySelector('i').classList.add('fa-chevron-down');
                    const tooltipSpan = hideToolbarBtn.querySelector('.tooltip');
                    // if (tooltipSpan) tooltipSpan.textContent = 'הצג סרגל כלים';
                }

                // Simple toggle function with direct DOM manipulation
                hideToolbarBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling

                    const isCurrentlyHidden = toolbar.classList.contains('hidden');

                    // Toggle toolbar visibility
                    if (isCurrentlyHidden) {
                        toolbar.classList.remove('hidden');
                        this.classList.remove('active');
                        this.setAttribute('aria-pressed', 'false');
                        this.querySelector('i').classList.add('fa-chevron-up');
                        this.querySelector('i').classList.remove('fa-chevron-down');
                        const tooltipSpan = this.querySelector('.tooltip');
                        // if (tooltipSpan) tooltipSpan.textContent = 'הסתר סרגל כלים';
                    } else {
                        toolbar.classList.add('hidden');
                        this.classList.add('active');
                        this.setAttribute('aria-pressed', 'true');
                        this.querySelector('i').classList.remove('fa-chevron-up');
                        this.querySelector('i').classList.add('fa-chevron-down');
                        const tooltipSpan = this.querySelector('.tooltip');
                        // if (tooltipSpan) tooltipSpan.textContent = 'הצג סרגל כלים';
                    }

                    // Save state to localStorage
                    localStorage.setItem('hideToolbar', !isCurrentlyHidden);

                    // Force editor refresh
                    setTimeout(() => {
                        if (typeof editor !== 'undefined' && editor.refresh) {
                            editor.refresh();
                        }
                    }, 50);
                });
            }

            // Clear button
            document.getElementById('clear-btn').addEventListener('click', function () {
                if (confirm('האם אתה בטוח שברצונך לנקות את כל התוכן?')) {
                    editor.setValue('');
                    editor.focus();
                }
            });

            // ===== FILE OPERATIONS SYSTEM =====
            // Track the current file handle (File System Access API) and filename
            let currentFileHandle = null;
            let currentFileName = 'markdown_document.md';
            let isElectron = !!(window.electronAPI);

            // Detect platform for path separator hints
            function getPlatformInfo() {
                const ua = navigator.userAgent.toLowerCase();
                if (ua.includes('win')) return { os: 'windows', sep: '\\' };
                if (ua.includes('mac')) return { os: 'mac', sep: '/' };
                return { os: 'linux', sep: '/' };
            }

            // Check if File System Access API is available (Chrome/Edge on Windows/Mac/Linux desktop)
            function hasFileSystemAccess() {
                return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
            }

            // Update status bar with current filename
            function updateFileStatus(name) {
                currentFileName = name || 'markdown_document.md';
                const statsEl = document.getElementById('stats');
                const text = editor.getValue();
                const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
                const chars = text.length;
                const statsIcon = document.createElement('i');
                statsIcon.className = 'fa-solid fa-chart-simple';
                const indicator = document.createElement('span');
                indicator.className = 'file-indicator';
                indicator.title = currentFileName;
                const fileIcon = document.createElement('i');
                fileIcon.className = 'fa-solid fa-file';
                indicator.append(' | ', fileIcon, ' ', currentFileName);
                statsEl.replaceChildren(statsIcon, ` ${words} מילים | ${chars} תווים`, indicator);
            }

            // === SAVE DOCUMENT ===
            document.getElementById('save-btn').addEventListener('click', saveDocument);

            // Print functionality
            document.getElementById('print-btn').addEventListener('click', function() {
                printDocument();
            });

            async function printDocument() {
                const printWindow = window.open('about:blank', 'markdown-print');
                if (!printWindow) return;
                const content = renderMarkdown(editor.getValue());
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="he" dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <title>הדפסת מסמך Markdown</title>
                        <style>
                            * {
                                box-sizing: border-box;
                                margin: 0;
                                padding: 0;
                            }
                            body {
                                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                                line-height: 1.6;
                                padding: 40px;
                                max-width: 800px;
                                margin: 0 auto;
                                color: #000;
                            }
                            h1, h2, h3, h4, h5, h6 {
                                margin-top: 1.5em;
                                margin-bottom: 0.75em;
                                font-weight: 600;
                            }
                            h1 {
                                font-size: 2em;
                                border-bottom: 1px solid #ccc;
                                padding-bottom: 0.3em;
                            }
                            h2 {
                                font-size: 1.5em;
                                border-bottom: 1px solid #ccc;
                                padding-bottom: 0.3em;
                            }
                            h3 { font-size: 1.25em; }
                            p { margin-bottom: 1.25em; }
                            a { color: #0070f3; }
                            blockquote {
                                border-right: 4px solid #0070f3;
                                margin: 1.5em 0;
                                padding: 0.8em 1.4em;
                                background-color: #f7f9fc;
                            }
                            pre {
                                background-color: #f7f9fc;
                                padding: 1.2em;
                                border-radius: 4px;
                                overflow-x: auto;
                                direction: ltr;
                                text-align: left;
                                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                                font-size: 14px;
                            }
                            code {
                                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                                background-color: #f7f9fc;
                                padding: 0.2em 0.4em;
                                border-radius: 4px;
                                font-size: 0.9em;
                                direction: ltr;
                            }
                            pre code {
                                background: none;
                                padding: 0;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin: 1.5em 0;
                            }
                            table th, table td {
                                padding: 0.8em 1.2em;
                                border: 1px solid #ccc;
                                text-align: right;
                            }
                            table th {
                                background-color: #f7f9fc;
                                font-weight: 600;
                            }
                            table tr:nth-child(even) {
                                background-color: #f7f9fc;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                            }
                            ul, ol {
                                margin: 1.25em 1.5em 1.25em 0;
                            }
                            li {
                                margin-bottom: 0.5em;
                            }
                            .mermaid-diagram {
                                text-align: center;
                                break-inside: avoid;
                            }
                            .mermaid-diagram > img {
                                display: block;
                                max-width: 100%;
                                height: auto;
                                margin-inline: auto;
                            }
                            .katex-display {
                                margin: 1.5em 0;
                                overflow-x: auto;
                                text-align: center;
                            }
                            @media print {
                                body {
                                    padding: 0;
                                }
                                pre {
                                    white-space: pre-wrap;
                                    word-wrap: break-word;
                                }
                            }
                        </style>
                    </head>
                    <body></body>
                    </html>
                `);
                printWindow.document.close();
                const printDocument = printWindow.document;
                const stylesheet = document.querySelector('link[data-katex]').cloneNode();
                stylesheet.href = document.querySelector('link[data-katex]').href;
                const stylesheetReady = new Promise(resolve => {
                    stylesheet.addEventListener('load', resolve, { once: true });
                    stylesheet.addEventListener('error', resolve, { once: true });
                });
                printDocument.head.append(stylesheet);
                printDocument.body.replaceChildren(content);
                await renderMermaid(printDocument.body);
                await stylesheetReady;
                await Promise.allSettled(Array.from(printDocument.images, image => image.decode()));
                await printDocument.fonts.ready;
                if (!printWindow.closed) {
                    printWindow.focus();
                    printWindow.print();
                }
            }

            async function saveDocument() {
                const content = editor.getValue();

                // 1) Electron native save
                if (isElectron) {
                    if (!allowFileSize(new Blob([content]))) return;
                    try {
                        const result = await window.electronAPI.saveFile(content, currentFileName);
                        if (result.success) {
                            currentFileName = result.fileName;
                            updateFileStatus(currentFileName);
                        }
                    } catch (err) {
                        console.error('Electron save error:', err);
                    }
                    return;
                }

                // 2) File System Access API (modern Chrome/Edge - works great on Windows)
                if (hasFileSystemAccess()) {
                    try {
                        // If we have a handle from a previous save/open, write directly
                        if (currentFileHandle) {
                            const writable = await currentFileHandle.createWritable();
                            await writable.write(content);
                            await writable.close();
                            updateFileStatus(currentFileHandle.name);
                            return;
                        }

                        // Otherwise show save picker
                        const handle = await window.showSaveFilePicker({
                            suggestedName: currentFileName,
                            types: [{
                                description: 'Markdown Files',
                                accept: { 'text/markdown': ['.md', '.markdown'] }
                            }, {
                                description: 'Text Files',
                                accept: { 'text/plain': ['.txt'] }
                            }]
                        });

                        const writable = await handle.createWritable();
                        await writable.write(content);
                        await writable.close();

                        currentFileHandle = handle;
                        currentFileName = handle.name;
                        updateFileStatus(currentFileName);
                    } catch (err) {
                        // User cancelled the dialog - not an error
                        if (err.name !== 'AbortError') {
                            console.error('Save error:', err);
                            fallbackSave(content);
                        }
                    }
                    return;
                }

                // 3) Fallback: Blob download (works everywhere including Linux/remote)
                fallbackSave(content);
            }

            function fallbackSave(content) {
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                updateFileStatus(currentFileName);
            }

            // === SAVE AS (always show picker) ===
            async function saveDocumentAs() {
                const content = editor.getValue();

                if (isElectron) {
                    if (!allowFileSize(new Blob([content]))) return;
                    try {
                        const result = await window.electronAPI.saveFileAs(content, currentFileName);
                        if (result.success) {
                            currentFileName = result.fileName;
                            updateFileStatus(currentFileName);
                        }
                    } catch (err) {
                        console.error('Electron saveAs error:', err);
                    }
                    return;
                }

                if (hasFileSystemAccess()) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: currentFileName,
                            types: [{
                                description: 'Markdown Files',
                                accept: { 'text/markdown': ['.md', '.markdown'] }
                            }, {
                                description: 'Text Files',
                                accept: { 'text/plain': ['.txt'] }
                            }]
                        });

                        const writable = await handle.createWritable();
                        await writable.write(content);
                        await writable.close();

                        currentFileHandle = handle;
                        currentFileName = handle.name;
                        updateFileStatus(currentFileName);
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('SaveAs error:', err);
                            fallbackSave(content);
                        }
                    }
                    return;
                }

                fallbackSave(content);
            }

            // === OPEN DOCUMENT ===
            document.getElementById('open-btn').addEventListener('click', openDocument);

            async function openDocument() {
                // 1) Electron native open
                if (isElectron) {
                    try {
                        const result = await window.electronAPI.openFile();
                        if (result.success) {
                            editor.setValue(result.content);
                            currentFileName = result.fileName;
                            updateFileStatus(currentFileName);
                            currentFileHandle = null;
                            editor.clearHistory();
                        }
                    } catch (err) {
                        console.error('Electron open error:', err);
                    }
                    return;
                }

                // 2) File System Access API
                if (hasFileSystemAccess()) {
                    try {
                        const [handle] = await window.showOpenFilePicker({
                            types: [{
                                description: 'Markdown Files',
                                accept: {
                                    'text/markdown': ['.md', '.markdown'],
                                    'text/plain': ['.txt', '.text']
                                }
                            }],
                            multiple: false
                        });

                        const file = await handle.getFile();
                        if (!allowFileSize(file)) return;
                        const content = await file.text();

                        editor.setValue(content);
                        currentFileHandle = handle;
                        currentFileName = handle.name;
                        updateFileStatus(currentFileName);
                        editor.clearHistory();
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            console.error('Open error:', err);
                            fallbackOpen();
                        }
                    }
                    return;
                }

                // 3) Fallback: HTML file input (works on Linux / remote servers)
                fallbackOpen();
            }

            function allowFileSize(file) {
                if (file.size <= maxFileBytes) return true;
                alert('גודל הקובץ עולה על 10 MiB.');
                return false;
            }

            function fallbackOpen() {
                const fileInput = document.getElementById('file-input');
                fileInput.value = ''; // Reset so the same file can be re-opened
                fileInput.click();
            }

            // Handle file input change (fallback open)
            document.getElementById('file-input').addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file || !allowFileSize(file)) return;

                const reader = new FileReader();
                reader.onload = function (event) {
                    editor.setValue(event.target.result);
                    currentFileName = file.name;
                    currentFileHandle = null;
                    updateFileStatus(currentFileName);
                    editor.clearHistory();
                };
                reader.readAsText(file, 'UTF-8');
            });

            // === Electron menu event listeners ===
            if (isElectron) {
                window.electronAPI.onMenuOpen(() => openDocument());
                window.electronAPI.onMenuSave(() => saveDocument());
                window.electronAPI.onMenuSaveAs(() => saveDocumentAs());
            }

            // Dark mode toggle
            const themeToggle = document.getElementById('theme-toggle');

            themeToggle.addEventListener('click', function () {
                const isActive = this.getAttribute('data-active') === 'true';
                setDarkMode(!isActive);
            });

            // Keyboard navigation for toggle
            themeToggle.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });

            // Check for saved theme preference
            if (localStorage.getItem('darkMode') === 'enabled') {
                setDarkMode(true);
            }

            // Update preview and stats when editor changes
            editor.on('change', updatePreview);
            editor.on('cursorActivity', function () {
                updateStats(editor.getValue());
            });

            // Global keyboard shortcut for open (outside editor too)
            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                    e.preventDefault();
                    openDocument();
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                    e.preventDefault();
                    printDocument();
                }
            });

            // Handle window resize events to make the editor responsive
            window.addEventListener('resize', function () {
                editor.refresh();
            });

            // Initial update
            updatePreview();

            function initResizablePanels() {
                const appContainer = document.querySelector('.app-container');
                const divider = document.querySelector('.divider');
                const editorPanel = document.querySelector('.editor-panel');
                const previewPanel = document.querySelector('.preview-panel');

                if (!divider || !editorPanel || !previewPanel) {
                    return;
                }

                let isResizing = false;
                let startX, startWidth;

                // Load saved panel widths from localStorage
                const savedEditorWidth = localStorage.getItem('editorPanelWidth');
                const savedPreviewWidth = localStorage.getItem('previewPanelWidth');

                if (savedEditorWidth && savedPreviewWidth) {
                    document.documentElement.style.setProperty('--editor-width', savedEditorWidth);
                    document.documentElement.style.setProperty('--preview-width', savedPreviewWidth);
                }

                // Mouse down event on the divider
                divider.addEventListener('mousedown', startResize);

                // Touch start event for mobile
                divider.addEventListener('touchstart', function (e) {
                    startX = e.touches[0].clientX;
                    startWidth = editorPanel.getBoundingClientRect().width;
                    startResize(e);
                });

                function startResize(e) {
                    if (currentViewMode !== 'split') return;

                    isResizing = true;
                    if (e.type !== 'touchstart') {
                        startX = e.clientX;
                        startWidth = editorPanel.getBoundingClientRect().width;
                    }

                    // Add classes for styling during drag
                    divider.classList.add('dragging');
                    appContainer.classList.add('resizing');

                    // Prevent text selection during resize
                    document.body.style.userSelect = 'none';

                    e.preventDefault();
                }

                // Mouse move event - calculate and set new widths
                document.addEventListener('mousemove', resize);

                // Touch move event for mobile
                document.addEventListener('touchmove', function (e) {
                    if (!isResizing) return;

                    const touchX = e.touches[0].clientX;
                    doResize(touchX);
                    e.preventDefault(); // Prevent scrolling
                });

                function resize(e) {
                    if (!isResizing) return;
                    doResize(e.clientX);
                }

                function doResize(clientX) {
                    // Calculate the new width based on mouse/touch movement
                    const containerWidth = appContainer.clientWidth;
                    const newWidth = startWidth - (clientX - startX);

                    // Calculate percentages with limits
                    const editorPercent = Math.min(Math.max((newWidth / containerWidth) * 100, 20), 80);
                    const previewPercent = 100 - editorPercent;

                    // Update CSS variables
                    document.documentElement.style.setProperty('--editor-width', `${editorPercent}%`);
                    document.documentElement.style.setProperty('--preview-width', `${previewPercent}%`);

                    // Refresh CodeMirror
                    editor.refresh();
                }

                // Mouse up and touch end events - finalize resize
                function stopResize() {
                    if (!isResizing) return;

                    isResizing = false;

                    // Remove drag-related classes
                    divider.classList.remove('dragging');
                    appContainer.classList.remove('resizing');

                    // Re-enable text selection
                    document.body.style.userSelect = '';

                    // Get final widths
                    const editorWidth = getComputedStyle(document.documentElement).getPropertyValue('--editor-width');
                    const previewWidth = getComputedStyle(document.documentElement).getPropertyValue('--preview-width');

                    // Save to localStorage
                    localStorage.setItem('editorPanelWidth', editorWidth);
                    localStorage.setItem('previewPanelWidth', previewWidth);

                    // Final refresh of editor
                    editor.refresh();
                }

                document.addEventListener('mouseup', stopResize);
                document.addEventListener('touchend', stopResize);
                document.addEventListener('touchcancel', stopResize);
            }

            // Modify the existing setViewMode function to reinitialize resizable panels when needed
            const originalSetViewMode = setViewMode;
            setViewMode = function (mode) {
                // Call the original function first
                originalSetViewMode(mode);

                // If we switched to split view, make sure panels are resizable
                if (mode === 'split') {
                    // Need a small delay to ensure DOM is updated
                    setTimeout(initResizablePanels, 100);
                }
            };

            // Initialize resizable panels
            initResizablePanels();
        });
