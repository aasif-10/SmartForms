<div align="center">
  
  # SmartForms

  **A privacy-first, intelligent browser extension that remembers what you type so you never have to fill the same form twice.**
  
</div>

---

## Overview

**SmartForms** is a modern, production-grade Chrome Extension designed to take the friction out of repetitive form-filling. Originally engineered to conquer the heavily obfuscated DOM of Google Forms, it uses a lightweight heuristics engine to identify form fields, save your inputs locally, and elegantly suggest them the next time you encounter a similar field.

## Features

- **Intelligent Field Classification:** Uses a 5-tier cascading classification engine (Exact Match → Alias → Metadata → Fuzzy Overlap → Custom User Mapping) to understand what a form field is actually asking for, even if the underlying HTML is obfuscated.
- **100% Privacy-First:** Your data is your own. All form data is stored offline using `chrome.storage.local`. **Zero** external network requests are made, and **zero** data is sent to the cloud.
- **Isolated, Premium UI:** Built using Shadow DOM encapsulation. The suggestion chips and save dialogs are beautifully styled and completely immune to the host website's CSS, ensuring they always look perfect.
- **Trusted Types Compatible:** Carefully engineered using manual DOM node creation to avoid `innerHTML` assignments, preventing `Illegal invocation` crashes on highly secure websites like Google properties.
- **Keyboard Accessible:** Fully supports keyboard navigation. Tab, arrow keys, and Enter/Escape work seamlessly to accept or dismiss suggestions without reaching for the mouse.

## Installation (Developer Mode)

Since this extension is currently in development, you can install it manually in Chrome:

1. Clone this repository:
   ```bash
   git clone https://github.com/aasif-10/SmartForms.git
   ```
2. Navigate to the project directory and install dependencies:
   ```bash
   cd SmartForms
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Enable **Developer mode** using the toggle in the top right corner.
6. Click **Load unpacked** and select the `dist` folder generated inside the project directory.

## Architecture & Tech Stack

- **Framework:** [React 18](https://reactjs.org/) (Popup & Options pages)
- **Build Tool:** [Vite](https://vitejs.dev/) & Rollup (Lightning-fast HMR and optimized chunking)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Encapsulated in Shadow DOM for content scripts)
- **Manifest:** MV3 (Manifest Version 3)

### Core Components
- **`field-detector.ts`**: Scans the DOM for inputs, textareas, and content-editable elements, extracting contextual metadata (labels, aria-labels, neighboring text).
- **`field-classifier.ts`**: Scores the metadata against a predefined taxonomy to determine the semantic meaning of a field (e.g., matching "Given Name" to `first_name`).
- **`autofill.ts`**: The main engine handling focus/blur events and safely injecting values into the DOM using native property setters to trigger React/Angular event listeners.

## Contributing

Contributions, issues, and feature requests are welcome. 
Please check the [issues page](https://github.com/aasif-10/SmartForms/issues) and read our [Contributing Guidelines](CONTRIBUTING.md) if you would like to contribute.

## License

Distributed under the MIT License. See `LICENSE` for more information.