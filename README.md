# Upstage DocuParse (MVP)

A professional Document AI tool designed to digitize, extract, and verify data from complex documents (including **Korean HWP/HWPX**, PDF, and Images). This application demonstrates the full capabilities of the **Upstage Document Parse API** and **Solar LLM**.

## 🌟 Key Features

*   **Format Agnostic Parsing**: Excellent support for Korean HWP, HWPX, as well as PDF and standard images.
*   **Circular HITL Workflow**: 
    *   Parse once, extract multiple times.
    *   Seamlessly jump between Schema editing and Verification without re-uploading.
*   **Schema Library**: Save and load extraction schemas (e.g., "Invoice", "KC Safety") locally to automate repetitive tasks.
*   **Unified Verification UI (New)**:
    *   **One-Stop Checklist**: Edit extracted data and view document assets (Tables, Equations, Figures) in a single scrollable list.
    *   **Visual Grounding**: Clicking any item automatically highlights its location in the document preview.
    *   **Equation Support**: Full LaTeX rendering for mathematical formulas using MathJax.
    *   **Confidence Indicators**: visual warning flags for low-confidence extractions.

## 🚀 Getting Started

### Prerequisites
*   **Node.js**: v18 or higher (Recommended v20+)
*   **API Key**: An [Upstage AI Console](https://console.upstage.ai/) API Key.

### Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/upstage-docuparse-adv.-mvp.git
    cd upstage-docuparse-adv.-mvp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure API Key**:
    *   You can set the `DEFAULT_API_KEY` in `src/constants.ts` (not recommended for production).
    *   **Best Practice**: Use the Settings modal in the UI to input your key securely during runtime.

4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    *   The app will open at `http://localhost:3000`.

### Requirements
*   **System**: Windows, macOS, or Linux
*   **Browser**: Chrome (recommended), Edge, Firefox, Safari
*   **Network**: Allow outbound traffic to `api.upstage.ai` (proxied via Vite)

## 🛠️ Usage Guide

### Step 1: Parsing
1.  Click **Settings** (top right) to enter your Upstage API Key.
2.  Upload a file (e.g., `.hwp`, `.pdf`).
3.  Click **Run Parsing**. 
    *   *Note*: This converts the document into machine-readable HTML and extracts assets (tables/images/equations).

### Step 2: Schema Definition
1.  Define *what* you want to extract.
2.  **Options**:
    *   **Auto-Generate**: Let AI guess the schema based on the file.
    *   **Load Preset**: Use the dropdown to load saved schemas.
    *   **Visual/Code Editor**: Manually tweak fields.
3.  Click **Run Extraction**.

### Step 3: Verification (HITL)
1.  **Review Data**: The right panel lists all extracted information.
2.  **Check Assets**: Scroll down in the right panel to see "Detected Assets" (Tables, Figures) found in the document.
3.  **Edit & Correct**: Click any value to edit it. If the schema is wrong (e.g., missing fields), click "Re-configure Schema" to go back.
4.  **Grounding**: Click an item to see where it comes from in the Left Preview panel.

### Step 4: Export
1.  Download the verified data as **JSON** or **CSV**.

## 🧩 Configuration

Default settings can be modified in `src/constants.ts`:
*   `DEFAULT_API_KEY`: (For demo purposes only).
*   `PRESET_SCHEMAS`: Default JSON schemas provided in the library.

## 📄 License
This project is an MVP demonstration for Upstage AI integration.
