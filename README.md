# Video to ASCII Converter

A modern, high-performance web application that converts video files into real-time ASCII animations. Built with **Next.js**, **React 19**, **Tailwind CSS v4**, and **FFmpeg WASM**, it processes videos entirely client-side, ensuring complete privacy and offline usability.

![Video to ASCII Preview](public/preview.png) *(Optional: Replace with your actual preview image)*

## 🚀 Features

- **Client-Side Processing**: All video parsing and processing occurs inside the user's browser via FFmpeg WASM. No video data is ever sent to a server.
- **Real-Time Controls**: Adjust parameters on the fly:
  - **Character Density & Resolution**: Customize the grid density for finer or blockier details.
  - **Visual Tuning**: Tweak contrast, brightness, and character mappings.
  - **Color Modes**: Support for true-color ASCII, grayscale, and custom color presets.
- **Export Formats**:
  - **WebM Video**: Re-record the ASCII output directly into a downloadable WebM video file.
  - **Text Output**: Copy or download static ASCII frames as plain text.
  - **Colored HTML**: Export styled HTML files preserving the colored ASCII layout.
- **Asset Preloading**: Background loading and caching of FFmpeg WASM binaries to ensure quick load times on subsequent uses.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Styling**: React 19, Tailwind CSS v4, Radix UI, Shadcn, Lucide React
- **Video Decoding**: `@ffmpeg/ffmpeg` (v0.12.10) & `@ffmpeg/core` (WASM binaries)
- **State Management & Hooks**: Custom React hooks for frame extraction, ASCII conversion, and recording.

## 📦 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended) and `pnpm` as the package manager.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/caeher/video-to-ascii.git
   cd video-to-ascii
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```
   > [!NOTE]
   > The `postinstall` script automatically runs `node scripts/copy-ffmpeg-assets.mjs` to copy the FFmpeg WASM binaries into `public/ffmpeg/` for local serving.

### Running Locally

To start the development server:
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

To create a production build:
```bash
pnpm build
pnpm start
```

## 📂 Project Structure

```
├── app/                  # Next.js App Router entry points & global styles
├── components/           # Reusable UI components (buttons, dialogs, etc.)
├── features/
│   └── video-converter/  # Main feature directory
│       ├── components/   # Dropzone, ASCII viewer, Export controls, Converter controls
│       ├── hooks/        # hooks for ASCII exporting and FFmpeg loading/preloading
│       ├── utils/        # FFmpeg encoder, WebM recorder, and loaders
│       └── types.ts      # Shared type definitions
├── public/               # Static assets (including ffmpeg WASM binaries)
└── scripts/              # Build & dependency copy scripts
```

## 🤝 Contributing

Contributions are welcome! Please check our [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
