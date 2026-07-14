# Contributing to Video to ASCII Converter

Thank you for your interest in contributing to the Video to ASCII Converter project! We welcome contributions of all forms, including bug fixes, feature implementations, documentation improvements, and feedback.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 1. Reporting Bugs
- Search existing issues to ensure the bug hasn't been reported.
- If you find a new bug, please open an issue using the **Bug Report** template.
- Include clear steps to reproduce the error, your environment details, and screenshots/recordings if possible.

### 2. Suggesting Features
- We love feature ideas! Search existing issues first to see if it's already being discussed.
- Open an issue using the **Feature Request** template, explaining the utility of the feature and how it should work.

### 3. Submitting Pull Requests
1. **Fork** the repository and create your branch from `main`.
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Implement your changes**. Make sure to follow the project's coding standards.
3. **Test your changes** locally to ensure the build and lint checks pass.
4. **Commit** your changes using the Conventional Commits standard (see below).
5. **Push** your branch to GitHub and open a Pull Request.

---

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. The FFmpeg WASM binaries are required locally to process video. A `postinstall` hook copies them automatically. If they are missing, run:
   ```bash
   node scripts/copy-ffmpeg-assets.mjs
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```
4. Verify files using the linter before pushing:
   ```bash
   pnpm lint
   ```

---

## Coding Guidelines

- Use **TypeScript** for all component and hook logic.
- Prefer **functional components** and React hooks.
- Follow **Tailwind CSS v4** conventions for styling.
- Keep components small, modular, and focused.
- Preserve and add comments/docstrings for complex logic.

---

## Commit Message Guidelines

We use **Conventional Commits** to maintain a clean git history and automate changelog generation. Each commit message must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types

- `feat`: A new feature for the user, not a new feature for builds or tests.
- `fix`: A bug fix for the user, not a fix to a build script.
- `docs`: Documentation changes (e.g. README.md, CONTRIBUTING.md).
- `style`: Formatting, semi-colons, white-space changes (no functional logic changes).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Update build scripts, postinstall tasks, configurations, dependency upgrades, etc.

### Example Commits

- `feat(video-converter): add custom character set selection`
- `fix(audio): handle videos with no audio tracks during export`
- `docs: update setup steps in README`
- `chore(deps): upgrade next.js version`
