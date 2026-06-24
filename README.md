# CassetteForge — Cassette J-Card Generator

A lightweight, browser-based web application to search, customize, and print audio cassette tape J-card covers. 

Live Demo: [https://your-username.github.io/cassette-jcard-maker/](https://your-username.github.io/cassette-jcard-maker/) (Replace with your actual GitHub Pages URL)

---

## Features

- **Automated Album Search:** Powered by the MusicBrainz API to find releases by artist or album title.
- **Cover Art Fetching:** Retrieves official release artwork from the Cover Art Archive.
- **Tracklist Import:** Automatically imports the track listing for the selected release.
- **Customization Panel:**
  - **Typography:** Multiple Google Fonts, customizable font sizes, and font weights.
  - **Color Schemes:** Custom color pickers and preset themes (Midnight, Retro, Neon, Forest, Minimal, Classic).
  - **Layout Controls:** Adjust cover art placement (front, back, both, or none), text alignment, image fit modes, and spine text direction.
- **Custom Image Upload:** Use your own image as the cover art.
- **Print-Ready Output:** CSS print styles optimized for standard J-card dimensions with crop marks and fold guides.
- **High-Resolution Export:** Download your customized J-card as a 2x resolution PNG file for external printing.

---

## J-Card Dimensions

The generator matches standard J-card physical dimensions at print time:

| Panel | Width | Height |
|-------|-------|--------|
| **Back Flap** | 1 1/16 in (27 mm) | 4 in (101.6 mm) |
| **Spine** | 1/2 in (12.7 mm) | 4 in (101.6 mm) |
| **Front Cover** | 2 9/16 in (65.1 mm) | 4 in (101.6 mm) |
| **Total Unfolded** | 4 1/8 in (104.8 mm) | 4 in (101.6 mm) |

---

## Installation & Local Setup

Because this is a serverless static web application, no installation or build steps are required.

### Quick Start
1. Clone or download this repository.
2. Open `index.html` directly in your web browser.

*Note: Some browsers may block API requests via the `file://` protocol due to CORS security policies. If search does not work, run a simple local web server in the project directory.*

### Running a Local Server
Using Python:
```bash
python -m http.server 8080
```
Using Node.js (`http-server`):
```bash
npx http-server -p 8080
```
Then navigate to `http://localhost:8080` in your browser.

---

## Printing Instructions

To ensure the J-card prints at the correct physical size:

1. Click the **Print** button in the app or press `Ctrl + P`.
2. In the browser print dialog:
   - Set **Destination** to your printer or "Save as PDF".
   - Set **Layout** to **Landscape**.
   - Set **Paper Size** to Letter or A4.
   - Set **Margins** to **Default** or **None** (do not use "Fit to page" or scaling options).
   - Ensure **Scale** is set to **100%**.
   - **Crucial:** Enable the **Background graphics** option to ensure colors and images print correctly.

---

## Technologies Used

- **HTML5 & CSS3:** Semantics, custom properties, CSS Grid/Flexbox, CSS Transitions, and `@media print` styles.
- **Vanilla JavaScript:** DOM manipulation, asynchronous fetch requests, and state management.
- **[html2canvas](https://github.com/niklasvh/html2canvas):** Client-side rendering of the J-card element to a downloadable PNG.
- **[MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API):** Public database query.
- **[Cover Art Archive API](https://coverartarchive.org/):** Album artwork repository.
