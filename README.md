# Hebrew Markdown Editor (RTL Markdown Editor)

<img src="./images/icon.svg" alt="Hebrew Markdown Editor Logo" width="100" align="right">

A modern, feature-rich Markdown editor optimized for Hebrew (RTL) content with live preview functionality. This elegant editor combines the simplicity of Markdown with full Hebrew language support, mathematical formula rendering, and a clean Apple-inspired design.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Live demo: [dorpascal.com/hebrew-markdown](https://dorpascal.com/hebrew-markdown)

## 🌟 Features

- **Full Hebrew (RTL) Support**: Optimized for right-to-left Hebrew text editing with proper directional handling
- **Live Preview**: See your formatted content in real-time as you type
- **Multiple View Modes**: Choose between editor-only, split view, or preview-only modes
- **Theme Selection**: Multiple editor themes including Material, Dracula, Nord, Solarized, and more
- **Dark/Light Mode**: Toggle between dark and light interface modes
- **Math Expressions**: Full support for mathematical formulas using KaTeX ($E = mc^2$)
- **Code Highlighting**: Syntax highlighting for code blocks with automatic LTR orientation
- **Rich Markdown Support**:
  - Text formatting (bold, italic, strikethrough)
  - Headers (multiple levels)
  - Lists (ordered, unordered, task lists)
  - Tables
  - Links and images
  - Blockquotes
  - Code blocks
- **Modern UI**: Clean, minimal design inspired by Apple products
- **Responsive Design**: Works on desktop and mobile devices
- **Document Stats**: Word and character count tracking
- **Export**: Save your content as .md files

## 📸 Screenshots

![Light Mode](./images/light-mode.png)
![Dark Mode](./images/dark-mode.png)

## 🛠️ Technologies Used

- **[CodeMirror](https://codemirror.net/)**: Advanced text editor for the browser
- **[Marked.js](https://marked.js.org/)**: Markdown parser and compiler
- **[KaTeX](https://katex.org/)**: Fast math typesetting library for the web
- **[DOMPurify](https://github.com/cure53/DOMPurify)**: HTML sanitization library
- **[Font Awesome](https://fontawesome.com/)**: Icon library
- **[Inter Font](https://fonts.google.com/specimen/Inter)**: Modern typeface

## 📦 Installation

1. Clone the repository or download the files:

   ```bash
   git clone https://github.com/Dor-sketch/hebrew-markdown.git
   ```

2. Open `index.html` in your web browser or deploy to any web server.

No build process or dependencies installation required! Everything is loaded from CDNs.

## 🚀 Usage

1. Start typing your Markdown content in the editor panel
2. Use the toolbar buttons for common Markdown formatting
3. View the rendered output in the preview panel
4. Toggle between different view modes using the buttons in the header
5. Switch between themes or dark/light mode as preferred
6. Save your document using the save button (💾)

### Keyboard Shortcuts

- `Ctrl+B`: Bold text
- `Ctrl+I`: Italic text
- `Ctrl+K`: Insert link
- `Ctrl+S`: Save document

## 🔧 Customization

### Adding New Themes

To add a new editor theme:

1. Include the theme's CSS in the `<head>` section
2. Add the theme to the `editorThemes` object in the JavaScript
3. Add a new option in the theme dropdown HTML

### Changing Default Settings

Edit the following variables in the JavaScript:

- `currentTheme`: Default editor theme
- `isDarkMode`: Default dark/light mode
- `currentViewMode`: Default view mode
- `sampleContent`: Default content shown on first load

## 📃 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- [Dor Pascal](https://dorpascal.com) - Creator
- All the amazing open-source libraries used in this project

---

Made with ❤️ for Hebrew Markdown enthusiasts | [Report an Issue](https://github.com/Dor-sketch/hebrew-markdown/issues)
