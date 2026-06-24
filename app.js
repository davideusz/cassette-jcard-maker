/**
 * CassetteForge v2 — Cassette Tape J-Card & Shell Label Generator
 *
 * Integrates MusicBrainz + Cover Art Archive APIs, local Audio Metadata parsing,
 * QR code generation, advanced panels, and CSS effects.
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
    shellScale: 2.0,
    activeTab: 'jcard', // 'jcard' or 'shell'
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
      
      // Content
      artistName: '',
      albumTitle: '',
      year: '',
      trackList: '',
      tracksSideA: '',
      tracksSideB: '',
      enableSides: false,
      notes: '',
      spineCustom: '',
      
      // New V2 Features
      panelCount: '3', // 3, 4, 5, 6
      extraText1: '',
      extraText2: '',
      extraText3: '',
      
      qrUrl: '',
      qrPosition: 'none',
      qrSize: 60,
      
      logoDolbyB: false,
      logoDolbyC: false,
      logoTapeType: 'none',
      logoPosition: 'spine',
      
      overlayFilter: 'none',
      overlayOpacity: 40
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
  // SVG LOGOS (Retro Cassette Era)
  // ═══════════════════════════════════════════════════════════════════════════
  const logos = {
    dolbyB: `<svg viewBox="0 0 100 60"><path d="M40 5h-10v50h10c15 0 25-10 25-25s-10-25-25-25zm0 15c8 0 12 5 12 10s-4 10-12 10h-5V20h5zM60 5h10v50h-10c-15 0-25-10-25-25s10-25 25-25zm0 15c-8 0-12 5-12 10s4 10 12 10h5V20h-5z"/></svg>`,
    dolbyC: `<svg viewBox="0 0 120 60"><path d="M40 5h-10v50h10c15 0 25-10 25-25s-10-25-25-25zm0 15c8 0 12 5 12 10s-4 10-12 10h-5V20h5zM60 5h10v50h-10c-15 0-25-10-25-25s10-25 25-25zm0 15c-8 0-12 5-12 10s4 10 12 10h5V20h-5z"/><text x="95" y="45" font-family="sans-serif" font-weight="bold" font-size="40">C</text></svg>`,
    typeI: `<svg viewBox="0 0 80 30"><rect x="5" y="5" width="70" height="20" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="20" font-family="sans-serif" font-weight="bold" font-size="12">TYPE I</text></svg>`,
    typeII: `<svg viewBox="0 0 80 30"><rect x="5" y="5" width="70" height="20" fill="none" stroke="currentColor" stroke-width="2"/><text x="10" y="20" font-family="sans-serif" font-weight="bold" font-size="12">TYPE II</text></svg>`,
    typeIV: `<svg viewBox="0 0 80 30"><rect x="5" y="5" width="70" height="20" fill="none" stroke="currentColor" stroke-width="2"/><text x="10" y="20" font-family="sans-serif" font-weight="bold" font-size="12">TYPE IV</text></svg>`
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM ELEMENT CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  const el = {};

  function cacheElements() {
    const ids = [
      // Search
      'searchOverlay', 'searchInput', 'searchBtn', 'searchStatus', 'searchResults',
      'audioDropZone', 'audioFileInput', 'audioFileBrowse',
      // Editor chrome
      'editor', 'editorTitle', 'backToSearch', 'printBtn', 'exportBtn',
      'tabBar', 'jcardTab', 'shellTab',
      // Sidebars — design controls
      'fontFamily', 'titleSize', 'artistSize', 'trackSize', 'fontWeight',
      'titleSizeVal', 'artistSizeVal', 'trackSizeVal',
      'themePreset', 'bgColor', 'textColor', 'accentColor',
      'panelCount', 'coverPosition', 'textAlign', 'spineDirection', 'coverFit',
      'logoDolbyB', 'logoDolbyC', 'logoTapeType', 'logoPosition',
      'overlayFilter', 'overlayOpacity', 'overlayOpacityVal',
      'customImage', 'resetImage',
      // Sidebars — text content
      'artistName', 'albumTitle', 'yearInput', 'enableSides',
      'singleTrackWrap', 'trackListInput',
      'sidesTrackWrap', 'tracksSideA', 'tracksSideB',
      'notesInput', 'spineCustom',
      'qrUrl', 'qrPosition', 'qrSize', 'qrSizeVal',
      'extraPanelsPanel', 'extraText1', 'extraText2', 'extraText3',
      'extraText2Label', 'extraText3Label',
      // Preview - JCard
      'previewArea', 'previewContainer', 'jcard',
      'jcardFront', 'jcardSpine', 'jcardBack',
      'jcardExtra1', 'jcardExtra2', 'jcardExtra3',
      'foldExtra1', 'foldExtra2', 'foldExtra3',
      'frontArt', 'frontTitleDisplay', 'frontArtistDisplay', 'frontYearDisplay',
      'spineText', 'backArt', 'trackListDisplay', 'backNotesDisplay',
      'extraContent1', 'extraContent2', 'extraContent3',
      'qrBackContainer', 'qrFrontContainer',
      'logoBackContainer', 'logoSpineContainer', 'logoFrontContainer',
      'textureOverlay', 'panelLabels',
      // Preview - Shell
      'shellLabel', 'shellSideA', 'shellSideB', 'shellArtist', 'shellArtist2',
      'shellAlbum', 'shellAlbum2', 'shellLogoArea', 'shellTextureOverlay',
      // Zoom
      'zoomIn', 'zoomOut', 'zoomFit', 'zoomLevel',
      'shellZoomIn', 'shellZoomOut', 'shellZoomLevel',
      // Print
      'printArea'
    ];

    ids.forEach((id) => {
      el[id] = document.getElementById(id);
      if (!el[id]) console.warn(`Element #${id} not found.`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function debounce(fn, ms) {
    let timerId = null;
    return function (...args) {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function adjustColor(hex, amount) {
    let colour = hex.replace('#', '');
    if (colour.length === 3) colour = colour.split('').map((c) => c + c).join('');
    const num = parseInt(colour, 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  function isLight(hex) {
    const colour = hex.replace('#', '');
    const r = parseInt(colour.substring(0, 2), 16);
    const g = parseInt(colour.substring(2, 4), 16);
    const b = parseInt(colour.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUSICBRAINZ / CAA API
  // ═══════════════════════════════════════════════════════════════════════════

  const API_MB = 'https://musicbrainz.org/ws/2';
  const API_CAA = 'https://coverartarchive.org';

  async function searchReleases(query) {
    const res = await fetch(`${API_MB}/release?query=${encodeURIComponent(query)}&fmt=json&limit=24`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    return (await res.json()).releases || [];
  }

  async function fetchCoverArt(mbid) {
    try {
      const res = await fetch(`${API_CAA}/release/${mbid}/front`, { redirect: 'follow' });
      if (!res.ok) return null;
      return res.url;
    } catch { return null; }
  }

  async function fetchTrackList(mbid) {
    const res = await fetch(`${API_MB}/release/${mbid}?inc=recordings&fmt=json`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { single: '', sideA: '', sideB: '' };
    const data = await res.json();
    if (!data.media || data.media.length === 0) return { single: '', sideA: '', sideB: '' };

    let singleList = [];
    let sideA = [];
    let sideB = [];
    let num = 1;

    data.media.forEach((medium, idx) => {
      if (medium.tracks) {
        medium.tracks.forEach((track) => {
          const line = `${num}. ${track.title}`;
          singleList.push(line);
          if (idx === 0) sideA.push(line);
          else sideB.push(line);
          num++;
        });
      }
    });

    return {
      single: singleList.join('\n'),
      sideA: sideA.join('\n'),
      sideB: sideB.join('\n')
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH UI
  // ═══════════════════════════════════════════════════════════════════════════

  async function performSearch() {
    const query = el.searchInput.value.trim();
    if (!query) return;
    el.searchStatus.innerHTML = '<span class="loading-spinner"></span> Searching MusicBrainz…';
    el.searchResults.innerHTML = '';
    try {
      const releases = await searchReleases(query);
      if (releases.length === 0) { el.searchStatus.textContent = 'No results found.'; return; }
      el.searchStatus.textContent = `Found ${releases.length} release(s).`;
      renderSearchResults(releases);
    } catch (err) {
      el.searchStatus.textContent = `Search failed: ${err.message}`;
    }
  }

  function renderSearchResults(releases) {
    el.searchResults.innerHTML = '';
    releases.forEach((release) => {
      const mbid = release.id;
      const title = release.title || 'Unknown';
      const artist = release['artist-credit'] ? release['artist-credit'].map(ac => ac.name).join(', ') : 'Unknown Artist';
      const year = release.date ? release.date.substring(0, 4) : '—';

      const card = document.createElement('div');
      card.className = 'result-card';
      card.dataset.mbid = mbid;
      card.dataset.title = title;
      card.dataset.artist = artist;
      card.dataset.year = year;

      card.innerHTML = `
        <div class="result-thumb"><img src="${API_CAA}/release/${mbid}/front-250" loading="lazy" alt="cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="thumb-placeholder" style="display:none">🎵</div></div>
        <div class="card-info">
          <div class="card-title">${escapeHtml(title)}</div>
          <div class="card-artist">${escapeHtml(artist)}</div>
        </div>
      `;
      el.searchResults.appendChild(card);
    });
  }

  async function selectRelease(mbid, title, artist, year) {
    el.searchStatus.innerHTML = '<span class="loading-spinner"></span> Loading release details…';
    try {
      state.selectedRelease = { id: mbid, title, artist, year };
      state.settings.artistName = artist;
      state.settings.albumTitle = title;
      state.settings.year = year;
      state.settings.spineCustom = '';

      const [coverUrl, tracks] = await Promise.all([ fetchCoverArt(mbid), fetchTrackList(mbid) ]);

      state.coverArtUrl = coverUrl;
      state.customImageUrl = null;
      state.settings.trackList = tracks.single;
      state.settings.tracksSideA = tracks.sideA;
      state.settings.tracksSideB = tracks.sideB;
      state.settings.enableSides = (tracks.sideB.length > 0);
      state.settings.notes = '';

      populateEditorFields();
      showEditor();
    } catch (err) {
      el.searchStatus.textContent = `Failed to load release: ${err.message}`;
    }
  }

  function showEditor() {
    el.searchOverlay.classList.remove('active');
    el.searchOverlay.classList.add('hidden');
    el.editor.classList.remove('hidden');
    el.editorTitle.textContent = `${state.settings.artistName} — ${state.settings.albumTitle}`;
    updatePreview();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO FILE METADATA PARSING (Feature 7)
  // ═══════════════════════════════════════════════════════════════════════════

  function handleAudioDrop(e) {
    e.preventDefault();
    el.audioDropZone.classList.remove('active');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAudioFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleAudioInput(e) {
    if (e.target.files && e.target.files.length > 0) {
      processAudioFiles(Array.from(e.target.files));
    }
  }

  async function processAudioFiles(files) {
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|flac|ogg|m4a|aac|wav)$/i));
    if (audioFiles.length === 0) return;

    el.searchStatus.innerHTML = '<span class="loading-spinner"></span> Extracting metadata…';

    const tracksData = [];
    let sharedArtist = '';
    let sharedAlbum = '';
    let sharedYear = '';
    let coverArtDataUrl = null;

    for (const file of audioFiles) {
      try {
        const tags = await new Promise((resolve, reject) => {
          jsmediatags.read(file, { onSuccess: resolve, onError: reject });
        });
        
        const tag = tags.tags;
        if (!sharedArtist && tag.artist) sharedArtist = tag.artist;
        if (!sharedAlbum && tag.album) sharedAlbum = tag.album;
        if (!sharedYear && tag.year) sharedYear = tag.year;
        
        if (!coverArtDataUrl && tag.picture) {
          const { data, format } = tag.picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) { base64String += String.fromCharCode(data[i]); }
          coverArtDataUrl = `data:${format};base64,${window.btoa(base64String)}`;
        }
        
        tracksData.push({
          num: tag.track ? parseInt(tag.track.split('/')[0]) : 999,
          title: tag.title || file.name.replace(/\.[^/.]+$/, "")
        });
      } catch (err) {
        // Fallback for missing tags
        tracksData.push({ num: 999, title: file.name.replace(/\.[^/.]+$/, "") });
      }
    }

    tracksData.sort((a, b) => a.num - b.num);
    const trackStr = tracksData.map((t, i) => `${i+1}. ${t.title}`).join('\n');
    
    // Split into A/B artificially for demo if more than 4 tracks
    let sideA = trackStr;
    let sideB = '';
    let enableSides = false;
    if (tracksData.length > 4) {
      const mid = Math.ceil(tracksData.length / 2);
      sideA = tracksData.slice(0, mid).map((t, i) => `${i+1}. ${t.title}`).join('\n');
      sideB = tracksData.slice(mid).map((t, i) => `${mid+i+1}. ${t.title}`).join('\n');
      enableSides = true;
    }

    state.settings.artistName = sharedArtist || 'Unknown Artist';
    state.settings.albumTitle = sharedAlbum || 'Unknown Album';
    state.settings.year = sharedYear || '';
    state.settings.trackList = trackStr;
    state.settings.tracksSideA = sideA;
    state.settings.tracksSideB = sideB;
    state.settings.enableSides = enableSides;
    state.settings.spineCustom = '';
    
    state.coverArtUrl = null;
    state.customImageUrl = coverArtDataUrl;

    populateEditorFields();
    showEditor();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POPULATE EDITOR FIELDS
  // ═══════════════════════════════════════════════════════════════════════════

  function populateEditorFields() {
    const s = state.settings;

    el.artistName.value = s.artistName;
    el.albumTitle.value = s.albumTitle;
    el.yearInput.value = s.year;
    el.trackListInput.value = s.trackList;
    el.tracksSideA.value = s.tracksSideA;
    el.tracksSideB.value = s.tracksSideB;
    el.enableSides.checked = s.enableSides;
    el.notesInput.value = s.notes;
    el.spineCustom.value = s.spineCustom;

    el.extraText1.value = s.extraText1;
    el.extraText2.value = s.extraText2;
    el.extraText3.value = s.extraText3;

    el.fontFamily.value = s.fontFamily;
    el.titleSize.value = s.titleSize;
    el.artistSize.value = s.artistSize;
    el.trackSize.value = s.trackSize;
    el.fontWeight.value = s.fontWeight;

    el.bgColor.value = s.bgColor;
    el.textColor.value = s.textColor;
    el.accentColor.value = s.accentColor;

    el.panelCount.value = s.panelCount;
    el.coverPosition.value = s.coverPosition;
    el.textAlign.value = s.textAlign;
    el.spineDirection.value = s.spineDirection;
    el.coverFit.value = s.coverFit;

    el.qrUrl.value = s.qrUrl;
    el.qrPosition.value = s.qrPosition;
    el.qrSize.value = s.qrSize;

    el.logoDolbyB.checked = s.logoDolbyB;
    el.logoDolbyC.checked = s.logoDolbyC;
    el.logoTapeType.value = s.logoTapeType;
    el.logoPosition.value = s.logoPosition;
    
    el.overlayFilter.value = s.overlayFilter;
    el.overlayOpacity.value = s.overlayOpacity;

    el.titleSizeVal.textContent = `${s.titleSize}pt`;
    el.artistSizeVal.textContent = `${s.artistSize}pt`;
    el.trackSizeVal.textContent = `${s.trackSize}pt`;
    el.qrSizeVal.textContent = `${s.qrSize}px`;
    el.overlayOpacityVal.textContent = `${s.overlayOpacity}%`;

    toggleSidePanels();
    toggleExtraPanels();
  }

  function toggleSidePanels() {
    if (state.settings.enableSides) {
      el.singleTrackWrap.classList.add('hidden');
      el.sidesTrackWrap.classList.remove('hidden');
    } else {
      el.singleTrackWrap.classList.remove('hidden');
      el.sidesTrackWrap.classList.add('hidden');
    }
  }

  function toggleExtraPanels() {
    const count = parseInt(state.settings.panelCount);
    
    // UI Panel visibility
    if (count > 3) el.extraPanelsPanel.classList.remove('hidden');
    else el.extraPanelsPanel.classList.add('hidden');
    
    el.extraText2.classList.toggle('hidden', count < 5);
    el.extraText2Label.classList.toggle('hidden', count < 5);
    el.extraText3.classList.toggle('hidden', count < 6);
    el.extraText3Label.classList.toggle('hidden', count < 6);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE PREVIEW (J-Card & Shell)
  // ═══════════════════════════════════════════════════════════════════════════

  function updatePreview() {
    const s = state.settings;
    const artUrl = state.customImageUrl || state.coverArtUrl;

    const spineColor = isLight(s.bgColor) ? adjustColor(s.bgColor, -15) : adjustColor(s.bgColor, 15);
    const objectFit = s.coverFit === 'stretch' ? 'fill' : s.coverFit;

    // ── Font & Core ──
    const fontStr = `'${s.fontFamily}', sans-serif`;
    el.jcardFront.style.backgroundColor = s.bgColor;
    el.jcardFront.style.color = s.textColor;
    el.jcardBack.style.backgroundColor = s.bgColor;
    el.jcardBack.style.color = s.textColor;
    el.jcardSpine.style.backgroundColor = spineColor;

    [el.jcardFront, el.jcardBack, el.jcardExtra1, el.jcardExtra2, el.jcardExtra3].forEach(p => {
      p.style.fontFamily = fontStr;
      p.style.fontWeight = s.fontWeight;
      p.style.textAlign = s.textAlign;
      p.style.backgroundColor = s.bgColor;
      p.style.color = s.textColor;
    });

    // ── Front Panel ──
    renderArtImage(el.frontArt, (s.coverPosition === 'front' || s.coverPosition === 'both') ? artUrl : null, objectFit);
    el.frontTitleDisplay.textContent = s.albumTitle;
    el.frontTitleDisplay.style.fontSize = `${s.titleSize}pt`;
    el.frontArtistDisplay.textContent = s.artistName;
    el.frontArtistDisplay.style.fontSize = `${s.artistSize}pt`;
    el.frontArtistDisplay.style.color = s.accentColor;
    el.frontYearDisplay.textContent = s.year;
    el.frontYearDisplay.style.fontSize = `${Math.max(6, s.artistSize - 2)}pt`;

    // ── Spine ──
    el.spineText.textContent = s.spineCustom.trim() ? s.spineCustom : `${s.artistName.toUpperCase()} — ${s.albumTitle.toUpperCase()}`;
    el.spineText.style.color = s.accentColor;
    el.spineText.style.fontFamily = fontStr;
    el.jcardSpine.className = `jcard-panel jcard-spine spine-${s.spineDirection}`;

    // ── Back Panel (Tracks & Sides) ──
    renderArtImage(el.backArt, (s.coverPosition === 'back' || s.coverPosition === 'both') ? artUrl : null, objectFit);
    
    let trackHtml = '';
    if (s.enableSides) {
      if (s.tracksSideA) trackHtml += `<div class="side-header" style="border-color:${s.accentColor};color:${s.accentColor}">SIDE A</div><div>${escapeHtml(s.tracksSideA).replace(/\n/g, '<br>')}</div>`;
      if (s.tracksSideB) trackHtml += `<div class="side-header" style="border-color:${s.accentColor};color:${s.accentColor}">SIDE B</div><div>${escapeHtml(s.tracksSideB).replace(/\n/g, '<br>')}</div>`;
    } else {
      trackHtml = escapeHtml(s.trackList).replace(/\n/g, '<br>');
    }
    
    el.trackListDisplay.innerHTML = trackHtml;
    el.trackListDisplay.style.fontSize = `${s.trackSize}pt`;
    
    el.backNotesDisplay.innerHTML = escapeHtml(s.notes).replace(/\n/g, '<br>');
    el.backNotesDisplay.style.fontSize = `${Math.max(5, s.trackSize - 1)}pt`;

    // ── Extra Panels ──
    const pCount = parseInt(s.panelCount);
    el.jcardExtra1.style.display = pCount >= 4 ? '' : 'none';
    el.foldExtra1.style.display = pCount >= 4 ? '' : 'none';
    el.jcardExtra2.style.display = pCount >= 5 ? '' : 'none';
    el.foldExtra2.style.display = pCount >= 5 ? '' : 'none';
    el.jcardExtra3.style.display = pCount >= 6 ? '' : 'none';
    el.foldExtra3.style.display = pCount >= 6 ? '' : 'none';
    
    el.extraContent1.innerHTML = escapeHtml(s.extraText1).replace(/\n/g, '<br>');
    el.extraContent2.innerHTML = escapeHtml(s.extraText2).replace(/\n/g, '<br>');
    el.extraContent3.innerHTML = escapeHtml(s.extraText3).replace(/\n/g, '<br>');

    // ── QR Code ──
    [el.qrBackContainer, el.qrFrontContainer].forEach(c => { c.style.display = 'none'; c.innerHTML = ''; });
    if (s.qrPosition !== 'none' && s.qrUrl.trim() && window.QRCode) {
      const container = s.qrPosition === 'backFlap' ? el.qrBackContainer : el.qrFrontContainer;
      container.style.display = 'block';
      if (s.qrPosition === 'frontBottom') { container.style.bottom = '10px'; container.style.left = '10px'; }
      else { container.style.bottom = '30px'; container.style.left = '50%'; container.style.transform = 'translateX(-50%)'; }
      
      new QRCode(container, {
        text: s.qrUrl,
        width: s.qrSize,
        height: s.qrSize,
        colorDark : "#000000",
        colorLight : "#ffffff"
      });
    }

    // ── Logos ──
    [el.logoBackContainer, el.logoSpineContainer, el.logoFrontContainer].forEach(c => { c.innerHTML = ''; });
    let logoHtml = '';
    if (s.logoDolbyB) logoHtml += logos.dolbyB;
    if (s.logoDolbyC) logoHtml += logos.dolbyC;
    if (s.logoTapeType && s.logoTapeType !== 'none') logoHtml += logos[s.logoTapeType];
    
    if (logoHtml) {
      let target;
      if (s.logoPosition === 'spine') target = el.logoSpineContainer;
      else if (s.logoPosition === 'backBottom') { target = el.logoBackContainer; target.style.bottom = '10px'; target.style.left = '50%'; target.style.transform = 'translateX(-50%)'; }
      else { target = el.logoFrontContainer; target.style.bottom = '10px'; target.style.right = '10px'; }
      target.innerHTML = logoHtml;
    }

    // ── Texture Overlay ──
    el.textureOverlay.className = 'texture-overlay';
    if (s.overlayFilter !== 'none') {
      el.textureOverlay.classList.add(`texture-${s.overlayFilter}`);
      el.textureOverlay.style.opacity = s.overlayOpacity / 100;
    } else {
      el.textureOverlay.style.opacity = 0;
    }

    // ── Shell Label Preview ──
    el.shellLabel.style.backgroundColor = s.bgColor;
    el.shellLabel.style.color = s.textColor;
    el.shellLabel.style.fontFamily = fontStr;
    el.shellLabel.style.fontWeight = s.fontWeight;
    
    const shellArtistTxt = s.artistName;
    const shellAlbumTxt = s.albumTitle;
    el.shellArtist.textContent = shellArtistTxt;
    el.shellArtist.style.color = s.accentColor;
    el.shellAlbum.textContent = shellAlbumTxt;
    el.shellArtist2.textContent = shellArtistTxt;
    el.shellArtist2.style.color = s.accentColor;
    el.shellAlbum2.textContent = shellAlbumTxt;
    
    el.shellSideA.style.color = s.accentColor;
    el.shellSideB.style.color = s.accentColor;
    
    el.shellLogoArea.innerHTML = s.logoDolbyB ? logos.dolbyB : '';
    
    el.shellTextureOverlay.className = 'texture-overlay';
    if (s.overlayFilter !== 'none') {
      el.shellTextureOverlay.classList.add(`texture-${s.overlayFilter}`);
      el.shellTextureOverlay.style.opacity = s.overlayOpacity / 100;
    }

    // ── Scale ──
    el.jcard.style.transform = `scale(${state.previewScale})`;
    el.zoomLevel.textContent = `${Math.round(state.previewScale * 100)}%`;
    
    el.shellLabel.style.transform = `scale(${state.shellScale})`;
    el.shellZoomLevel.textContent = `${Math.round(state.shellScale * 100)}%`;
  }

  function renderArtImage(container, url, objectFit) {
    if (!url) { container.style.display = 'none'; return; }
    container.style.display = '';
    let img = container.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      container.innerHTML = '';
      container.appendChild(img);
    }
    if (img.src !== url) img.src = url;
    img.className = `fit-${objectFit}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BINDINGS
  // ═══════════════════════════════════════════════════════════════════════════

  function bindControls() {
    const debouncedUpdate = debounce(updatePreview, 150);

    // Simple inputs
    ['fontFamily', 'fontWeight', 'coverPosition', 'textAlign', 'spineDirection', 'coverFit', 'panelCount', 'qrPosition', 'logoTapeType', 'logoPosition', 'overlayFilter'].forEach(id => {
      el[id].addEventListener('change', () => { state.settings[id] = el[id].value; toggleExtraPanels(); updatePreview(); });
    });

    ['logoDolbyB', 'logoDolbyC'].forEach(id => {
      el[id].addEventListener('change', () => { state.settings[id] = el[id].checked; updatePreview(); });
    });

    el.enableSides.addEventListener('change', () => {
      state.settings.enableSides = el.enableSides.checked;
      toggleSidePanels();
      updatePreview();
    });

    // Ranges
    const bindRange = (id, unit) => {
      el[id].addEventListener('input', () => {
        state.settings[id] = el[id].value;
        el[id + 'Val'].textContent = `${el[id].value}${unit}`;
        updatePreview();
      });
    };
    bindRange('titleSize', 'pt'); bindRange('artistSize', 'pt'); bindRange('trackSize', 'pt');
    bindRange('qrSize', 'px'); bindRange('overlayOpacity', '%');

    // Colors
    el.themePreset.addEventListener('change', () => {
      const name = el.themePreset.value;
      if (themes[name]) {
        ['bgColor', 'textColor', 'accentColor'].forEach(c => {
          state.settings[c] = themes[name][c];
          el[c].value = themes[name][c];
        });
        updatePreview();
      }
    });

    ['bgColor', 'textColor', 'accentColor'].forEach(c => {
      el[c].addEventListener('input', () => {
        state.settings[c] = el[c].value;
        el.themePreset.value = 'custom';
        updatePreview();
      });
    });

    // Text inputs
    ['artistName', 'albumTitle', 'yearInput', 'trackListInput', 'tracksSideA', 'tracksSideB', 'notesInput', 'spineCustom', 'extraText1', 'extraText2', 'extraText3', 'qrUrl'].forEach(id => {
      el[id].addEventListener('input', () => {
        state.settings[id] = el[id].value;
        debouncedUpdate();
      });
    });

    // Image
    el.customImage.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => { state.customImageUrl = e.target.result; updatePreview(); };
        reader.readAsDataURL(file);
      }
    });

    el.resetImage.addEventListener('click', () => {
      state.customImageUrl = null; el.customImage.value = ''; updatePreview();
    });
  }

  function bindTabs() {
    el.tabBar.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') return;
      const tab = e.target.dataset.tab;
      state.activeTab = tab;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      if (tab === 'jcard') {
        el.jcardTab.classList.remove('hidden');
        el.shellTab.classList.add('hidden');
        el.editorTitle.textContent = 'Editing J-Card';
      } else {
        el.jcardTab.classList.add('hidden');
        el.shellTab.classList.remove('hidden');
        el.editorTitle.textContent = 'Editing Shell Label';
      }
    });
  }

  function bindZoomControls() {
    el.zoomIn.addEventListener('click', () => { state.previewScale = Math.min(3.0, +(state.previewScale + 0.25).toFixed(2)); updatePreview(); });
    el.zoomOut.addEventListener('click', () => { state.previewScale = Math.max(0.5, +(state.previewScale - 0.25).toFixed(2)); updatePreview(); });
    el.zoomFit.addEventListener('click', () => { state.previewScale = 1.0; updatePreview(); });

    el.shellZoomIn.addEventListener('click', () => { state.shellScale = Math.min(4.0, +(state.shellScale + 0.5).toFixed(2)); updatePreview(); });
    el.shellZoomOut.addEventListener('click', () => { state.shellScale = Math.max(0.5, +(state.shellScale - 0.5).toFixed(2)); updatePreview(); });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRINT & EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  function handlePrint() {
    const printArea = el.printArea;
    printArea.innerHTML = '';
    
    // Choose what to print based on active tab
    const sourceNode = state.activeTab === 'jcard' ? el.jcard : el.shellLabel;
    const clone = sourceNode.cloneNode(true);

    clone.style.transform = 'none';
    clone.style.transformOrigin = 'top left';
    clone.style.margin = '0';
    clone.style.position = 'relative';

    const page = document.createElement('div');
    page.style.position = 'relative';
    page.style.display = 'inline-block';
    page.style.padding = '20px';

    if (state.activeTab === 'jcard') {
      // Add crop marks at the four corners of the J-card
      const cropLength = 15;
      const cropStyle = '1px solid #000';
      const c = (styles) => { const m = document.createElement('div'); Object.assign(m.style, {position:'absolute', zIndex:'100', ...styles}); return m; };
      
      page.appendChild(c({ top: '5px', left: '20px', width: `${cropLength}px`, height: '0', borderTop: cropStyle }));
      page.appendChild(c({ top: '20px', left: '5px', width: '0', height: `${cropLength}px`, borderLeft: cropStyle }));
      page.appendChild(c({ top: '5px', right: '20px', width: `${cropLength}px`, height: '0', borderTop: cropStyle }));
      page.appendChild(c({ top: '20px', right: '5px', width: '0', height: `${cropLength}px`, borderRight: cropStyle }));
      page.appendChild(c({ bottom: '5px', left: '20px', width: `${cropLength}px`, height: '0', borderBottom: cropStyle }));
      page.appendChild(c({ bottom: '20px', left: '5px', width: '0', height: `${cropLength}px`, borderLeft: cropStyle }));
      page.appendChild(c({ bottom: '5px', right: '20px', width: `${cropLength}px`, height: '0', borderBottom: cropStyle }));
      page.appendChild(c({ bottom: '20px', right: '5px', width: '0', height: `${cropLength}px`, borderRight: cropStyle }));
    }

    page.appendChild(clone);
    printArea.appendChild(page);

    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => { printArea.innerHTML = ''; }, 500);
    });
  }

  async function handleExport() {
    if (typeof html2canvas === 'undefined') { alert('html2canvas loading...'); return; }
    
    const card = state.activeTab === 'jcard' ? el.jcard : el.shellLabel;
    const originalTransform = card.style.transform;

    try {
      card.style.transform = 'none';
      await new Promise(r => requestAnimationFrame(r));
      const canvas = await html2canvas(card, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const filename = `${slugify(state.settings.artistName || 'artist')}-${slugify(state.settings.albumTitle || 'album')}-${state.activeTab}.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
      }, 'image/png');
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      card.style.transform = originalTransform;
    }
  }

  function handleBackToSearch() {
    el.editor.classList.add('hidden');
    el.searchOverlay.classList.remove('hidden');
    el.searchOverlay.classList.add('active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    // Search
    const debouncedSearch = debounce(performSearch, 300);
    el.searchBtn.addEventListener('click', debouncedSearch);
    el.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); debouncedSearch(); } });

    // Search Results Delegation
    el.searchResults.addEventListener('click', (e) => {
      const card = e.target.closest('.result-card');
      if (card && card.dataset.mbid) selectRelease(card.dataset.mbid, card.dataset.title, card.dataset.artist, card.dataset.year);
    });

    // Audio Drop Zone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => {
      el.audioDropZone.addEventListener(n, e => { e.preventDefault(); e.stopPropagation(); });
    });
    el.audioDropZone.addEventListener('dragenter', () => el.audioDropZone.classList.add('active'));
    el.audioDropZone.addEventListener('dragover', () => el.audioDropZone.classList.add('active'));
    el.audioDropZone.addEventListener('dragleave', () => el.audioDropZone.classList.remove('active'));
    el.audioDropZone.addEventListener('drop', handleAudioDrop);
    
    el.audioFileBrowse.addEventListener('click', () => el.audioFileInput.click());
    el.audioFileInput.addEventListener('change', handleAudioInput);

    // Controls
    bindControls();
    bindTabs();
    bindZoomControls();

    // Actions
    el.printBtn.addEventListener('click', handlePrint);
    el.exportBtn.addEventListener('click', handleExport);
    el.backToSearch.addEventListener('click', handleBackToSearch);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !el.editor.classList.contains('hidden')) {
        e.preventDefault(); handlePrint();
      }
    });

    el.searchInput.focus();
  });
})();
