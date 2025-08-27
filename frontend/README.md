# Jarvis Coder Frontend

This is the frontend for the Jarvis Coder AI IDE, built with React, Tailwind CSS, Framer Motion, and Monaco Editor.

## Features

- **Terminal-first UI:** Interact with AI and code in a seamless terminal-like environment.
- **Modern Design:** Glassmorphism, subtle gradients, smooth animations, and elegant typography.
- **Resizable Panels:** Adjust the layout of the sidebar, terminal, and code editor.
- **Theme Toggling:** Switch between dark and light themes.
- **Integrated Chat:** Real-time AI responses with syntax-highlighted code blocks.
- **Monaco Editor:** VS Code-like code editing experience with syntax highlighting.
- **Modular Structure:** Organized into `components`, `hooks`, ``utils`, and `contexts` for maintainability.

## Setup and Installation

1.  **Navigate to the `frontend` directory:**

    ```bash
    cd frontend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Chat/
│   │   │   └── ChatWindow.tsx
│   │   ├── Editor/
│   │   │   └── EditorPane.tsx
│   │   ├── Sidebar/
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       └── ThemeToggle.tsx
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useStore.ts
│   │   └── useTheme.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Next Steps

- Implement File Explorer functionality in the Sidebar.
- Implement Model Selector and API Key Manager logic.
- Integrate with the FastAPI backend for real AI responses.
- Add Framer Motion animations for a smoother UX.
- Implement additional features like command palette, project history, and toast notifications.