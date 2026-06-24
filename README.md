# cassette-jcard-maker
Free cassette J-card insert generator featuring MusicBrainz album search, live interactive preview, typography and color customization, and print-ready layouts.
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
