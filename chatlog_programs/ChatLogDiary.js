//@name ChatLogDiary
//@display-name 📖 Chat Log Diary
//@api 3.0
//@version 2.0.0
//@description 채팅 로그를 LogDiary 스타일 HTML로 변환하여 클립보드에 복사합니다. 삼성 폰 호환.

(async () => {
  // ========== 상태 변수 ==========
  let buttonRef = null;
  let allMessages = [];
  let rangeStart = 0;
  let rangeEnd = 0;
  let selectedSet = new Set();
  let charName = '캐릭터';
  let currentTheme = 'navy';
  let viewMode = 'list';
  let personaName = '';
  let useUserTag = false;
  let modelInfo = '';
  let promptInfo = '';
  let includeImages = true;
  let includeHeaderImages = true;
  let assetMap = {};
  let assetUrlMap = {};
  let charImageUri = '';
  let charImageUrl = '';
  let personaImageUri = '';
  let personaImageUrl = '';
  let personaDisplayName = '';
  let logTitle = '';
  let coverLabel = 'CHAT LOG';
  let customPageTitle = '';
  let customPageSubtitle = '';
  let loadPersonaList = null;
  let useTranslationCache = false;
  let coverImageUri = '';
  let useCover = true;
  let templateMode = 'full'; // 'full' | 'no-cover' | 'text-only'
  let coverZoom = 100;
  let coverFocusX = 50;
  let coverFocusY = 50;
  let pageSplitSize = 30;
  let bodyFontSize = 0;
  let bodyLineHeight = 0;
  let replacements = [];
  let customTags = [];
  let customThemes = {
    'custom1': {
      name: '\u{1F3A8} \uCEE4\uC2A4\uD140 1',
      bg: '#ffffff', text: '#2c3e50', headerText: '#162a3e', tagText: '#6c8da8',
      dialogue: 'background-color:#f0f2f5;color:#162a3e;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f0f2f5;color:#2c3e50;padding:0 4px;border-radius:2px',
      sound: 'color:#162a3e;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#2d5af0;font-style:italic', narration: 'color:#2c3e50',
      userInput: 'color:#2d5af0;font-style:italic',
      charName: 'color:#162a3e;font-weight:700', userName: 'color:#162a3e;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#2c3e50;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#e8eaed', coverBg: '#1a1a1a',
      coverGrad: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 25%, transparent 45%)',
      coverLabel: 'rgba(255,255,255,0.8)', coverTitle: '#ffffff', coverDesc: 'rgba(255,255,255,0.9)',
      tagBg: 'rgba(255,255,255,0.1)', tagBorder: 'rgba(255,255,255,0.3)', tagColor: '#ffffff',
      sectionColor: '#162a3e', sectionBorder: '#162a3e',
      profLabel: '#6c8da8', profName: '#162a3e', profFallback: '#e8eaed',
      pageNum: '#162a3e', pageTitle: '#162a3e', pageSub: '#6c8da8', chevron: '#6c8da8',
      divider: 'rgba(22,42,62,0.12)',
      preview: { bg: '#ffffff', text: '#2c3e50', accent: '#162a3e' },
      _customBg: '#ffffff', _customHighlight: '#d1fae5', _customBody: '#2c3e50',
      _customCover: '#ffffff', _customSection: '#162a3e'
    },
    'custom2': {
      name: '\u{1F3A8} \uCEE4\uC2A4\uD140 2',
      bg: '#0d1117', text: '#c9d1d9', headerText: '#f0f6fc', tagText: '#8b949e',
      dialogue: 'background-color:#1c2433;color:#c9d1d9;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#1c2433;color:#8b949e;padding:0 4px;border-radius:2px',
      sound: 'color:#d2a8ff;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#79c0ff;font-style:italic', narration: 'color:#c9d1d9',
      userInput: 'color:#79c0ff;font-style:italic',
      charName: 'color:#79c0ff;font-weight:700', userName: 'color:#58a6ff;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#c9d1d9;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#010409', coverBg: '#161b22',
      coverGrad: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 30%, transparent 55%)',
      coverLabel: 'rgba(255,255,255,0.6)', coverTitle: '#f0f6fc', coverDesc: 'rgba(255,255,255,0.7)',
      tagBg: 'rgba(255,255,255,0.08)', tagBorder: 'rgba(255,255,255,0.2)', tagColor: '#c9d1d9',
      sectionColor: '#58a6ff', sectionBorder: '#58a6ff',
      profLabel: '#58a6ff', profName: '#f0f6fc', profFallback: '#2d333b',
      pageNum: '#58a6ff', pageTitle: '#f0f6fc', pageSub: '#8b949e', chevron: '#8b949e',
      divider: '#30363d',
      preview: { bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff' },
      _customBg: '#0d1117', _customHighlight: '#1c2433', _customBody: '#c9d1d9',
      _customCover: '#f0f6fc', _customSection: '#58a6ff'
    }
  };
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const FS_OPTIONS = ['', '13px', '14px', '15px', '16px', '18px'];
  const LH_OPTIONS = ['', '1.5', '1.7', '1.9', '2.0', '2.2'];
  let uiDarkMode = true;

  // ========== 번역 캐시 조회 ==========
  function extractLongestPlainChunk(text) {
    const chunks = text.split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs).map(s => s.trim()).filter(s => s.length > 30);
    return chunks.sort((a, b) => b.length - a.length)[0] || '';
  }

  async function findTranslationFromCache(originalText) {
    try {
      if (typeof Risuai.getTranslationCache !== 'function' || typeof Risuai.searchTranslationCache !== 'function') {
        return { found: false };
      }
      const exactMatch = await Risuai.getTranslationCache(originalText);
      if (exactMatch) return { found: true, translation: exactMatch };
      const chunk = extractLongestPlainChunk(originalText);
      if (!chunk) return { found: false };
      const entries = await Risuai.searchTranslationCache(chunk);
      if (!entries || entries.length === 0) return { found: false };
      const minLength = originalText.length * 0.5;
      const maxLength = originalText.length * 1.5;
      const matches = entries.filter(e => e.key.length >= minLength && e.key.length <= maxLength);
      if (matches.length === 0) return { found: false };
      if (matches.length > 1) {
        matches.sort((a, b) => Math.abs(a.key.length - originalText.length) - Math.abs(b.key.length - originalText.length));
      }
      return { found: true, translation: matches[0].value };
    } catch (e) {
      return { found: false };
    }
  }

  // ========== 테마 정의 (LogDiary 스타일) ==========
  const THEMES = {
    'navy': {
      name: '📖 네이비',
      bg: '#ffffff',
      text: '#2c3e50',
      headerText: '#162a3e',
      tagText: '#6c8da8',
      dialogue: 'background-color:#f0f2f5;color:#162a3e;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f0f2f5;color:#2c3e50;padding:0 4px;border-radius:2px',
      sound: 'color:#162a3e;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#2d5af0;font-style:italic',
      narration: 'color:#2c3e50',
      userInput: 'color:#2d5af0;font-style:italic',
      charName: 'color:#162a3e;font-weight:700',
      userName: 'color:#162a3e;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#2c3e50;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#e8eaed',
      coverBg: '#1a1a1a',
      coverGrad: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 25%, transparent 45%)',
      coverLabel: 'rgba(255,255,255,0.8)',
      coverTitle: '#ffffff',
      coverDesc: 'rgba(255,255,255,0.9)',
      tagBg: 'rgba(255,255,255,0.1)',
      tagBorder: 'rgba(255,255,255,0.3)',
      tagColor: '#ffffff',
      sectionColor: '#162a3e',
      sectionBorder: '#162a3e',
      profLabel: '#6c8da8',
      profName: '#162a3e',
      profFallback: '#e8eaed',
      pageNum: '#162a3e',
      pageTitle: '#162a3e',
      pageSub: '#6c8da8',
      chevron: '#6c8da8',
      divider: 'rgba(22,42,62,0.12)',
      preview: { bg: '#ffffff', text: '#2c3e50', accent: '#162a3e' }
    },
    'dark': {
      name: '📖 다크',
      bg: '#0d1117',
      text: '#c9d1d9',
      headerText: '#f0f6fc',
      tagText: '#8b949e',
      dialogue: 'background-color:#1c2433;color:#c9d1d9;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#1c2433;color:#8b949e;padding:0 4px;border-radius:2px',
      sound: 'color:#d2a8ff;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#79c0ff;font-style:italic',
      narration: 'color:#c9d1d9',
      userInput: 'color:#79c0ff;font-style:italic',
      charName: 'color:#79c0ff;font-weight:700',
      userName: 'color:#58a6ff;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#c9d1d9;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#010409',
      coverBg: '#161b22',
      coverGrad: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 30%, transparent 55%)',
      coverLabel: 'rgba(255,255,255,0.6)',
      coverTitle: '#f0f6fc',
      coverDesc: 'rgba(255,255,255,0.7)',
      tagBg: 'rgba(255,255,255,0.08)',
      tagBorder: 'rgba(255,255,255,0.2)',
      tagColor: '#c9d1d9',
      sectionColor: '#58a6ff',
      sectionBorder: '#58a6ff',
      profLabel: '#58a6ff',
      profName: '#f0f6fc',
      profFallback: '#2d333b',
      pageNum: '#58a6ff',
      pageTitle: '#f0f6fc',
      pageSub: '#8b949e',
      chevron: '#8b949e',
      divider: '#30363d',
      preview: { bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff' }
    },
    'cream': {
      name: '📖 크림',
      bg: '#faf8f3',
      text: '#3d3929',
      headerText: '#3d3929',
      tagText: '#8a7d68',
      dialogue: 'background-color:#f0ece2;color:#3d3929;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f0ece2;color:#7a7060;padding:0 4px;border-radius:2px',
      sound: 'color:#8a7d68;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#a0522d;font-style:italic',
      narration: 'color:#3d3929',
      userInput: 'color:#8b6914;font-style:italic',
      charName: 'color:#5a4f3a;font-weight:700',
      userName: 'color:#5a4f3a;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#3d3929;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#e8e0d0',
      coverBg: '#2c2416',
      coverGrad: 'linear-gradient(to top, rgba(44,36,22,0.9) 0%, rgba(44,36,22,0.55) 25%, transparent 45%)',
      coverLabel: 'rgba(255,245,230,0.75)',
      coverTitle: '#fff5e6',
      coverDesc: 'rgba(255,245,230,0.85)',
      tagBg: 'rgba(255,245,230,0.1)',
      tagBorder: 'rgba(255,245,230,0.3)',
      tagColor: '#fff5e6',
      sectionColor: '#6b5c45',
      sectionBorder: '#6b5c45',
      profLabel: '#8a7d68',
      profName: '#3d3929',
      profFallback: '#e8e0d0',
      pageNum: '#6b5c45',
      pageTitle: '#3d3929',
      pageSub: '#8a7d68',
      chevron: '#8a7d68',
      divider: '#ddd5c5',
      preview: { bg: '#faf8f3', text: '#3d3929', accent: '#6b5c45' }
    },
    'rose': {
      name: '📖 로즈',
      bg: '#fdf2f4',
      text: '#4a2c35',
      headerText: '#6b2c3f',
      tagText: '#a87589',
      dialogue: 'background-color:#f5e0e5;color:#4a2c35;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f5e0e5;color:#7a5060;padding:0 4px;border-radius:2px',
      sound: 'color:#a87589;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#c0506d;font-style:italic',
      narration: 'color:#4a2c35',
      userInput: 'color:#c0506d;font-style:italic',
      charName: 'color:#6b2c3f;font-weight:700',
      userName: 'color:#6b2c3f;font-weight:700',
      paragraph: 'margin:0 0 10px 0;color:#4a2c35;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      pageBg: '#f0d0d8',
      coverBg: '#2c1620',
      coverGrad: 'linear-gradient(to top, rgba(44,22,32,0.9) 0%, rgba(44,22,32,0.55) 25%, transparent 45%)',
      coverLabel: 'rgba(255,230,240,0.75)',
      coverTitle: '#ffe6f0',
      coverDesc: 'rgba(255,230,240,0.85)',
      tagBg: 'rgba(255,230,240,0.1)',
      tagBorder: 'rgba(255,230,240,0.3)',
      tagColor: '#ffe6f0',
      sectionColor: '#6b2c3f',
      sectionBorder: '#6b2c3f',
      profLabel: '#a87589',
      profName: '#4a2c35',
      profFallback: '#f0d0d8',
      pageNum: '#6b2c3f',
      pageTitle: '#4a2c35',
      pageSub: '#a87589',
      chevron: '#a87589',
      divider: '#e0b8c5',
      preview: { bg: '#fdf2f4', text: '#4a2c35', accent: '#6b2c3f' }
    }
  };

  // ========== 에셋 유틸 ==========
  const RISU_ASSET_BASE = 'https://sv.risuai.xyz/rs/assets/';
  const getAssetRisuUrl = (key) => {
    if (!key) return '';
    if (typeof key === 'string' && key.startsWith('http')) return key;
    if (typeof key === 'string') {
      let filename = key;
      if (filename.startsWith('assets/')) filename = filename.substring(7);
      if (/^[a-f0-9]{16,}\.[a-z0-9]+$/i.test(filename)) return RISU_ASSET_BASE + filename;
    }
    return '';
  };

  const getAssetDataUri = async (key) => {
    if (!key) return null;
    if (typeof key === 'string' && key.startsWith('data:')) return key;
    if (typeof key === 'string' && key.length > 100 && !key.startsWith('assets/') && !key.startsWith('http')) {
      if (key.startsWith('iVBOR')) return 'data:image/png;base64,' + key;
      if (key.startsWith('/9j/')) return 'data:image/jpeg;base64,' + key;
      if (key.startsWith('UklGR')) return 'data:image/webp;base64,' + key;
      return 'data:image/png;base64,' + key;
    }
    try {
      let readKey = key;
      if (typeof key === 'string' && key.startsWith('assets/')) readKey = key.substring(7);
      let data;
      try { data = await Risuai.readImage(readKey); }
      catch (e) { const filename = key.split('/').pop(); if (filename && filename !== readKey) data = await Risuai.readImage(filename); }
      if (!data) return null;
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        let mime = 'image/png';
        if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
        else if (bytes[0] === 0xFF && bytes[1] === 0xD8) mime = 'image/jpeg';
        else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = 'image/webp';
        else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = 'image/gif';
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength)));
        }
        return 'data:' + mime + ';base64,' + btoa(binary);
      }
      if (typeof data === 'string') {
        if (data.startsWith('data:')) return data;
        return 'data:image/png;base64,' + data;
      }
      return null;
    } catch (e) { return null; }
  };

  const compressImageViaCanvas = (dataUri, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUri);
        img.src = dataUri;
      } catch (e) { resolve(dataUri); }
    });
  };

  const compressDataUrisInHtml = async (html, maxWidth = 800, quality = 0.7) => {
    const matches = [...new Set((html.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g) || []))];
    const toCompress = matches.filter(uri => uri.length > 10240);
    if (toCompress.length === 0) return html;
    const compressed = await Promise.all(toCompress.map(uri => compressImageViaCanvas(uri, maxWidth, quality)));
    let result = html;
    for (let i = 0; i < toCompress.length; i++) {
      if (compressed[i] !== toCompress[i]) result = result.split(toCompress[i]).join(compressed[i]);
    }
    return result;
  };

  const stripHtml = (html) => {
    if (!html) return '';
    // Strip <Thoughts>...</Thoughts> content (AI internal reasoning, not meant for display)
    html = html.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/gi, '');
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('style, script').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-regex-modern-stylish-white').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-regex-guardian-status-wrapper, .x-risu-regex-guardian-char-wrapper').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-annotation_content').forEach(el => el.remove());
    div.querySelectorAll('details').forEach(el => {
      const summary = el.querySelector('summary');
      if (summary) summary.replaceWith(document.createTextNode('\n[' + summary.textContent.trim() + ']\n'));
    });
    div.querySelectorAll('br').forEach(el => el.replaceWith(document.createTextNode('\n')));
    div.querySelectorAll('p').forEach(el => el.insertAdjacentText('afterend', '\n'));
    let text = div.textContent || '';
    text = text.replace(/┣[^┫]*┫/g, '');
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  };

  const escHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ========== 클립보드 유틸 (삼성 폰 호환) ==========
  const copyHtmlViaDOM = (html, btn, label) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    wrap.querySelectorAll('details').forEach(d => d.setAttribute('open', ''));
    document.body.appendChild(wrap);
    const range = document.createRange();
    range.selectNodeContents(wrap);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    sel.removeAllRanges();
    document.body.removeChild(wrap);
    if (!ok) { try { navigator.clipboard.writeText(html); } catch {} }
    showCopied(btn, label || '📋 HTML');
  };

  const copyHtmlToClipboard = async (html, btn, label) => {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([html], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })]);
    } catch (e) {
      try { await navigator.clipboard.writeText(html); } catch (e2) {
        const ta = document.createElement('textarea');
        ta.value = html; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    }
    showCopied(btn, label || 'HTML 복사');
  };

  const copyMobileHtml = (html, btn, label) => {
    if (isIOS) {
      const openedHtml = html.replace(/<details(?!\s+open)/gi, '<details open');
      copyHtmlToClipboard(openedHtml, btn, label || '📋 HTML');
    } else {
      copyHtmlViaDOM(html, btn, label);
    }
  };

  const copyToClipboard = async (text, btn, label) => {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    showCopied(btn, label);
  };

  const showCopied = (btn, originalLabel) => {
    if (!btn) return;
    btn.textContent = '✓ 복사됨';
    btn.classList.add('btn-copied');
    setTimeout(() => { btn.textContent = originalLabel; btn.classList.remove('btn-copied'); }, 2000);
  };

  const closePanel = async () => {
    document.getElementById('log-overlay').style.display = 'none';
    await Risuai.hideContainer();
  };

  // ========== 채팅 로그 추출 ==========
  const extractChatLog = async () => {
    try {
      const db = await Risuai.getDatabase();
      const charIdx = await Risuai.getCurrentCharacterIndex();
      const chatIdx = await Risuai.getCurrentChatIndex();
      if (!db || charIdx === -1 || chatIdx === -1) return { messages: [], charName: '?' };
      const character = db.characters[charIdx];
      charName = character?.name || character?.data?.name || '캐릭터';

      charImageUri = ''; charImageUrl = '';
      try {
        if (character.image) {
          const cUri = await getAssetDataUri(character.image);
          if (cUri) charImageUri = cUri;
          charImageUrl = getAssetRisuUrl(character.image);
        }
      } catch (e) {}

      personaImageUri = ''; personaImageUrl = ''; personaDisplayName = '';
      try {
        const personas = db.personas || [];
        const selIdx = db.selectedPersona;
        if (typeof selIdx === 'number' && selIdx >= 0 && selIdx < personas.length) {
          const persona = personas[selIdx];
          personaDisplayName = persona.name || '';
          if (persona.icon) {
            const pUri = await getAssetDataUri(persona.icon);
            if (pUri) personaImageUri = pUri;
            personaImageUrl = getAssetRisuUrl(persona.icon);
          }
        }
      } catch (e) {}

      // 에셋 매핑 구축
      const nameKeyMap = {};
      const nameLookup = {};
      const noExtLookup = {};
      const charAssets = character.additionalAssets || [];
      for (const asset of charAssets) {
        if (Array.isArray(asset) && asset[0]) {
          const aName = asset[0];
          nameKeyMap[aName] = asset[1] || '';
          nameLookup[aName.toLowerCase()] = aName;
          const noExt = aName.replace(/\.[^.]+$/, '');
          if (noExt !== aName) noExtLookup[noExt.toLowerCase()] = aName;
        }
      }
      try {
        const modules = db.modules || [];
        for (const mod of modules) {
          if (!mod) continue;
          const modAssets = mod.assets || [];
          for (const asset of modAssets) {
            if (Array.isArray(asset) && asset[0] && !nameKeyMap[asset[0]]) {
              nameKeyMap[asset[0]] = asset[1] || '';
              nameLookup[asset[0].toLowerCase()] = asset[0];
              const noExt = asset[0].replace(/\.[^.]+$/, '');
              if (noExt !== asset[0]) noExtLookup[noExt.toLowerCase()] = asset[0];
            }
          }
        }
      } catch (e) {}

      const prefixLookup = {};
      for (const aName of Object.keys(nameKeyMap)) {
        const lo = aName.toLowerCase();
        const prefixMatch = lo.match(/^(.+?)[_\-](\d+)(?:\.[^.]+)?$/);
        if (prefixMatch) {
          if (!prefixLookup[prefixMatch[1]]) prefixLookup[prefixMatch[1]] = [];
          prefixLookup[prefixMatch[1]].push(aName);
        }
        const noExtLo = lo.replace(/\.[^.]+$/, '');
        if (noExtLo !== lo) {
          if (!prefixLookup[noExtLo]) prefixLookup[noExtLo] = [];
          if (!prefixLookup[noExtLo].includes(aName)) prefixLookup[noExtLo].push(aName);
        }
      }

      // editdisplay 정규식 수집
      const displayRegexScripts = [];
      try {
        const charScripts = character.customscript || [];
        if (Array.isArray(charScripts)) {
          for (const s of charScripts) {
            if (!s || !s.in || !s.out) continue;
            if ((s.type || 'editdisplay').toLowerCase() !== 'editdisplay') continue;
            if (/\{\{(?:img|asset|random|image)|assetlist|<img\b|\bsrc\s*=/i.test(s.out)) displayRegexScripts.push(s);
          }
        }
        const enabledModIds = db.enabledModules || [];
        for (const mod of (db.modules || [])) {
          if (!mod || !enabledModIds.includes(mod.id)) continue;
          for (const s of (mod.regex || [])) {
            if (!s || !s.in || !s.out) continue;
            if ((s.type || 'editinput').toLowerCase() !== 'editdisplay') continue;
            if (/\{\{(?:img|asset|random|image)|assetlist|<img\b|\bsrc\s*=/i.test(s.out)) displayRegexScripts.push(s);
          }
        }
      } catch (e) {}

      const parseRegexOutMappings = (outStr) => {
        const result = { dicts: [], randoms: [], literals: [] };
        let dm; const dictRe = /\{\{dict::([^}]+)\}\}/gi;
        while ((dm = dictRe.exec(outStr)) !== null) {
          const map = {};
          for (const pair of dm[1].split('::')) { const eq = pair.indexOf('='); if (eq > 0) map[pair.substring(0, eq).trim().toLowerCase()] = pair.substring(eq + 1).trim(); }
          if (Object.keys(map).length > 0) result.dicts.push(map);
        }
        let rm; const randRe = /\{\{random::([^}]+)\}\}/gi;
        while ((rm = randRe.exec(outStr)) !== null) { const items = rm[1].split('::').map(s => s.trim()).filter(Boolean); if (items.length > 0) result.randoms.push(items); }
        let lm; const litRe = /\{\{(?:img|asset|image)\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
        while ((lm = litRe.exec(outStr)) !== null) { if (!/^\$\d+$/.test(lm[1].trim())) result.literals.push(lm[1].trim()); }
        let sm; const srcRe = /\bsrc\s*=\s*["']([^"'${}]+)["']/gi;
        while ((sm = srcRe.exec(outStr)) !== null) result.literals.push(sm[1].trim());
        return result;
      };

      const applyOutMappings = (groups, mappings) => {
        const candidates = new Set();
        candidates.add(groups.join('_')); candidates.add(groups.join('-')); candidates.add(groups.join(''));
        for (const g of groups) candidates.add(g);
        for (const dict of mappings.dicts) { const mapped = groups.map(g => dict[g.toLowerCase()] || g); candidates.add(mapped.join('_')); candidates.add(mapped.join('-')); candidates.add(mapped.join('')); for (const m of mapped) candidates.add(m); }
        for (const items of mappings.randoms) { for (const item of items) { const clean = item.replace(/\{\{[^}]*\}\}/g, '').trim(); if (clean) candidates.add(clean); } }
        for (const lit of mappings.literals) { let resolved = lit; for (let i = 0; i < groups.length; i++) resolved = resolved.replace(new RegExp('\\$' + (i + 1), 'g'), groups[i]); candidates.add(resolved); }
        return candidates;
      };

      const regexAliasMap = {};
      for (const script of displayRegexScripts) {
        for (const dict of parseRegexOutMappings(script.out).dicts) { for (const [key, val] of Object.entries(dict)) { const lo = key.toLowerCase(); if (!regexAliasMap[lo]) regexAliasMap[lo] = []; if (!regexAliasMap[lo].includes(val)) regexAliasMap[lo].push(val); } }
      }

      const resolveAssetsByRegex = (rawText) => {
        const found = new Set();
        for (const script of displayRegexScripts) {
          try {
            let flags = script.flag || '';
            if (Array.isArray(script.ableFlag)) for (const f of script.ableFlag) { if (typeof f === 'string' && /^[gimsuy]$/.test(f) && !flags.includes(f)) flags += f; }
            if (!flags.includes('g')) flags += 'g';
            const re = new RegExp(script.in, flags);
            const outMappings = parseRegexOutMappings(script.out);
            let match;
            while ((match = re.exec(rawText)) !== null) {
              const groups = match.slice(1).filter(Boolean);
              if (groups.length === 0) continue;
              for (const prefix of applyOutMappings(groups, outMappings)) {
                const lo = prefix.toLowerCase();
                const exact = resolveAssetName(prefix);
                if (exact) { found.add(exact); continue; }
                if (prefixLookup[lo]) { for (const name of prefixLookup[lo]) found.add(name); continue; }
                for (const aName of Object.keys(nameKeyMap)) { if (aName.toLowerCase().startsWith(lo + '_') || aName.toLowerCase().startsWith(lo + '-')) found.add(aName); }
              }
            }
          } catch (e) {}
        }
        return found;
      };

      const extractImgRef = (tag) => {
        let m = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i); if (m) return m[1];
        m = tag.match(/\bsrc\s*=\s*([^\s>"']+)/i); if (m) return m[1];
        m = tag.match(/=\s*"([^"]+)"/); if (m) return m[1];
        m = tag.match(/<img\s*::?\s*([^>]+?)\s*>/i); if (m) return m[1].trim();
        return null;
      };

      const resolveAssetName = (ref) => {
        if (!ref) return null;
        if (/^(https?:|data:|blob:)/i.test(ref)) return null;
        if (nameKeyMap[ref]) return ref;
        const lo = ref.toLowerCase();
        if (nameLookup[lo]) return nameLookup[lo];
        const noExt = ref.replace(/\.[^.]+$/, '').toLowerCase();
        if (nameLookup[noExt]) return nameLookup[noExt];
        if (noExtLookup[lo]) return noExtLookup[lo];
        if (noExtLookup[noExt]) return noExtLookup[noExt];
        const prefixHits = prefixLookup[lo] || prefixLookup[noExt];
        if (prefixHits && prefixHits.length > 0) return prefixHits[0];
        const aliases = regexAliasMap[lo];
        if (aliases) { for (const alias of aliases) { if (nameKeyMap[alias]) return alias; if (nameLookup[alias.toLowerCase()]) return nameLookup[alias.toLowerCase()]; } }
        return null;
      };

      const imgTagRe = /<img\b[^>]*>/gi;
      const curlyImgRe = /\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
      const bracketAssetRe = /<([^a-zA-Z\/!\s<>][^<>]*)>/g;
      const extractBracketName = (content) => { const p = content.lastIndexOf('|'); return p !== -1 ? content.substring(p + 1).trim() : content.trim(); };

      const chatData = character.chats[chatIdx];
      const messages = Array.isArray(chatData) ? chatData : (chatData?.message || []);

      let firstMessageText = '';
      try {
        const fmIndex = (chatData && !Array.isArray(chatData) && chatData.fmIndex != null) ? chatData.fmIndex : -1;
        if (fmIndex >= 0) {
          const altGreetings = character.alternateGreetings || character.alternate_greetings || (character.data && (character.data.alternateGreetings || character.data.alternate_greetings)) || [];
          firstMessageText = altGreetings[fmIndex] || '';
        }
        if (!firstMessageText) firstMessageText = character.firstMessage || character.firstmessage || character.first_mes || '';
        if (!firstMessageText && character.data) firstMessageText = character.data.firstMessage || character.data.firstmessage || character.data.first_mes || '';
      } catch (e) {}

      // 에셋 스캔
      const referencedNames = new Set();
      const allScanTargets = [...messages];
      if (firstMessageText) allScanTargets.unshift({ data: firstMessageText, role: 'char' });
      for (const msg of allScanTargets) {
        const raw = msg[msg.data !== undefined ? 'data' : 'mes'] || '';
        for (const tag of (raw.match(imgTagRe) || [])) { const resolved = resolveAssetName(extractImgRef(tag)); if (resolved) referencedNames.add(resolved); }
        let cm; const cRe = /\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
        while ((cm = cRe.exec(raw)) !== null) { const resolved = resolveAssetName(cm[1].trim()); if (resolved) referencedNames.add(resolved); }
        let em; const bRe = /<([^a-zA-Z\/!\s<>][^<>]*)>/g;
        while ((em = bRe.exec(raw)) !== null) { const resolved = resolveAssetName(extractBracketName(em[1])); if (resolved) referencedNames.add(resolved); }
        const rawLower = raw.toLowerCase();
        for (const aName of Object.keys(nameKeyMap)) {
          if (referencedNames.has(aName)) continue;
          const variants = [aName]; const noExt = aName.replace(/\.[^.]+$/, ''); if (noExt !== aName) variants.push(noExt);
          for (const v of variants) { if (!rawLower.includes(v.toLowerCase())) continue; const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if (new RegExp('<[^>]*' + esc + '[^>]*>|\\{\\{[^}]*' + esc + '[^}]*\\}\\}', 'i').test(raw)) { referencedNames.add(aName); break; } }
        }
        if (displayRegexScripts.length > 0) for (const name of resolveAssetsByRegex(raw)) referencedNames.add(name);
      }

      assetMap = {}; assetUrlMap = {};
      const loadPromises = [];
      for (const name of referencedNames) {
        const key = nameKeyMap[name];
        const url = getAssetRisuUrl(key); if (url) assetUrlMap[name] = url;
        loadPromises.push(getAssetDataUri(key).then(uri => { if (uri) assetMap[name] = uri; }).catch(() => {}));
      }
      if (loadPromises.length > 0) await Promise.all(loadPromises);

      const processRawContent = (rawContent) => {
        rawContent = rawContent.replace(curlyImgRe, (m, name) => { const resolved = resolveAssetName(name.trim()); return '\n{{ASSET:' + (resolved || name.trim()) + '}}\n'; });
        rawContent = rawContent.replace(imgTagRe, (m) => { const resolved = resolveAssetName(extractImgRef(m)); return resolved ? '\n{{ASSET:' + resolved + '}}\n' : m; });
        rawContent = rawContent.replace(bracketAssetRe, (m, content) => { const n = extractBracketName(content); const resolved = resolveAssetName(n); if (resolved) return '\n{{ASSET:' + resolved + '}}\n'; if (content.includes('|')) return '\n{{ASSET:' + n + '}}\n'; return m; });
        const rcLower = rawContent.toLowerCase();
        for (const aName of Object.keys(nameKeyMap)) {
          if (rawContent.includes('{{ASSET:' + aName + '}}')) continue;
          const variants = [aName]; const noExt = aName.replace(/\.[^.]+$/, ''); if (noExt !== aName) variants.push(noExt);
          for (const v of variants) { if (!rcLower.includes(v.toLowerCase())) continue; const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); rawContent = rawContent.replace(new RegExp('<[^>]*' + esc + '[^>]*>', 'gi'), '\n{{ASSET:' + aName + '}}\n'); rawContent = rawContent.replace(new RegExp('\\{\\{(?!ASSET:)[^}]*' + esc + '[^}]*\\}\\}', 'gi'), '\n{{ASSET:' + aName + '}}\n'); }
        }
        return rawContent;
      };

      const result = [];
      if (firstMessageText && firstMessageText.trim()) {
        const fmClean = stripHtml(processRawContent(firstMessageText));
        if (fmClean.trim()) result.push({ role: 'char', name: charName, text: fmClean, dbIndex: -1, isFirstMessage: true });
      }
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let rawContent = msg[msg.data !== undefined ? 'data' : 'mes'] || '';
        if (useTranslationCache && rawContent.trim()) {
          const tr = await findTranslationFromCache(rawContent);
          if (tr.found && tr.translation) rawContent = tr.translation;
        }
        rawContent = processRawContent(rawContent);
        const cleanText = stripHtml(rawContent);
        if (!cleanText.trim()) continue;
        let role = msg.role === 'user' ? 'user' : (msg.role === 'system' ? 'system' : 'char');
        let name = role === 'user' ? '유저' : (role === 'system' ? '시스템' : charName);
        result.push({ role, name, text: cleanText, dbIndex: i });
      }
      return { messages: result, charName };
    } catch (e) {
      console.error('ChatLogDiary: 채팅 로그 추출 실패:', e);
      return { messages: [], charName: '?' };
    }
  };

  // ========== 페르소나/단어 치환 ==========
  const getPersonaVariants = (name) => {
    if (!name) return [];
    return [name.trim()];
  };

  const applyPersona = (text) => {
    if (!personaName || !useUserTag) return text;
    let result = text;
    for (const v of getPersonaVariants(personaName)) {
      result = result.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '{{user}}');
    }
    return result;
  };

  const applyReplacements = (text) => {
    let result = text;
    for (const rep of replacements) {
      if (rep.from && rep.from.trim()) {
        result = result.replace(new RegExp(rep.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rep.to || '');
      }
    }
    return result;
  };

  // ========== 텍스트 스타일링 ==========
  const styleLine = (line, theme) => {
    const assetMatch = line.match(/^\{\{ASSET:([^}]+)\}\}$/);
    if (assetMatch) {
      const aName = assetMatch[1];
      if (includeImages && assetMap[aName]) return '<div style="text-align:center;margin:0.8em 0"><img src="' + assetMap[aName] + '" alt="' + escHtml(aName) + '" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15)"></div>';
      return '<span style="color:#888;font-size:0.9em;font-style:italic">[🖼️ ' + escHtml(aName) + ']</span>';
    }
    const dlg = theme.dialogue + ';font-weight:700';
    const thgt = theme.thought;
    const snd = theme.sound;
    const act = theme.action;
    // Full-line patterns
    const dMatch = line.match(/^["\u201C\u201F](.+)["\u201D\u201E]$/);
    if (dMatch) return '<span style="' + dlg + '">\u201C' + escHtml(dMatch[1]) + '\u201D</span>';
    const tMatch = line.match(/^['\u2018](.+)['\u2019]$/);
    if (tMatch) return '<span style="' + thgt + '">\u2018' + escHtml(tMatch[1]) + '\u2019</span>';
    const sMatch = line.match(/^\xA7(.+)\xA7$/);
    if (sMatch) return '<span style="' + snd + '">' + escHtml(sMatch[1]) + '</span>';
    const aMatch = line.match(/^\u25C7(.+)\u25C7$/);
    if (aMatch) return '<span style="' + act + '">\u25C7' + escHtml(aMatch[1]) + '\u25C7</span>';
    // Inline patterns
    let result = escHtml(line);
    result = result.replace(/(&quot;|["\u201C\u201F])(.+?)(&quot;|["\u201D\u201E])/g, '<span style="' + dlg + '">\u201C$2\u201D</span>');
    result = result.replace(/(['\u2018])(.+?)(['\u2019])/g, '<span style="' + thgt + '">\u2018$2\u2019</span>');
    result = result.replace(/\xA7(.+?)\xA7/g, '<span style="' + snd + '">$1</span>');
    result = result.replace(/\u25C7(.+?)\u25C7/g, '<span style="' + act + '">\u25C7$1\u25C7</span>');
    return result;
  };

  // ========== 본문 빌드 (메시지 배열 → HTML) ==========
  const buildBodyHtml = (msgIndices, theme) => {
    let body = '';
    let pendingSpacer = false;
    const pStyle = () => {
      if (pendingSpacer) { pendingSpacer = false; return theme.paragraph.replace('margin:0 0', 'margin:1.5em 0'); }
      return theme.paragraph;
    };
    for (const i of msgIndices) {
      const msg = allMessages[i];
      pendingSpacer = true;
      let displayName = applyReplacements(applyPersona(msg.name));
      let displayText = applyReplacements(applyPersona(msg.text));
      const isUser = msg.role === 'user';
      {
        const nameStyle = isUser ? theme.userName : theme.charName;
        body += '<p style="' + pStyle() + '"><span style="' + nameStyle + '">' + escHtml(displayName) + ':</span></p>';
      }
      if (msg.role === 'user') {
        for (const line of displayText.split('\n').filter(l => l.trim())) {
          body += '<p style="' + pStyle() + '"><span style="' + theme.userInput + '"><em>' + escHtml(line) + '</em></span></p>';
        }
        continue;
      }
      let prevWasEmpty = false;
      for (const line of displayText.split('\n')) {
        const trimLine = line.trim();
        if (!trimLine) { if (!prevWasEmpty) { pendingSpacer = true; prevWasEmpty = true; } continue; }
        prevWasEmpty = false;
        const styledContent = styleLine(trimLine, theme);
        if (styledContent.startsWith('<div')) {
          if (pendingSpacer) { pendingSpacer = false; body += styledContent.replace('<div style="', '<div style="margin-top:1.5em;'); }
          else body += styledContent;
        } else {
          body += '<p style="' + pStyle() + '">' + styledContent + '</p>';
        }
      }
    }
    return body;
  };

  // ========== 메인 HTML 생성 (LogDiary 스타일) ==========
  const buildStyledHtml = () => {
    if (allMessages.length === 0) return '';
    const theme = getTheme(currentTheme);
    const indices = [...selectedSet].sort((a, b) => a - b);
    if (indices.length === 0) return '';
    const isDark = currentTheme === 'dark';
    const font = "font-family:'Noto Serif KR','Noto Serif JP','Noto Serif SC','Noto Serif TC',Georgia,'Times New Roman',serif";
    const pName = personaName || personaDisplayName;
    const displayPName = (useUserTag && pName) ? '{{user}}' : pName;
    const effectiveCoverUri = (useCover && coverImageUri) ? coverImageUri : ((useCover && charImageUri) ? charImageUri : '');

    let h = '<div style="box-shadow:0 4px 16px rgba(0,0,0,0.1);max-width:900px;margin:5px auto;border-radius:1rem;background-color:' + theme.bg + ';padding:0 0 clamp(20px,4vw,30px) 0;' + font + ';font-size:clamp(13px,2.3vw,14.2px);" data-chatlog="true">';

    // -- 커버 섹션 --
    if (templateMode !== 'text-only') {
    h += '<div style="margin:0 0 30px 0;box-sizing:border-box;border-radius:16px 16px 0 0;background-color:' + theme.coverBg + ';">';
    if (effectiveCoverUri && templateMode === 'full') {
      h += '<div style="background-color:#1a1a1a;background-image:url(\'' + effectiveCoverUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\');background-size:' + coverZoom + '%;background-position:' + coverFocusX + '% ' + coverFocusY + '%;background-repeat:no-repeat;border-radius:16px 16px 0 0;display:table;">';
      h += '<div style="display:table-cell;vertical-align:bottom;height:min(68vw,615px);min-height:200px;padding:clamp(15px,3vw,20px) clamp(30px,5vw,40px);box-sizing:border-box;background:' + theme.coverGrad + ';border-radius:16px 16px 0 0;">';
    } else {
      h += '<div style="padding:clamp(20px,4vw,30px) clamp(30px,5vw,40px) clamp(15px,3vw,20px) clamp(30px,5vw,40px);">';
    }
    h += '<div style="font-size:clamp(10px,1.8vw,11px);color:' + theme.coverLabel + ';letter-spacing:clamp(2px,0.4vw,3px);margin:0 0 5px 0;' + font + ';">' + escHtml(coverLabel) + '</div>';
    h += '<div style="font-size:clamp(28px,5vw,42px);color:' + theme.coverTitle + ';margin:0;' + font + ';font-weight:700;line-height:1.1;">' + escHtml(charName) + '</div>';
    if (logTitle) h += '<div style="font-size:clamp(12px,2.2vw,14px);letter-spacing:-0.5px;color:' + theme.coverDesc + ';margin:5px 0 10px 0;' + font + ';max-width:90%;">' + escHtml(logTitle) + '</div>';
    // Gather all tags: model, prompt, custom
    const allTags = [];
    if (modelInfo) allTags.push(modelInfo);
    if (promptInfo) allTags.push(promptInfo);
    for (const t of customTags) { if (t && t.trim()) allTags.push(t.trim()); }
    if (allTags.length > 0) {
      const tgS = 'display:inline-block;background:' + theme.tagBg + ';color:' + theme.tagColor + ';padding:clamp(4px,0.8vw,5px) clamp(10px,2vw,12px);margin:0 clamp(6px,1.2vw,8px) clamp(6px,1.2vw,8px) 0;border:1px solid ' + theme.tagBorder + ';font-size:clamp(10px,1.8vw,11px);line-height:1.4;vertical-align:middle;' + font;
      h += '<div style="font-size:0;">';
      for (const tag of allTags) h += '<span style="' + tgS + '">' + escHtml(tag) + '</span> ';
      h += '</div>';
    }
    if (effectiveCoverUri && templateMode === 'full') h += '</div></div>';
    else h += '</div>';
    h += '</div>';
    } // end cover section

    // -- 프로필 섹션 --
    if (templateMode !== 'text-only') {
    h += '<div style="padding:0 0 10px 0;">';
    h += '<div style="padding:0 clamp(30px,5vw,50px) 10px clamp(30px,5vw,50px);text-align:center;">';
    h += '<span style="display:inline-block;font-size:clamp(11px,2vw,13px);font-weight:600;letter-spacing:clamp(1.5px,0.3vw,2px);color:' + theme.sectionColor + ';text-transform:uppercase;border-bottom:1px solid ' + theme.sectionBorder + ';padding-bottom:5px;margin-bottom:10px;">Profile</span>';
    h += '</div>';
    const profCard = (imgUri, label, name) => {
      let c = '<div style="display:table-cell;vertical-align:top;text-align:center;box-sizing:border-box;padding:0 clamp(10px,3vw,30px);width:50%;">';
      if (imgUri && includeHeaderImages) {
        c += '<div style="text-align:center;margin:0 auto 12px auto;"><img src="' + imgUri + '" alt="avatar" style="width:clamp(80px,22vw,200px);height:clamp(80px,22vw,200px);border-radius:50%;object-fit:cover;"></div>';
      }
      c += '<div style="text-align:center;">';
      c += '<div style="font-size:clamp(8px,1.3vw,10px);color:' + theme.profLabel + ';margin-bottom:3px;font-weight:600;text-transform:uppercase;' + font + ';">' + label + '</div>';
      c += '<div style="display:block;font-size:clamp(13px,2.5vw,18px);font-weight:700;' + font + ';color:' + theme.profName + ';line-height:1.2;margin-bottom:clamp(6px,1.5vw,10px);">' + escHtml(name) + '</div>';
      c += '</div></div>';
      return c;
    };
    h += '<div style="display:table;min-width:100%;margin-bottom:0;"><div style="display:table-row;">';
    h += profCard(charImageUri, 'CHAR', charName);
    if (pName) h += profCard(personaImageUri, 'USER', displayPName);
    h += '</div></div></div>';
    } // end profile section

    // -- 콘텐츠 섹션 (페이지 분할) --
    const splitSize = pageSplitSize > 0 ? pageSplitSize : indices.length;
    const pages = [];
    for (let i = 0; i < indices.length; i += splitSize) pages.push(indices.slice(i, i + splitSize));

    for (let pi = 0; pi < pages.length; pi++) {
      const pageIndices = pages[pi];
      const pageLabel = pages.length > 1 ? '#' + (pi + 1) + ' 본문' : '본문';
      const pageMsgCount = pageIndices.length + '개 메시지';

      h += '<details open style="margin:0;">';
      h += '<summary style="cursor:pointer;list-style:none;outline:none;color:inherit;font-weight:normal;">';
      h += '<div style="display:table;min-width:100%;"><div style="display:table-row;">';
      h += '<div style="display:table-cell;vertical-align:middle;">';
      h += '<div style="display:table;min-width:100%;padding:clamp(15px,3vw,20px) 0;">';
      h += '<div style="display:table-cell;vertical-align:middle;padding-left:clamp(30px,5vw,50px);">';
      h += '<div style="font-size:clamp(14px,2.5vw,16px);font-weight:700;color:' + theme.pageTitle + ';margin-bottom:4px;' + font + ';line-height:1.3;">' + pageLabel + '</div>';
      h += '<div style="font-size:clamp(11px,2vw,12px);color:' + theme.pageSub + ';' + font + ';line-height:1.4;">' + pageMsgCount + '</div>';
      h += '</div></div></div>';
      h += '<div style="display:table-cell;vertical-align:middle;width:clamp(50px,10vw,70px);text-align:right;padding-right:clamp(30px,5vw,50px);">';
      h += '<span style="font-size:clamp(16px,3vw,20px);color:' + theme.chevron + ';">\u2335</span>';
      h += '</div></div></div></summary>';
      let innerExtra = theme.innerWrap;
      if (bodyFontSize > 0 && FS_OPTIONS[bodyFontSize]) innerExtra += ';font-size:' + FS_OPTIONS[bodyFontSize];
      if (bodyLineHeight > 0 && LH_OPTIONS[bodyLineHeight]) innerExtra += ';line-height:' + LH_OPTIONS[bodyLineHeight];
      h += '<div style="padding:clamp(15px,3vw,20px) clamp(30px,5vw,50px);' + innerExtra + '">';
      h += buildBodyHtml(pageIndices, theme);
      h += '</div></details>';

      if (pi < pages.length - 1) {
        h += '<div style="height:1px;background-color:' + theme.divider + ';margin:0 clamp(30px,5vw,50px);"></div>';
      }
    }

    const wmColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    h += '<div style="text-align:right;padding:8px clamp(30px,5vw,50px) 0;font-size:10px;color:' + wmColor + ';' + font + ';letter-spacing:0.02em;">Made by Chat Log Diary</div>';
    h += '</div>';
    return h;
  };

  const buildPlainText = () => {
    if (allMessages.length === 0) return '';
    const indices = [...selectedSet].sort((a, b) => a - b);
    if (indices.length === 0) return '';
    let header = '';
    if (modelInfo) header += '🤖 모델: ' + modelInfo + '\n';
    if (promptInfo) header += '📝 프롬프트: ' + promptInfo + '\n';
    if (header) header += '\n';
    return header + indices.map(i => { const m = allMessages[i]; return applyReplacements(applyPersona(m.name)) + ':\n' + applyReplacements(applyPersona(m.text)); }).join('\n\n');
  };

  // ========== 모바일 HTML 빌드 (삼성 클립보드 호환) ==========
  const buildMobileHtml = async () => {
    const origAssetMap = assetMap;
    const origCharImg = charImageUri;
    const origPersonaImg = personaImageUri;
    const origCoverImg = coverImageUri;
    const mobileMap = {};
    let hasDataUriFallback = false;
    for (const name of Object.keys(origAssetMap)) {
      if (assetUrlMap[name]) {
        mobileMap[name] = assetUrlMap[name];
      } else {
        mobileMap[name] = origAssetMap[name];
        if (origAssetMap[name] && origAssetMap[name].startsWith('data:')) hasDataUriFallback = true;
      }
    }
    assetMap = mobileMap;
    charImageUri = charImageUrl || origCharImg;
    personaImageUri = personaImageUrl || origPersonaImg;
    if (!charImageUrl && origCharImg && origCharImg.startsWith('data:')) hasDataUriFallback = true;
    if (!personaImageUrl && origPersonaImg && origPersonaImg.startsWith('data:')) hasDataUriFallback = true;
    // Cover image: if it's a user-uploaded data URI, compress it
    if (coverImageUri && coverImageUri.startsWith('data:')) hasDataUriFallback = true;
    let html;
    try {
      html = buildStyledHtml();
    } finally {
      assetMap = origAssetMap;
      charImageUri = origCharImg;
      personaImageUri = origPersonaImg;
      coverImageUri = origCoverImg;
    }
    if (hasDataUriFallback) {
      html = await compressDataUrisInHtml(html, 800, 0.7);
    }
    return html;
  };

  // ========== UI 구축 ==========
  const setupUI = () => {
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; }
      #log-overlay { display:none; position:fixed; inset:0; z-index:99999; background:#0d1117; overflow:hidden; }
      .top-bar { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#161b22; border-bottom:1px solid #30363d; flex-shrink:0; }
      .top-bar .title { font-size:14px; font-weight:700; color:#f0f6fc; white-space:nowrap; }
      .top-bar .info { font-size:12px; color:#8b949e; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .top-bar .spacer { flex:1; }
      .tab-bar { display:flex; gap:4px; padding:4px 12px; background:#161b22; border-bottom:1px solid #30363d; flex-shrink:0; }
      .tab-bar .tab { padding:6px 12px; font-size:13px; color:#8b949e; cursor:pointer; border-radius:6px; border:none; background:transparent; }
      .tab-bar .tab.active { background:#21262d; color:#f0f6fc; }
      .main-area { flex:1; overflow-y:auto; padding:0; position:relative; }
      .btn { display:inline-block; padding:6px 12px; font-size:12px; border-radius:6px; border:1px solid #30363d; background:#21262d; color:#c9d1d9; cursor:pointer; white-space:nowrap; }
      .btn:active { opacity:0.7; }
      .btn-primary { background:#238636; border-color:#2ea043; color:#fff; }
      .btn-danger { background:#da3633; border-color:#f85149; color:#fff; }
      .btn-copied { background:#238636 !important; border-color:#2ea043 !important; color:#fff !important; }
      .btn-close { background:transparent; border:none; color:#8b949e; font-size:20px; cursor:pointer; padding:4px 8px; }

      /* 메시지 목록 */
      .msg-block { padding:8px 12px; border-bottom:1px solid #21262d; cursor:pointer; }
      .msg-block.dimmed { opacity:0.35; }
      .msg-block .msg-header { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
      .msg-block .msg-role { font-size:12px; font-weight:600; padding:2px 6px; border-radius:4px; }
      .msg-block .msg-role.char { background:#1f3d1f; color:#3fb950; }
      .msg-block .msg-role.user { background:#1f2d3d; color:#58a6ff; }
      .msg-block .msg-idx { font-size:11px; color:#484f58; margin-left:auto; }
      .msg-block .msg-text { font-size:12px; color:#8b949e; max-height:60px; overflow:hidden; line-height:1.4; word-break:break-all; }
      .msg-check { width:16px; height:16px; accent-color:#58a6ff; }
      .msg-asset-badge { display:inline-block;background:#1f2d3d;color:#58a6ff;padding:1px 5px;border-radius:3px;font-size:11px;margin:0 2px; }

      /* 미리보기 */
      #preview-wrap { display:none; position:absolute; inset:0; }
      #preview-wrap.visible { display:block; }
      #preview-frame { width:100%; height:100%; border:none; }

      /* 설정 드로어 */
      .drawer-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; }
      .drawer-overlay.open { display:block; }
      .settings-drawer { position:fixed; top:0; right:-320px; width:300px; max-width:85vw; height:100%; background:#161b22; border-left:1px solid #30363d; z-index:101; overflow-y:auto; transition:right 0.25s ease; padding:12px; }
      .settings-drawer.open { right:0; }
      .se-group { margin-bottom:14px; }
      .se-label { font-size:12px; color:#8b949e; margin-bottom:6px; display:block; font-weight:600; }
      .se-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
      .se-input { width:100%; padding:6px 8px; background:#0d1117; border:1px solid #30363d; border-radius:6px; color:#c9d1d9; font-size:13px; }
      .se-input:focus { border-color:#58a6ff; outline:none; }
      .se-input-sm { width:60px; padding:4px 6px; background:#0d1117; border:1px solid #30363d; border-radius:4px; color:#c9d1d9; font-size:12px; text-align:center; }
      .se-check { display:flex; align-items:center; gap:6px; font-size:12px; color:#c9d1d9; cursor:pointer; }
      .se-check input { accent-color:#58a6ff; }
      .theme-chip { display:inline-block; width:28px; height:28px; border-radius:50%; border:2px solid transparent; cursor:pointer; margin:0 4px; }
      .theme-chip.active { border-color:#58a6ff; box-shadow:0 0 0 2px rgba(88,166,255,0.4); }

      /* 하단 액션 바 */
      .bottom-bar { display:flex; gap:6px; padding:8px 12px; background:#161b22; border-top:1px solid #30363d; flex-shrink:0; align-items:center; }
      .bottom-bar .spacer { flex:1; }

      /* 커버 이미지 미리보기 */
      .cover-preview { max-width:100%; max-height:100px; border-radius:6px; margin-top:6px; border:1px solid #30363d; }

      /* 치환 규칙 */
      .rep-row { display:flex; gap:4px; align-items:center; margin-bottom:4px; }
      .rep-row input { flex:1; }
      .rep-remove { background:none; border:none; color:#da3633; cursor:pointer; font-size:16px; padding:0 4px; }

      /* 범위 힌트 */
      #range-hint { font-size:11px; color:#484f58; margin-top:4px; }

      /* UI Light Mode */
      .ui-light #log-overlay { background:#f6f8fa; }
      .ui-light .top-bar { background:#ffffff; border-bottom-color:#d0d7de; }
      .ui-light .top-bar .title { color:#1f2328; }
      .ui-light .top-bar .info { color:#656d76; }
      .ui-light .tab-bar { background:#ffffff; border-bottom-color:#d0d7de; }
      .ui-light .tab-bar .tab { color:#656d76; }
      .ui-light .tab-bar .tab.active { background:#ddf4ff; color:#0969da; }
      .ui-light .btn { background:#f6f8fa; border-color:#d0d7de; color:#1f2328; }
      .ui-light .btn-primary { background:#2da44e; border-color:#2da44e; color:#fff; }
      .ui-light .btn-close { color:#656d76; }
      .ui-light .msg-block { border-bottom-color:#d0d7de; }
      .ui-light .msg-block .msg-text { color:#656d76; }
      .ui-light .msg-block .msg-idx { color:#8c959f; }
      .ui-light .bottom-bar { background:#ffffff; border-top-color:#d0d7de; }
      .ui-light .settings-drawer { background:#ffffff; border-left-color:#d0d7de; }
      .ui-light .se-label { color:#656d76; }
      .ui-light .se-input, .ui-light .se-input-sm { background:#f6f8fa; border-color:#d0d7de; color:#1f2328; }
      .ui-light .se-check { color:#1f2328; }
      .ui-light #range-hint { color:#8c959f; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'log-overlay';
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;">
        <div class="top-bar">
          <span class="title">📖 Chat Log Diary</span>
          <span class="info" id="log-info"></span>
          <span class="spacer"></span>
          <button class="btn" id="btn-ui-mode" style="font-size:12px;">🌞</button>
          <button class="btn" id="btn-settings">⚙️</button>
          <button class="btn-close" id="btn-close">✕</button>
        </div>
        <div class="tab-bar">
          <button class="tab active" data-view="list">📋 목록</button>
          <button class="tab" data-view="preview">👁️ 미리보기</button>
        </div>
        <div class="main-area">
          <div id="log-content"></div>
          <div id="preview-wrap"><iframe id="preview-frame"></iframe></div>
        </div>
        <div class="bottom-bar">
          <button class="btn btn-primary" id="btn-copy-html">📋 HTML 복사</button>
          <button class="btn" id="btn-copy-text">📄 텍스트</button>
          <span class="spacer"></span>
          <span id="range-hint"></span>
        </div>
      </div>

      <div class="drawer-overlay" id="drawer-overlay"></div>
      <div class="settings-drawer" id="settings-drawer">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <span style="font-size:14px;font-weight:700;color:#f0f6fc;">⚙️ 설정</span>
          <button class="btn-close" id="btn-drawer-close" style="font-size:18px;">✕</button>
        </div>

        <div class="se-group">
          <label class="se-label">🎨 테마</label>
          <div class="se-row" id="theme-chips"></div>
        </div>

        <div class="se-group">
          <label class="se-label">📐 메시지 범위</label>
          <div class="se-row">
            <input type="number" class="se-input-sm" id="range-start" min="1" value="1">
            <span style="color:#484f58;">~</span>
            <input type="number" class="se-input-sm" id="range-end" min="1" value="1">
            <button class="btn" id="btn-apply-range" style="font-size:11px;padding:4px 8px;">적용</button>
          </div>
          <div class="se-row" style="gap:4px;">
            <button class="btn" id="btn-sel-all" style="font-size:11px;padding:3px 8px;">전체</button>
            <button class="btn" id="btn-sel-none" style="font-size:11px;padding:3px 8px;">해제</button>
            <button class="btn" id="btn-sel-nouser" style="font-size:11px;padding:3px 8px;">유저 제외</button>
          </div>
          <div class="se-row" style="gap:4px;">
            <span style="font-size:11px;color:#8b949e;">앞</span>
            <input type="number" class="se-input-sm" id="front-n" min="1" value="10" style="width:45px;">
            <button class="btn" id="btn-sel-front" style="font-size:11px;padding:3px 8px;">선택</button>
            <span style="font-size:11px;color:#8b949e;margin-left:4px;">뒤</span>
            <input type="number" class="se-input-sm" id="back-n" min="1" value="10" style="width:45px;">
            <button class="btn" id="btn-sel-back" style="font-size:11px;padding:3px 8px;">선택</button>
          </div>
        </div>

        <div class="se-group">
          <label class="se-label">📝 로그 제목</label>
          <input type="text" class="se-input" id="input-title" placeholder="선택사항">
        </div>

        <div class="se-group">
          <label class="se-label">📌 표지 상단 문구</label>
          <input type="text" class="se-input" id="input-cover-label" placeholder="CHAT LOG" value="CHAT LOG">
        </div>

        <div class="se-group">
          <label class="se-label">📄 본문 제목</label>
          <input type="text" class="se-input" id="input-page-title" placeholder="Page Title (기본: 본문)" style="margin-bottom:4px;">
          <input type="text" class="se-input" id="input-page-subtitle" placeholder="Page Subtitle (기본: N개 메시지)">
        </div>

        <div class="se-group">
          <label class="se-label">👤 페르소나</label>
          <div class="se-row">
            <select class="se-input" id="persona-select" style="flex:1;"><option value="">자동 감지</option></select>
          </div>
          <label class="se-check" style="margin-top:4px;"><input type="checkbox" id="chk-usertag"> 페르소나 이름 → {'{'+'{'+'user}}'}</label>
        </div>

        <div class="se-group">
          <label class="se-label">🤖 모델 / 프롬프트</label>
          <input type="text" class="se-input" id="input-model" placeholder="모델명" style="margin-bottom:4px;">
          <input type="text" class="se-input" id="input-prompt" placeholder="프롬프트명">
        </div>

        <div class="se-group">
          <label class="se-label">🏷️ 태그</label>
          <div id="tag-list"></div>
          <button class="btn" id="btn-add-tag" style="font-size:11px;margin-top:4px;">+ 태그 추가</button>
        </div>

        <div class="se-group">
          <label class="se-label">🖼️ 표지 이미지</label>
          <div class="se-row" style="margin-bottom:6px;">
            <span style="font-size:12px;color:#8b949e;">템플릿:</span>
            <select class="se-input" id="template-mode" style="flex:1;">
              <option value="full">표지 + 프로필 + 본문</option>
              <option value="no-cover">프로필 + 본문</option>
              <option value="text-only">본문만</option>
            </select>
          </div>
          <div class="se-row">
            <label class="btn" style="flex:1;text-align:center;cursor:pointer;">📷 업로드<input type="file" id="cover-upload" accept="image/*" style="display:none;"></label>
            <button class="btn btn-danger" id="btn-cover-remove" style="display:none;font-size:11px;">🗑️</button>
          </div>
          <img id="cover-preview" class="cover-preview" style="display:none;">
          <div id="cover-controls" style="display:none;margin-top:6px;">
            <div class="se-row" style="margin-bottom:4px;">
              <span style="font-size:11px;color:#8b949e;width:50px;">Zoom</span>
              <input type="range" id="cover-zoom" min="100" max="300" value="100" style="flex:1;accent-color:#58a6ff;">
              <span id="cover-zoom-val" style="font-size:11px;color:#8b949e;width:30px;text-align:right;">100%</span>
            </div>
            <div class="se-row" style="margin-bottom:4px;">
              <span style="font-size:11px;color:#8b949e;width:50px;">Focus X</span>
              <input type="range" id="cover-focus-x" min="0" max="100" value="50" style="flex:1;accent-color:#58a6ff;">
              <span id="cover-fx-val" style="font-size:11px;color:#8b949e;width:30px;text-align:right;">50%</span>
            </div>
            <div class="se-row">
              <span style="font-size:11px;color:#8b949e;width:50px;">Focus Y</span>
              <input type="range" id="cover-focus-y" min="0" max="100" value="50" style="flex:1;accent-color:#58a6ff;">
              <span id="cover-fy-val" style="font-size:11px;color:#8b949e;width:30px;text-align:right;">50%</span>
            </div>
          </div>
        </div>

        <div class="se-group">
          <label class="se-label">⚙️ 옵션</label>
          <label class="se-check"><input type="checkbox" id="chk-images" checked> 본문 이미지 포함</label>
          <label class="se-check"><input type="checkbox" id="chk-translation"> 번역문 사용</label>
        </div>

        <div class="se-group">
          <label class="se-label">🔤 본문 글자 크기 / 줄 간격</label>
          <div class="se-row">
            <span style="font-size:11px;color:#8b949e;width:50px;">크기</span>
            <input type="range" id="body-fontsize" min="0" max="5" value="0" style="flex:1;accent-color:#58a6ff;">
            <span id="body-fs-val" style="font-size:11px;color:#8b949e;width:40px;text-align:right;">기본</span>
          </div>
          <div class="se-row">
            <span style="font-size:11px;color:#8b949e;width:50px;">간격</span>
            <input type="range" id="body-lineheight" min="0" max="5" value="0" style="flex:1;accent-color:#58a6ff;">
            <span id="body-lh-val" style="font-size:11px;color:#8b949e;width:40px;text-align:right;">기본</span>
          </div>
        </div>

        <div class="se-group">
          <label class="se-label">📄 페이지 분할</label>
          <div class="se-row">
            <input type="number" class="se-input-sm" id="input-splitsize" value="30" min="0" max="500">
            <span style="font-size:12px;color:#8b949e;">개씩 (0=분할안함)</span>
          </div>
        </div>

        <div class="se-group">
          <label class="se-label">🔄 단어 치환</label>
          <div id="rep-list"></div>
          <button class="btn" id="btn-add-rep" style="font-size:11px;margin-top:4px;">+ 추가</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // ========== 이벤트 바인딩 ==========
    const $ = (id) => document.getElementById(id);

    $('btn-close').addEventListener('click', closePanel);

    const openDrawer = () => { $('drawer-overlay').classList.add('open'); $('settings-drawer').classList.add('open'); };
    const closeDrawer = () => { $('drawer-overlay').classList.remove('open'); $('settings-drawer').classList.remove('open'); };
    $('btn-ui-mode').addEventListener('click', () => {
      uiDarkMode = !uiDarkMode;
      document.body.classList.toggle('ui-light', !uiDarkMode);
      $('btn-ui-mode').textContent = uiDarkMode ? '\u{1F31E}' : '\u{1F319}';
    });
    $('btn-settings').addEventListener('click', openDrawer);
    $('btn-drawer-close').addEventListener('click', closeDrawer);
    $('drawer-overlay').addEventListener('click', closeDrawer);

    overlay.querySelectorAll('.tab-bar .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        viewMode = tab.dataset.view;
        if (viewMode === 'preview') {
          $('log-content').style.display = 'none';
          $('preview-wrap').classList.add('visible');
          renderPreview();
        } else {
          $('log-content').style.display = '';
          $('preview-wrap').classList.remove('visible');
        }
      });
    });

    const themeChips = $('theme-chips');
    const themeColors = { navy: '#162a3e', dark: '#0d1117', cream: '#faf8f3', rose: '#fdf2f4', custom1: '#7c3aed', custom2: '#ec4899' };
    const allThemeEntries = [...Object.entries(THEMES), ...Object.entries(customThemes)];
    for (const [key, theme] of allThemeEntries) {
      const chip = document.createElement('span');
      chip.className = 'theme-chip' + (key === currentTheme ? ' active' : '');
      chip.style.background = themeColors[key] || theme.bg;
      chip.title = theme.name;
      chip.dataset.theme = key;
      chip.addEventListener('click', () => {
        currentTheme = key;
        themeChips.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (viewMode === 'preview') renderPreview();
      });
      themeChips.appendChild(chip);
    }

    $('btn-copy-html').addEventListener('click', async () => {
      try {
        let html = await buildMobileHtml();
        if (!html) return;
        html = html.replaceAll(' data-chatlog="true"', '');
        await copyMobileHtml(html, $('btn-copy-html'), '\u{1F4CB} HTML \uBCF5\uC0AC');
      } catch (err) {
        console.error('ChatLogDiary: HTML copy failed:', err);
        try {
          let html = buildStyledHtml();
          if (html) {
            html = html.replaceAll(' data-chatlog="true"', '');
            copyMobileHtml(html, $('btn-copy-html'), '\u{1F4CB} HTML \uBCF5\uC0AC');
          }
        } catch (e2) {
          try { await navigator.clipboard.writeText(buildStyledHtml()); showCopied($('btn-copy-html'), '\u{1F4CB} HTML \uBCF5\uC0AC'); } catch (e3) {}
        }
      }
    });
    $('btn-copy-text').addEventListener('click', () => {
      const text = buildPlainText();
      if (text) copyToClipboard(text, $('btn-copy-text'), '\u{1F4C4} \uD14D\uC2A4\uD2B8');
    });

    $('input-title').addEventListener('input', (e) => { logTitle = e.target.value; });
    $('input-cover-label').addEventListener('input', (e) => { coverLabel = e.target.value || 'CHAT LOG'; });
    $('input-page-title').addEventListener('input', (e) => { customPageTitle = e.target.value; });
    $('input-page-subtitle').addEventListener('input', (e) => { customPageSubtitle = e.target.value; });
    $('input-model').addEventListener('input', (e) => { modelInfo = e.target.value; });
    $('input-prompt').addEventListener('input', (e) => { promptInfo = e.target.value; });
    $('chk-images').addEventListener('change', (e) => { includeImages = e.target.checked; });
    $('chk-translation').addEventListener('change', (e) => { useTranslationCache = e.target.checked; });
    $('chk-usertag').addEventListener('change', (e) => { useUserTag = e.target.checked; });
    $('template-mode').addEventListener('change', (e) => {
      templateMode = e.target.value;
      useCover = templateMode === 'full';
      includeHeaderImages = templateMode !== 'text-only';
    });
    $('input-splitsize').addEventListener('change', (e) => { pageSplitSize = parseInt(e.target.value, 10) || 0; });
    const FS_LABELS = ['\uAE30\uBCF8', '13px', '14px', '15px', '16px', '18px'];
    const LH_LABELS = ['\uAE30\uBCF8', '1.5', '1.7', '1.9', '2.0', '2.2'];
    $('body-fontsize').addEventListener('input', (e) => { bodyFontSize = parseInt(e.target.value, 10); $('body-fs-val').textContent = FS_LABELS[bodyFontSize] || '\uAE30\uBCF8'; });
    $('body-lineheight').addEventListener('input', (e) => { bodyLineHeight = parseInt(e.target.value, 10); $('body-lh-val').textContent = LH_LABELS[bodyLineHeight] || '\uAE30\uBCF8'; });

    $('cover-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('\uC774\uBBF8\uC9C0 \uD06C\uAE30\uB294 5MB \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        coverImageUri = ev.target.result;
        $('cover-preview').src = coverImageUri;
        $('cover-preview').style.display = 'block';
        $('btn-cover-remove').style.display = 'inline-block';
        $('cover-controls').style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
    $('btn-cover-remove').addEventListener('click', () => {
      coverImageUri = '';
      $('cover-preview').src = '';
      $('cover-preview').style.display = 'none';
      $('btn-cover-remove').style.display = 'none';
      $('cover-controls').style.display = 'none';
      $('cover-upload').value = '';
    });
    $('cover-zoom').addEventListener('input', (e) => { coverZoom = parseInt(e.target.value, 10); $('cover-zoom-val').textContent = coverZoom + '%'; });
    $('cover-focus-x').addEventListener('input', (e) => { coverFocusX = parseInt(e.target.value, 10); $('cover-fx-val').textContent = coverFocusX + '%'; });
    $('cover-focus-y').addEventListener('input', (e) => { coverFocusY = parseInt(e.target.value, 10); $('cover-fy-val').textContent = coverFocusY + '%'; });

    const loadPersonaListFn = async () => {
      try {
        const db = await Risuai.getDatabase();
        const personas = db.personas || [];
        const sel = $('persona-select');
        sel.innerHTML = '<option value="">\uC790\uB3D9 \uAC10\uC9C0</option>';
        for (let i = 0; i < personas.length; i++) {
          const p = personas[i];
          const opt = document.createElement('option');
          opt.value = p.name || ('\uD398\uB974\uC18C\uB098 ' + (i + 1));
          opt.textContent = p.name || ('\uD398\uB974\uC18C\uB098 ' + (i + 1));
          sel.appendChild(opt);
        }
        if (personaDisplayName) sel.value = personaDisplayName;
      } catch (e) {}
    };
    loadPersonaList = loadPersonaListFn;
    $('persona-select').addEventListener('change', async (e) => {
      const val = e.target.value;
      personaName = val;
      if (val) {
        try {
          const db = await Risuai.getDatabase();
          const match = (db.personas || []).find(p => p.name === val);
          if (match && match.icon) {
            const uri = await getAssetDataUri(match.icon);
            if (uri) personaImageUri = uri;
            personaImageUrl = getAssetRisuUrl(match.icon);
          }
        } catch (e) {}
      }
    });

    $('btn-apply-range').addEventListener('click', applyRange);
    $('btn-sel-all').addEventListener('click', selectAll);
    $('btn-sel-none').addEventListener('click', selectNone);
    $('btn-sel-nouser').addEventListener('click', deselectUser);
    $('btn-sel-front').addEventListener('click', () => {
      const n = parseInt($('front-n').value, 10) || 10;
      selectedSet.clear();
      for (let i = 0; i < Math.min(n, allMessages.length); i++) selectedSet.add(i);
      renderMessages(); updateRangeHint();
      if (viewMode === 'preview') renderPreview();
    });
    $('btn-sel-back').addEventListener('click', () => {
      const n = parseInt($('back-n').value, 10) || 10;
      selectedSet.clear();
      const start = Math.max(0, allMessages.length - n);
      for (let i = start; i < allMessages.length; i++) selectedSet.add(i);
      renderMessages(); updateRangeHint();
      if (viewMode === 'preview') renderPreview();
    });

    const renderRepList = () => {
      const list = $('rep-list');
      list.innerHTML = '';
      replacements.forEach((rep, i) => {
        const row = document.createElement('div');
        row.className = 'rep-row';
        row.innerHTML = '<input class="se-input" placeholder="\uCC3E\uAE30" style="flex:1;font-size:12px;padding:4px 6px;">' +
          '<input class="se-input" placeholder="\uBC14\uAFB8\uAE30" style="flex:1;font-size:12px;padding:4px 6px;">' +
          '<button class="rep-remove">\u2715</button>';
        const inputs = row.querySelectorAll('input');
        inputs[0].value = rep.from || '';
        inputs[1].value = rep.to || '';
        inputs[0].addEventListener('input', (e) => { replacements[i].from = e.target.value; });
        inputs[1].addEventListener('input', (e) => { replacements[i].to = e.target.value; });
        row.querySelector('.rep-remove').addEventListener('click', () => { replacements.splice(i, 1); renderRepList(); });
        list.appendChild(row);
      });
    };
    $('btn-add-rep').addEventListener('click', () => { replacements.push({ from: '', to: '' }); renderRepList(); });

    const renderTagList = () => {
      const list = $('tag-list');
      list.innerHTML = '';
      customTags.forEach((tag, i) => {
        const row = document.createElement('div');
        row.className = 'rep-row';
        row.innerHTML = '<input class="se-input" placeholder="\uD0DC\uADF8 \uD14D\uC2A4\uD2B8" style="flex:1;font-size:12px;padding:4px 6px;">' +
          '<button class="rep-remove">\u2715</button>';
        const input = row.querySelector('input');
        input.value = tag || '';
        input.addEventListener('input', (e) => { customTags[i] = e.target.value; });
        row.querySelector('.rep-remove').addEventListener('click', () => { customTags.splice(i, 1); renderTagList(); });
        list.appendChild(row);
      });
    };
    $('btn-add-tag').addEventListener('click', () => { customTags.push(''); renderTagList(); });
  };

  // ========== 범위 관리 ==========
  const applyRange = () => {
    const si = document.getElementById('range-start');
    const ei = document.getElementById('range-end');
    let s = parseInt(si.value, 10) - 1;
    let e = parseInt(ei.value, 10) - 1;
    if (isNaN(s) || s < 0) s = 0;
    if (isNaN(e) || e < 0) e = allMessages.length - 1;
    if (s > allMessages.length - 1) s = allMessages.length - 1;
    if (e > allMessages.length - 1) e = allMessages.length - 1;
    if (s > e) { const t = s; s = e; e = t; }
    rangeStart = s; rangeEnd = e;
    si.value = s + 1; ei.value = e + 1;
    selectedSet.clear();
    for (let i = s; i <= e; i++) selectedSet.add(i);
    renderMessages();
    updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const selectAll = () => {
    selectedSet.clear();
    for (let i = 0; i < allMessages.length; i++) selectedSet.add(i);
    rangeStart = 0; rangeEnd = allMessages.length - 1;
    const si = document.getElementById('range-start');
    const ei = document.getElementById('range-end');
    if (si) si.value = 1;
    if (ei) ei.value = allMessages.length;
    renderMessages(); updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const selectNone = () => {
    selectedSet.clear();
    renderMessages(); updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const deselectUser = () => {
    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i].role === 'user' && selectedSet.has(i)) selectedSet.delete(i);
    }
    renderMessages(); updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const toggleSelect = (idx) => {
    if (selectedSet.has(idx)) selectedSet.delete(idx);
    else selectedSet.add(idx);
    updateRangeHint();
    const block = document.querySelector('.msg-block[data-idx="' + idx + '"]');
    if (block) {
      block.classList.toggle('dimmed', !selectedSet.has(idx));
      const cb = block.querySelector('.msg-check');
      if (cb) cb.checked = selectedSet.has(idx);
    }
    if (viewMode === 'preview') renderPreview();
  };

  const updateRangeHint = () => {
    const el = document.getElementById('range-hint');
    if (el) el.textContent = '\uC120\uD0DD: ' + selectedSet.size + '\uAC1C / \uC804\uCCB4: ' + allMessages.length + '\uAC1C';
  };

  // ========== 메시지 목록 렌더링 ==========
  const renderMessages = () => {
    const content = document.getElementById('log-content');
    if (allMessages.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:#484f58;">\uCC44\uD305 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      return;
    }
    let html = '';
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const selected = selectedSet.has(i);
      const dimClass = selected ? '' : ' dimmed';
      let escapedText = msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      escapedText = escapedText.replace(/\{\{ASSET:([^}]+)\}\}/g, '<span class="msg-asset-badge">\u{1F5BC}\uFE0F $1</span>');
      const fmClass = msg.isFirstMessage ? ' first-message' : '';
      const idxLabel = msg.isFirstMessage ? '\u{1F4CC} First' : '#' + (i + 1);
      html += '<div class="msg-block ' + msg.role + dimClass + fmClass + '" data-idx="' + i + '">';
      html += '<div class="msg-header"><input type="checkbox" class="msg-check" ' + (selected ? 'checked' : '') + '><span class="msg-role ' + msg.role + '">' + msg.name + '</span><span class="msg-idx">' + idxLabel + '</span></div>';
      html += '<div class="msg-text">' + escapedText.replace(/\n/g, '<br>') + '</div></div>';
    }
    content.innerHTML = html;

    content.querySelectorAll('.msg-block').forEach(block => {
      const idx = parseInt(block.dataset.idx);
      block.addEventListener('click', (e) => { if (e.target.classList.contains('msg-check')) return; toggleSelect(idx); });
      const cb = block.querySelector('.msg-check');
      if (cb) cb.addEventListener('change', () => toggleSelect(idx));
    });
  };

  // ========== 미리보기 ==========
  const renderPreview = () => {
    let html = buildStyledHtml();
    if (!html) return;
    const theme = getTheme(currentTheme);
    const pageBg = theme.pageBg || '#1a1a1a';
    const frame = document.getElementById('preview-frame');
    const fullPage = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'
      + 'html, body { margin: 0; padding: 20px; background: ' + pageBg + '; min-height: 100%; }'
      + '* { box-sizing: border-box; }'
      + '</style></head><body>' + html + '</body></html>';
    frame.srcdoc = fullPage;
  };

  // ========== 메인 진입 ==========
  const showLog = async () => {
    viewMode = 'list';
    const overlay = document.getElementById('log-overlay');
    overlay.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'list'));
    document.getElementById('log-content').style.display = '';
    document.getElementById('preview-wrap').classList.remove('visible');

    const { messages } = await extractChatLog();
    if (loadPersonaList) await loadPersonaList();
    allMessages = messages;
    document.getElementById('log-info').textContent = messages.length > 0
      ? ' \xB7 ' + messages.length + '\uAC1C \xB7 ' + charName : '';
    rangeStart = 0;
    rangeEnd = Math.max(0, messages.length - 1);
    selectedSet.clear();
    for (let i = 0; i < messages.length; i++) selectedSet.add(i);
    const si = document.getElementById('range-start');
    const ei = document.getElementById('range-end');
    si.value = 1; si.max = messages.length;
    ei.value = messages.length; ei.max = messages.length;
    updateRangeHint();
    renderMessages();
    overlay.style.display = 'block';
    await Risuai.showContainer('fullscreen');
  };

  // ========== 버튼 등록 ==========
  const registerBtn = async () => {
    if (buttonRef) { try { await Risuai.unregisterUIPart(buttonRef.id); } catch (e) {} buttonRef = null; }
    buttonRef = await Risuai.registerButton({
      name: 'ChatLogDiary',
      icon: '\u{1F4D6}',
      iconType: 'html',
      location: 'chat'
    }, showLog);
  };

  // ========== 초기화 ==========
  setupUI();
  try {
    await registerBtn();
    console.log('ChatLogDiary v1.0 \uD50C\uB7EC\uADF8\uC778\uC774 \uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
  } catch (error) {
    console.log('ChatLogDiary Error: ' + error.message);
  }
})();
