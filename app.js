/**
 * CassetteForge — Cassette Tape J-Card Cover Art Generator
 *
 * Integrates MusicBrainz + Cover Art Archive APIs to let users search for
 * albums, fetch cover art and track listings, customise typography / colours /
 * layout, then print or export a production-ready J-card.
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLICATION STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const state = {
    selectedRelease: null,
    coverArtUrl: null,
    customImageUrl: null,
    previewScale: 1.5,
    settings: {
      fontFamily: 'Inter',
      titleSize: 14,
      artistSize: 11,
      trackSize: 7,
      fontWeight: '400',
      bgColor: '#1a1a2e',
      textColor: '#e0e0e0',
      accentColor: '#e94560',
      coverPosition: 'front',
      textAlign: 'center',
      spineDirection: 'btl',
      coverFit: 'cover',
      artistName: '',
      albumTitle: '',
      year: '',
      trackList: '',
      notes: '',
      spineCustom: ''
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME PRESETS
  // ═══════════════════════════════════════════════════════════════════════════

  const themes = {
    classic:  { bgColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#333333' },
    midnight: { bgColor: '#1a1a2e', textColor: '#e0e0e0', accentColor: '#e94560' },
    retro:    { bgColor: '#f4e8c1', textColor: '#5c3d2e', accentColor: '#c4722f' },
    neon:     { bgColor: '#0a0a0a', textColor: '#00ff88', accentColor: '#ff00ff' },
    minimal:  { bgColor: '#f5f5f5', textColor: '#666666', accentColor: '#999999' },
    forest:   { bgColor: '#1a2e1a', textColor: '#c8e6c9', accentColor: '#66bb6a' }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM ELEMENT CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  /** @type {Record<string, HTMLElement>} */
  const el = {};

  /**
   * Populate the element cache. Called once on DOMContentLoaded.
   */
  function cacheElements() {
    const ids = [
      // Search
      'searchOverlay', 'searchInput', 'searchBtn', 'searchStatus', 'searchResults',
      // Editor chrome
      'editor', 'editorTitle', 'backToSearch', 'printBtn', 'exportBtn',
      // Sidebars — design controls
      'fontFamily', 'titleSize', 'artistSize', 'trackSize', 'fontWeight',
      'titleSizeVal', 'artistSizeVal', 'trackSizeVal',
      'themePreset', 'bgColor', 'textColor', 'accentColor',
      'coverPosition', 'textAlign', 'spineDirection', 'coverFit',
      'customImage', 'resetImage',
      // Sidebars — text content
      'artistName', 'albumTitle', 'yearInput', 'trackListInput', 'notesInput', 'spineCustom',
      // Preview
      'previewArea', 'previewContainer', 'jcard',
      'jcardFront', 'jcardSpine', 'jcardBack',
      'frontArt', 'frontTitleDisplay', 'frontArtistDisplay', 'frontYearDisplay',
      'spineText', 'backArt', 'trackListDisplay', 'backNotesDisplay',
      // Zoom
      'zoomIn', 'zoomOut', 'zoomFit', 'zoomLevel',
      // Print
      'printArea'
    ];

    ids.forEach((id) => {
      el[id] = document.getElementById(id);
      if (!el[id]) {
        console.warn(`[CassetteForge] Element #${id} not found in the DOM.`);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a debounced version of `fn`.
   * @param {Function} fn - The function to debounce.
   * @param {number} ms - Delay in milliseconds.
   * @returns {Function}
   */
  function debounce(fn, ms) {
    let timerId = null;
    return function (...args) {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /**
   * Darken or lighten a hex colour by a fixed amount.
   * Positive `amount` lightens; negative darkens.
   * @param {string} hex - 7-char hex colour (e.g. '#1a1a2e').
   * @param {number} amount - Shift per channel (−255 … 255).
   * @returns {string} Adjusted hex colour.
   */
  function adjustColor(hex, amount) {
    let colour = hex.replace('#', '');
    if (colour.length === 3) {
      colour = colour.split('').map((c) => c + c).join('');
    }
    const num = parseInt(colour, 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Determine whether a colour is visually "light" based on relative luminance.
   * @param {string} hex - 7-char hex colour.
   * @returns {boolean}
   */
  function isLight(hex) {
    const colour = hex.replace('#', '');
    const r = parseInt(colour.substring(0, 2), 16);
    const g = parseInt(colour.substring(2, 4), 16);
    const b = parseInt(colour.substring(4, 6), 16);
    // Perceived brightness (ITU-R BT.601)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

  /**
   * Slugify a string for use in filenames.
   * @param {string} str
   * @returns {string}
   */
  function slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUSICBRAINZ / COVER ART ARCHIVE API
  // ═══════════════════════════════════════════════════════════════════════════

  const API_MB = 'https://musicbrainz.org/ws/2';
  const API_CAA = 'https://coverartarchive.org';

  /**
   * Search MusicBrainz for releases matching `query`.
   * @param {string} query
   * @returns {Promise<Object[]>} Array of release objects.
   */
  async function searchReleases(query) {
    const url = `${API_MB}/release?query=${encodeURIComponent(query)}&fmt=json&limit=24`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`MusicBrainz search failed (${res.status})`);
    }
    const data = await res.json();
    return data.releases || [];
  }

  /**
   * Fetch the full-resolution front cover art URL for a release.
   * Returns the final (redirected) URL, or null if unavailable.
   * @param {string} mbid
   * @returns {Promise<string|null>}
   */
  async function fetchCoverArt(mbid) {
    try {
      const res = await fetch(`${API_CAA}/release/${mbid}/front`, {
        redirect: 'follow'
      });
      if (!res.ok) return null;
      // The browser will have followed the redirect; the final URL is in res.url
      return res.url;
    } catch {
      return null;
    }
  }

  /**
   * Fetch the track listing for a MusicBrainz release.
   * @param {string} mbid
   * @returns {Promise<string>} Numbered track list string.
   */
  async function fetchTrackList(mbid) {
    const url = `${API_MB}/release/${mbid}?inc=recordings&fmt=json`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return '';
    const data = await res.json();
    const media = data.media;
    if (!media || media.length === 0) return '';

    // Concatenate tracks from all media (sides A, B, etc.)
    const lines = [];
    let num = 1;
    media.forEach((medium) => {
      if (medium.tracks) {
        medium.tracks.forEach((track) => {
          lines.push(`${num}. ${track.title}`);
          num++;
        });
      }
    });
    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH UI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a MusicBrainz search and render results.
   */
  async function performSearch() {
    const query = el.searchInput.value.trim();
    if (!query) {
      el.searchStatus.textContent = 'Please enter an artist or album name.';
      return;
    }

    el.searchStatus.innerHTML = '<span class="loading-spinner"></span> Searching MusicBrainz…';
    el.searchResults.innerHTML = '';

    try {
      const releases = await searchReleases(query);

      if (releases.length === 0) {
        el.searchStatus.textContent = 'No results found. Try a different search term.';
        return;
      }

      el.searchStatus.textContent = `Found ${releases.length} release${releases.length !== 1 ? 's' : ''}.`;
      renderSearchResults(releases);
    } catch (err) {
      console.error('[CassetteForge] Search error:', err);
      el.searchStatus.textContent = `Search failed: ${err.message}. Please try again.`;
    }
  }

  /**
   * Build and insert result cards into #searchResults.
   * Uses event delegation — a single click handler on the container.
   * @param {Object[]} releases
   */
  function renderSearchResults(releases) {
    el.searchResults.innerHTML = '';

    releases.forEach((release) => {
      const mbid = release.id;
      const title = release.title || 'Unknown Title';
      const artist =
        release['artist-credit'] && release['artist-credit'].length > 0
          ? release['artist-credit'].map((ac) => ac.name).join(', ')
          : 'Unknown Artist';
      const year = release.date ? release.date.substring(0, 4) : '—';

      const card = document.createElement('div');
      card.className = 'result-card';
      card.dataset.mbid = mbid;
      card.dataset.title = title;
      card.dataset.artist = artist;
      card.dataset.year = year;

      // Thumbnail
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'result-thumb';

      const img = document.createElement('img');
      img.src = `${API_CAA}/release/${mbid}/front-250`;
      img.alt = `${title} cover art`;
      img.loading = 'lazy';
      img.onerror = function () {
        // Replace broken image with a gradient placeholder
        this.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'thumb-placeholder';
        placeholder.textContent = '🎵';
        thumbWrap.appendChild(placeholder);
      };
      thumbWrap.appendChild(img);

      // Text info
      const info = document.createElement('div');
      info.className = 'result-info';
      info.innerHTML = `
        <div class="result-title">${escapeHtml(title)}</div>
        <div class="result-artist">${escapeHtml(artist)}</div>
        <div class="result-year">${escapeHtml(year)}</div>
      `;

      card.appendChild(thumbWrap);
      card.appendChild(info);
      el.searchResults.appendChild(card);
    });
  }

  /**
   * Escape HTML entities for safe insertion into innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle a release card click. Fetches cover art + tracks, then enters editor.
   * @param {string} mbid
   * @param {string} title
   * @param {string} artist
   * @param {string} year
   */
  async function selectRelease(mbid, title, artist, year) {
    // Show loading feedback
    el.searchStatus.innerHTML = '<span class="loading-spinner"></span> Loading release details…';

    try {
      // Store basic release info immediately
      state.selectedRelease = { id: mbid, title, artist, year };
      state.settings.artistName = artist;
      state.settings.albumTitle = title;
      state.settings.year = year;
      state.settings.spineCustom = '';

      // Fetch cover art and tracks in parallel
      const [coverUrl, trackList] = await Promise.all([
        fetchCoverArt(mbid),
        fetchTrackList(mbid)
      ]);

      state.coverArtUrl = coverUrl;
      state.customImageUrl = null;
      state.settings.trackList = trackList;
      state.settings.notes = '';

      // Populate form fields
      populateEditorFields();

      // Transition from search to editor
      el.searchOverlay.classList.remove('active');
      el.searchOverlay.classList.add('hidden');
      el.editor.classList.remove('hidden');

      // Update editor title
      el.editorTitle.textContent = `${artist} — ${title}`;

      // Render the preview
      updatePreview();
    } catch (err) {
      console.error('[CassetteForge] Release selection error:', err);
      el.searchStatus.textContent = `Failed to load release: ${err.message}`;
    }
  }

  /**
   * Populate all editor form fields from the current state.
   */
  function populateEditorFields() {
    const s = state.settings;

    el.artistName.value = s.artistName;
    el.albumTitle.value = s.albumTitle;
    el.yearInput.value = s.year;
    el.trackListInput.value = s.trackList;
    el.notesInput.value = s.notes;
    el.spineCustom.value = s.spineCustom;

    el.fontFamily.value = s.fontFamily;
    el.titleSize.value = s.titleSize;
    el.artistSize.value = s.artistSize;
    el.trackSize.value = s.trackSize;
    el.fontWeight.value = s.fontWeight;

    el.bgColor.value = s.bgColor;
    el.textColor.value = s.textColor;
    el.accentColor.value = s.accentColor;

    el.coverPosition.value = s.coverPosition;
    el.textAlign.value = s.textAlign;
    el.spineDirection.value = s.spineDirection;
    el.coverFit.value = s.coverFit;

    // Range value displays
    el.titleSizeVal.textContent = `${s.titleSize}pt`;
    el.artistSizeVal.textContent = `${s.artistSize}pt`;
    el.trackSizeVal.textContent = `${s.trackSize}pt`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // J-CARD PREVIEW RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply ALL current state settings to the J-card DOM elements.
   * This is the single source of truth for the preview's visual appearance.
   */
  function updatePreview() {
    const s = state.settings;
    const artUrl = state.customImageUrl || state.coverArtUrl;

    // ── Compute shared styles ──────────────────────────────────────────────
    const spineColor = isLight(s.bgColor)
      ? adjustColor(s.bgColor, -15)
      : adjustColor(s.bgColor, 15);

    // Determine the object-fit value; 'stretch' maps to CSS 'fill'
    const objectFit = s.coverFit === 'stretch' ? 'fill' : s.coverFit;

    // ── Front Panel ────────────────────────────────────────────────────────
    el.jcardFront.style.backgroundColor = s.bgColor;
    el.jcardFront.style.color = s.textColor;
    el.jcardFront.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.jcardFront.style.fontWeight = s.fontWeight;
    el.jcardFront.style.textAlign = s.textAlign;

    // Front cover art
    const showFrontArt = (s.coverPosition === 'front' || s.coverPosition === 'both') && artUrl;
    renderArtImage(el.frontArt, showFrontArt ? artUrl : null, objectFit);

    // Front text
    el.frontTitleDisplay.textContent = s.albumTitle;
    el.frontTitleDisplay.style.fontSize = `${s.titleSize}pt`;
    el.frontTitleDisplay.style.color = s.textColor;
    el.frontTitleDisplay.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.frontTitleDisplay.style.fontWeight = s.fontWeight;

    el.frontArtistDisplay.textContent = s.artistName;
    el.frontArtistDisplay.style.fontSize = `${s.artistSize}pt`;
    el.frontArtistDisplay.style.color = s.accentColor;
    el.frontArtistDisplay.style.fontFamily = `'${s.fontFamily}', sans-serif`;

    el.frontYearDisplay.textContent = s.year;
    el.frontYearDisplay.style.fontSize = `${Math.max(6, s.artistSize - 2)}pt`;
    el.frontYearDisplay.style.color = s.textColor;
    el.frontYearDisplay.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.frontYearDisplay.style.opacity = '0.7';

    // ── Spine ──────────────────────────────────────────────────────────────
    el.jcardSpine.style.backgroundColor = spineColor;
    el.jcardSpine.style.fontFamily = `'${s.fontFamily}', sans-serif`;

    const spineContent = s.spineCustom.trim()
      ? s.spineCustom
      : `${s.artistName.toUpperCase()} — ${s.albumTitle.toUpperCase()}`;
    el.spineText.textContent = spineContent;
    el.spineText.style.color = s.accentColor;
    el.spineText.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.spineText.style.fontWeight = s.fontWeight;

    // Spine direction classes
    el.jcardSpine.classList.remove('spine-btl', 'spine-ttb', 'spine-horizontal');
    el.jcardSpine.classList.add(`spine-${s.spineDirection}`);

    // ── Back Flap ──────────────────────────────────────────────────────────
    el.jcardBack.style.backgroundColor = s.bgColor;
    el.jcardBack.style.color = s.textColor;
    el.jcardBack.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.jcardBack.style.fontWeight = s.fontWeight;
    el.jcardBack.style.textAlign = s.textAlign;

    // Back cover art
    const showBackArt = (s.coverPosition === 'back' || s.coverPosition === 'both') && artUrl;
    renderArtImage(el.backArt, showBackArt ? artUrl : null, objectFit);

    // Track listing (preserve newlines as HTML)
    el.trackListDisplay.innerHTML = escapeHtml(s.trackList).replace(/\n/g, '<br>');
    el.trackListDisplay.style.fontSize = `${s.trackSize}pt`;
    el.trackListDisplay.style.color = s.textColor;
    el.trackListDisplay.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.trackListDisplay.style.textAlign = s.textAlign;

    // Notes
    el.backNotesDisplay.innerHTML = escapeHtml(s.notes).replace(/\n/g, '<br>');
    el.backNotesDisplay.style.fontSize = `${Math.max(5, s.trackSize - 1)}pt`;
    el.backNotesDisplay.style.color = s.textColor;
    el.backNotesDisplay.style.fontFamily = `'${s.fontFamily}', sans-serif`;
    el.backNotesDisplay.style.opacity = '0.75';
    el.backNotesDisplay.style.textAlign = s.textAlign;

    // ── Scale ──────────────────────────────────────────────────────────────
    el.jcard.style.transform = `scale(${state.previewScale})`;
    el.zoomLevel.textContent = `${Math.round(state.previewScale * 100)}%`;
  }

  /**
   * Create or update an <img> inside a container element for cover art display.
   * If `url` is null, clear the container.
   * @param {HTMLElement} container
   * @param {string|null} url
   * @param {string} objectFit - CSS object-fit value.
   */
  function renderArtImage(container, url, objectFit) {
    if (!url) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = '';

    let img = container.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.crossOrigin = 'anonymous'; // Required for html2canvas
      img.alt = 'Cover art';
      container.innerHTML = '';
      container.appendChild(img);
    }

    // Only update src if it actually changed to avoid unnecessary reloads
    if (img.src !== url) {
      img.src = url;
    }
    img.style.objectFit = objectFit;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME PRESETS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply a named theme preset, or do nothing for 'custom'.
   * @param {string} name
   */
  function applyTheme(name) {
    if (name === 'custom' || !themes[name]) return;

    const theme = themes[name];
    state.settings.bgColor = theme.bgColor;
    state.settings.textColor = theme.textColor;
    state.settings.accentColor = theme.accentColor;

    // Sync colour picker inputs
    el.bgColor.value = theme.bgColor;
    el.textColor.value = theme.textColor;
    el.accentColor.value = theme.accentColor;

    updatePreview();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMISATION CONTROL BINDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bind all sidebar control event listeners.
   */
  function bindControls() {
    // ── Typography ─────────────────────────────────────────────────────────

    el.fontFamily.addEventListener('change', () => {
      state.settings.fontFamily = el.fontFamily.value;
      updatePreview();
    });

    el.fontWeight.addEventListener('change', () => {
      state.settings.fontWeight = el.fontWeight.value;
      updatePreview();
    });

    // Range sliders
    bindRange(el.titleSize, 'titleSize', el.titleSizeVal, 'pt');
    bindRange(el.artistSize, 'artistSize', el.artistSizeVal, 'pt');
    bindRange(el.trackSize, 'trackSize', el.trackSizeVal, 'pt');

    // ── Colours ────────────────────────────────────────────────────────────

    el.themePreset.addEventListener('change', () => {
      applyTheme(el.themePreset.value);
    });

    // Each colour picker sets preset to 'custom'
    bindColorInput(el.bgColor, 'bgColor');
    bindColorInput(el.textColor, 'textColor');
    bindColorInput(el.accentColor, 'accentColor');

    // ── Layout ─────────────────────────────────────────────────────────────

    el.coverPosition.addEventListener('change', () => {
      state.settings.coverPosition = el.coverPosition.value;
      updatePreview();
    });

    el.textAlign.addEventListener('change', () => {
      state.settings.textAlign = el.textAlign.value;
      updatePreview();
    });

    el.spineDirection.addEventListener('change', () => {
      state.settings.spineDirection = el.spineDirection.value;
      updatePreview();
    });

    el.coverFit.addEventListener('change', () => {
      state.settings.coverFit = el.coverFit.value;
      updatePreview();
    });

    // ── Text content (debounced) ───────────────────────────────────────────

    const debouncedUpdate = debounce(updatePreview, 150);

    el.artistName.addEventListener('input', () => {
      state.settings.artistName = el.artistName.value;
      debouncedUpdate();
    });

    el.albumTitle.addEventListener('input', () => {
      state.settings.albumTitle = el.albumTitle.value;
      debouncedUpdate();
    });

    el.yearInput.addEventListener('input', () => {
      state.settings.year = el.yearInput.value;
      debouncedUpdate();
    });

    el.trackListInput.addEventListener('input', () => {
      state.settings.trackList = el.trackListInput.value;
      debouncedUpdate();
    });

    el.notesInput.addEventListener('input', () => {
      state.settings.notes = el.notesInput.value;
      debouncedUpdate();
    });

    el.spineCustom.addEventListener('input', () => {
      state.settings.spineCustom = el.spineCustom.value;
      debouncedUpdate();
    });

    // ── Image upload ───────────────────────────────────────────────────────

    el.customImage.addEventListener('change', handleImageUpload);
    el.resetImage.addEventListener('click', () => {
      state.customImageUrl = null;
      el.customImage.value = ''; // Reset the file input
      updatePreview();
    });
  }

  /**
   * Bind a range input to a state property and its value display.
   * @param {HTMLInputElement} input
   * @param {string} stateKey
   * @param {HTMLElement} display
   * @param {string} unit
   */
  function bindRange(input, stateKey, display, unit) {
    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      state.settings[stateKey] = val;
      display.textContent = `${val}${unit}`;
      updatePreview();
    });
  }

  /**
   * Bind a colour picker to a state property and switch theme to 'custom'.
   * @param {HTMLInputElement} input
   * @param {string} stateKey
   */
  function bindColorInput(input, stateKey) {
    input.addEventListener('input', () => {
      state.settings[stateKey] = input.value;
      el.themePreset.value = 'custom';
      updatePreview();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle a custom image file upload.
   * @param {Event} event
   */
  function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      state.customImageUrl = e.target.result;
      updatePreview();
    };
    reader.onerror = () => {
      alert('Failed to read the image file. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZOOM CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3.0;
  const ZOOM_STEP = 0.25;

  function bindZoomControls() {
    el.zoomIn.addEventListener('click', () => {
      state.previewScale = Math.min(ZOOM_MAX, +(state.previewScale + ZOOM_STEP).toFixed(2));
      updatePreview();
    });

    el.zoomOut.addEventListener('click', () => {
      state.previewScale = Math.max(ZOOM_MIN, +(state.previewScale - ZOOM_STEP).toFixed(2));
      updatePreview();
    });

    el.zoomFit.addEventListener('click', () => {
      // Calculate scale to fit the preview area
      const area = el.previewArea;
      const card = el.jcard;

      if (!area || !card) return;

      // Temporarily reset scale to measure natural dimensions
      card.style.transform = 'scale(1)';
      const cardRect = card.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();

      // Leave some padding (40px each side)
      const padding = 80;
      const scaleX = (areaRect.width - padding) / cardRect.width;
      const scaleY = (areaRect.height - padding) / cardRect.height;
      const fitScale = Math.min(scaleX, scaleY);

      // Clamp to valid range
      state.previewScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +fitScale.toFixed(2)));
      updatePreview();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRINT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clone the J-card, add crop marks, place in #printArea, and trigger print.
   */
  function handlePrint() {
    const printArea = el.printArea;
    printArea.innerHTML = '';

    // Clone the J-card element
    const clone = el.jcard.cloneNode(true);

    // Remove transforms and ensure exact dimensions
    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.margin = '0';
    clone.style.position = 'relative';

    // Wrap in a page container with crop marks
    const page = document.createElement('div');
    page.className = 'print-page';
    page.style.position = 'relative';
    page.style.display = 'inline-block';
    page.style.padding = '20px';

    // Add crop marks at the four corners of the J-card
    const cropLength = 15; // px
    const cropStyle = '1px solid #000';

    /**
     * Create a crop mark line element.
     * @param {Object} styles - CSS styles for the mark.
     * @returns {HTMLElement}
     */
    function createCropMark(styles) {
      const mark = document.createElement('div');
      mark.style.position = 'absolute';
      mark.style.zIndex = '100';
      Object.assign(mark.style, styles);
      return mark;
    }

    // Top-left corner
    page.appendChild(createCropMark({
      top: '5px', left: '20px',
      width: `${cropLength}px`, height: '0',
      borderTop: cropStyle
    }));
    page.appendChild(createCropMark({
      top: '20px', left: '5px',
      width: '0', height: `${cropLength}px`,
      borderLeft: cropStyle
    }));

    // Top-right corner
    page.appendChild(createCropMark({
      top: '5px', right: '20px',
      width: `${cropLength}px`, height: '0',
      borderTop: cropStyle
    }));
    page.appendChild(createCropMark({
      top: '20px', right: '5px',
      width: '0', height: `${cropLength}px`,
      borderRight: cropStyle
    }));

    // Bottom-left corner
    page.appendChild(createCropMark({
      bottom: '5px', left: '20px',
      width: `${cropLength}px`, height: '0',
      borderBottom: cropStyle
    }));
    page.appendChild(createCropMark({
      bottom: '20px', left: '5px',
      width: '0', height: `${cropLength}px`,
      borderLeft: cropStyle
    }));

    // Bottom-right corner
    page.appendChild(createCropMark({
      bottom: '5px', right: '20px',
      width: `${cropLength}px`, height: '0',
      borderBottom: cropStyle
    }));
    page.appendChild(createCropMark({
      bottom: '20px', right: '5px',
      width: '0', height: `${cropLength}px`,
      borderRight: cropStyle
    }));

    page.appendChild(clone);
    printArea.appendChild(page);

    // Use requestAnimationFrame to let the DOM update before printing
    requestAnimationFrame(() => {
      window.print();

      // Clean up after the print dialog closes
      // Use a small timeout since window.print() blocks on some browsers
      setTimeout(() => {
        printArea.innerHTML = '';
      }, 500);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT PNG
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Use html2canvas to render the J-card at 2× resolution and download as PNG.
   */
  async function handleExport() {
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas is still loading. Please try again in a moment.');
      return;
    }

    const card = el.jcard;

    // Store original transform so we can restore it after capture
    const originalTransform = card.style.transform;

    try {
      // Remove the scale transform for accurate capture
      card.style.transform = 'none';

      // Wait a frame for the DOM to settle
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(card, {
        scale: 2,                   // 2× resolution for crisp output
        useCORS: true,              // Allow cross-origin images
        allowTaint: false,
        backgroundColor: null,      // Transparent outside the card
        logging: false
      });

      // Convert canvas to a downloadable PNG
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to generate PNG. Please try again.');
          return;
        }

        const artist = slugify(state.settings.artistName || 'artist');
        const album = slugify(state.settings.albumTitle || 'album');
        const filename = `${artist}-${album}-jcard.png`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 'image/png');
    } catch (err) {
      console.error('[CassetteForge] Export error:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      // Always restore the original transform
      card.style.transform = originalTransform;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BACK TO SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Return from editor to the search overlay, clearing state.
   */
  function handleBackToSearch() {
    // Hide editor, show search overlay
    el.editor.classList.add('hidden');
    el.searchOverlay.classList.remove('hidden');
    el.searchOverlay.classList.add('active');

    // Reset state
    state.selectedRelease = null;
    state.coverArtUrl = null;
    state.customImageUrl = null;
    state.previewScale = 1.5;
    state.settings = {
      fontFamily: 'Inter',
      titleSize: 14,
      artistSize: 11,
      trackSize: 7,
      fontWeight: '400',
      bgColor: '#1a1a2e',
      textColor: '#e0e0e0',
      accentColor: '#e94560',
      coverPosition: 'front',
      textAlign: 'center',
      spineDirection: 'btl',
      coverFit: 'cover',
      artistName: '',
      albumTitle: '',
      year: '',
      trackList: '',
      notes: '',
      spineCustom: ''
    };

    // Clear search results (keep previous query text for convenience)
    el.searchStatus.textContent = '';
    el.searchResults.innerHTML = '';

    // Focus the search input
    el.searchInput.focus();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════════════════

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+P — trigger custom print (prevent default browser print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        // Only intercept when in the editor
        if (!el.editor.classList.contains('hidden')) {
          e.preventDefault();
          handlePrint();
        }
      }

      // Escape — close search overlay if we're in the editor
      if (e.key === 'Escape') {
        if (!el.editor.classList.contains('hidden')) {
          // Already in editor — do nothing (or could close modals if any)
        } else if (el.searchOverlay.classList.contains('active')) {
          // If search overlay is showing and there are results, could clear them
          // but the spec says "close search overlay if in editor" — Escape in
          // editor is a no-op since search is already closed
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT DELEGATION FOR SEARCH RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  function bindSearchResultsDelegation() {
    el.searchResults.addEventListener('click', (e) => {
      // Walk up from the clicked target to find a .result-card
      const card = e.target.closest('.result-card');
      if (!card) return;

      const { mbid, title, artist, year } = card.dataset;
      if (mbid) {
        selectRelease(mbid, title, artist, year);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    // ── Search ─────────────────────────────────────────────────────────────
    const debouncedSearch = debounce(performSearch, 300);

    el.searchBtn.addEventListener('click', () => {
      debouncedSearch();
    });

    el.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        debouncedSearch();
      }
    });

    // ── Event delegation for result cards ──────────────────────────────────
    bindSearchResultsDelegation();

    // ── Editor controls ────────────────────────────────────────────────────
    bindControls();
    bindZoomControls();

    // ── Action buttons ─────────────────────────────────────────────────────
    el.printBtn.addEventListener('click', handlePrint);
    el.exportBtn.addEventListener('click', handleExport);
    el.backToSearch.addEventListener('click', handleBackToSearch);

    // ── Keyboard shortcuts ─────────────────────────────────────────────────
    bindKeyboardShortcuts();

    // ── Initial state ──────────────────────────────────────────────────────
    el.searchInput.focus();
  });
})();
