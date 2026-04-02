<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/69b1b9a8-c1c8-4991-ba67-a51c359cd8d7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Release

To automatically update the version and generate a changelog, use the following command:

1.  **Preview changes (Dry Run)**:
    ```bash
    npm run release -- --dry-run
    ```
2.  **Commit and tag new version**:
    ```bash
    npm run release
    ```
3.  **Push to remote with tags**:
    ```bash
    git push --follow-tags origin main
    ```
