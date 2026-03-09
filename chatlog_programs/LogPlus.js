//@name LogPlus
//@display-name 📋 Log plus
//@api 3.0
//@version 1.3.8
//@update-url https://host-ashen.vercel.app/LogPlus.js

(async () => {
  let buttonRef = null;
  let allMessages = [];
  let rangeStart = 0;
  let rangeEnd = 0;
  let selectedSet = new Set();
  let charName = '캐릭터';
  let currentTheme = 'archive-navy';
  let viewMode = 'list';
  let boldQuotes = true;
  let boldFlags = { dialogue: true, thought: false, sound: true, action: false, narration: false };
  let highlightIdx = -1;
  let soundHighlightIdx = 4;
  let personaName = '';
  let useUserTag = false;
  let modelInfo = '';
  let promptInfo = '';
  let editMode = false;
  let editPhase = 'off'; // 'off' | 'style' | 'text'
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
  // 스타일 오버라이드: { dialogue:{color,bg,fontSize}, thought:{...}, sound:{...}, action:{...}, narration:{...}, charName:{...}, userName:{...} }
  let styleOverrides = {};
  let hideCharName = false;
  let hideUserName = false;
  let loadPersonaList = null; // setupUI에서 초기화
  let useTranslationCache = false; // 리스 번역 캐시에서 번역문 가져오기

  // ========== 번역 캐시 조회 (RisuAI 번역 캐시) ==========
  function extractLongestPlainChunk(text) {
    const chunks = text.split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs).map(s => s.trim()).filter(s => s.length > 30);
    return chunks.sort((a, b) => b.length - a.length)[0] || '';
  }

  async function findTranslationFromCache(originalText, msgIndex) {
    try {
      if (typeof Risuai.getTranslationCache !== 'function' || typeof Risuai.searchTranslationCache !== 'function') {
        return { found: false, reason: 'no_api' };
      }

      // 1) 정확 매칭
      const exactMatch = await Risuai.getTranslationCache(originalText);
      if (exactMatch) {
        return { found: true, translation: exactMatch };
      }

      // 2) 청크 기반 퍼지 매칭
      const chunk = extractLongestPlainChunk(originalText);
      if (!chunk) {
        return { found: false, reason: 'no_chunk' };
      }
      const entries = await Risuai.searchTranslationCache(chunk);
      if (!entries || entries.length === 0) {
        return { found: false, reason: 'no_entries' };
      }
      const minLength = originalText.length * 0.5;
      const maxLength = originalText.length * 1.5;
      const matches = entries.filter(e => e.key.length >= minLength && e.key.length <= maxLength);
      if (matches.length === 0) {
        return { found: false, reason: 'length_filter' };
      }
      if (matches.length > 1) {
        const originalLength = originalText.length;
        matches.sort((a, b) => Math.abs(a.key.length - originalLength) - Math.abs(b.key.length - originalLength));
      }
      return { found: true, translation: matches[0].value };
    } catch (e) {
      return { found: false, reason: 'error', error: e.message };
    }
  }

  // ========== 파스텔 하이라이트 색상 ==========
  const PASTEL_COLORS = [
    { name: '민트', bg: '#d1fae5', text: '#065f46' },
    { name: '스카이', bg: '#dbeafe', text: '#1e40af' },
    { name: '라벤더', bg: '#ede9fe', text: '#5b21b6' },
    { name: '로즈', bg: '#ffe4e6', text: '#9f1239' },
    { name: '피치', bg: '#fed7aa', text: '#9a3412' },
    { name: '레몬', bg: '#fef9c3', text: '#854d0e' },
    { name: '코랄', bg: '#fecdd3', text: '#be123c' },
    { name: '틸', bg: '#ccfbf1', text: '#115e59' },
    { name: '블러시', bg: '#fce7f3', text: '#9d174d' },
    { name: '세이지', bg: '#dcfce7', text: '#166534' },
  ];

  // ========== 테마 정의 ==========
  const THEMES = {
    'white-classic': {
      name: '화이트 클래식',
      container: 'max-width:800px;margin:1.5em auto;padding:2em;color:#18181b;font-family:Times New Roman,Batang,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,serif;font-size:15px;font-weight:400;line-height:1.5;box-sizing:border-box;border-radius:16px;background:#ffffff;border:1px solid #e0e0e0;box-shadow:0 4px 24px rgba(0,0,0,0.20)',
      headerBg: '#f3f0eb',
      headerBorder: '#e0dcd4',
      badgeBg: '#555',
      badgeColor: '#fff',
      promptBg: '#6366f1',
      modelBg: '#059669',
      innerWrap: 'line-height:1.7',
      paragraph: 'margin:0 0 1em 0;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#18181b;font-weight:700',
      charName: 'color:#18181b;font-weight:700',
      dialogue: 'color:#059669;background:#ecfdf5;padding:0.1em 0.4em;border-radius:4px',
      thought: 'color:#6b7280;background:#f3f4f6;padding:0.1em 0.4em;border-radius:4px;font-style:italic',
      sound: 'color:#78716c;font-weight:500;padding:0.1em 0.4em;border-radius:4px',
      action: 'color:#a855f7;font-style:italic',
      userInput: 'color:#6366f1',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#111827;line-height:1.4',
      narration: '',
      preview: { bg: '#ffffff', text: '#18181b', accent: '#059669' },
      pageBg: '#e8e8e8'
    },
    'dark-noir': {
      name: '다크 누아르',
      container: 'max-width:800px;margin:1.5em auto;padding:2em;color:#e0e0e0;font-family:Noto Serif KR,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,Times New Roman,serif;font-size:15px;font-weight:400;line-height:1.5;box-sizing:border-box;border-radius:16px;background:#0f0f0f;border:1px solid #2a2a2a;box-shadow:0 4px 32px rgba(0,0,0,0.6)',
      headerBg: '#1a1a2e',
      headerBorder: '#2a2a3e',
      badgeBg: '#6366f1',
      badgeColor: '#fff',
      promptBg: '#7c3aed',
      modelBg: '#10b981',
      innerWrap: 'line-height:1.7',
      paragraph: 'margin:0 0 1em 0;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#93c5fd;font-weight:700',
      charName: 'color:#f9a8d4;font-weight:700',
      dialogue: 'color:#34d399;background:rgba(16,185,129,0.1);padding:0.15em 0.5em;border-radius:4px',
      thought: 'color:#9ca3af;background:rgba(156,163,175,0.1);padding:0.15em 0.5em;border-radius:4px;font-style:italic',
      sound: 'color:#fbbf24;font-weight:500;padding:0.15em 0.5em;border-radius:4px',
      action: 'color:#c084fc;font-style:italic',
      userInput: 'color:#93c5fd',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#f3f4f6;line-height:1.4',
      narration: 'color:#d1d5db',
      preview: { bg: '#0f0f0f', text: '#e0e0e0', accent: '#34d399' },
      pageBg: '#050505'
    },
    'sepia-vintage': {
      name: '세피아 빈티지',
      container: 'max-width:800px;margin:1.5em auto;padding:2em;color:#3e2723;font-family:Nanum Myeongjo,Noto Serif KR,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,Times New Roman,serif;font-size:15px;font-weight:400;line-height:1.5;box-sizing:border-box;border-radius:16px;background:linear-gradient(180deg,#fdf6ec 0%,#f5eedc 100%);border:1px solid #d4b896;box-shadow:0 4px 24px rgba(62,39,35,0.15)',
      headerBg: '#f3e7d6',
      headerBorder: '#e7d6c1',
      badgeBg: '#7c5c42',
      badgeColor: '#f5f5f5',
      promptBg: '#92400e',
      modelBg: '#7c5c42',
      innerWrap: 'line-height:1.8',
      paragraph: 'margin:0 0 1em 0;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#5d4037;font-weight:700',
      charName: 'color:#5d4037;font-weight:700',
      dialogue: 'color:#2e7d32;background:rgba(46,125,50,0.06);padding:0.1em 0.4em;border-radius:3px;border-left:2px solid #81c784;padding-left:0.6em',
      thought: 'color:#795548;background:rgba(121,85,72,0.06);padding:0.1em 0.4em;border-radius:3px;font-style:italic',
      sound: 'color:#a1887f;font-weight:500;font-style:italic;padding:0.1em 0.4em;border-radius:3px',
      action: 'color:#8d6e63;font-style:italic',
      userInput: 'color:#5c6bc0',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#3e2723;line-height:1.4',
      narration: 'color:#4e342e',
      preview: { bg: '#fdf6ec', text: '#3e2723', accent: '#2e7d32' },
      pageBg: '#d4c5a9'
    },
    'ocean-blue': {
      name: '오션 블루',
      container: 'max-width:800px;margin:1.5em auto;padding:2em;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:15px;font-weight:400;line-height:1.5;box-sizing:border-box;border-radius:16px;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 50%,#f0f9ff 100%);border:1px solid #bae6fd;box-shadow:0 4px 24px rgba(14,116,144,0.12)',
      headerBg: '#e0f2fe',
      headerBorder: '#bae6fd',
      badgeBg: '#0e7490',
      badgeColor: '#fff',
      promptBg: '#0369a1',
      modelBg: '#0f766e',
      innerWrap: 'line-height:1.7',
      paragraph: 'margin:0 0 1em 0;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#0369a1;font-weight:700',
      charName: 'color:#0e7490;font-weight:700',
      dialogue: 'color:#0f766e;background:rgba(15,118,110,0.06);padding:0.15em 0.5em;border-radius:6px;border:1px solid rgba(15,118,110,0.12)',
      thought: 'color:#64748b;background:rgba(100,116,139,0.08);padding:0.15em 0.5em;border-radius:6px;font-style:italic',
      sound: 'color:#0891b2;font-weight:600;font-size:0.95em;padding:0.15em 0.5em;border-radius:6px',
      action: 'color:#7c3aed;font-style:italic',
      userInput: 'color:#2563eb',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#0c4a6e;line-height:1.4',
      narration: 'color:#334155',
      preview: { bg: '#f0f9ff', text: '#1e293b', accent: '#0f766e' },
      pageBg: '#bae6fd'
    },
    'monochrome-ink': {
      name: '모노크롬 잉크',
      container: 'max-width:800px;margin:1.5em auto;padding:2em;color:#1f2937;font-family:IBM Plex Mono,Consolas,monospace;font-size:14px;font-weight:400;line-height:1.5;box-sizing:border-box;border-radius:4px;background:#fafafa;border:2px solid #1f2937;box-shadow:none',
      headerBg: '#f3f4f6',
      headerBorder: '#d1d5db',
      badgeBg: '#1f2937',
      badgeColor: '#fff',
      promptBg: '#374151',
      modelBg: '#1f2937',
      innerWrap: 'line-height:1.7',
      paragraph: 'margin:0 0 1em 0;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#1f2937;font-weight:700',
      charName: 'color:#1f2937;font-weight:700',
      dialogue: 'color:#1f2937;background:transparent;padding:0.1em 0;border-left:3px solid #1f2937;padding-left:0.8em',
      thought: 'color:#6b7280;background:transparent;padding:0.1em 0;font-style:italic',
      sound: 'color:#4b5563;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:0.9em;padding:0.1em 0',
      action: 'color:#9ca3af;font-style:italic',
      userInput: 'color:#6b7280',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#111827;line-height:1.4',
      narration: 'color:#374151',
      preview: { bg: '#fafafa', text: '#1f2937', accent: '#1f2937' },
      pageBg: '#e5e7eb'
    },

    // ── Archive 시리즈 (Log Diary 스타일) ──
    'archive-navy': {
      name: '📖 아카이브 네이비',
      category: 'archive',
      container: 'max-width:900px;margin:5px auto;padding:0;color:#2c3e50;font-family:Noto Serif KR,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,Times New Roman,serif;font-size:clamp(13px,2.3vw,14.2px);font-weight:400;line-height:1.7;box-sizing:border-box;border-radius:1rem;background:#ffffff;box-shadow:0 4px 16px rgba(0,0,0,0.1)',
      headerBg: '#f8f9fa',
      headerBorder: 'rgba(22,42,62,0.12)',
      badgeBg: '#162a3e',
      badgeColor: '#fff',
      promptBg: '#162a3e',
      modelBg: '#6c8da8',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      paragraph: 'margin:0 0 10px 0;color:#2c3e50;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#162a3e;font-weight:700',
      charName: 'color:#162a3e;font-weight:700',
      dialogue: 'background-color:#f0f2f5;color:#162a3e;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f0f2f5;color:#2c3e50;padding:0 4px;border-radius:2px',
      sound: 'color:#162a3e;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#2d5af0;font-style:italic',
      userInput: 'color:#2d5af0;font-style:italic',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#162a3e;line-height:1.4',
      narration: 'color:#2c3e50',
      preview: { bg: '#ffffff', text: '#2c3e50', accent: '#162a3e' },
      pageBg: '#e8eaed',
      arc: {
        mainBg: '#ffffff',
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
        chevron: '#6c8da8'
      }
    },
    'archive-dark': {
      name: '📖 아카이브 다크',
      category: 'archive',
      container: 'max-width:900px;margin:5px auto;padding:0;color:#c9d1d9;font-family:Noto Serif KR,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,Times New Roman,serif;font-size:clamp(13px,2.3vw,14.2px);font-weight:400;line-height:1.7;box-sizing:border-box;border-radius:1rem;background:#0d1117;box-shadow:0 4px 16px rgba(0,0,0,0.4)',
      headerBg: '#161b22',
      headerBorder: '#30363d',
      badgeBg: '#58a6ff',
      badgeColor: '#0d1117',
      promptBg: '#388bfd',
      modelBg: '#3fb950',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      paragraph: 'margin:0 0 10px 0;color:#c9d1d9;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#58a6ff;font-weight:700',
      charName: 'color:#79c0ff;font-weight:700',
      dialogue: 'background-color:#1c2433;color:#c9d1d9;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#1c2433;color:#8b949e;padding:0 4px;border-radius:2px',
      sound: 'color:#d2a8ff;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#79c0ff;font-style:italic',
      userInput: 'color:#79c0ff;font-style:italic',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#f0f6fc;line-height:1.4',
      narration: 'color:#c9d1d9',
      preview: { bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff' },
      pageBg: '#010409',
      arc: {
        mainBg: '#0d1117',
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
        chevron: '#8b949e'
      }
    },
    'archive-cream': {
      name: '📖 아카이브 크림',
      category: 'archive',
      container: 'max-width:900px;margin:5px auto;padding:0;color:#3d3929;font-family:Noto Serif KR,Noto Serif JP,Noto Serif SC,Noto Serif TC,Georgia,Times New Roman,serif;font-size:clamp(13px,2.3vw,14.2px);font-weight:400;line-height:1.7;box-sizing:border-box;border-radius:1rem;background:#faf8f3;box-shadow:0 4px 16px rgba(0,0,0,0.08)',
      headerBg: '#f2ede3',
      headerBorder: '#ddd5c5',
      badgeBg: '#6b5c45',
      badgeColor: '#faf8f3',
      promptBg: '#6b5c45',
      modelBg: '#8a7d68',
      innerWrap: 'line-height:1.7;letter-spacing:-0.5px',
      paragraph: 'margin:0 0 10px 0;color:#3d3929;line-height:1.7;letter-spacing:-0.5px;text-align:left;word-break:keep-all',
      spacer: 'height:1.5em',
      userName: 'color:#5a4f3a;font-weight:700',
      charName: 'color:#5a4f3a;font-weight:700',
      dialogue: 'background-color:#f0ece2;color:#3d3929;font-weight:600;padding:0 4px;border-radius:2px',
      thought: 'background-color:#f0ece2;color:#7a7060;padding:0 4px;border-radius:2px',
      sound: 'color:#8a7d68;font-weight:600;font-style:italic;padding:0 4px',
      action: 'color:#a0522d;font-style:italic',
      userInput: 'color:#8b6914;font-style:italic',
      sectionTitle: 'margin:1em 0 0.75em 0;font-size:1.3em;font-weight:800;color:#3d3929;line-height:1.4',
      narration: 'color:#3d3929',
      preview: { bg: '#faf8f3', text: '#3d3929', accent: '#6b5c45' },
      pageBg: '#e8e0d0',
      arc: {
        mainBg: '#faf8f3',
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
        chevron: '#8a7d68'
      }
    }
  };

  // ========== UI 설정 ==========
  const setupUI = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: transparent;
      }
      #log-overlay {
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); z-index: 1000;
        backdrop-filter: blur(3px);
      }
      #log-panel {
        position: fixed; top: 3%; left: 3%; width: 94%; height: 94%;
        background: #1a1a1a; border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
        display: flex; flex-direction: column; overflow: hidden;
      }
      #log-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px;
        background: #242424; border-bottom: 1px solid #333;
        flex-shrink: 0;
      }
      #log-title { color: #e0e0e0; font-size: 15px; font-weight: 600; }
      #log-info { color: #777; font-size: 12px; margin-left: 10px; }
      #btn-patchnotes { background: none; border: none; color: #666; font-size: 10px; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: all 0.2s; font-weight: 400; }
      #btn-patchnotes:hover { color: #aaa; background: rgba(255,255,255,0.05); }
      #patchnotes-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center; }
      #patchnotes-overlay.visible { display:flex; }
      #patchnotes-card { background:#1e1e1e; border:1px solid #333; border-radius:12px; width:90%; max-width:480px; max-height:70vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
      #patchnotes-card .pn-header { padding:16px 20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center; }
      #patchnotes-card .pn-header h3 { margin:0; font-size:15px; color:#e0e0e0; }
      #patchnotes-card .pn-close { background:none; border:none; color:#888; font-size:18px; cursor:pointer; padding:4px 8px; }
      #patchnotes-card .pn-body { padding:20px; overflow-y:auto; font-size:13px; color:#ccc; line-height:1.7; }
      #patchnotes-card .pn-body h4 { color:#4ecca3; margin:16px 0 8px 0; font-size:13px; }
      #patchnotes-card .pn-body h4:first-child { margin-top:0; }
      #patchnotes-card .pn-body ul { margin:0 0 8px 0; padding-left:20px; }
      #patchnotes-card .pn-body li { margin-bottom:4px; }
      .header-btns { display: flex; gap: 6px; align-items: center; }
      .header-btn {
        padding: 6px 14px; border: none; border-radius: 7px; cursor: pointer;
        font-weight: 600; font-size: 12px; transition: all 0.2s;
      }
      #btn-copy-plain { background: #555; color: #ccc; }
      #btn-copy-plain:hover { background: #666; }
      #btn-copy-html { background: #3b82f6; color: white; }
      #btn-copy-html:hover { background: #60a5fa; }
      .btn-copied { background: #10b981 !important; color: white !important; }
      #btn-close { background: #3a3a3a; color: #888; font-size: 16px; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
      #btn-close:hover { background: #555; color: #ccc; }


      /* 편집 단계 버튼 */
      .edit-phase-btns { display: none; gap: 3px; align-items: center; }
      .edit-phase-btns.visible { display: flex; }
      .edit-phase-btn {
        padding: 4px 10px; border: 1px solid #444; border-radius: 5px;
        cursor: pointer; font-size: 10px; font-weight: 600;
        transition: all 0.15s; background: #222; color: #888;
      }
      .edit-phase-btn:hover { background: #333; color: #bbb; }
      .edit-phase-btn.active { border-color: #3b82f6; color: #60a5fa; background: #1e293b; }
      .edit-phase-btn.text-active { border-color: #f59e0b; color: #fbbf24; background: #292211; }
      .edit-phase-warn {
        font-size: 9px; color: #f59e0b; padding: 2px 6px;
        background: rgba(245,158,11,0.1); border-radius: 3px;
        white-space: nowrap;
      }

      /* 툴바 */
      #toolbar {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 16px;
        background: #1f1f1f; border-bottom: 1px solid #2a2a2a;
        flex-shrink: 0; flex-wrap: wrap;
      }
      .range-group { display: flex; align-items: center; gap: 5px; }
      .range-label { color: #666; font-size: 11px; font-weight: 500; white-space: nowrap; }
      .range-input {
        width: 58px; padding: 4px 6px;
        background: #2a2a2a; color: #e0e0e0; border: 1px solid #3a3a3a;
        border-radius: 5px; font-size: 12px; text-align: center; outline: none;
      }
      .range-input:focus { border-color: #3b82f6; }
      #btn-apply-range {
        padding: 4px 10px; background: #333; color: #aaa; border: 1px solid #444;
        border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: 500;
        transition: all 0.2s;
      }
      #btn-apply-range:hover { background: #444; color: #ddd; }
      .toolbar-sep { width: 1px; height: 20px; background: #333; flex-shrink: 0; }
      #range-hint { color: #555; font-size: 11px; }

      /* 테마 선택 */
      .theme-selector { display: flex; gap: 5px; align-items: center; }
      .theme-label { color: #666; font-size: 11px; font-weight: 500; white-space: nowrap; }
      .theme-chip {
        width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
        border: 2px solid transparent; transition: all 0.2s;
        position: relative; overflow: hidden;
      }
      .theme-chip:hover { transform: scale(1.15); }
      .theme-chip.active { border-color: #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.4); }
      .theme-sep {
        width: 1px; height: 20px; background: #444; flex-shrink: 0; margin: 0 3px;
        align-self: center;
      }
      .theme-sep-label {
        font-size: 9px; color: #888; white-space: nowrap; writing-mode: vertical-rl;
        text-orientation: mixed; letter-spacing: 0.5px;
      }
      .theme-chip-inner {
        width: 100%; height: 100%; border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; font-weight: 800; line-height: 1;
      }

      /* 뷰 전환 탭 */
      .view-tabs { display: flex; gap: 2px; background: #2a2a2a; border-radius: 6px; padding: 2px; }
      .view-tab {
        padding: 4px 12px; border: none; border-radius: 5px; cursor: pointer;
        font-size: 11px; font-weight: 600; background: transparent; color: #777;
        transition: all 0.2s;
      }
      .view-tab:hover { color: #bbb; }
      .view-tab.active { background: #444; color: #e0e0e0; }

      /* 옵션 바 */
      #options-bar {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 16px;
        background: #1a1a1a; border-bottom: 1px solid #2a2a2a;
        flex-shrink: 0; flex-wrap: wrap;
      }
      .opt-group { display: flex; align-items: center; gap: 4px; }
      .opt-label { font-size: 12px; flex-shrink: 0; }
      .opt-toggle { display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; }
      .opt-toggle input[type="checkbox"] { display: none; }
      .opt-toggle-switch {
        width: 28px; height: 16px; border-radius: 8px; background: #3a3a3a;
        position: relative; transition: background 0.2s; flex-shrink: 0;
      }
      .opt-toggle-switch::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 12px; height: 12px; border-radius: 50%; background: #888;
        transition: all 0.2s;
      }
      .opt-toggle input:checked + .opt-toggle-switch { background: #3b82f6; }
      .opt-toggle input:checked + .opt-toggle-switch::after { left: 14px; background: #fff; }
      .opt-toggle-label { color: #888; font-size: 11px; font-weight: 500; white-space: nowrap; }
      .opt-toggle input:checked ~ .opt-toggle-label { color: #ccc; }
      .opt-text-input {
        width: 90px; padding: 3px 6px;
        background: #2a2a2a; color: #ddd; border: 1px solid #3a3a3a;
        border-radius: 4px; font-size: 11px; outline: none;
      }
      .opt-text-input:focus { border-color: #3b82f6; }
      .opt-text-input::placeholder { color: #555; }
      .opt-persona-select {
        width: 110px; padding: 3px 4px;
        background: #2a2a2a; color: #ddd; border: 1px solid #3a3a3a;
        border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;
      }
      .opt-persona-select:focus { border-color: #3b82f6; }
      .opt-persona-select option { background: #2a2a2a; color: #ddd; }
      .palette-chips { display: flex; gap: 3px; align-items: center; }
      .palette-chip {
        width: 18px; height: 18px; border-radius: 4px; cursor: pointer;
        border: 2px solid transparent; transition: all 0.15s;
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; color: #666; font-weight: 700;
      }
      .palette-chip:hover { transform: scale(1.15); }
      .palette-chip.active { border-color: #fff; box-shadow: 0 0 6px rgba(255,255,255,0.3); }
      .palette-chip.none { background: #333; font-size: 9px; }

      /* 메시지 목록 */
      #log-content {
        flex: 1; overflow-y: auto; padding: 14px 16px;
        color: #d0d0d0; font-size: 14px; line-height: 1.7;
      }
      #log-content::-webkit-scrollbar { width: 5px; }
      #log-content::-webkit-scrollbar-track { background: transparent; }
      #log-content::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
      .msg-block {
        margin-bottom: 12px; padding: 10px 12px;
        background: #222; border-radius: 8px;
        border-left: 3px solid #444; transition: opacity 0.2s;
      }
      .msg-block.user { border-left-color: #3b82f6; }
      .msg-block.char { border-left-color: #f472b6; }
      .msg-block.first-message { border-left-color: #fbbf24; background: rgba(251,191,36,0.06); }
      .msg-block.first-message .msg-idx { color: #fbbf24; font-weight: 600; font-family: sans-serif; }
      .msg-block.system { border-left-color: #a78bfa; }
      .msg-block.dimmed { opacity: 0.25; }
      .msg-block { cursor: pointer; user-select: none; }
      .msg-block:hover { background: #2a2a2a; }
      .msg-check { width: 15px; height: 15px; border-radius: 4px; border: 2px solid #555; background: transparent; cursor: pointer; flex-shrink: 0; transition: all 0.15s; appearance: none; -webkit-appearance: none; margin: 0; }
      .msg-check:checked { background: #3b82f6; border-color: #3b82f6; }
      .msg-check:checked::after { content: '✓'; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; line-height: 1; }
      .sel-bar { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
      .sel-btn { padding: 3px 8px; background: #2a2a2a; color: #aaa; border: 1px solid #3a3a3a; border-radius: 5px; cursor: pointer; font-size: 11px; transition: all 0.15s; }
      .sel-btn:hover { background: #333; color: #ddd; }
      .sel-count { color: #555; font-size: 11px; margin-left: 4px; }
      .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
      .msg-role { font-weight: 700; font-size: 12px; flex: 1; }
      .msg-role.user { color: #60a5fa; }
      .msg-role.char { color: #f472b6; }
      .msg-role.system { color: #a78bfa; }
      .msg-idx { color: #555; font-size: 10px; font-family: monospace; flex-shrink: 0; }
      .msg-text { color: #c0c0c0; line-height: 1.7; font-size: 13px; white-space: pre-wrap; word-break: break-word; }
      .msg-asset-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: #2d2d44; border: 1px solid #3b3b5c; border-radius: 4px; color: #a5b4fc; font-size: 11px; font-family: monospace; vertical-align: middle; }
      #log-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #555; font-size: 15px; }

      /* 미리보기 컨테이너 */
      #preview-wrap {
        flex: 1; display: none; position: relative;
        background: #2a2a2a; overflow: hidden;
      }
      #preview-wrap.visible { display: flex; flex-direction: column; }
      #preview-toolbar {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 16px; background: #222; border-bottom: 1px solid #333;
        flex-shrink: 0;
      }
      .preview-zoom-btn {
        width: 26px; height: 26px; border: 1px solid #444; border-radius: 5px;
        background: #333; color: #aaa; cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
      }
      .preview-zoom-btn:hover { background: #444; color: #ddd; }
      #zoom-label { color: #666; font-size: 11px; min-width: 36px; text-align: center; }
      #preview-frame {
        flex: 1; width: 100%; border: none;
        background: #1a1a1a;
      }
      #edit-container {
        display: none; flex: 1; width: 100%; overflow: auto;
        background: #1a1a1a; padding: 20px; box-sizing: border-box;
      }
      #edit-container.visible { display: block; }
      #edit-container [data-chatlog]:focus {
        outline: 2px dashed rgba(245,158,11,0.4); outline-offset: 8px;
      }
      #edit-container * { box-sizing: border-box; }

      /* 스타일 편집 패널 (컴팩트) */
      #style-edit-panel {
        display: none; padding: 5px 16px;
        background: #111; border-bottom: 1px solid #2a2a2a;
        flex-shrink: 0;
      }
      #style-edit-panel.visible { display: block; }
      .se-tabs {
        display: flex; gap: 2px; margin-bottom: 6px; flex-wrap: wrap;
      }
      .se-tab {
        padding: 3px 10px; border: none; border-radius: 4px; cursor: pointer;
        font-size: 10px; font-weight: 600; background: #1a1a1a; color: #666;
        transition: all 0.15s; display: flex; align-items: center; gap: 4px;
        white-space: nowrap;
      }
      .se-tab:hover { color: #aaa; background: #222; }
      .se-tab.active { background: #2a2a2a; color: #ddd; }
      .se-tab-dot {
        width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0;
      }
      .se-body {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        min-height: 28px;
      }
      .se-prop-label {
        font-size: 10px; color: #666; flex-shrink: 0;
      }
      .se-preset-chips {
        display: flex; gap: 3px; align-items: center;
      }
      .se-preset-chip {
        width: 16px; height: 16px; border-radius: 3px; cursor: pointer;
        border: 2px solid transparent; transition: all 0.12s;
        flex-shrink: 0;
      }
      .se-preset-chip:hover { transform: scale(1.2); }
      .se-preset-chip.active { border-color: #fff; box-shadow: 0 0 4px rgba(255,255,255,0.3); }
      .se-preset-chip.none {
        background: #333; display: flex; align-items: center; justify-content: center;
        font-size: 7px; color: #888; font-weight: 700;
      }
      .se-size-btns { display: flex; gap: 2px; }
      .se-size-btn {
        padding: 2px 8px; border: 1px solid #333; border-radius: 3px;
        background: #1a1a1a; color: #777; font-size: 9px; cursor: pointer;
        transition: all 0.12s;
      }
      .se-size-btn:hover { background: #222; color: #aaa; }
      .se-size-btn.active { background: #2a2a2a; color: #ddd; border-color: #555; }
      .se-sep { width: 1px; height: 18px; background: #2a2a2a; flex-shrink: 0; }
      .se-hide-toggle {
        display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;
      }
      .se-hide-toggle input { display: none; }
      .se-hide-sw {
        width: 22px; height: 12px; border-radius: 6px; background: #3a3a3a;
        position: relative; transition: background 0.2s; flex-shrink: 0;
      }
      .se-hide-sw::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 8px; height: 8px; border-radius: 50%; background: #888; transition: all 0.2s;
      }
      .se-hide-toggle input:checked + .se-hide-sw { background: #ef4444; }
      .se-hide-toggle input:checked + .se-hide-sw::after { left: 12px; background: #fff; }
      .se-hide-label { font-size: 9px; color: #888; }
      .se-bold-toggle {
        display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none;
      }
      .se-bold-toggle input { display: none; }
      .se-bold-sw {
        width: 22px; height: 12px; border-radius: 6px; background: #3a3a3a;
        position: relative; transition: background 0.2s; flex-shrink: 0;
      }
      .se-bold-sw::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 8px; height: 8px; border-radius: 50%; background: #888; transition: all 0.2s;
      }
      .se-bold-toggle input:checked + .se-bold-sw { background: #3b82f6; }
      .se-bold-toggle input:checked + .se-bold-sw::after { left: 12px; background: #fff; }
      .se-bold-label { font-size: 9px; color: #888; font-weight: 600; }
      .se-reset-btn {
        padding: 3px 8px; border: 1px solid #333;
        border-radius: 3px; background: #1a1a1a; color: #666;
        font-size: 9px; cursor: pointer; margin-left: auto;
      }
      .se-reset-btn:hover { background: #2a2a2a; color: #aaa; }
      .se-preset-bar {
        display: flex; align-items: center; gap: 6px; margin-top: 6px;
        padding-top: 5px; border-top: 1px solid #1e1e1e;
      }
      .se-preset-btn {
        padding: 2px 8px; border: 1px solid #333; border-radius: 3px;
        background: #1a1a1a; color: #777; font-size: 9px; cursor: pointer;
      }
      .se-preset-btn:hover { background: #222; color: #aaa; }
      .se-preset-select {
        padding: 2px 4px; background: #1a1a1a; color: #aaa; border: 1px solid #333;
        border-radius: 3px; font-size: 9px; outline: none; cursor: pointer; max-width: 120px;
      }
      .se-preset-label { font-size: 9px; color: #555; }
      .se-preset-del {
        padding: 2px 6px; border: 1px solid #333; border-radius: 3px;
        background: #1a1a1a; color: #ef4444; font-size: 9px; cursor: pointer;
      }
      .se-preset-del:hover { background: #2a2a2a; }

      /* ===== 모바일 전용 요소 (데스크톱에서 숨김) ===== */
      #m-settings-btn {
        display: none; width: 36px; height: 36px;
        align-items: center; justify-content: center;
        background: #3a3a3a; color: #aaa; border: none; border-radius: 8px;
        font-size: 16px; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
      }
      #m-settings-btn.m-active { background: #3b82f6; color: #fff; }
      #m-bottom-bar {
        display: none; align-items: center; justify-content: space-between;
        padding: 8px 10px; background: #1e1e1e; border-top: 1px solid #333;
        flex-shrink: 0; gap: 6px;
      }
      .m-bottom-tabs { display: flex; gap: 4px; }
      .m-tab {
        padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer;
        font-size: 13px; font-weight: 600; background: #2a2a2a; color: #888;
        transition: all 0.15s;
      }
      .m-tab.active { background: #3b82f6; color: #fff; }
      .m-bottom-actions { display: flex; gap: 6px; }
      .m-action-btn {
        padding: 9px 14px; border: none; border-radius: 8px; cursor: pointer;
        font-size: 12px; font-weight: 600; background: #333; color: #ccc;
        transition: all 0.15s;
      }
      .m-action-btn.m-primary { background: #3b82f6; color: #fff; }
      .m-action-btn.btn-copied { background: #10b981 !important; color: #fff !important; }

      /* 모바일 설정 드로어 */
      #m-settings-drawer {
        display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 100; background: rgba(0,0,0,0.5);
      }
      #m-settings-drawer.visible { display: flex; flex-direction: column; }
      #m-drawer-content {
        position: absolute; top: 0; left: 0; width: 88%; max-width: 340px; height: 100%;
        background: #1a1a1a; overflow-y: auto; -webkit-overflow-scrolling: touch;
        box-shadow: 4px 0 20px rgba(0,0,0,0.5);
        padding: 0; display: flex; flex-direction: column;
      }
      #m-drawer-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px; background: #242424; border-bottom: 1px solid #333;
        flex-shrink: 0;
      }
      #m-drawer-header span { color: #ddd; font-size: 14px; font-weight: 600; }
      #m-drawer-close {
        width: 32px; height: 32px; border: none; border-radius: 6px;
        background: #333; color: #aaa; font-size: 16px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      #m-drawer-body { flex: 1; overflow-y: auto; padding: 10px; }
      .m-section {
        margin-bottom: 10px; padding: 10px; background: #222;
        border-radius: 8px; border: 1px solid #2a2a2a;
      }
      .m-section-title {
        font-size: 11px; font-weight: 600; color: #888;
        text-transform: uppercase; letter-spacing: 0.05em;
        margin-bottom: 8px;
      }
      .m-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
      .m-row:last-child { margin-bottom: 0; }
      .m-input {
        flex: 1; min-width: 0; padding: 7px 8px; background: #2a2a2a; color: #ddd;
        border: 1px solid #3a3a3a; border-radius: 5px; font-size: 13px; outline: none;
      }
      .m-input:focus { border-color: #3b82f6; }
      .m-select {
        flex: 1; min-width: 0; padding: 7px 6px; background: #2a2a2a; color: #ddd;
        border: 1px solid #3a3a3a; border-radius: 5px; font-size: 13px; outline: none;
        cursor: pointer;
      }
      .m-select option { background: #2a2a2a; color: #ddd; }
      .m-label { font-size: 11px; color: #888; flex-shrink: 0; min-width: 36px; }
      .m-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
      .m-toggle input { display: none; }
      .m-toggle-sw {
        width: 32px; height: 18px; border-radius: 9px; background: #3a3a3a;
        position: relative; transition: background 0.2s; flex-shrink: 0;
      }
      .m-toggle-sw::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 14px; height: 14px; border-radius: 50%; background: #888;
        transition: all 0.2s;
      }
      .m-toggle input:checked + .m-toggle-sw { background: #3b82f6; }
      .m-toggle input:checked + .m-toggle-sw::after { left: 16px; background: #fff; }
      .m-toggle-label { font-size: 12px; color: #aaa; }
      .m-toggle input:checked ~ .m-toggle-label { color: #ddd; }
      .m-theme-grid { display: flex; flex-wrap: wrap; gap: 4px; }
      .m-apply-btn {
        width: 100%; padding: 8px; border: none; border-radius: 6px;
        background: #333; color: #aaa; font-size: 12px; font-weight: 600;
        cursor: pointer; transition: all 0.15s;
      }
      .m-apply-btn:hover { background: #444; color: #ddd; }
      .m-edit-btns { display: flex; gap: 4px; }
      .m-edit-btn {
        flex: 1; padding: 8px; border: 1px solid #444; border-radius: 6px;
        background: #222; color: #888; font-size: 11px; font-weight: 600;
        cursor: pointer; text-align: center; transition: all 0.15s;
      }
      .m-edit-btn.active { border-color: #3b82f6; color: #60a5fa; background: #1e293b; }
      .m-edit-btn.text-active { border-color: #f59e0b; color: #fbbf24; background: #292211; }

      /* ===== 모바일 레이아웃 (@media) ===== */
      @media (max-width: 768px) {
        #log-panel {
          top: 0 !important; left: 0 !important;
          width: 100% !important; height: 100% !important;
          border-radius: 0 !important; position: relative !important;
        }
        #log-header { padding: 8px 10px !important; }
        #log-info { display: none !important; }
        #log-title { font-size: 14px !important; }
        .header-btns .view-tabs,
        .header-btns #btn-copy-plain,
        .header-btns #btn-copy-html { display: none !important; }
        #m-settings-btn { display: flex !important; }
        #m-bottom-bar { display: flex !important; }
        #btn-close { width: 36px !important; height: 36px !important; font-size: 18px !important; }
        /* 데스크톱 전용 설정 바 숨김 (모바일에서는 드로어 사용) */
        #toolbar, #options-bar, #style-edit-panel { display: none !important; }
        #log-content { padding: 10px !important; }
        .msg-block { padding: 10px !important; }
        .msg-text { font-size: 13px !important; line-height: 1.6 !important; }
        .preview-zoom-btn { width: 34px !important; height: 34px !important; font-size: 16px !important; }
        #zoom-label { font-size: 12px !important; }
        #preview-toolbar { padding: 6px 10px !important; gap: 6px !important; }
      }
    `;
    document.head.appendChild(style);

    // 테마 칩 HTML 생성
    let themeChipsHtml = '';
    let prevCategory = '';
    for (const [key, theme] of Object.entries(THEMES).sort((a,b)=>(a[1].category==='archive'?0:1)-(b[1].category==='archive'?0:1))) {
      const p = theme.preview;
      const cat = theme.category || 'default';
      if (cat !== prevCategory && prevCategory !== '') {
        themeChipsHtml += '<div class="theme-sep"></div>';
      }
      prevCategory = cat;
      themeChipsHtml += `<div class="theme-chip${key === currentTheme ? ' active' : ''}" data-theme="${key}" title="${theme.name}">
        <div class="theme-chip-inner" style="background:${p.bg};color:${p.accent};border:1px solid ${p.accent}33;">Aa</div>
      </div>`;
    }

    // 파스텔 칩 HTML 생성 (대사용)
    let paletteHtml = '<div class="palette-chip none' + (highlightIdx === -1 ? ' active' : '') + '" data-idx="-1" title="기본">✕</div>';
    PASTEL_COLORS.forEach((c, idx) => {
      paletteHtml += '<div class="palette-chip' + (highlightIdx === idx ? ' active' : '') + '" data-idx="' + idx + '" title="' + c.name + '" style="background:' + c.bg + ';"></div>';
    });
    // 파스텔 칩 HTML 생성 (효과음용)
    let soundPaletteHtml = '<div class="palette-chip snd-hl none' + (soundHighlightIdx === -1 ? ' active' : '') + '" data-idx="-1" title="기본">✕</div>';
    PASTEL_COLORS.forEach((c, idx) => {
      soundPaletteHtml += '<div class="palette-chip snd-hl' + (soundHighlightIdx === idx ? ' active' : '') + '" data-idx="' + idx + '" title="' + c.name + '" style="background:' + c.bg + ';"></div>';
    });

    document.body.innerHTML = `
      <div id="log-overlay">
        <div id="log-panel">
          <div id="log-header">
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span id="log-title">📋 Log Plus</span><button id="btn-patchnotes" title="패치 내역">v1.3.8</button>
              <span id="log-info"></span>
            </div>
            <div class="header-btns">
              <div class="view-tabs">
                <button class="view-tab active" data-view="list">목록</button>
                <button class="view-tab" data-view="preview">미리보기</button>
              </div>
              <button id="m-settings-btn" title="설정">⚙️</button>
              <button class="header-btn" id="btn-copy-plain">텍스트</button>
              <button class="header-btn" id="btn-copy-html">HTML 복사</button>
              <button class="header-btn" id="btn-close">✕</button>
            </div>
          </div>
          <div id="toolbar">
            <div class="range-group">
              <span class="range-label">시작</span>
              <input type="number" class="range-input" id="range-start" min="1" value="1">
            </div>
            <div class="range-group">
              <span class="range-label">끝</span>
              <input type="number" class="range-input" id="range-end" min="1" value="1">
            </div>
            <button id="btn-apply-range">범위 선택</button>
            <button id="btn-select-all" class="sel-btn">전체</button>
            <button id="btn-select-none" class="sel-btn">해제</button>
            <button id="btn-deselect-user" class="sel-btn" title="선택 범위에서 유저 메시지만 해제">유저 해제</button>
            <span id="range-hint"></span>
            <div class="toolbar-sep"></div>
            <div class="theme-selector">
              <span class="theme-label">테마</span>
              ${themeChipsHtml}
            </div>
          </div>
          <div id="options-bar">
            <div class="opt-group">
              <span class="opt-label">👤</span>
              <select class="opt-persona-select" id="opt-persona-select">
                <option value="">페르소나 선택</option>
                <option value="__custom__">✏️ 직접 입력</option>
              </select>
              <input type="text" class="opt-text-input" id="opt-persona" placeholder="이름 입력" style="display:none;width:80px">
              <label class="opt-toggle" style="margin-left:4px">
                <input type="checkbox" id="opt-user-tag">
                <span class="opt-toggle-switch"></span>
                <span class="opt-toggle-label">{{user}}</span>
              </label>
              <label class="opt-toggle" style="margin-left:4px">
                <input type="checkbox" id="opt-header-images" checked>
                <span class="opt-toggle-switch"></span>
                <span class="opt-toggle-label">🖼️ 프로필</span>
              </label>
            </div>
            <div class="opt-group">
              <span class="opt-label">📌</span>
              <input type="text" class="opt-text-input" id="opt-log-title" placeholder="로그 제목" style="width:140px">
            </div>
            <div class="toolbar-sep"></div>
            <div class="opt-group">
              <span class="opt-label">🤖</span>
              <input type="text" class="opt-text-input" id="opt-model" placeholder="모델명">
            </div>
            <div class="opt-group">
              <span class="opt-label">📝</span>
              <input type="text" class="opt-text-input" id="opt-prompt" placeholder="프롬프트" style="width:130px">
            </div>
            <div class="toolbar-sep"></div>
            <label class="opt-toggle">
              <input type="checkbox" id="opt-images" checked>
              <span class="opt-toggle-switch"></span>
              <span class="opt-toggle-label">🖼️ 이미지</span>
            </label>
            <div class="toolbar-sep"></div>
            <label class="opt-toggle">
              <input type="checkbox" id="opt-edit">
              <span class="opt-toggle-switch"></span>
              <span class="opt-toggle-label">✂️ 편집</span>
            </label>
            <div class="edit-phase-btns" id="edit-phase-btns">
              <button class="edit-phase-btn active" id="ep-style" title="스타일 편집">🎨 스타일</button>
              <button class="edit-phase-btn" id="ep-text" title="글자 수정">✏️ 글자수정</button>
              <span class="edit-phase-warn" id="ep-warn" style="display:none">글자수정 중</span>
            </div>
            <div class="toolbar-sep"></div>
            <label class="opt-toggle">
              <input type="checkbox" id="opt-translation-cache">
              <span class="opt-toggle-switch"></span>
              <span class="opt-toggle-label">🌐 번역문</span>
            </label>
          </div>
          <div id="style-edit-panel">
            <div class="se-tabs">
              <button class="se-tab active" data-setab="dialogue"><div class="se-tab-dot" style="background:#34d399"></div>대사</button>
              <button class="se-tab" data-setab="thought"><div class="se-tab-dot" style="background:#9ca3af"></div>속마음</button>
              <button class="se-tab" data-setab="sound"><div class="se-tab-dot" style="background:#fbbf24"></div>효과음</button>
              <button class="se-tab" data-setab="action"><div class="se-tab-dot" style="background:#c084fc"></div>지문</button>
              <button class="se-tab" data-setab="narration"><div class="se-tab-dot" style="background:#d1d5db"></div>나레이션</button>
              <button class="se-tab" data-setab="charName"><div class="se-tab-dot" style="background:#f9a8d4"></div>캐릭터명</button>
              <button class="se-tab" data-setab="userName"><div class="se-tab-dot" style="background:#93c5fd"></div>유저명</button>
            </div>
            <div class="se-body" id="se-body"></div>
          </div>
          <div id="log-content"></div>
          <div id="preview-wrap">
            <div id="preview-toolbar">
              <button class="preview-zoom-btn" id="zoom-out">\u2212</button>
              <span id="zoom-label">100%</span>
              <button class="preview-zoom-btn" id="zoom-in">+</button>
              <button class="preview-zoom-btn" id="zoom-reset" style="width:auto;padding:0 8px;font-size:10px;">맞춤</button>
            </div>
            <iframe id="preview-frame" sandbox="allow-same-origin"></iframe>
            <div id="edit-container"></div>
          </div>
          <div id="m-bottom-bar">
            <div class="m-bottom-tabs">
              <button class="m-tab active" data-view="list">📋 목록</button>
              <button class="m-tab" data-view="preview">👁️ 미리보기</button>
            </div>
            <div class="m-bottom-actions">
              <button class="m-action-btn" id="m-copy-plain">📄 텍스트</button>
              <button class="m-action-btn m-primary" id="m-copy-html">📋 HTML</button>
            </div>
          </div>
          <div id="m-settings-drawer">
            <div id="m-drawer-content">
              <div id="m-drawer-header">
                <span>⚙️ 설정</span>
                <button id="m-drawer-close">✕</button>
              </div>
              <div id="m-drawer-body"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // ===== 패치노트 모달 =====
    const patchnotesHtml = `
      <div id="patchnotes-overlay">
        <div id="patchnotes-card">
          <div class="pn-header"><h3>📋 패치 내역</h3><button class="pn-close">✕</button></div>
          <div class="pn-body">
            <h4>v1.3.8</h4>
            <ul>
              <li>모바일 HTML 복사 시 리스 서버 URL을 사용할 수 없는 경우 Canvas 기반 이미지 압축 폴백 추가</li>
              <li>계정 동기화 미사용 환경에서도 모바일 HTML 복사 정상 작동</li>
            </ul>
            <h4>v1.3.7</h4>
            <ul>
              <li>┣...┫로 감싸진 텍스트를 제거하는 정규식 추가</li>
            </ul>          
            <h4>v1.3.6</h4>
            <ul>
              <li>퍼스트 메시지 가져오기 추가</li>
              <li>Hidden Story 최신버전 반영</li>
            </ul>
            <h4>v1.3.5</h4>
            <ul>
              <li>영출 및 일출 텍스트 완벽 지원 적용</li>
              <li>봇 정규식 반영을 통한 이미지 에셋 가져오기 완벽 호환</li>
              <li>유저 인풋 제외 토글 버튼 추가</li>
              <li>기존 AI 호출 번역 기능 삭제</li>
              <li>특정 언어 폰트 깨짐 렌더링 버그 수정</li>
              <li>모바일 환경 범위 지정 오류 수정</li>
            </ul>
            <h4>자세한 내용은 아카챈 참고</h4>
          </div>
        </div>
      </div>
    `;
    document.getElementById('log-panel').insertAdjacentHTML('beforeend', patchnotesHtml);
    document.getElementById('btn-patchnotes').addEventListener('click', () => {
      document.getElementById('patchnotes-overlay').classList.add('visible');
    });
    document.getElementById('patchnotes-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'patchnotes-overlay') e.target.classList.remove('visible');
    });
    document.querySelector('#patchnotes-card .pn-close').addEventListener('click', () => {
      document.getElementById('patchnotes-overlay').classList.remove('visible');
    });

    // ===== 이벤트 바인딩 =====
    document.getElementById('btn-close').addEventListener('click', closePanel);
    document.getElementById('log-overlay').addEventListener('click', async (e) => {
      if (e.target.id === 'log-overlay') await closePanel();
    });
    document.getElementById('btn-apply-range').addEventListener('click', applyRange);
    document.getElementById('btn-select-all').addEventListener('click', () => { selectAll(); });
    document.getElementById('btn-select-none').addEventListener('click', () => { selectNone(); });
    document.getElementById('btn-deselect-user').addEventListener('click', () => { deselectUser(); });
    document.getElementById('range-start').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyRange(); });
    document.getElementById('range-end').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyRange(); });

    // 텍스트 복사
    document.getElementById('btn-copy-plain').addEventListener('click', async () => {
      await copyToClipboard(buildPlainText(), document.getElementById('btn-copy-plain'), '텍스트');
    });

    // HTML 복사 (편집 모드일 때는 편집된 내용 복사, 아니면 빌드된 HTML 복사)
    document.getElementById('btn-copy-html').addEventListener('click', async () => {
      const btn = document.getElementById('btn-copy-html');
      try {
        let html = '';
        if (editPhase !== 'off') {
          const editDiv = document.getElementById('edit-container');
          if (editDiv.classList.contains('visible')) {
            const container = editDiv.querySelector('[data-chatlog]');
            if (container) html = container.outerHTML;
          } else {
            const frame = document.getElementById('preview-frame');
            const doc = frame.contentDocument || frame.contentWindow.document;
            const container = doc.querySelector('[data-chatlog]');
            if (container) html = container.outerHTML;
          }
        }
        if (!html) { html = buildStyledHtml(); }
        html = html.replace('<details open>', '<details>').replace('<details open="">', '<details>').replace(' data-chatlog="true"', '');
        await copyHtmlToClipboard(html, btn);
      } catch (e) {
        const html = buildStyledHtml().replace('<details open>', '<details>').replace(' data-chatlog="true"', '');
        await copyHtmlToClipboard(html, btn);
      }
    });

    // 테마 칩 클릭
    document.querySelectorAll('.theme-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentTheme = chip.dataset.theme;
        document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (viewMode === 'preview') renderPreview();
      });
    });

    // 뷰 탭 전환
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.view;
        if (target === viewMode) return;
        viewMode = target;
        document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        toggleView();
      });
    });

    // 줌 컨트롤
    let zoomLevel = 100;
    document.getElementById('zoom-in').addEventListener('click', () => {
      zoomLevel = Math.min(200, zoomLevel + 10);
      applyZoom();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
      zoomLevel = Math.max(50, zoomLevel - 10);
      applyZoom();
    });
    document.getElementById('zoom-reset').addEventListener('click', () => {
      zoomLevel = 100;
      applyZoom();
    });

    const applyZoom = () => {
      document.getElementById('zoom-label').textContent = zoomLevel + '%';
      const frame = document.getElementById('preview-frame');
      frame.style.transform = 'scale(' + (zoomLevel / 100) + ')';
      frame.style.transformOrigin = 'top center';
      frame.style.width = (100 / (zoomLevel / 100)) + '%';
      frame.style.height = (100 / (zoomLevel / 100)) + '%';
    };

    // ===== 옵션 이벤트 =====

    // ===== 스타일 편집 패널 (컴팩트) =====
    const SE_COLOR_PRESETS = [
      { name: '기본', value: '' },
      { name: '에메랄드', value: '#059669' },
      { name: '틸', value: '#0d9488' },
      { name: '스카이', value: '#0284c7' },
      { name: '로즈', value: '#e11d48' },
      { name: '보라', value: '#7c3aed' },
      { name: '핑크', value: '#db2777' },
      { name: '골드', value: '#d97706' },
      { name: '그레이', value: '#6b7280' },
      { name: '네이비', value: '#1e3a5f' },
      { name: '차콜', value: '#374151' },
      { name: '화이트', value: '#ffffff' },
      { name: '블랙', value: '#111827' },
    ];
    const SE_BG_PRESETS = [
      { name: '없음', value: '' },
      { name: '민트', value: '#d1fae5' },
      { name: '스카이', value: '#dbeafe' },
      { name: '라벤더', value: '#ede9fe' },
      { name: '로즈', value: '#ffe4e6' },
      { name: '피치', value: '#fed7aa' },
      { name: '레몬', value: '#fef9c3' },
      { name: '세이지', value: '#dcfce7' },
      { name: '그레이', value: '#f3f4f6' },
      { name: '다크', value: 'rgba(0,0,0,0.15)' },
    ];
    let seActiveTab = 'dialogue';

    const SE_SIZES = [
      { label: '작게', value: '0.85em' },
      { label: '기본', value: '' },
      { label: '크게', value: '1.15em' },
    ];

    const buildSeBody = () => {
      const body = document.getElementById('se-body');
      if (!body) return;
      const stype = seActiveTab;
      const ov = styleOverrides[stype] || {};
      const hasBg = !['charName', 'userName'].includes(stype);
      const isNameTab = stype === 'charName' || stype === 'userName';

      let h = '';

      // 볼드 토글 (텍스트 탭만)
      const textTabs = ['dialogue', 'thought', 'sound', 'action', 'narration'];
      if (textTabs.includes(stype)) {
        const isBold = boldFlags[stype] || false;
        h += '<label class="se-bold-toggle"><input type="checkbox" id="se-bold-chk"' + (isBold ? ' checked' : '') + '><div class="se-bold-sw"></div><span class="se-bold-label">B 볼드</span></label>';
        h += '<div class="se-sep"></div>';
      }

      // 이름 숨기기 토글 (이름 탭 전용)
      if (isNameTab) {
        const hideChecked = stype === 'charName' ? hideCharName : hideUserName;
        h += '<label class="se-hide-toggle"><input type="checkbox" id="se-hide-name"' + (hideChecked ? ' checked' : '') + '><div class="se-hide-sw"></div><span class="se-hide-label">본문 숨기기</span></label>';
        h += '<div class="se-sep"></div>';
      }

      // 글자 색 프리셋
      h += '<span class="se-prop-label">글자</span>';
      h += '<div class="se-preset-chips" data-prop="color">';
      SE_COLOR_PRESETS.forEach(p => {
        const isActive = (ov.color || '') === p.value;
        if (!p.value) {
          h += '<div class="se-preset-chip none' + (isActive ? ' active' : '') + '" data-val="" title="기본">✕</div>';
        } else {
          h += '<div class="se-preset-chip' + (isActive ? ' active' : '') + '" data-val="' + p.value + '" title="' + p.name + '" style="background:' + p.value + '"></div>';
        }
      });
      h += '</div>';

      // 배경색 프리셋
      if (hasBg) {
        h += '<div class="se-sep"></div>';
        h += '<span class="se-prop-label">배경</span>';
        h += '<div class="se-preset-chips" data-prop="bg">';
        SE_BG_PRESETS.forEach(p => {
          const isActive = (ov.bg || '') === p.value;
          if (!p.value) {
            h += '<div class="se-preset-chip none' + (isActive ? ' active' : '') + '" data-val="" title="없음">✕</div>';
          } else {
            h += '<div class="se-preset-chip' + (isActive ? ' active' : '') + '" data-val="' + p.value + '" title="' + p.name + '" style="background:' + p.value + ';' + (p.value.startsWith('rgba') ? 'border:1px solid #555' : '') + '"></div>';
          }
        });
        h += '</div>';
      }

      // 하이라이트 (대사/효과음)
      if (stype === 'dialogue') {
        h += '<div class="se-sep"></div>';
        h += '<span class="se-prop-label">하이라이트</span>';
        h += '<div class="palette-chips">' + paletteHtml + '</div>';
      }
      if (stype === 'sound') {
        h += '<div class="se-sep"></div>';
        h += '<span class="se-prop-label">하이라이트</span>';
        h += '<div class="palette-chips">' + soundPaletteHtml + '</div>';
      }

      // 글자 크기 (3버튼)
      h += '<div class="se-sep"></div>';
      h += '<span class="se-prop-label">크기</span>';
      h += '<div class="se-size-btns">';
      SE_SIZES.forEach(s => {
        const isActive = (ov.fontSize || '') === s.value;
        h += '<button class="se-size-btn' + (isActive ? ' active' : '') + '" data-sz="' + s.value + '">' + s.label + '</button>';
      });
      h += '</div>';

      // 초기화 버튼
      h += '<button class="se-reset-btn" id="se-reset-cur">초기화</button>';

      body.innerHTML = h;

      // ---- 바인딩 ----
      // 볼드 토글
      const boldChk = document.getElementById('se-bold-chk');
      if (boldChk) {
        boldChk.addEventListener('change', () => {
          boldFlags[stype] = boldChk.checked;
          // boldQuotes 동기화 (대사 기준, 레거시 호환)
          boldQuotes = boldFlags.dialogue;
          if (viewMode === 'preview') renderPreview();
        });
      }

      // 이름 숨기기
      const hideChk = document.getElementById('se-hide-name');
      if (hideChk) {
        hideChk.addEventListener('change', () => {
          if (stype === 'charName') hideCharName = hideChk.checked;
          else hideUserName = hideChk.checked;
          if (viewMode === 'preview') renderPreview();
        });
      }

      // 색상 칩
      body.querySelectorAll('.se-preset-chips').forEach(group => {
        const prop = group.dataset.prop;
        group.querySelectorAll('.se-preset-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const val = chip.dataset.val;
            if (!styleOverrides[stype]) styleOverrides[stype] = {};
            if (val) {
              styleOverrides[stype][prop] = val;
            } else {
              delete styleOverrides[stype][prop];
              if (Object.keys(styleOverrides[stype]).length === 0) delete styleOverrides[stype];
            }
            group.querySelectorAll('.se-preset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            if (viewMode === 'preview') renderPreview();
          });
        });
      });

      // 하이라이트 칩 (대사)
      body.querySelectorAll('.palette-chip:not(.snd-hl)').forEach(chip => {
        chip.addEventListener('click', () => {
          highlightIdx = parseInt(chip.dataset.idx);
          body.querySelectorAll('.palette-chip:not(.snd-hl)').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          if (viewMode === 'preview') renderPreview();
        });
      });

      // 하이라이트 칩 (효과음)
      body.querySelectorAll('.palette-chip.snd-hl').forEach(chip => {
        chip.addEventListener('click', () => {
          soundHighlightIdx = parseInt(chip.dataset.idx);
          body.querySelectorAll('.palette-chip.snd-hl').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          if (viewMode === 'preview') renderPreview();
        });
      });

      // 크기 버튼
      body.querySelectorAll('.se-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.sz;
          if (!styleOverrides[stype]) styleOverrides[stype] = {};
          if (val) { styleOverrides[stype].fontSize = val; }
          else { delete styleOverrides[stype].fontSize; if (Object.keys(styleOverrides[stype]).length === 0) delete styleOverrides[stype]; }
          body.querySelectorAll('.se-size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (viewMode === 'preview') renderPreview();
        });
      });

      // 현재 탭 초기화
      const resetBtn = document.getElementById('se-reset-cur');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          delete styleOverrides[stype];
          if (stype === 'dialogue') { highlightIdx = -1; boldFlags.dialogue = true; }
          if (stype === 'thought') { boldFlags.thought = false; }
          if (stype === 'sound') { soundHighlightIdx = 4; boldFlags.sound = true; }
          if (stype === 'action') { boldFlags.action = false; }
          if (stype === 'narration') { boldFlags.narration = false; }
          if (stype === 'charName') hideCharName = false;
          if (stype === 'userName') hideUserName = false;
          boldQuotes = boldFlags.dialogue;
          buildSeBody();
          if (viewMode === 'preview') renderPreview();
        });
      }
    };

    // 프리셋 바 (저장/불러오기)
    const buildPresetBar = () => {
      const panel = document.getElementById('style-edit-panel');
      let bar = document.getElementById('se-preset-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'se-preset-bar';
        bar.id = 'se-preset-bar';
        panel.appendChild(bar);
      }
      // 비동기로 저장된 프리셋 목록을 읽어옴
      (async () => {
        let savedList = [];
        try {
          const raw = await Risuai.pluginStorage.getItem('chatlogger_presets');
          if (raw) savedList = JSON.parse(raw);
        } catch (e) {}

        let h = '<span class="se-preset-label">💾 프리셋</span>';
        h += '<select class="se-preset-select" id="se-preset-select"><option value="">선택...</option>';
        savedList.forEach((p, i) => {
          h += '<option value="' + i + '">' + p.name + '</option>';
        });
        h += '</select>';
        h += '<button class="se-preset-btn" id="se-preset-load">불러오기</button>';
        h += '<button class="se-preset-del" id="se-preset-del">삭제</button>';
        h += '<button class="se-preset-btn" id="se-preset-save">현재 저장</button>';

        bar.innerHTML = h;

        // 불러오기
        document.getElementById('se-preset-load').addEventListener('click', () => {
          const sel = document.getElementById('se-preset-select');
          const idx = parseInt(sel.value);
          if (isNaN(idx) || !savedList[idx]) return;
          const preset = savedList[idx];
          styleOverrides = JSON.parse(JSON.stringify(preset.overrides || {}));
          highlightIdx = preset.highlightIdx !== undefined ? preset.highlightIdx : -1;
          soundHighlightIdx = preset.soundHighlightIdx !== undefined ? preset.soundHighlightIdx : 4;
          boldQuotes = preset.boldQuotes !== undefined ? preset.boldQuotes : true;
          if (preset.boldFlags) {
            boldFlags = JSON.parse(JSON.stringify(preset.boldFlags));
          } else {
            // 레거시 호환: boldQuotes로부터 복원
            boldFlags = { dialogue: boldQuotes, thought: boldQuotes, sound: true, action: false, narration: false };
          }
          boldQuotes = boldFlags.dialogue;
          hideCharName = preset.hideCharName || false;
          hideUserName = preset.hideUserName || false;
          // UI 동기화
          buildSeBody();
          if (viewMode === 'preview') renderPreview();
        });

        // 삭제
        document.getElementById('se-preset-del').addEventListener('click', async () => {
          const sel = document.getElementById('se-preset-select');
          const idx = parseInt(sel.value);
          if (isNaN(idx) || !savedList[idx]) return;
          savedList.splice(idx, 1);
          try { await Risuai.pluginStorage.setItem('chatlogger_presets', JSON.stringify(savedList)); } catch (e) {}
          buildPresetBar();
        });

        // 저장
        document.getElementById('se-preset-save').addEventListener('click', async () => {
          const name = prompt('프리셋 이름을 입력하세요:');
          if (!name || !name.trim()) return;
          const preset = {
            name: name.trim(),
            overrides: JSON.parse(JSON.stringify(styleOverrides)),
            highlightIdx,
            soundHighlightIdx,
            boldQuotes: boldFlags.dialogue,
            boldFlags: JSON.parse(JSON.stringify(boldFlags)),
            hideCharName,
            hideUserName
          };
          savedList.push(preset);
          try { await Risuai.pluginStorage.setItem('chatlogger_presets', JSON.stringify(savedList)); } catch (e) {}
          buildPresetBar();
        });
      })();
    };

    // 탭 클릭
    document.querySelectorAll('.se-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        seActiveTab = tab.dataset.setab;
        document.querySelectorAll('.se-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        buildSeBody();
      });
    });
    buildSeBody();
    buildPresetBar();

    let previewDebounce = null;
    const debouncePreview = () => {
      if (viewMode !== 'preview') return;
      clearTimeout(previewDebounce);
      previewDebounce = setTimeout(() => renderPreview(), 500);
    };

    // 페르소나 드롭다운 초기화 (버튼 클릭 시 로드)
    const personaSelect = document.getElementById('opt-persona-select');
    const personaInput = document.getElementById('opt-persona');
    let personaList = [];
    let personaLoaded = false;

    const loadPersonaListFn = async () => {
      if (personaLoaded) return;
      personaLoaded = true;
      try {
        const pdb = await Risuai.getDatabase();
        personaList = (pdb && pdb.personas) || [];
        personaList.forEach((p, i) => {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = p.name || ('Persona ' + (i + 1));
          personaSelect.insertBefore(opt, personaSelect.lastElementChild);
        });
      } catch (e) { console.warn('Persona list load failed:', e); }
    };
    loadPersonaList = loadPersonaListFn;

    personaSelect.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === '__custom__') {
        personaInput.style.display = '';
        personaInput.focus();
        personaName = personaInput.value.trim();
        personaImageUri = '';
        personaImageUrl = '';
      } else if (val === '') {
        personaInput.style.display = 'none';
        personaName = '';
        personaImageUri = '';
        personaImageUrl = '';
      } else {
        personaInput.style.display = 'none';
        const idx = parseInt(val, 10);
        const persona = personaList[idx];
        if (persona) {
          personaName = persona.name || '';
          if (persona.icon) {
            try {
              const uri = await getAssetDataUri(persona.icon);
              if (uri) personaImageUri = uri;
              personaImageUrl = getAssetRisuUrl(persona.icon);
            } catch (err) { console.warn('Persona icon load:', err); }
          } else {
            personaImageUri = '';
            personaImageUrl = '';
          }
        }
      }
      debouncePreview();
    });
    personaInput.addEventListener('input', (e) => {
      personaName = e.target.value.trim();
      debouncePreview();
    });
    document.getElementById('opt-user-tag').addEventListener('change', (e) => {
      useUserTag = e.target.checked;
      if (viewMode === 'preview') renderPreview();
    });
    document.getElementById('opt-header-images').addEventListener('change', (e) => {
      includeHeaderImages = e.target.checked;
      if (viewMode === 'preview') renderPreview();
    });
    document.getElementById('opt-log-title').addEventListener('input', (e) => {
      logTitle = e.target.value.trim();
      debouncePreview();
    });
    document.getElementById('opt-model').addEventListener('input', (e) => {
      modelInfo = e.target.value.trim();
      debouncePreview();
    });
    document.getElementById('opt-prompt').addEventListener('input', (e) => {
      promptInfo = e.target.value.trim();
      debouncePreview();
    });

    document.getElementById('opt-images').addEventListener('change', (e) => {
      includeImages = e.target.checked;
      if (viewMode === 'preview') renderPreview();
    });

    // 번역문(캐시) 토글
    document.getElementById('opt-translation-cache').addEventListener('change', async (e) => {
      useTranslationCache = e.target.checked;
      // 모바일 동기화
      const mdTc = document.getElementById('md-translation-cache');
      if (mdTc) mdTc.checked = useTranslationCache;
      // 번역 캐시 적용 시 채팅 로그 다시 추출
      const { messages } = await extractChatLog();
      allMessages = messages;
      renderMessages();
      if (viewMode === 'preview') renderPreview();
    });

    // ===== 편집 단계 관리 =====
    const setEditPhase = (phase) => {
      editPhase = phase;
      editMode = phase !== 'off';
      const stylePanel = document.getElementById('style-edit-panel');
      const phaseBtns = document.getElementById('edit-phase-btns');
      const epStyle = document.getElementById('ep-style');
      const epText = document.getElementById('ep-text');
      const epWarn = document.getElementById('ep-warn');

      if (phase === 'off') {
        stylePanel.classList.remove('visible');
        phaseBtns.classList.remove('visible');
        epWarn.style.display = 'none';
        epStyle.classList.remove('active'); epText.classList.remove('active', 'text-active');
        document.getElementById('preview-frame').style.display = '';
        document.getElementById('edit-container').classList.remove('visible');
        document.getElementById('edit-container').innerHTML = '';
        if (viewMode === 'preview') renderPreview();
      } else if (phase === 'style') {
        stylePanel.classList.add('visible');
        phaseBtns.classList.add('visible');
        epStyle.classList.add('active'); epText.classList.remove('active', 'text-active');
        epWarn.style.display = 'none';
        document.getElementById('preview-frame').style.display = '';
        document.getElementById('edit-container').classList.remove('visible');
        if (viewMode !== 'preview') {
          viewMode = 'preview';
          document.querySelectorAll('.view-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === 'preview');
          });
          document.querySelectorAll('#m-bottom-bar .m-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === 'preview');
          });
          toggleView();
        } else {
          renderPreview();
        }
      } else if (phase === 'text') {
        stylePanel.classList.remove('visible');
        phaseBtns.classList.add('visible');
        epStyle.classList.remove('active'); epText.classList.add('active', 'text-active');
        epWarn.style.display = '';
        document.getElementById('preview-frame').style.display = 'none';
        renderEditContainer();
      }
    };

    document.getElementById('opt-edit').addEventListener('change', (e) => {
      setEditPhase(e.target.checked ? 'style' : 'off');
    });

    document.getElementById('ep-style').addEventListener('click', () => {
      if (editPhase === 'text') {
        // 글자 수정 → 스타일로 전환 시 경고
        if (!confirm('스타일 편집으로 전환하면 수정한 글자가 초기화됩니다. 전환할까요?')) return;
      }
      setEditPhase('style');
    });

    document.getElementById('ep-text').addEventListener('click', () => {
      setEditPhase('text');
    });

    // ===== 모바일 UI 이벤트 =====
    const mIsMobile = () => window.innerWidth <= 768;

    // 드로어 열기/닫기
    const mDrawer = document.getElementById('m-settings-drawer');
    const openMobileDrawer = () => {
      buildMobileDrawer();
      mDrawer.classList.add('visible');
      const btn = document.getElementById('m-settings-btn');
      if (btn) btn.classList.add('m-active');
    };
    const closeMobileDrawer = () => {
      mDrawer.classList.remove('visible');
      const btn = document.getElementById('m-settings-btn');
      if (btn) btn.classList.remove('m-active');
    };

    // 드로어 백드롭 클릭 → 닫기
    mDrawer.addEventListener('click', (e) => {
      if (e.target === mDrawer) closeMobileDrawer();
    });
    // 닫기 버튼
    document.getElementById('m-drawer-close').addEventListener('click', closeMobileDrawer);

    // ===== 모바일 드로어 본문 빌더 =====
    const buildMobileDrawer = () => {
      const body = document.getElementById('m-drawer-body');
      if (!body) return;

      let h = '';

      // --- 📐 범위 · 선택 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">📐 범위 · 선택</div>';
      h += '<div class="m-row">';
      h += '<span class="m-label">시작</span>';
      h += '<input type="text" inputmode="numeric" pattern="[0-9]*" class="m-input" id="md-range-start" value="' + (rangeStart + 1) + '" style="width:60px;flex:none">';
      h += '<span class="m-label">끝</span>';
      h += '<input type="text" inputmode="numeric" pattern="[0-9]*" class="m-input" id="md-range-end" value="' + (rangeEnd + 1) + '" style="width:60px;flex:none">';
      h += '<button class="m-apply-btn" id="md-apply-range" style="width:auto;flex:none;padding:7px 12px">적용</button>';
      h += '</div>';
      h += '<div class="m-row" style="margin-top:6px">';
      h += '<button class="m-apply-btn" id="md-select-all" style="flex:1;padding:7px 0;background:#1a1a2e;color:#93c5fd;border:1px solid #3b82f6">전체 선택</button>';
      h += '<button class="m-apply-btn" id="md-select-none" style="flex:1;padding:7px 0;background:#1a1a1a;color:#aaa;border:1px solid #444">전체 해제</button>';
      h += '<button class="m-apply-btn" id="md-deselect-user" style="flex:1;padding:7px 0;background:#1a1a1a;color:#f0a0a0;border:1px solid #c06060">유저 해제</button>';
      h += '<span class="m-label" id="md-sel-count" style="color:#666;font-size:11px">' + selectedSet.size + '/' + allMessages.length + '</span>';
      h += '</div>';
      h += '</div>';

      // --- 🎨 테마 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">🎨 테마</div>';
      h += '<div class="m-theme-grid">';
      let mPrevCat = '';
      for (const [key, theme] of Object.entries(THEMES).sort((a,b)=>(a[1].category==='archive'?0:1)-(b[1].category==='archive'?0:1))) {
        const p = theme.preview;
        const cat = theme.category || 'default';
        if (cat !== mPrevCat && mPrevCat !== '') {
          h += '</div>';
          h += '<div class="m-theme-grid" style="margin-top:8px">';
        }
        mPrevCat = cat;
        const active = key === currentTheme ? ' active' : '';
        h += '<div class="theme-chip' + active + '" data-theme="' + key + '" title="' + theme.name + '" style="margin:0">';
        h += '<div class="theme-chip-inner" style="background:' + p.bg + ';color:' + p.accent + ';border:1px solid ' + p.accent + '33;">Aa</div>';
        h += '</div>';
      }
      h += '</div>';
      h += '</div>';

      // --- 👤 페르소나 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">👤 페르소나</div>';
      h += '<div class="m-row">';
      h += '<select class="m-select" id="md-persona-select">';
      h += '<option value="">선택</option>';
      personaList.forEach((p, i) => {
        const sel = (personaSelect.value === String(i)) ? ' selected' : '';
        h += '<option value="' + i + '"' + sel + '>' + (p.name || ('Persona ' + (i + 1))) + '</option>';
      });
      h += '<option value="__custom__"' + (personaSelect.value === '__custom__' ? ' selected' : '') + '>✏️ 직접 입력</option>';
      h += '</select>';
      h += '</div>';
      const showCustom = personaSelect.value === '__custom__' ? '' : 'display:none;';
      h += '<div class="m-row" id="md-persona-custom-row" style="' + showCustom + '">';
      h += '<input type="text" class="m-input" id="md-persona-input" placeholder="이름 입력" value="' + (personaName || '').replace(/"/g, '&quot;') + '">';
      h += '</div>';
      h += '<div class="m-row">';
      h += '<label class="m-toggle"><input type="checkbox" id="md-user-tag"' + (useUserTag ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">{{user}} 태그</span></label>';
      h += '</div>';
      h += '<div class="m-row">';
      h += '<label class="m-toggle"><input type="checkbox" id="md-header-images"' + (includeHeaderImages ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">🖼️ 프로필 이미지</span></label>';
      h += '</div>';
      h += '</div>';

      // --- 📌 제목 / 🤖📝 모델·프롬프트 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">📌 제목 · 🤖 모델 · 📝 프롬프트</div>';
      h += '<div class="m-row"><span class="m-label">제목</span><input type="text" class="m-input" id="md-title" placeholder="로그 제목" value="' + (logTitle || '').replace(/"/g, '&quot;') + '"></div>';
      h += '<div class="m-row"><span class="m-label">모델</span><input type="text" class="m-input" id="md-model" placeholder="모델명" value="' + (modelInfo || '').replace(/"/g, '&quot;') + '"></div>';
      h += '<div class="m-row"><span class="m-label">프롬</span><input type="text" class="m-input" id="md-prompt" placeholder="프롬프트" value="' + (promptInfo || '').replace(/"/g, '&quot;') + '"></div>';
      h += '</div>';

      // --- 🖼️ 이미지 / 🌐 번역문 / ✂️ 편집 토글 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">옵션</div>';
      h += '<div class="m-row">';
      h += '<label class="m-toggle"><input type="checkbox" id="md-images"' + (includeImages ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">🖼️ 이미지</span></label>';
      h += '</div>';
      h += '<div class="m-row">';
      h += '<label class="m-toggle"><input type="checkbox" id="md-translation-cache"' + (useTranslationCache ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">🌐 번역문</span></label>';
      h += '</div>';
      h += '<div class="m-row">';
      h += '<label class="m-toggle"><input type="checkbox" id="md-edit"' + (editPhase !== 'off' ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">✂️ 편집</span></label>';
      h += '</div>';
      // 편집 단계 버튼
      const epVis = editPhase !== 'off' ? '' : 'display:none;';
      h += '<div class="m-row" id="md-edit-phase-row" style="' + epVis + '">';
      h += '<div class="m-edit-btns" style="width:100%">';
      h += '<button class="m-edit-btn' + (editPhase === 'style' ? ' active' : '') + '" id="md-ep-style">🎨 스타일</button>';
      h += '<button class="m-edit-btn' + (editPhase === 'text' ? ' text-active' : '') + '" id="md-ep-text">✏️ 글자수정</button>';
      h += '</div>';
      h += '</div>';
      h += '</div>';

      // --- 🎨 스타일 편집 ---
      if (editPhase === 'style') {
        h += '<div class="m-section">';
        h += '<div class="m-section-title">🎨 스타일 편집</div>';
        // 탭
        const seTabs = [
          ['dialogue', '대사'], ['thought', '속마음'], ['sound', '효과음'],
          ['action', '지문'], ['narration', '나레이션'],
          ['charName', '캐릭터명'], ['userName', '유저명']
        ];
        h += '<div class="m-row" style="flex-wrap:wrap;gap:3px;margin-bottom:10px">';
        seTabs.forEach(([key, label]) => {
          h += '<button class="m-edit-btn' + (seActiveTab === key ? ' active' : '') + '" data-msetab="' + key + '" style="flex:none;padding:5px 8px;font-size:10px">' + label + '</button>';
        });
        h += '</div>';

        // 개별 스타일 내용
        const stype = seActiveTab;
        const ov = styleOverrides[stype] || {};
        const hasBg = !['charName', 'userName'].includes(stype);
        const isNameTab = stype === 'charName' || stype === 'userName';
        const textTabs = ['dialogue', 'thought', 'sound', 'action', 'narration'];

        // 볼드
        if (textTabs.includes(stype)) {
          const isBold = boldFlags[stype] || false;
          h += '<div class="m-row"><label class="m-toggle"><input type="checkbox" id="md-se-bold"' + (isBold ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">B 볼드</span></label></div>';
        }
        // 이름 숨기기
        if (isNameTab) {
          const hideChecked = stype === 'charName' ? hideCharName : hideUserName;
          h += '<div class="m-row"><label class="m-toggle"><input type="checkbox" id="md-se-hide"' + (hideChecked ? ' checked' : '') + '><div class="m-toggle-sw"></div><span class="m-toggle-label">본문 숨기기</span></label></div>';
        }
        // 글자색
        h += '<div style="margin:6px 0 4px"><span class="m-label">글자</span></div>';
        h += '<div class="m-row" style="flex-wrap:wrap;gap:3px" id="md-se-colors">';
        SE_COLOR_PRESETS.forEach(p => {
          const isActive = (ov.color || '') === p.value;
          if (!p.value) {
            h += '<div class="se-preset-chip none' + (isActive ? ' active' : '') + '" data-val="" data-prop="color" title="기본" style="width:20px;height:20px;font-size:10px">✕</div>';
          } else {
            h += '<div class="se-preset-chip' + (isActive ? ' active' : '') + '" data-val="' + p.value + '" data-prop="color" title="' + p.name + '" style="background:' + p.value + ';width:20px;height:20px"></div>';
          }
        });
        h += '</div>';
        // 배경색
        if (hasBg) {
          h += '<div style="margin:6px 0 4px"><span class="m-label">배경</span></div>';
          h += '<div class="m-row" style="flex-wrap:wrap;gap:3px" id="md-se-bgs">';
          SE_BG_PRESETS.forEach(p => {
            const isActive = (ov.bg || '') === p.value;
            if (!p.value) {
              h += '<div class="se-preset-chip none' + (isActive ? ' active' : '') + '" data-val="" data-prop="bg" title="없음" style="width:20px;height:20px;font-size:10px">✕</div>';
            } else {
              h += '<div class="se-preset-chip' + (isActive ? ' active' : '') + '" data-val="' + p.value + '" data-prop="bg" title="' + p.name + '" style="background:' + p.value + ';width:20px;height:20px;' + (p.value.startsWith('rgba') ? 'border:1px solid #555' : '') + '"></div>';
            }
          });
          h += '</div>';
        }
        // 하이라이트 (대사)
        if (stype === 'dialogue') {
          h += '<div style="margin:6px 0 4px"><span class="m-label">하이라이트</span></div>';
          h += '<div class="m-row" style="flex-wrap:wrap;gap:3px" id="md-se-hl">';
          h += '<div class="palette-chip none' + (highlightIdx === -1 ? ' active' : '') + '" data-idx="-1" title="기본" style="width:20px;height:20px;font-size:10px">✕</div>';
          PASTEL_COLORS.forEach((c, idx) => {
            h += '<div class="palette-chip' + (highlightIdx === idx ? ' active' : '') + '" data-idx="' + idx + '" title="' + c.name + '" style="background:' + c.bg + ';width:20px;height:20px"></div>';
          });
          h += '</div>';
        }
        // 하이라이트 (효과음)
        if (stype === 'sound') {
          h += '<div style="margin:6px 0 4px"><span class="m-label">하이라이트</span></div>';
          h += '<div class="m-row" style="flex-wrap:wrap;gap:3px" id="md-se-sndhl">';
          h += '<div class="palette-chip snd-hl none' + (soundHighlightIdx === -1 ? ' active' : '') + '" data-idx="-1" title="기본" style="width:20px;height:20px;font-size:10px">✕</div>';
          PASTEL_COLORS.forEach((c, idx) => {
            h += '<div class="palette-chip snd-hl' + (soundHighlightIdx === idx ? ' active' : '') + '" data-idx="' + idx + '" title="' + c.name + '" style="background:' + c.bg + ';width:20px;height:20px"></div>';
          });
          h += '</div>';
        }
        // 크기
        h += '<div style="margin:6px 0 4px"><span class="m-label">크기</span></div>';
        h += '<div class="m-edit-btns">';
        SE_SIZES.forEach(s => {
          const isActive = (ov.fontSize || '') === s.value;
          h += '<button class="m-edit-btn' + (isActive ? ' active' : '') + '" data-mdsz="' + s.value + '">' + s.label + '</button>';
        });
        h += '</div>';
        // 초기화
        h += '<div style="margin-top:8px"><button class="m-apply-btn" id="md-se-reset">초기화</button></div>';

        h += '</div>'; // .m-section
      }

      // --- 💾 프리셋 ---
      h += '<div class="m-section">';
      h += '<div class="m-section-title">💾 프리셋</div>';
      h += '<div class="m-row"><select class="m-select" id="md-preset-select"><option value="">선택...</option></select></div>';
      h += '<div class="m-edit-btns">';
      h += '<button class="m-edit-btn" id="md-preset-load">불러오기</button>';
      h += '<button class="m-edit-btn" id="md-preset-del">삭제</button>';
      h += '<button class="m-edit-btn" id="md-preset-save">저장</button>';
      h += '</div>';
      h += '</div>';

      body.innerHTML = h;

      // =========== 드로어 이벤트 바인딩 ===========

      // 범위 적용
      document.getElementById('md-apply-range').addEventListener('click', () => {
        // 모바일에서 입력 중인 값을 확정하기 위해 blur 처리
        document.getElementById('md-range-start').blur();
        document.getElementById('md-range-end').blur();
        const s = parseInt(document.getElementById('md-range-start').value) || 1;
        const e = parseInt(document.getElementById('md-range-end').value) || (rangeEnd + 1);
        document.getElementById('range-start').value = s;
        document.getElementById('range-end').value = e;
        applyRange();
        // 적용 후 입력값 갱신 (1-indexed)
        document.getElementById('md-range-start').value = rangeStart + 1;
        document.getElementById('md-range-end').value = rangeEnd + 1;
        const cnt = document.getElementById('md-sel-count');
        if (cnt) cnt.textContent = selectedSet.size + '/' + allMessages.length;
      });

      document.getElementById('md-select-all').addEventListener('click', () => {
        selectAll();
        const cnt = document.getElementById('md-sel-count');
        if (cnt) cnt.textContent = selectedSet.size + '/' + allMessages.length;
      });
      document.getElementById('md-select-none').addEventListener('click', () => {
        selectNone();
        const cnt = document.getElementById('md-sel-count');
        if (cnt) cnt.textContent = selectedSet.size + '/' + allMessages.length;
      });
      document.getElementById('md-deselect-user').addEventListener('click', () => {
        deselectUser();
        const cnt = document.getElementById('md-sel-count');
        if (cnt) cnt.textContent = selectedSet.size + '/' + allMessages.length;
      });

      // 테마 칩
      body.querySelectorAll('.theme-chip[data-theme]').forEach(chip => {
        chip.addEventListener('click', () => {
          currentTheme = chip.dataset.theme;
          // 데스크톱 칩 동기화
          document.querySelectorAll('#toolbar .theme-chip').forEach(c => c.classList.toggle('active', c.dataset.theme === currentTheme));
          // 드로어 칩
          body.querySelectorAll('.theme-chip[data-theme]').forEach(c => c.classList.toggle('active', c.dataset.theme === currentTheme));
          debouncePreview();
        });
      });

      // 페르소나 선택
      const mdPersonaSel = document.getElementById('md-persona-select');
      mdPersonaSel.addEventListener('change', async (e) => {
        const val = e.target.value;
        // 데스크톱 select 동기화
        personaSelect.value = val;
        personaSelect.dispatchEvent(new Event('change'));
        // 커스텀 입력 행 표시
        const customRow = document.getElementById('md-persona-custom-row');
        if (val === '__custom__') {
          customRow.style.display = '';
          document.getElementById('md-persona-input').focus();
        } else {
          customRow.style.display = 'none';
        }
      });
      const mdPersonaInput = document.getElementById('md-persona-input');
      mdPersonaInput.addEventListener('input', (e) => {
        personaName = e.target.value.trim();
        personaInput.value = personaName;
        debouncePreview();
      });

      // {{user}} 토글
      document.getElementById('md-user-tag').addEventListener('change', (e) => {
        useUserTag = e.target.checked;
        document.getElementById('opt-user-tag').checked = useUserTag;
        if (viewMode === 'preview') renderPreview();
      });

      // 프로필 이미지 토글
      document.getElementById('md-header-images').addEventListener('change', (e) => {
        includeHeaderImages = e.target.checked;
        document.getElementById('opt-header-images').checked = includeHeaderImages;
        if (viewMode === 'preview') renderPreview();
      });

      // 제목/모델/프롬프트
      document.getElementById('md-title').addEventListener('input', (e) => {
        logTitle = e.target.value.trim();
        document.getElementById('opt-log-title').value = logTitle;
        debouncePreview();
      });
      document.getElementById('md-model').addEventListener('input', (e) => {
        modelInfo = e.target.value.trim();
        document.getElementById('opt-model').value = modelInfo;
        debouncePreview();
      });
      document.getElementById('md-prompt').addEventListener('input', (e) => {
        promptInfo = e.target.value.trim();
        document.getElementById('opt-prompt').value = promptInfo;
        debouncePreview();
      });

      // 이미지 토글
      document.getElementById('md-images').addEventListener('change', (e) => {
        includeImages = e.target.checked;
        document.getElementById('opt-images').checked = includeImages;
        if (viewMode === 'preview') renderPreview();
      });

      // 번역문(캐시) 토글
      document.getElementById('md-translation-cache').addEventListener('change', async (e) => {
        useTranslationCache = e.target.checked;
        document.getElementById('opt-translation-cache').checked = useTranslationCache;
        const { messages } = await extractChatLog();
        allMessages = messages;
        renderMessages();
        if (viewMode === 'preview') renderPreview();
      });

      // 편집 토글
      document.getElementById('md-edit').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.getElementById('opt-edit').checked = checked;
        setEditPhase(checked ? 'style' : 'off');
        // 편집 단계 행 가시성
        document.getElementById('md-edit-phase-row').style.display = checked ? '' : 'none';
        // 스타일 편집 섹션 → 드로어 재구성
        buildMobileDrawer();
      });
      // 편집 단계 버튼
      const mdEpStyle = document.getElementById('md-ep-style');
      const mdEpText = document.getElementById('md-ep-text');
      if (mdEpStyle) {
        mdEpStyle.addEventListener('click', () => {
          if (editPhase === 'text') {
            if (!confirm('스타일 편집으로 전환하면 수정한 글자가 초기화됩니다. 전환할까요?')) return;
          }
          setEditPhase('style');
          buildMobileDrawer();
        });
      }
      if (mdEpText) {
        mdEpText.addEventListener('click', () => {
          setEditPhase('text');
          closeMobileDrawer();
        });
      }

      // 스타일 편집 탭
      body.querySelectorAll('[data-msetab]').forEach(tab => {
        tab.addEventListener('click', () => {
          seActiveTab = tab.dataset.msetab;
          // 데스크톱 동기화
          document.querySelectorAll('.se-tab').forEach(t => t.classList.toggle('active', t.dataset.setab === seActiveTab));
          buildSeBody();
          buildMobileDrawer();
        });
      });

      // 스타일: 볼드 토글
      const mdSeBold = document.getElementById('md-se-bold');
      if (mdSeBold) {
        mdSeBold.addEventListener('change', () => {
          boldFlags[seActiveTab] = mdSeBold.checked;
          boldQuotes = boldFlags.dialogue;
          if (viewMode === 'preview') renderPreview();
        });
      }
      // 스타일: 이름 숨기기
      const mdSeHide = document.getElementById('md-se-hide');
      if (mdSeHide) {
        mdSeHide.addEventListener('change', () => {
          if (seActiveTab === 'charName') hideCharName = mdSeHide.checked;
          else hideUserName = mdSeHide.checked;
          if (viewMode === 'preview') renderPreview();
        });
      }
      // 스타일: 색상·배경 칩
      body.querySelectorAll('.se-preset-chip[data-prop]').forEach(chip => {
        chip.addEventListener('click', () => {
          const prop = chip.dataset.prop;
          const val = chip.dataset.val;
          if (!styleOverrides[seActiveTab]) styleOverrides[seActiveTab] = {};
          if (val) { styleOverrides[seActiveTab][prop] = val; }
          else { delete styleOverrides[seActiveTab][prop]; if (Object.keys(styleOverrides[seActiveTab]).length === 0) delete styleOverrides[seActiveTab]; }
          // 같은 prop 칩들 active 토글
          body.querySelectorAll('.se-preset-chip[data-prop="' + prop + '"]').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          buildSeBody(); // 데스크톱 동기화
          if (viewMode === 'preview') renderPreview();
        });
      });
      // 스타일: 하이라이트 (대사)
      body.querySelectorAll('#md-se-hl .palette-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          highlightIdx = parseInt(chip.dataset.idx);
          body.querySelectorAll('#md-se-hl .palette-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          buildSeBody();
          if (viewMode === 'preview') renderPreview();
        });
      });
      // 스타일: 하이라이트 (효과음)
      body.querySelectorAll('#md-se-sndhl .palette-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          soundHighlightIdx = parseInt(chip.dataset.idx);
          body.querySelectorAll('#md-se-sndhl .palette-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          buildSeBody();
          if (viewMode === 'preview') renderPreview();
        });
      });
      // 스타일: 크기
      body.querySelectorAll('[data-mdsz]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.mdsz;
          if (!styleOverrides[seActiveTab]) styleOverrides[seActiveTab] = {};
          if (val) { styleOverrides[seActiveTab].fontSize = val; }
          else { delete styleOverrides[seActiveTab].fontSize; if (Object.keys(styleOverrides[seActiveTab]).length === 0) delete styleOverrides[seActiveTab]; }
          body.querySelectorAll('[data-mdsz]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          buildSeBody();
          if (viewMode === 'preview') renderPreview();
        });
      });
      // 스타일: 초기화
      const mdSeReset = document.getElementById('md-se-reset');
      if (mdSeReset) {
        mdSeReset.addEventListener('click', () => {
          const stype = seActiveTab;
          delete styleOverrides[stype];
          if (stype === 'dialogue') { highlightIdx = -1; boldFlags.dialogue = true; }
          if (stype === 'thought') { boldFlags.thought = false; }
          if (stype === 'sound') { soundHighlightIdx = 4; boldFlags.sound = true; }
          if (stype === 'action') { boldFlags.action = false; }
          if (stype === 'narration') { boldFlags.narration = false; }
          if (stype === 'charName') hideCharName = false;
          if (stype === 'userName') hideUserName = false;
          boldQuotes = boldFlags.dialogue;
          buildSeBody();
          buildMobileDrawer();
          if (viewMode === 'preview') renderPreview();
        });
      }

      // 프리셋 로드 (비동기)
      (async () => {
        let savedList = [];
        try {
          const raw = await Risuai.pluginStorage.getItem('chatlogger_presets');
          if (raw) savedList = JSON.parse(raw);
        } catch (e) {}
        const sel = document.getElementById('md-preset-select');
        if (!sel) return;
        savedList.forEach((p, i) => {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = p.name;
          sel.appendChild(opt);
        });

        document.getElementById('md-preset-load')?.addEventListener('click', () => {
          const idx = parseInt(sel.value);
          if (isNaN(idx) || !savedList[idx]) return;
          const preset = savedList[idx];
          styleOverrides = JSON.parse(JSON.stringify(preset.overrides || {}));
          highlightIdx = preset.highlightIdx !== undefined ? preset.highlightIdx : -1;
          soundHighlightIdx = preset.soundHighlightIdx !== undefined ? preset.soundHighlightIdx : 4;
          boldQuotes = preset.boldQuotes !== undefined ? preset.boldQuotes : true;
          if (preset.boldFlags) boldFlags = JSON.parse(JSON.stringify(preset.boldFlags));
          else boldFlags = { dialogue: boldQuotes, thought: boldQuotes, sound: true, action: false, narration: false };
          boldQuotes = boldFlags.dialogue;
          hideCharName = preset.hideCharName || false;
          hideUserName = preset.hideUserName || false;
          buildSeBody();
          buildMobileDrawer();
          if (viewMode === 'preview') renderPreview();
        });

        document.getElementById('md-preset-del')?.addEventListener('click', async () => {
          const idx = parseInt(sel.value);
          if (isNaN(idx) || !savedList[idx]) return;
          savedList.splice(idx, 1);
          try { await Risuai.pluginStorage.setItem('chatlogger_presets', JSON.stringify(savedList)); } catch (e) {}
          buildMobileDrawer();
        });

        document.getElementById('md-preset-save')?.addEventListener('click', async () => {
          const name = prompt('프리셋 이름을 입력하세요:');
          if (!name || !name.trim()) return;
          savedList.push({
            name: name.trim(),
            overrides: JSON.parse(JSON.stringify(styleOverrides)),
            highlightIdx, soundHighlightIdx,
            boldQuotes: boldFlags.dialogue,
            boldFlags: JSON.parse(JSON.stringify(boldFlags)),
            hideCharName, hideUserName
          });
          try { await Risuai.pluginStorage.setItem('chatlogger_presets', JSON.stringify(savedList)); } catch (e) {}
          buildMobileDrawer();
        });
      })();
    };

    // 설정 버튼 → 드로어 열기
    const mSettingsBtn = document.getElementById('m-settings-btn');
    if (mSettingsBtn) {
      mSettingsBtn.addEventListener('click', openMobileDrawer);
    }

    // 모바일 하단 바: 뷰 탭
    document.querySelectorAll('#m-bottom-bar .m-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.view;
        if (target === viewMode) return;
        viewMode = target;
        document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === target));
        document.querySelectorAll('#m-bottom-bar .m-tab').forEach(t => t.classList.toggle('active', t.dataset.view === target));
        toggleView();
      });
    });

    // 데스크톱 뷰 탭 변경 시 모바일 탭 동기화
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#m-bottom-bar .m-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.view === viewMode);
        });
      });
    });

    // 모바일 하단 바: 텍스트 복사
    const mCopyPlain = document.getElementById('m-copy-plain');
    if (mCopyPlain) {
      mCopyPlain.addEventListener('click', async () => {
        await copyToClipboard(buildPlainText(), mCopyPlain, '📄 텍스트');
      });
    }

    // 모바일 하단 바: HTML 복사 (URL 기반 이미지로 경량화)
    const buildMobileHtml = async () => {
      // 모든 테마 동일: 이미지를 Risu URL로 임시 교체 → 빌드 → 복원
      const origAssetMap = assetMap;
      const origCharImg = charImageUri;
      const origPersonaImg = personaImageUri;
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
      let html;
      try {
        html = buildStyledHtml();
      }
      finally {
        assetMap = origAssetMap;
        charImageUri = origCharImg;
        personaImageUri = origPersonaImg;
      }
      // Risu 서버 URL을 사용할 수 없는 이미지가 있으면 Canvas로 압축
      if (hasDataUriFallback) {
        html = await compressDataUrisInHtml(html, 800, 0.7);
      }
      return html;
    };

    const mCopyHtml = document.getElementById('m-copy-html');
    if (mCopyHtml) {
      mCopyHtml.addEventListener('click', async () => {
        try {
          let html = '';
          if (editPhase !== 'off') {
            const editDiv = document.getElementById('edit-container');
            if (editDiv.classList.contains('visible')) {
              const container = editDiv.querySelector('[data-chatlog]');
              if (container) html = container.outerHTML;
            } else {
              const frame = document.getElementById('preview-frame');
              const doc = frame.contentDocument || frame.contentWindow.document;
              const container = doc.querySelector('[data-chatlog]');
              if (container) html = container.outerHTML;
            }
            // 편집 모드 HTML에서도 data URI → URL 치환
            if (html) {
              let editHasDataUriFallback = false;
              for (const [name, url] of Object.entries(assetUrlMap)) {
                if (assetMap[name] && url) html = html.split(assetMap[name]).join(url);
              }
              if (charImageUrl && charImageUri) html = html.split(charImageUri).join(charImageUrl);
              else if (charImageUri && charImageUri.startsWith('data:')) editHasDataUriFallback = true;
              if (personaImageUrl && personaImageUri) html = html.split(personaImageUri).join(personaImageUrl);
              else if (personaImageUri && personaImageUri.startsWith('data:')) editHasDataUriFallback = true;
              // URL 치환 안 된 data URI가 남아있으면 Canvas 압축
              if (editHasDataUriFallback || /data:image\/[^;]+;base64,.{10240,}/.test(html)) {
                html = await compressDataUrisInHtml(html, 800, 0.7);
              }
            }
          }
          if (!html) html = await buildMobileHtml();
          html = html.replace(' data-chatlog="true"', '');
          copyMobileHtml(html, mCopyHtml, '📋 HTML');
        } catch (e) {
          const html = (await buildMobileHtml()).replace(' data-chatlog="true"', '');
          copyMobileHtml(html, mCopyHtml, '📋 HTML');
        }
      });
    }

    // 화면 리사이즈 시 모바일/데스크톱 상태 전환
    let prevMobile = mIsMobile();
    window.addEventListener('resize', () => {
      const nowMobile = mIsMobile();
      if (nowMobile !== prevMobile) {
        prevMobile = nowMobile;
        if (!nowMobile) closeMobileDrawer();
      }
    });
  };

  // ========== 클립보드 유틸 ==========
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 모바일용 (Android/Galaxy): 가상 DOM 렌더 → Selection + execCommand 방식
  // 래퍼에 스타일을 넣으면 브라우저가 clipboard 직렬화 시 부모 스타일을 포함시키므로
  // 스타일 없는 래퍼를 사용. 동기 실행이라 repaint 전에 제거되어 화면 깜박임 없음.
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
    if (!ok) {
      try { navigator.clipboard.writeText(html); } catch {}
    }
    showCopied(btn, label || '📋 HTML');
  };

  // 모바일 HTML 복사 디스패처: iOS → Clipboard API, Android → DOM 방식
  const copyMobileHtml = (html, btn, label) => {
    if (isIOS) {
      // iOS: Clipboard API + Blob (text/html) — 이미지 주소 포함 HTML 원본 유지
      const openedHtml = html.replace(/<details(?!\s+open)/gi, '<details open');
      copyHtmlToClipboard(openedHtml, btn, label || '📋 HTML');
    } else {
      // Android (Galaxy 등): DOM 기반 Selection + execCommand
      copyHtmlViaDOM(html, btn, label);
    }
  };

  const copyToClipboard = async (text, btn, label) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showCopied(btn, label);
  };

  const copyHtmlToClipboard = async (html, btn, label) => {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([html], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob
        })
      ]);
    } catch (e) {
      try { await navigator.clipboard.writeText(html); } catch (e2) {
        const ta = document.createElement('textarea');
        ta.value = html;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    }
    showCopied(btn, label || 'HTML 복사');
  };

  const showCopied = (btn, originalLabel) => {
    btn.textContent = '\u2713 복사됨';
    btn.classList.add('btn-copied');
    setTimeout(() => {
      btn.textContent = originalLabel;
      btn.classList.remove('btn-copied');
    }, 2000);
  };

  const closePanel = async () => {
    document.getElementById('log-overlay').style.display = 'none';
    await Risuai.hideContainer();
  };

  // ========== 에셋 Risu URL 유틸 (모바일 경량 복사용) ==========
  const RISU_ASSET_BASE = 'https://sv.risuai.xyz/rs/assets/';
  const getAssetRisuUrl = (key) => {
    if (!key) return '';
    if (typeof key === 'string' && key.startsWith('http')) return key;
    if (typeof key === 'string') {
      let filename = key;
      if (filename.startsWith('assets/')) filename = filename.substring(7);
      // hash.ext 패턴 (SHA-256 등 16진수 해시 + 확장자)
      if (/^[a-f0-9]{16,}\.[a-z0-9]+$/i.test(filename)) {
        return RISU_ASSET_BASE + filename;
      }
    }
    return '';
  };

  // ========== 에셋 이미지 유틸 ==========
  const getAssetDataUri = async (key) => {
    if (!key) return null;
    if (typeof key === 'string' && key.startsWith('data:')) return key;
    if (typeof key === 'string' && key.length > 100 && !key.startsWith('assets/') && !key.startsWith('http')) {
      if (key.startsWith('iVBOR')) return 'data:image/png;base64,' + key;
      if (key.startsWith('/9j/')) return 'data:image/jpeg;base64,' + key;
      if (key.startsWith('UklGR')) return 'data:image/webp;base64,' + key;
      if (key.startsWith('AAAA')) return 'data:image/avif;base64,' + key;
      return 'data:image/png;base64,' + key;
    }
    try {
      let readKey = key;
      if (typeof key === 'string' && key.startsWith('assets/')) readKey = key.substring(7);
      let data;
      try {
        data = await Risuai.readImage(readKey);
      } catch (e) {
        const filename = key.split('/').pop();
        if (filename && filename !== readKey) data = await Risuai.readImage(filename);
      }
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
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
          binary += String.fromCharCode.apply(null, chunk);
        }
        return 'data:' + mime + ';base64,' + btoa(binary);
      }
      if (typeof data === 'string') {
        if (data.startsWith('data:')) return data;
        return 'data:image/png;base64,' + data;
      }
      return null;
    } catch (e) {
      console.warn('Asset load failed:', key, e);
      return null;
    }
  };

  // ========== Canvas 기반 이미지 압축 (모바일 폴백용) ==========
  const compressImageViaCanvas = (dataUri, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        };
        img.onerror = () => resolve(dataUri); // 실패 시 원본 반환
        img.src = dataUri;
      } catch (e) {
        resolve(dataUri);
      }
    });
  };

  // HTML 내 모든 data URI 이미지를 Canvas로 압축 (모바일 폴백)
  const compressDataUrisInHtml = async (html, maxWidth = 800, quality = 0.7) => {
    // data:image/... 패턴을 모두 찾아서 압축
    const dataUriRe = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
    const matches = [...new Set(html.match(dataUriRe) || [])];
    if (matches.length === 0) return html;

    // 이미 충분히 작은 data URI는 건너뛰기 (10KB 이하)
    const toCompress = matches.filter(uri => uri.length > 10240);
    if (toCompress.length === 0) return html;

    const compressed = await Promise.all(
      toCompress.map(uri => compressImageViaCanvas(uri, maxWidth, quality))
    );
    let result = html;
    for (let i = 0; i < toCompress.length; i++) {
      if (compressed[i] !== toCompress[i]) {
        result = result.split(toCompress[i]).join(compressed[i]);
      }
    }
    return result;
  };

  // ========== HTML 태그 제거 (플레인 텍스트용) ==========
  const stripHtml = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('style, script').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-regex-modern-stylish-white').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-regex-guardian-status-wrapper, .x-risu-regex-guardian-char-wrapper').forEach(el => el.remove());
    div.querySelectorAll('.x-risu-annotation_content').forEach(el => el.remove());
    div.querySelectorAll('details').forEach(el => {
      const summary = el.querySelector('summary');
      if (summary) { summary.replaceWith(document.createTextNode('\n[' + summary.textContent.trim() + ']\n')); }
    });
    div.querySelectorAll('br').forEach(el => el.replaceWith(document.createTextNode('\n')));
    div.querySelectorAll('p').forEach(el => el.insertAdjacentText('afterend', '\n'));
    ['[class*="x-risu-regex-quote-block"]','[class*="x-risu-regex-sound-block"]','[class*="x-risu-regex-thought-block"]'].forEach(sel => {
      div.querySelectorAll(sel).forEach(el => { el.insertAdjacentText('beforebegin', '\n'); el.insertAdjacentText('afterend', '\n'); });
    });
    let text = div.textContent || '';
    text = text.replace(/┣[^┫]*┫/g, ''); // ┣┫로 감싸진 숨김 텍스트 제거
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  };

  // ========== DB에서 채팅 로그 추출 ==========
  const extractChatLog = async () => {
    try {
      const db = await Risuai.getDatabase();
      const charIdx = await Risuai.getCurrentCharacterIndex();
      const chatIdx = await Risuai.getCurrentChatIndex();
      if (!db || charIdx === -1 || chatIdx === -1) return { messages: [], charName: '?' };
      const character = db.characters[charIdx];
      charName = character?.name || character?.data?.name || '캐릭터';

      // 캐릭터 이미지 로드
      charImageUri = '';
      charImageUrl = '';
      try {
        if (character.image) {
          const cUri = await getAssetDataUri(character.image);
          if (cUri) charImageUri = cUri;
          charImageUrl = getAssetRisuUrl(character.image);
        }
      } catch (e) { console.warn('캐릭터 이미지 로드 실패:', e); }

      // 페르소나 이미지 로드
      personaImageUri = '';
      personaImageUrl = '';
      personaDisplayName = '';
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
      } catch (e) { console.warn('페르소나 이미지 로드 실패:', e); }

      // 에셋 name->key 매핑 구축 (유연한 룩업 테이블 포함)
      const nameKeyMap = {};    // 원본이름 -> key
      const nameLookup = {};    // lowercase 이름 -> 원본이름
      const noExtLookup = {};   // lowercase 확장자제거 이름 -> 원본이름
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

      // 모듈 에셋도 nameKeyMap에 추가 (<emoji|name> 등 모듈 에셋 지원)
      // 모듈은 character와 달리 .assets (not .additionalAssets) 사용, 구조: [name, path/data, ext]
      try {
        const modules = db.modules || [];
        for (const mod of modules) {
          if (!mod) continue;
          const modAssets = mod.assets || [];
          for (const asset of modAssets) {
            if (Array.isArray(asset) && asset[0]) {
              const aName = asset[0];
              if (!nameKeyMap[aName]) { // 캐릭터 에셋 우선
                nameKeyMap[aName] = asset[1] || '';
                nameLookup[aName.toLowerCase()] = aName;
                const noExt = aName.replace(/\.[^.]+$/, '');
                if (noExt !== aName) noExtLookup[noExt.toLowerCase()] = aName;
              }
            }
          }
        }
      } catch (e) { console.warn('LogPlus: 모듈 에셋 스캔 실패:', e); }

      // 접두사 룩업 테이블 구축 (prefix 매칭용)
      // nameKeyMap의 모든 이름을 prefix로 묶어서, 정확 매칭 실패 시 접두사로 찾을 수 있게 함
      const prefixLookup = {}; // lowercase prefix -> [원본이름, ...]
      for (const aName of Object.keys(nameKeyMap)) {
        const lo = aName.toLowerCase();
        // 이름에서 가능한 접두사 패턴 추출: name_1.png → prefix "name"
        // 언더스코어/하이픈/점 + 숫자(들) + (확장자) 로 끝나는 패턴에서 접두사 추출
        const prefixMatch = lo.match(/^(.+?)[_\-](\d+)(?:\.[^.]+)?$/);
        if (prefixMatch) {
          const prefix = prefixMatch[1];
          if (!prefixLookup[prefix]) prefixLookup[prefix] = [];
          prefixLookup[prefix].push(aName);
        }
        // 확장자 제거한 이름 자체도 접두사 후보로 등록
        const noExtLo = lo.replace(/\.[^.]+$/, '');
        if (noExtLo !== lo) {
          if (!prefixLookup[noExtLo]) prefixLookup[noExtLo] = [];
          if (!prefixLookup[noExtLo].includes(aName)) prefixLookup[noExtLo].push(aName);
        }
      }

      // editdisplay regex script 수집 (캐릭터 + 활성 모듈)
      // 이 regex의 IN 패턴과 원문을 매칭하여, 캡처 그룹으로 에셋 접두사를 추론
      const displayRegexScripts = [];
      try {
        const charScripts = character.customscript || [];
        if (Array.isArray(charScripts)) {
          for (const s of charScripts) {
            if (!s || !s.in || !s.out) continue;
            const t = (s.type || 'editdisplay').toLowerCase();
            if (t !== 'editdisplay') continue;
            // out 필드에 에셋 관련 CBS가 있는 스크립트만 수집 ({{img, {{asset, assetlist, src= 등)
            if (/\{\{(?:img|asset|random|image)|assetlist|<img\b|\bsrc\s*=/i.test(s.out)) {
              displayRegexScripts.push(s);
            }
          }
        }
        // 활성 모듈의 regex도 수집
        const enabledModIds = db.enabledModules || [];
        const modules = db.modules || [];
        for (const mod of modules) {
          if (!mod || !enabledModIds.includes(mod.id)) continue;
          const modScripts = mod.regex || [];
          if (!Array.isArray(modScripts)) continue;
          for (const s of modScripts) {
            if (!s || !s.in || !s.out) continue;
            const t = (s.type || 'editinput').toLowerCase();
            if (t !== 'editdisplay') continue;
            if (/\{\{(?:img|asset|random|image)|assetlist|<img\b|\bsrc\s*=/i.test(s.out)) {
              displayRegexScripts.push(s);
            }
          }
        }
      } catch (e) { console.warn('LogPlus: 정규식 스크립트 수집 실패:', e); }

      // 정규식 스크립트의 OUT 필드에서 이름 매핑/대체 이름 추출
      // {{dict::shy=embarrassed::angry=annoyed::...}} → { shy: "embarrassed", angry: "annoyed" }
      // {{random::name1::name2::name3}} → ["name1", "name2", "name3"]
      // $1_$2 등의 조합 패턴도 분석
      const parseRegexOutMappings = (outStr) => {
        const result = { dicts: [], randoms: [], literals: [] };
        // 1) {{dict::key=val::key=val...}} 패턴 추출
        const dictRe = /\{\{dict::([^}]+)\}\}/gi;
        let dm;
        while ((dm = dictRe.exec(outStr)) !== null) {
          const map = {};
          const pairs = dm[1].split('::');
          for (const pair of pairs) {
            const eq = pair.indexOf('=');
            if (eq > 0) {
              map[pair.substring(0, eq).trim().toLowerCase()] = pair.substring(eq + 1).trim();
            }
          }
          if (Object.keys(map).length > 0) result.dicts.push(map);
        }
        // 2) {{random::a::b::c}} 패턴 추출
        const randRe = /\{\{random::([^}]+)\}\}/gi;
        let rm;
        while ((rm = randRe.exec(outStr)) !== null) {
          const items = rm[1].split('::').map(s => s.trim()).filter(Boolean);
          if (items.length > 0) result.randoms.push(items);
        }
        // 3) OUT에서 직접 참조되는 에셋 이름 리터럴 추출
        // {{img::name}}, {{asset::name}}, src="name" 등
        const litRe = /\{\{(?:img|asset|image)\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
        let lm;
        while ((lm = litRe.exec(outStr)) !== null) {
          const name = lm[1].trim();
          // $1, $2 등 캡처 그룹 참조가 아닌 경우만
          if (!/^\$\d+$/.test(name)) result.literals.push(name);
        }
        const srcRe = /\bsrc\s*=\s*["']([^"'${}]+)["']/gi;
        let sm;
        while ((sm = srcRe.exec(outStr)) !== null) {
          result.literals.push(sm[1].trim());
        }
        return result;
      };

      // 캡처 그룹 값에 OUT 매핑을 적용하여 실제 에셋 이름 후보 생성
      const applyOutMappings = (groups, mappings) => {
        const candidates = new Set();
        // 기본: 캡처 그룹 원본 조합
        candidates.add(groups.join('_'));
        candidates.add(groups.join('-'));
        candidates.add(groups.join(''));
        for (const g of groups) candidates.add(g);

        // dict 매핑 적용: 각 캡처 그룹을 dict에서 변환
        for (const dict of mappings.dicts) {
          const mapped = groups.map(g => dict[g.toLowerCase()] || g);
          candidates.add(mapped.join('_'));
          candidates.add(mapped.join('-'));
          candidates.add(mapped.join(''));
          for (const m of mapped) candidates.add(m);
        }

        // random 목록의 모든 이름을 후보에 추가
        for (const items of mappings.randoms) {
          for (const item of items) {
            // item 내의 CBS 태그 제거 후 순수 이름만 추출
            const clean = item.replace(/\{\{[^}]*\}\}/g, '').trim();
            if (clean) candidates.add(clean);
          }
        }

        // 리터럴 에셋 이름 추가
        for (const lit of mappings.literals) {
          // $1, $2 참조를 캡처 그룹 값으로 치환
          let resolved = lit;
          for (let i = 0; i < groups.length; i++) {
            resolved = resolved.replace(new RegExp('\\$' + (i + 1), 'g'), groups[i]);
          }
          candidates.add(resolved);
        }

        return candidates;
      };

      // 정규식 스크립트의 dict 매핑에서 별칭 테이블 구축
      // 예: dict::shy=embarrassed → regexAliasMap["shy"] = "embarrassed"
      // resolveAssetName에서 정확 매칭 실패 시 이 별칭으로 재시도
      const regexAliasMap = {}; // lowercase 원본이름 → [매핑된 이름, ...]
      for (const script of displayRegexScripts) {
        const mappings = parseRegexOutMappings(script.out);
        for (const dict of mappings.dicts) {
          for (const [key, val] of Object.entries(dict)) {
            const lo = key.toLowerCase();
            if (!regexAliasMap[lo]) regexAliasMap[lo] = [];
            if (!regexAliasMap[lo].includes(val)) regexAliasMap[lo].push(val);
          }
        }
      }

      // 정규식 스크립트의 IN 패턴으로 원문 매칭 → 캡처 그룹 + OUT 매핑으로 에셋 해석
      const resolveAssetsByRegex = (rawText) => {
        const found = new Set();
        for (const script of displayRegexScripts) {
          try {
            // 플래그 추출
            let flags = script.flag || '';
            if (Array.isArray(script.ableFlag)) {
              for (const f of script.ableFlag) {
                if (typeof f === 'string' && /^[gimsuy]$/.test(f) && !flags.includes(f)) flags += f;
              }
            }
            if (!flags.includes('g')) flags += 'g';
            const re = new RegExp(script.in, flags);
            const outMappings = parseRegexOutMappings(script.out);
            let match;
            while ((match = re.exec(rawText)) !== null) {
              // 캡처 그룹들을 추출
              const groups = match.slice(1).filter(Boolean);
              if (groups.length === 0) continue;
              // OUT 매핑을 적용하여 에셋 이름 후보 생성
              const candidates = applyOutMappings(groups, outMappings);
              for (const prefix of candidates) {
                const lo = prefix.toLowerCase();
                // 1) 정확 매칭
                const exact = resolveAssetName(prefix);
                if (exact) { found.add(exact); continue; }
                // 2) prefix 매칭 (접두사 룩업)
                if (prefixLookup[lo]) {
                  for (const name of prefixLookup[lo]) found.add(name);
                  continue;
                }
                // 3) startsWith 폴백 (prefixLookup에 없는 경우)
                for (const aName of Object.keys(nameKeyMap)) {
                  if (aName.toLowerCase().startsWith(lo + '_') || aName.toLowerCase().startsWith(lo + '-')) {
                    found.add(aName);
                  }
                }
              }
            }
          } catch (e) { /* 잘못된 정규식 무시 */ }
        }
        return found;
      };

      // img 태그에서 참조값 추출 (범용)
      const extractImgRef = (tag) => {
        // 1) src="value" 또는 src='value' (따옴표 있는 표준 형식)
        let m = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        if (m) return m[1];
        // 2) src=value (따옴표 없는 형식, 예: <img src=assetName>)
        m = tag.match(/\bsrc\s*=\s*([^\s>"']+)/i);
        if (m) return m[1];
        // 3) 기타 ="value" 패턴
        m = tag.match(/=\s*"([^"]+)"/);
        if (m) return m[1];
        m = tag.match(/=\s*'([^']+)'/);
        if (m) return m[1];
        // 4) <img::name> 콜론 형식 지원 (src 없이 :: 뒤에 에셋 이름)
        m = tag.match(/<img\s*::?\s*([^>]+?)\s*>/i);
        if (m) return m[1].trim();
        return null;
      };

      // 참조값 -> 에셋 이름 해석 (정확 → 대소문자무시 → 확장자제거 → 접두사 → regex별칭)
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
        // 접두사 매칭 폴백: ref가 "emotion_happy"이고 실제 에셋이 "emotion_happy_1" 등인 경우
        const prefixHits = prefixLookup[lo] || prefixLookup[noExt];
        if (prefixHits && prefixHits.length > 0) return prefixHits[0];
        // 정규식 스크립트 별칭 매핑 폴백: "shy" → "embarrassed" 등 dict 매핑
        const aliases = regexAliasMap[lo];
        if (aliases) {
          for (const alias of aliases) {
            if (nameKeyMap[alias]) return alias;
            const alo = alias.toLowerCase();
            if (nameLookup[alo]) return nameLookup[alo];
            // 별칭에 대해서도 접두사 매칭 시도
            const aliasPrefixHits = prefixLookup[alo];
            if (aliasPrefixHits && aliasPrefixHits.length > 0) return aliasPrefixHits[0];
          }
        }
        return null;
      };

      const imgTagRe = /<img\b[^>]*>/gi;
      // {{img::name}}, {{img="name"}}, {{img=name}} 등 중괄호 에셋 마커 패턴
      const curlyImgRe = /\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
      // <비HTML마크> 패턴 (모듈 에셋 마커 - 형식은 모듈마다 다를 수 있음)
      // 첫 글자가 영문자/슬래시/느낌표/공백이 아닌 <...> → HTML 태그와 구분
      const bracketAssetRe = /<([^a-zA-Z\/!\s<>][^<>]*)>/g;

      // 꺾쇠 마크 내용에서 에셋 이름 추출 (pipe 있으면 뒤쪽, 없으면 전체)
      const extractBracketName = (content) => {
        const pipeIdx = content.lastIndexOf('|');
        if (pipeIdx !== -1) return content.substring(pipeIdx + 1).trim();
        return content.trim();
      };

      const chatData = character.chats[chatIdx];
      const messages = Array.isArray(chatData) ? chatData : (chatData?.message || []);

      // 퍼스트 메시지 추출 (fmIndex로 선택된 인사 반영)
      let firstMessageText = '';
      try {
        const fmIndex = (chatData && !Array.isArray(chatData) && chatData.fmIndex != null) ? chatData.fmIndex : -1;
        if (fmIndex >= 0) {
          const altGreetings = character.alternateGreetings || character.alternate_greetings || character.alternateGreeting
            || (character.data && (character.data.alternateGreetings || character.data.alternate_greetings || character.data.alternateGreeting))
            || [];
          firstMessageText = altGreetings[fmIndex] || '';
        }
        if (!firstMessageText) {
          firstMessageText = character.firstMessage || character.firstmessage || character.first_mes || '';
        }
        if (!firstMessageText && character.data) {
          firstMessageText = character.data.firstMessage || character.data.firstmessage || character.data.first_mes || '';
        }
      } catch (e) { console.warn('LogPlus: 퍼스트 메시지 추출 실패:', e); }

      // 1차: 참조된 에셋 이름 수집 (범용 img 태그 + <emoji|name> 감지)
      const referencedNames = new Set();

      // 퍼스트 메시지에서도 에셋 스캔
      const allScanTargets = [...messages];
      if (firstMessageText) {
        allScanTargets.unshift({ data: firstMessageText, role: 'char' });
      }

      for (const msg of allScanTargets) {
        const k = msg.data !== undefined ? 'data' : 'mes';
        const raw = msg[k] || '';
        const tags = raw.match(imgTagRe) || [];
        for (const tag of tags) {
          const ref = extractImgRef(tag);
          const resolved = resolveAssetName(ref);
          if (resolved) referencedNames.add(resolved);
        }
        // {{img::name}} / {{img="name"}} 중괄호 패턴에서도 에셋 이름 수집
        let cm;
        const curlyScanRe = /\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi;
        while ((cm = curlyScanRe.exec(raw)) !== null) {
          const resolved = resolveAssetName(cm[1].trim());
          if (resolved) referencedNames.add(resolved);
        }
        // <비HTML마크> 패턴에서도 에셋 이름 수집 (모듈 에셋 등)
        let em;
        const bracketScanRe = /<([^a-zA-Z\/!\s<>][^<>]*)>/g;
        while ((em = bracketScanRe.exec(raw)) !== null) {
          const assetName = extractBracketName(em[1]);
          const resolved = resolveAssetName(assetName);
          if (resolved) referencedNames.add(resolved);
        }
        // ★ 범용 폴백: 역방향 탐색 — 등록된 에셋 이름이 <...> 또는 {{...}} 마크업 내에 존재하면 감지
        // 이 방식은 형식에 무관하게 작동하므로, 새로운 마크업 패턴이 나타나도 자동으로 인식
        const rawLower = raw.toLowerCase();
        for (const aName of Object.keys(nameKeyMap)) {
          if (referencedNames.has(aName)) continue;
          const variants = [aName];
          const noExt = aName.replace(/\.[^.]+$/, '');
          if (noExt !== aName) variants.push(noExt);
          for (const v of variants) {
            if (!rawLower.includes(v.toLowerCase())) continue;
            const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp('<[^>]*' + esc + '[^>]*>|\\{\\{[^}]*' + esc + '[^}]*\\}\\}', 'i').test(raw)) {
              referencedNames.add(aName);
              break;
            }
          }
        }
        // ★ 정규식 스크립트 기반 에셋 감지: editdisplay regex의 IN 패턴으로 원문 매칭 → 캡처 그룹에서 에셋 접두사 추론
        if (displayRegexScripts.length > 0) {
          const regexAssets = resolveAssetsByRegex(raw);
          for (const name of regexAssets) referencedNames.add(name);
        }
      }

      // 에셋 데이터 로드 (참조된 것만) + URL 맵 구축 (모바일용)
      assetMap = {};
      assetUrlMap = {};
      const loadPromises = [];
      for (const name of referencedNames) {
        const key = nameKeyMap[name];
        // URL 맵 (동기, 키에서 바로 생성)
        const url = getAssetRisuUrl(key);
        if (url) assetUrlMap[name] = url;
        // 데이터 URI 맵 (비동기)
        loadPromises.push(
          getAssetDataUri(key).then(uri => {
            if (uri) assetMap[name] = uri;
          }).catch(() => {})
        );
      }
      if (loadPromises.length > 0) await Promise.all(loadPromises);

      // 2차: 메시지 추출 (번역 캐시 사용 시 번역문으로 대체)
      let translationCacheStats = { found: 0, missed: 0 };
      // rawContent를 에셋 마커로 변환하는 공통 함수
      const processRawContent = (rawContent) => {
        // {{img::name}} / {{img="name"}} 중괄호 패턴 -> 에셋 마커 변환 (stripHtml 전, 다른 변환보다 먼저 처리)
        rawContent = rawContent.replace(curlyImgRe, (match, name) => {
          const trimmed = name.trim();
          const resolved = resolveAssetName(trimmed);
          if (resolved) return '\n{{ASSET:' + resolved + '}}\n';
          return '\n{{ASSET:' + trimmed + '}}\n';
        });
        // 모든 <img ...> 태그 -> 에셋 마커 변환 (stripHtml 전)
        rawContent = rawContent.replace(imgTagRe, (match) => {
          const ref = extractImgRef(match);
          const resolved = resolveAssetName(ref);
          if (resolved) return '\n{{ASSET:' + resolved + '}}\n';
          return match;
        });
        // <비HTML마크> 패턴 -> 에셋 마커 변환 (stripHtml 전, DOM이 <를 태그로 인식해서 제거하는 문제 방지)
        rawContent = rawContent.replace(bracketAssetRe, (match, content) => {
          const assetName = extractBracketName(content);
          const resolved = resolveAssetName(assetName);
          if (resolved) return '\n{{ASSET:' + resolved + '}}\n';
          if (content.includes('|')) return '\n{{ASSET:' + assetName + '}}\n';
          return match;
        });
        // ★ 범용 폴백: 위 패턴들이 놓친 에셋 참조를 역방향 탐색으로 변환
        const rcLower = rawContent.toLowerCase();
        for (const aName of Object.keys(nameKeyMap)) {
          if (rawContent.includes('{{ASSET:' + aName + '}}')) continue;
          const variants = [aName];
          const noExt = aName.replace(/\.[^.]+$/, '');
          if (noExt !== aName) variants.push(noExt);
          for (const v of variants) {
            if (!rcLower.includes(v.toLowerCase())) continue;
            const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            rawContent = rawContent.replace(new RegExp('<[^>]*' + esc + '[^>]*>', 'gi'), '\n{{ASSET:' + aName + '}}\n');
            rawContent = rawContent.replace(new RegExp('\\{\\{(?!ASSET:)[^}]*' + esc + '[^}]*\\}\\}', 'gi'), '\n{{ASSET:' + aName + '}}\n');
          }
        }
        return rawContent;
      };

      const result = [];

      // 퍼스트 메시지를 맨 앞에 삽입 (dbIndex: -1)
      if (firstMessageText && firstMessageText.trim()) {
        let fmRaw = processRawContent(firstMessageText);
        const fmClean = stripHtml(fmRaw);
        if (fmClean.trim()) {
          result.push({ role: 'char', name: charName, text: fmClean, dbIndex: -1, isFirstMessage: true });
        }
      }

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const key = msg.data !== undefined ? 'data' : 'mes';
        let rawContent = msg[key] || '';

        // 번역 캐시에서 번역문 조회
        if (useTranslationCache && rawContent.trim()) {
          const translationResult = await findTranslationFromCache(rawContent, i);
          if (translationResult.found && translationResult.translation) {
            rawContent = translationResult.translation;
            translationCacheStats.found++;
          } else {
            translationCacheStats.missed++;
          }
        }
        rawContent = processRawContent(rawContent);
        const cleanText = stripHtml(rawContent);
        if (!cleanText.trim()) continue;
        let role = 'char';
        if (msg.role === 'user') role = 'user';
        else if (msg.role === 'system') role = 'system';
        let name = charName;
        if (role === 'user') name = '유저';
        else if (role === 'system') name = '시스템';
        result.push({ role, name, text: cleanText, dbIndex: i });
      }

      const assetCount = Object.keys(assetMap).length;
      if (assetCount > 0) console.log('LogPlus: ' + assetCount + '개 에셋 이미지 로드됨');
      if (useTranslationCache) console.log('LogPlus: 번역 캐시 - 번역됨: ' + translationCacheStats.found + ', 미번역: ' + translationCacheStats.missed);
      return { messages: result, charName };
    } catch (e) {
      console.error('채팅 로그 추출 실패:', e);
      return { messages: [], charName: '?' };
    }
  };

  // ========== 페르소나 치환 유틸 ==========
  const getPersonaVariants = (name) => {
    if (!name) return [];
    const variants = new Set();
    variants.add(name); // 전체 이름

    const trimmed = name.trim();

    // 한글 이름 처리 (2~4자)
    // "왕자림" → "자림", "김민수" → "민수", "이서연" → "서연"
    if (/^[\uAC00-\uD7AF]{2,4}$/.test(trimmed)) {
      // 성(1자) 제거 → 이름부분
      const givenName = trimmed.slice(1);
      if (givenName.length >= 1) variants.add(givenName);
    }

    // 영어 이름 처리
    // "John Smith" → "John", "Smith"
    // "Mary Jane Watson" → "Mary", "Jane", "Watson", "Mary Jane"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      parts.forEach(p => { if (p.length >= 2) variants.add(p); });
      // first + middle (3파트 이상일 때)
      if (parts.length >= 3) {
        variants.add(parts[0] + ' ' + parts[1]);
      }
    }

    // 길이 긴 것부터 매칭 (긴 이름 우선 치환)
    return Array.from(variants).sort((a, b) => b.length - a.length);
  };

  const applyPersona = (text) => {
    if (!personaName || !useUserTag) return text;
    const variants = getPersonaVariants(personaName);
    let result = text;
    for (const v of variants) {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), '{{user}}');
    }
    return result;
  };

  // ========== 플레인 텍스트 생성 ==========
  const buildPlainText = () => {
    if (allMessages.length === 0) return '';
    const indices = [...selectedSet].sort((a,b) => a - b);
    if (indices.length === 0) return '';
    let header = '';
    if (modelInfo) header += '\uD83E\uDD16 \uBAA8\uB378: ' + modelInfo + '\n';
    if (promptInfo) header += '\uD83D\uDCDD \uD504\uB86C\uD504\uD2B8: ' + promptInfo + '\n';
    if (header) header += '\n';
    const lines = [];
    for (const i of indices) {
      const msg = allMessages[i];
      lines.push(applyPersona(msg.name) + ':\n' + applyPersona(msg.text));
    }
    return header + lines.join('\n\n');
  };

  // ========== 스타일드 HTML 생성 (핵심) ==========
  const escHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getEffectiveStyles = (theme) => {
    // 스타일 문자열에 override 적용 헬퍼
    const applyOverride = (base, stype) => {
      let s = base || '';
      const ov = styleOverrides[stype];
      if (!ov) return s;
      if (ov.color) {
        s = s.split(';').filter(p => !p.trim().startsWith('color')).join(';');
        s += ';color:' + ov.color;
      }
      if (ov.bg) {
        s = s.split(';').filter(p => !p.trim().startsWith('background')).join(';');
        s += ';background:' + ov.bg;
      }
      if (ov.fontSize) {
        s = s.split(';').filter(p => !p.trim().startsWith('font-size')).join(';');
        s += ';font-size:' + ov.fontSize;
      }
      return s;
    };

    let dlg = theme.dialogue;
    let thgt = theme.thought;
    if (boldFlags.dialogue) {
      dlg += ';font-weight:700';
    }
    if (boldFlags.thought) {
      thgt += ';font-weight:700';
    }
    if (highlightIdx >= 0 && PASTEL_COLORS[highlightIdx]) {
      const pc = PASTEL_COLORS[highlightIdx];
      dlg = dlg.split(';').filter(s => !s.trim().startsWith('background') && !s.trim().startsWith('color')).join(';');
      dlg += ';background:' + pc.bg + ';color:' + pc.text;
    }
    // styleOverrides 적용 (개별 오버라이드가 하이라이트보다 우선)
    dlg = applyOverride(dlg, 'dialogue');
    thgt = applyOverride(thgt, 'thought');
    let sndBase = theme.sound;
    if (boldFlags.sound) {
      sndBase += ';font-weight:700';
    }
    if (soundHighlightIdx >= 0 && PASTEL_COLORS[soundHighlightIdx]) {
      const pc = PASTEL_COLORS[soundHighlightIdx];
      sndBase = sndBase.split(';').filter(s => !s.trim().startsWith('background') && !s.trim().startsWith('color')).join(';');
      sndBase += ';background:' + pc.bg + ';color:' + pc.text;
    }
    const snd = applyOverride(sndBase, 'sound');
    let actBase = theme.action;
    if (boldFlags.action) actBase += ';font-weight:700';
    const act = applyOverride(actBase, 'action');
    let narBase = theme.narration || '';
    if (boldFlags.narration) narBase += ';font-weight:700';
    const nar = applyOverride(narBase, 'narration');
    const cName = applyOverride(theme.charName, 'charName');
    const uName = applyOverride(theme.userName, 'userName');
    return { dlg, thgt, snd, act, nar, cName, uName };
  };

  const styleLine = (line, theme, styles) => {
    const { dlg, thgt, snd, act, nar } = styles;

    // 0) 에셋 이미지 마커
    const assetMatch = line.match(/^\{\{ASSET:([^}]+)\}\}$/);
    if (assetMatch) {
      const aName = assetMatch[1];
      if (includeImages && assetMap[aName]) {
        return '<div style="text-align:center;margin:0.8em 0"><img src="' + assetMap[aName] + '" alt="' + escHtml(aName) + '" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15)"></div>';
      }
      return '<span style="color:#888;font-size:0.9em;font-style:italic">[🖼️ ' + escHtml(aName) + ']</span>';
    }

    // 1) 전체가 "..." 대사인 라인
    const dialogueMatch = line.match(/^["\u201C\u201F](.+)["\u201D\u201E]$/);
    if (dialogueMatch) {
      return '<span style="' + dlg + '">\u201C' + escHtml(dialogueMatch[1]) + '\u201D</span>';
    }

    // 2) 전체가 '...' 생각인 라인
    const thoughtMatch = line.match(/^['\u2018](.+)['\u2019]$/);
    if (thoughtMatch) {
      return '<span style="' + thgt + '">\u2018' + escHtml(thoughtMatch[1]) + '\u2019</span>';
    }

    // 3) §...§ 효과음 라인 (§ 제거)
    const soundMatch = line.match(/^\xA7(.+)\xA7$/);
    if (soundMatch) {
      return '<span style="' + snd + '">' + escHtml(soundMatch[1]) + '</span>';
    }

    // 4) ◇...◇ 지문/액션 라인
    const actionMatch = line.match(/^\u25C7(.+)\u25C7$/);
    if (actionMatch) {
      return '<span style="' + act + '">\u25C7' + escHtml(actionMatch[1]) + '\u25C7</span>';
    }

    // 5) 인라인 패턴이 섞인 일반 텍스트
    let result = escHtml(line);

    // 인라인 "대사"
    result = result.replace(/(&quot;|["\u201C\u201F])(.+?)(&quot;|["\u201D\u201E])/g,
      '<span style="' + dlg + '">\u201C$2\u201D</span>');

    // 인라인 '생각'
    result = result.replace(/(['\u2018])(.+?)(['\u2019])/g,
      '<span style="' + thgt + '">\u2018$2\u2019</span>');

    // 인라인 §효과음§ (§ 제거)
    result = result.replace(/\xA7(.+?)\xA7/g,
      '<span style="' + snd + '">$1</span>');

    // 인라인 ◇지문◇
    result = result.replace(/\u25C7(.+?)\u25C7/g,
      '<span style="' + act + '">\u25C7$1\u25C7</span>');

    if (nar) {
      return '<span style="' + nar + '">' + result + '</span>';
    }
    return result;
  };

  const buildStyledHtml = () => {
    if (allMessages.length === 0) return '';
    const theme = THEMES[currentTheme];
    const styles = getEffectiveStyles(theme);
    const indices = [...selectedSet].sort((a,b) => a - b);
    if (indices.length === 0) return '';
    const isDarkTheme = currentTheme === 'dark-noir' || currentTheme === 'archive-dark';

    let body = '';
    let pendingSpacer = false;
    let isFirst = true;

    // spacer를 별도 빈 div 대신 다음 요소의 margin-top으로 적용 (Froala가 빈 div에 <br> 삽입하는 문제 방지)
    const paraStyle = () => {
      if (pendingSpacer) {
        pendingSpacer = false;
        return theme.paragraph.replace('margin:0 0', 'margin:1.5em 0');
      }
      return theme.paragraph;
    };
    for (const i of indices) {
      const msg = allMessages[i];

      if (!isFirst || modelInfo || promptInfo) {
        pendingSpacer = true;
      }

      const displayName = applyPersona(msg.name);
      const displayText = applyPersona(msg.text);

      const isUser = msg.role === 'user';
      const hideName = isUser ? hideUserName : hideCharName;
      if (!hideName) {
        const nameStyle = isUser ? styles.uName : styles.cName;
        body += '<p style="' + paraStyle() + '"><span style="' + nameStyle + '">' + escHtml(displayName) + ':</span></p>';
      }

      if (msg.role === 'user') {
        const lines = displayText.split('\n').filter(l => l.trim());
        for (const line of lines) {
          body += '<p style="' + paraStyle() + '"><span style="' + theme.userInput + '"><em>' + escHtml(line) + '</em></span></p>';
        }
        isFirst = false;
        continue;
      }

      const lines = displayText.split('\n');
      let prevWasEmpty = false;
      let insideHiddenStory = false;
      let hiddenTitle = '';
      let hiddenProfile = '';
      let hiddenStatus = '';
      let hiddenBody = '';
      let hiddenPhase = ''; // 'title'|'profile'|'status'|'narrative'
      let hiddenVersion = ''; // ''|'v1'|'v2'

      for (const line of lines) {
        const trimLine = line.trim();

        // @Hidden Story@ 시작 감지 (v1)
        if (trimLine === '@Hidden Story@') {
          insideHiddenStory = true;
          hiddenTitle = '';
          hiddenProfile = '';
          hiddenStatus = '';
          hiddenBody = '';
          hiddenPhase = 'header';
          hiddenVersion = 'v1';
          continue;
        }

        // {HiddenStory} 시작 감지 (v2)
        if (trimLine === '{HiddenStory}') {
          insideHiddenStory = true;
          hiddenTitle = '';
          hiddenProfile = '';
          hiddenStatus = '';
          hiddenBody = '';
          hiddenPhase = 'header';
          hiddenVersion = 'v2';
          continue;
        }

        // @END@ 또는 @end@ 종료 감지 (v1) + {/HiddenStory} 종료 감지 (v2)
        if (insideHiddenStory && (/^@(END|end)@$/.test(trimLine) || trimLine === '{/HiddenStory}')) {
          insideHiddenStory = false;
          // details/summary 토글 블록 생성
          const toggleBorder = theme.headerBorder || '#e0dcd4';
          const toggleBg = isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
          let toggleHtml = '<details style="margin:0.8em 0;border:1px solid ' + toggleBorder + ';border-radius:8px;padding:0;background:' + toggleBg + '">';
          // summary
          const sumLabel = hiddenTitle || 'Hidden Story';
          toggleHtml += '<summary style="padding:0.6em 1em;font-size:0.9em;font-weight:600;cursor:pointer;list-style:none">';
          toggleHtml += '<span style="display:inline-block;margin-right:6px;font-size:0.8em">▶</span>' + escHtml(sumLabel) + '</summary>';
          // 내부
          toggleHtml += '<div style="padding:0.4em 1em 0.8em 1em;font-size:0.93em">';
          // 프로필 이미지
          if (hiddenProfile) {
            const profAsset = hiddenProfile.match(/^\{\{ASSET:([^}]+)\}\}$/);
            if (profAsset && includeImages && assetMap[profAsset[1]]) {
              toggleHtml += '<div style="text-align:center;margin:0.4em 0 0.6em 0"><img src="' + assetMap[profAsset[1]] + '" alt="' + escHtml(profAsset[1]) + '" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15)"></div>';
            } else if (profAsset) {
              toggleHtml += '<p style="' + theme.paragraph + '"><span style="color:#888;font-size:0.9em;font-style:italic">[🖼️ ' + escHtml(profAsset[1]) + ']</span></p>';
            }
          }
          // 상태 라인
          if (hiddenStatus) {
            const statusColor = isDarkTheme ? '#9ca3af' : '#6b7280';
            toggleHtml += '<p style="' + theme.paragraph + ';font-size:0.85em;color:' + statusColor + '">' + escHtml(hiddenStatus) + '</p>';
          }
          // 본문
          if (hiddenBody) {
            const bodyLines = hiddenBody.split('\n');
            for (const bl of bodyLines) {
              if (!bl.trim()) continue;
              const styledBl = styleLine(bl.trim(), theme, styles);
              if (styledBl.startsWith('<div')) {
                toggleHtml += styledBl;
              } else {
                toggleHtml += '<p style="' + theme.paragraph + '">' + styledBl + '</p>';
              }
            }
          }
          toggleHtml += '</div></details>';
          body += toggleHtml;
          continue;
        }

        // Hidden Story v2 내부 파싱 ({HiddenStory} 형식)
        if (insideHiddenStory && hiddenVersion === 'v2') {
          // portrait 멀티라인 수집 중
          if (hiddenPhase === 'portrait-multi') {
            if (trimLine.endsWith(']')) {
              const content = trimLine.slice(0, -1).trim();
              if (content && content.match(/^\{\{ASSET:[^}]+\}\}$/)) {
                hiddenProfile = content;
              }
              hiddenPhase = 'header';
            } else if (trimLine.match(/^\{\{ASSET:[^}]+\}\}$/)) {
              hiddenProfile = trimLine;
            }
            continue;
          }
          // header phase: 메타데이터 태그 파싱
          if (hiddenPhase === 'header') {
            if (!trimLine) continue; // 헤더 내 빈 줄 스킵
            const titleMatch = trimLine.match(/^\[hsTitle:\s*(.+)\]$/);
            if (titleMatch) { hiddenTitle = titleMatch[1].trim(); continue; }
            // [hsPortrait: VALUE] 단일 줄
            const portraitSingle = trimLine.match(/^\[hsPortrait:\s*(.+)\]$/);
            if (portraitSingle) { hiddenProfile = portraitSingle[1].trim(); continue; }
            // [hsPortrait: (멀티라인 시작)
            if (/^\[hsPortrait:/.test(trimLine)) {
              const afterColon = trimLine.replace(/^\[hsPortrait:\s*/, '').trim();
              if (afterColon) hiddenProfile = afterColon;
              hiddenPhase = 'portrait-multi';
              continue;
            }
            // [hsScene: VALUE]
            const sceneMatch = trimLine.match(/^\[hsScene:\s*(.+)\]$/);
            if (sceneMatch) { hiddenStatus = sceneMatch[1].trim(); continue; }
            // 메타데이터가 아닌 줄 → narrative 시작
            hiddenPhase = 'narrative';
            hiddenBody += trimLine + '\n';
            continue;
          }
          // narrative phase: 본문 수집
          if (hiddenPhase === 'narrative') {
            hiddenBody += trimLine + '\n';
            continue;
          }
          continue;
        }

        // Hidden Story v1 내부 파싱 (@Hidden Story@ 형식)
        if (insideHiddenStory) {
          if (hiddenPhase === 'header') {
            if (trimLine.startsWith('Title:')) {
              hiddenTitle = trimLine.substring(6).trim();
              continue;
            }
            if (trimLine.startsWith('Profile:')) {
              const profPart = trimLine.substring(8).trim();
              if (profPart) hiddenProfile = profPart;
              hiddenPhase = 'profile';
              continue;
            }
            if (trimLine.startsWith('Status:')) {
              hiddenStatus = trimLine.substring(7).trim();
              hiddenPhase = 'status';
              continue;
            }
            if (trimLine.startsWith('Hidden Story Narrative:')) {
              hiddenPhase = 'narrative';
              continue;
            }
            // 아직 키워드 전이면 계속 header
            continue;
          }
          if (hiddenPhase === 'profile') {
            // Profile 다음 줄이 에셋이면 프로필로
            if (trimLine.match(/^\{\{ASSET:[^}]+\}\}$/) && !hiddenProfile) {
              hiddenProfile = trimLine;
              continue;
            }
            if (trimLine.startsWith('Status:')) {
              hiddenStatus = trimLine.substring(7).trim();
              hiddenPhase = 'status';
              continue;
            }
            if (trimLine.startsWith('Hidden Story Narrative:')) {
              hiddenPhase = 'narrative';
              continue;
            }
            continue;
          }
          if (hiddenPhase === 'status') {
            if (trimLine.startsWith('Hidden Story Narrative:')) {
              hiddenPhase = 'narrative';
              continue;
            }
            continue;
          }
          if (hiddenPhase === 'narrative') {
            hiddenBody += trimLine + '\n';
            continue;
          }
          continue;
        }

        // 일반 라인 처리 (기존)
        if (!trimLine) {
          if (!prevWasEmpty) {
            pendingSpacer = true;
            prevWasEmpty = true;
          }
          continue;
        }
        prevWasEmpty = false;

        const styledContent = styleLine(trimLine, theme, styles);
        // 에셋 이미지(div)는 p로 감싸지 않음 (p 안의 div는 사이트 에디터에서 깨짐)
        if (styledContent.startsWith('<div')) {
          if (pendingSpacer) {
            pendingSpacer = false;
            body += styledContent.replace('<div style="', '<div style="margin-top:1.5em;');
          } else {
            body += styledContent;
          }
        } else {
          body += '<p style="' + paraStyle() + '">' + styledContent + '</p>';
        }
      }
      isFirst = false;
    }

    // ========== 세련된 헤더 ==========
    const hdrBg = theme.headerBg || '#f3f0eb';
    const hdrBorder = theme.headerBorder || '#e0dcd4';
    const badgeBg = theme.badgeBg || '#555';
    const badgeClr = theme.badgeColor || '#fff';
    const modelBgC = theme.modelBg || '#059669';
    const promptBgC = theme.promptBg || '#92400e';

    const pName = personaName || personaDisplayName;
    const displayPName = (useUserTag && pName) ? '{{user}}' : pName;
    const labelColor = isDarkTheme ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    const dividerColor = isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';

    // ========== Archive 시리즈 레이아웃 (Log Diary 구조) ==========
    if (theme.category === 'archive' && theme.arc) {
      const a = theme.arc;
      const msgCount = indices.length;
      const font = "font-family:'Noto Serif KR','Noto Serif JP','Noto Serif SC','Noto Serif TC',Georgia,'Times New Roman',serif";

      // -- 커버 섹션 (이미지 + 헤더 텍스트가 분리된 구조) --
      // Froala 호환: 이미지 위에 텍스트 오버레이 X → 이미지 아래에 헤더 배치
      // Froala가 <img>에 float/class를 추가해도 텍스트에 영향 없음

      let h = '<div style="box-shadow:0 4px 16px rgba(0,0,0,0.1);max-width:900px;margin:5px auto;border-radius:1rem;background-color:' + a.mainBg + ';padding:0 0 clamp(20px,4vw,30px) 0;' + font + ';font-size:clamp(13px,2.3vw,14.2px);" data-chatlog="true">';

      // 커버 래퍼 (이미지 + 헤더 텍스트)
      // width:100% 제거: iOS Froala가 붙여넣기 시 width:%를 고정 픽셀로 변환(784px 등)하여 모바일 화면 초과
      // block div는 width 없이도 자동 100%
      h += '<div style="margin:0 0 30px 0;box-sizing:border-box;border-radius:16px 16px 0 0;background-color:' + a.coverBg + ';">';
      if (charImageUri) {
        // 커버: 아카 새니타이저가 overflow/clip-path/object-fit/CSS width·height 삭제
        // + 이미지에 HTML width="원본" height="원본" 자동 추가
        // → max-height 사용 불가(HTML width와 충돌하여 찌부)
        // → max-width:60%로 제한하여 가로형 이미지가 지나치게 크지 않게
        // 세로형도 폭이 적절히 줄어들어 균형 잡힌 카드형 커버
        // border-radius + box-shadow → 카드형 이미지
        // 컨테이너 padding + background-color가 프레임 역할
        h += '<div style="text-align:center;padding:clamp(24px,5vw,48px) clamp(20px,3vw,30px);background-color:' + a.coverBg + ';border-radius:16px 16px 0 0;">';
        h += '<img src="' + charImageUri + '" alt="cover" style="max-width:60%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">';
        h += '</div>';
      }
      // 헤더 텍스트 (커버 이미지 아래, 겹치지 않음)
      h += '<div style="padding:clamp(15px,3vw,20px) clamp(30px,5vw,40px);box-sizing:border-box;background-color:' + a.coverBg + ';">';
      // <p>/<h1> 대신 <div> 사용: 모바일 Froala가 <h1>을 최상위로 승격시켜 부모 div 밖으로 꺼내는 문제 방지
      h += '<div style="font-size:clamp(10px,1.8vw,11px);color:' + a.coverLabel + ';letter-spacing:clamp(2px,0.4vw,3px);margin:0 0 5px 0;' + font + ';">CHAT LOG</div>';
      h += '<div style="font-size:clamp(28px,5vw,42px);color:' + a.coverTitle + ';margin:0;' + font + ';font-weight:700;line-height:1.1;">' + escHtml(charName) + '</div>';
      const coverCaption = logTitle || '';
      if (coverCaption) {
        h += '<div style="font-size:clamp(12px,2.2vw,14px);letter-spacing:-0.5px;color:' + a.coverDesc + ';margin:5px 0 10px 0;' + font + ';max-width:90%;">' + escHtml(coverCaption) + '</div>';
      }
      // 태그 (모델/프롬프트)
      if (modelInfo || promptInfo) {
        const tgS = 'display:inline-block;background:' + a.tagBg + ';color:' + a.tagColor + ';padding:clamp(4px,0.8vw,5px) clamp(10px,2vw,12px);margin:0 clamp(6px,1.2vw,8px) clamp(6px,1.2vw,8px) 0;border:1px solid ' + a.tagBorder + ';font-size:clamp(10px,1.8vw,11px);' + font;
        h += '<div style="font-size:0;">';
        if (modelInfo) h += '<span style="' + tgS + '">' + escHtml(modelInfo) + '</span> ';
        if (promptInfo) h += '<span style="' + tgS + '">' + escHtml(promptInfo) + '</span> ';
        h += '</div>';
      }
      h += '</div></div>';

      // -- 프로필 섹션 (display:table 강제 가로 배치) --
      // inline-block + width:50%는 iOS Froala가 px 고정 변환 → 모바일에서 세로 줄바꿈
      // display:table + table-cell → 강제 2열 배치, Froala/새니타이저 모두 보존
      h += '<div style="padding:0 0 10px 0;">';
      h += '<div style="padding:0 clamp(30px,5vw,50px) 10px clamp(30px,5vw,50px);text-align:center;">';
      h += '<span style="display:inline-block;font-size:clamp(11px,2vw,13px);font-weight:600;letter-spacing:clamp(1.5px,0.3vw,2px);color:' + a.sectionColor + ';text-transform:uppercase;border-bottom:1px solid ' + a.sectionBorder + ';padding-bottom:5px;margin-bottom:10px;">Profile</span>';
      h += '</div>';

      // 프로필 카드 빌더 — display:table-cell로 강제 가로 배치
      // width:50% → 셀 균등 분배로 이름 중앙 대칭 보장
      const profCard = (imgUri, label, name) => {
        let c = '<div style="display:table-cell;vertical-align:top;text-align:center;box-sizing:border-box;padding:0 clamp(10px,3vw,30px);width:50%;">';
        if (imgUri && includeHeaderImages) {
          c += '<div style="text-align:center;margin:0 auto 12px auto;">';
          c += '<img src="' + imgUri + '" alt="avatar" style="max-width:clamp(80px,22vw,200px);border-radius:50%;">';
          c += '</div>';
        } else if (!includeHeaderImages) {
          // 이미지 끔: 빈 공간 없이 이름만 표시
        } else {
          c += '<div style="max-width:clamp(80px,22vw,200px);border-radius:50%;margin:0 auto 12px auto;background:' + a.profFallback + ';"></div>';
        }
        c += '<div style="text-align:center;">';
        c += '<div style="font-size:clamp(8px,1.3vw,10px);color:' + a.profLabel + ';margin-bottom:3px;font-weight:600;text-transform:uppercase;' + font + ';">' + label + '</div>';
        c += '<div style="display:block;font-size:clamp(13px,2.5vw,18px);font-weight:700;' + font + ';color:' + a.profName + ';line-height:1.2;margin-bottom:clamp(6px,1.5vw,10px);">' + escHtml(name) + '</div>';
        c += '</div></div>';
        return c;
      };

      h += '<div style="display:table;min-width:100%;margin-bottom:0;">';
      h += '<div style="display:table-row;">';
      h += profCard(charImageUri, 'CHAR', charName);
      if (pName) {
        h += profCard(personaImageUri, 'USER', displayPName);
      }
      h += '</div></div></div>';

      // -- 콘텐츠 아코디언 (display:table 레이아웃 summary) --
      h += '<details open style="margin:0;">';
      h += '<summary style="cursor:pointer;list-style:none;outline:none;color:inherit;font-weight:normal;">';
      h += '<div style="display:table;min-width:100%;">';
      h += '<div style="display:table-row;">';
      h += '<div style="display:table-cell;vertical-align:middle;">';
      h += '<div style="display:table;min-width:100%;padding:clamp(15px,3vw,20px) 0;">';
      h += '<div style="display:table-cell;vertical-align:middle;padding-left:clamp(30px,5vw,50px);">';
      h += '<div style="font-size:clamp(14px,2.5vw,16px);font-weight:700;color:' + a.pageTitle + ';margin-bottom:4px;' + font + ';line-height:1.3;">\uBCF8\uBB38</div>';
      h += '<div style="font-size:clamp(11px,2vw,12px);color:' + a.pageSub + ';' + font + ';line-height:1.4;">' + msgCount + '\uAC1C \uBA54\uC2DC\uC9C0</div>';
      h += '</div></div></div>';
      h += '<div style="display:table-cell;vertical-align:middle;width:clamp(50px,10vw,70px);text-align:right;padding-right:clamp(30px,5vw,50px);">';
      h += '<span style="font-size:clamp(16px,3vw,20px);color:' + a.chevron + ';">\u2335</span>';
      h += '</div></div></div>';
      h += '</summary>';

      // 본문 내용
      h += '<div style="padding:clamp(15px,3vw,20px) clamp(30px,5vw,50px);' + theme.innerWrap + '">';
      h += body;
      h += '</div>';
      h += '</details>';
      // 워터마크
      const wmColor = isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
      h += '<div style="text-align:right;padding:8px clamp(30px,5vw,50px) 0;font-size:10px;color:' + wmColor + ';' + font + ';letter-spacing:0.02em;">Made by Log Plus</div>';
      h += '</div>';

      return h;
    }

    // ========== 기본 테마 헤더 ==========
    const buildAvatarCard = (imgUri, name, label) => {
      const szW = 'clamp(60px, 18vw, 140px)';
      const szH = 'clamp(88px, 26vw, 205px)';
      const cardWrap = 'display:inline-block;text-align:center;vertical-align:top;margin:0 clamp(2px, 1vw, 8px)';
      const labelStyle = 'font-size:clamp(0.5em, 1.5vw, 0.65em);text-transform:uppercase;letter-spacing:0.05em;color:' + labelColor + ';font-weight:600';
      const nameStyle = 'font-size:clamp(0.75em, 2.5vw, 1.05em);font-weight:700;text-align:center;line-height:1.3;max-width:' + szW;

      let card = '<div style="' + cardWrap + '">';
      if (includeHeaderImages) {
        const imgWrap = 'width:' + szW + ';height:' + szH + ';border-radius:12px;border:2px solid ' + hdrBorder + ';background:rgba(128,128,128,0.06);margin:0 auto 8px auto;text-align:center;line-height:' + szH;
        const imgStyle = 'max-width:100%;max-height:100%;border-radius:10px;vertical-align:middle';
        card += '<div style="' + imgWrap + '">';
        if (imgUri) {
          card += '<img src="' + imgUri + '" style="' + imgStyle + '">';
        } else {
          card += '<div style="width:100%;height:100%;text-align:center;line-height:' + szH + ';font-size:clamp(20px, 5vw, 36px);border-radius:10px">\uD83D\uDC64</div>';
        }
        card += '</div>';
      }
      card += '<div style="text-align:center"><div style="' + labelStyle + '">' + label + '</div><div style="' + nameStyle + '">' + escHtml(name) + '</div></div>';
      card += '</div>';
      return card;
    };

    let header = '<div style="margin-bottom:1.5em;padding:clamp(1em, 3vw, 1.8em) clamp(0.8em, 2.5vw, 1.5em);background:' + hdrBg + ';border-radius:16px;border:1px solid ' + hdrBorder + '">';

    // 상단: 아바타 영역 (inline-block + text-align:center — Froala가 justify-content 등 flex 속성을 제거하므로)
    header += '<div style="text-align:center;margin-bottom:1.2em">';
    header += buildAvatarCard(charImageUri, charName, 'Character');
    if (pName) {
      header += '<div style="display:inline-block;vertical-align:middle;font-size:clamp(0.9em, 3vw, 1.6em);color:' + dividerColor + ';font-weight:300;margin:0 clamp(1px, 0.5vw, 4px)">&times;</div>';
      header += buildAvatarCard(personaImageUri, displayPName, 'Persona');
    }
    header += '</div>';

    // 구분선 (hr = void element, Froala가 내부에 <br> 삽입 불가)
    header += '<hr style="border:none;border-top:1px solid ' + hdrBorder + ';margin:0 0 1em 0">';

    // 로그 제목
    const titleText = logTitle || '\uCC44\uD305 \uB85C\uADF8';
    header += '<p style="margin:0 0 0.6em 0;font-size:1.4em;font-weight:800;letter-spacing:-0.02em;text-align:center">' + escHtml(titleText) + '</p>';

    // 모델/프롬프트 태그 (가운데 정렬)
    const tagCss = 'display:inline-block;margin:0 4px 6px 4px;padding:5px 12px;border-radius:20px;font-size:0.7em;font-weight:600;line-height:1.2;color:#fff';
    if (modelInfo || promptInfo) {
      header += '<div style="text-align:center;margin-top:0.2em">';
      if (modelInfo) header += '<span style="' + tagCss + ';background:' + modelBgC + '">' + escHtml(modelInfo) + '</span>';
      if (promptInfo) header += '<span style="' + tagCss + ';background:' + promptBgC + '">' + escHtml(promptInfo) + '</span>';
      header += '</div>';
    }
    header += '</div>';

    // details/summary 토글 구조
    const summaryStyle = 'padding:0.7em 0;font-size:0.95em;font-weight:600;list-style:none';
    const summaryArrow = '<span style="display:inline-block;margin-right:6px">&#9654;</span>';

    const wmColor2 = isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    const watermark = '<div style="text-align:right;padding:8px 0 0;font-size:10px;color:' + wmColor2 + ';letter-spacing:0.02em;">Made by Log Plus</div>';

    return '<div style="' + theme.container + '" data-chatlog="true"><div style="' + theme.innerWrap + '">'
      + header
      + '<details open><summary style="' + summaryStyle + '">' + summaryArrow + '\uBCF8\uBB38 \uBCF4\uAE30 (' + indices.length + '\uAC1C \uBA54\uC2DC\uC9C0)</summary>'
      + body
      + '</details>' + watermark + '</div></div>';
  };

  // ========== 뷰 전환 ==========
  const toggleView = () => {
    const logContent = document.getElementById('log-content');
    const previewWrap = document.getElementById('preview-wrap');
    if (viewMode === 'preview') {
      logContent.style.display = 'none';
      previewWrap.classList.add('visible');
      renderPreview();
    } else {
      logContent.style.display = '';
      previewWrap.classList.remove('visible');
    }
  };

  const renderPreview = async () => {
    // 글자수정 단계에서는 iframe 재빌드 차단
    if (editPhase === 'text') return;

    let html = buildStyledHtml();
    if (!html) return;
    const theme = THEMES[currentTheme];
    const pageBg = theme.pageBg || '#1a1a1a';

    const frame = document.getElementById('preview-frame');

    const fullPage = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'
      + 'html, body { margin: 0; padding: 20px; background: ' + pageBg + '; min-height: 100%; }'
      + '* { box-sizing: border-box; }'
      + '</style></head><body>' + html + '</body></html>';
    frame.srcdoc = fullPage;
  };

  // ========== 글자수정 div 렌더 ==========
  const renderEditContainer = async () => {
    let html = buildStyledHtml();
    if (!html) return;
    const theme = THEMES[currentTheme];
    const pageBg = theme.pageBg || '#1a1a1a';
    const editDiv = document.getElementById('edit-container');

    // contenteditable 추가
    html = html.replace('data-chatlog="true"', 'data-chatlog="true" contenteditable="true"');

    const banner = '<div style="text-align:center;padding:8px;margin-bottom:12px;background:rgba(245,158,11,0.12);border-radius:8px;color:#f59e0b;font-size:13px;font-family:sans-serif;">\u270F\uFE0F \uAE00\uC790 \uC218\uC815 \uBAA8\uB4DC \u2014 \uD14D\uC2A4\uD2B8\uB97C \uC9C1\uC811 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4</div>';

    editDiv.style.background = pageBg;
    editDiv.innerHTML = banner + html;
    editDiv.classList.add('visible');
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
    rangeStart = 0;
    rangeEnd = allMessages.length - 1;
    const si = document.getElementById('range-start');
    const ei = document.getElementById('range-end');
    if (si) si.value = 1;
    if (ei) ei.value = allMessages.length;
    renderMessages();
    updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const selectNone = () => {
    selectedSet.clear();
    renderMessages();
    updateRangeHint();
    if (viewMode === 'preview') renderPreview();
  };

  const deselectUser = () => {
    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i].role === 'user' && selectedSet.has(i)) {
        selectedSet.delete(i);
      }
    }
    renderMessages();
    updateRangeHint();
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
    const count = selectedSet.size;
    document.getElementById('range-hint').textContent = '\uC120\uD0DD: ' + count + '\uAC1C / \uC804\uCCB4: ' + allMessages.length + '\uAC1C';
  };

  // ========== 메시지 목록 렌더링 ==========
  const renderMessages = () => {
    const content = document.getElementById('log-content');
    if (allMessages.length === 0) {
      content.innerHTML = '<div id="log-empty">\uCC44\uD305 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      return;
    }
    let html = '';
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const selected = selectedSet.has(i);
      const dimClass = selected ? '' : ' dimmed';
      let escapedText = msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      escapedText = escapedText.replace(/\{\{ASSET:([^}]+)\}\}/g, '<span class="msg-asset-badge">🖼️ $1</span>');
      const fmClass = msg.isFirstMessage ? ' first-message' : '';
      html += '<div class="msg-block ' + msg.role + dimClass + fmClass + '" data-idx="' + i + '">';
      const idxLabel = msg.isFirstMessage ? '📌 First' : '#' + (i + 1);
      html += '<div class="msg-header"><input type="checkbox" class="msg-check" ' + (selected ? 'checked' : '') + '><span class="msg-role ' + msg.role + '">' + msg.name + '</span><span class="msg-idx">' + idxLabel + '</span></div>';
      html += '<div class="msg-text">' + escapedText.replace(/\n/g, '<br>') + '</div></div>';
    }
    content.innerHTML = html;

    // 체크박스 및 블록 클릭 이벤트
    content.querySelectorAll('.msg-block').forEach(block => {
      const idx = parseInt(block.dataset.idx);
      block.addEventListener('click', (e) => {
        if (e.target.classList.contains('msg-check')) return;
        toggleSelect(idx);
      });
      const cb = block.querySelector('.msg-check');
      if (cb) cb.addEventListener('change', () => toggleSelect(idx));
    });

    // 스크롤 to first selected
    const sorted = [...selectedSet].sort((a,b) => a - b);
    if (sorted.length > 0) {
      const first = content.querySelector('.msg-block[data-idx="' + sorted[0] + '"]');
      if (first) first.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  // ========== 메인 진입 ==========
  const showLog = async () => {
    viewMode = 'list';
    document.querySelectorAll('.view-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === 'list');
    });
    document.querySelectorAll('#m-bottom-bar .m-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === 'list');
    });
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
    document.getElementById('log-overlay').style.display = 'block';
    await Risuai.showContainer('fullscreen');
  };

  // ========== 버튼 등록 ==========
  const registerBtn = async () => {
    if (buttonRef) { try { await Risuai.unregisterUIPart(buttonRef.id); } catch (e) {} buttonRef = null; }
    buttonRef = await Risuai.registerButton({
      name: 'LogPlus',
      icon: '\uD83D\uDCCB',
      iconType: 'html',
      location: 'chat'
    }, showLog);
  };

  // ========== 초기화 ==========
  setupUI();
  try {
    await registerBtn();
    console.log('LogPlus v2.0 플러그인이 로드되었습니다.');
  } catch (error) {
    console.log('Error: ' + error.message);
  }
})();