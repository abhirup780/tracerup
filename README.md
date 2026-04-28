# ABIF Trace Viewer 🧬

A powerful, web-based viewer for AB1 Sanger Sequencing trace files. This application allows researchers and bioinformaticians to easily visualize electropherograms, navigate sequence tracks, identify heterozygous base calls, and seamlessly apply reverse complement transformations directly in the browser. 

Built with modern web technologies, it’s lightning-fast, fully responsive, and offers an intuitive visual interface specifically designed for complex genomic data visualization.

---

## 🌟 Features

*   **Interactive Electropherogram Visualization:** Zoom, pan, and hover over individual signal peaks powered by Plotly.
*   **Intelligent Sequence Track:** Clear color-coding for nucleobases (`A`, `T`, `C`, `G`) and distinct visualization for heterozygous or ambiguous calls (e.g., `Y`, `R`, `W`, `M`, etc.).
*   **Reverse Complement Automation:** One-click toggle to invert sequence directions and translate the bases mapping instantaneously.
*   **Full-Box Adaptive Layout:** Perfectly aligned sequencing tracks across screens of all sizes, automatically wrapping at correct genomic index ranges without layout clipping.
*   **Search and Navigate:** Find specific sequences quickly with the built-in search functionality. 
*   **Dark Mode Optimization:** Reduced eye strain for prolonged use in dark mode environments.

## 🛠️ Built With

*   [React 19](https://react.dev/) - Core UI framework
*   [Vite](https://vitejs.dev/) - Frontend tooling and bundler
*   [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first styling methodology
*   [Plotly.js](https://plotly.com/javascript/) - High-performance complex signal charts
*   [Lucide React](https://lucide.dev/) - Polished icons 
*   [TypeScript](https://www.typescriptlang.org/) - For rock-solid static typing

## 🚀 Deployment

While this project can be prototyped natively on Google AI Studio, it is built on a standard modern Node/Vite stack allowing easy deployment to standard cloud providers.

### 1. Vercel (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log into [Vercel](https://vercel.com) and click **Add New** -> **Project**.
3. Import your Git repository.
4. Vercel will automatically detect `Vite`.
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**.

### 2. Netlify
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log into [Netlify](https://netlify.com) and click **Add new site** -> **Import an existing project**.
3. Connect your Git provider and select this repository.
4. Configure your build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**.

### 3. GitHub Pages
If you prefer static hosting directly via GitHub:
1. Open `vite.config.ts` and set your base path: `base: '/your-repo-name/'`.
2. Push your code.
3. You can either deploy via standard `gh-pages` branch deployment, or leverage [GitHub Actions](https://pages.github.com/) to build your Vite app and deploy standard static assets directly online.

## 💻 Running Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later)
* npm, yarn, or pnpm

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd abif-trace-viewer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

4. **Build for Production**
   ```bash
   npm run build
   # Outputs static assets to the `/dist` directory
   ```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## ⚖️ License
This project is open-source and available under the MIT License.
