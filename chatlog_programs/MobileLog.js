//@name Mobile Log Plugin (Log Diary Style)
//@display-name 모바일 로그 플러그인 v3
//@api 3.0
//@version 3.0.0
//@description 채팅 로그를 예쁜 Log Diary 스타일로 내보냅니다. (v3 API)

(async () => {
  // ========== 상태 변수 ==========
  let buttonRef = null;
  let chatData = null; // extractChatData 결과 캐시
  let useTranslation = false;

  // ========== 유틸리티 ==========
  function hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex;
  }

  // ========== 라이트/다크 테마 정의 (Log Diary 스타일) ==========
  const COLORS = {
    light: {
      name: '라이트',
      background: '#ffffff',
      cardBg: '#ffffff',
      cardBgUser: '#f8f9fa',
      text: '#2c3e50',
      textSecondary: '#6c8da8',
      nameColor: '#162a3e',
      border: '#c8d6e0',
      quoteBg: '#f0f2f5',
      quoteColor: '#162a3e',
      shadow: '0 4px 16px rgba(0,0,0,0.1)',
      avatarBorder: '#dee2e6',
      headerBg: '#1a1a1a',
      headerText: '#ffffff',
      accentColor: '#162a3e',
      tagBg: 'rgba(255, 255, 255, 0.1)',
      tagBorder: 'rgba(255, 255, 255, 0.3)'
    },
    dark: {
      name: '다크',
      background: '#1a1a1a',
      cardBg: '#2a2a2a',
      cardBgUser: '#2d3748',
      text: '#e0e0e0',
      textSecondary: '#a0a0a0',
      nameColor: '#64b5f6',
      border: '#4a4a4a',
      quoteBg: 'rgba(255, 255, 255, 0.1)',
      quoteColor: '#ffffff',
      shadow: '0 4px 16px rgba(0,0,0,0.5)',
      avatarBorder: '#4a4a4a',
      headerBg: '#0a0a0a',
      headerText: '#ffffff',
      accentColor: '#64b5f6',
      tagBg: 'rgba(255, 255, 255, 0.1)',
      tagBorder: 'rgba(255, 255, 255, 0.3)'
    }
  };

  // ========== 설정 (Risuai.pluginStorage 사용) ==========
  const SETTINGS_KEY = 'mobileLogDesignSettings';

  async function loadSettings() {
    try {
      const raw = await Risuai.pluginStorage.getItem(SETTINGS_KEY);
      const defaults = {
        personaName: '',
        boldQuotes: true,
        highlightQuotes: true,
        customThemeColor: '#162a3e',
        useCustomColor: false,
        theme: 'light',
        showMetadata: false,
        selectedModel: '',
        customModel: '',
        selectedPrompt: '',
        customPrompt: '',
        removeImages: false,
        customHeaderImage: '',
        headerImageMode: 'normal',
        emojiRemoval: 'none',
        compressImages: true,
        imageQuality: 70,
        imageMaxWidth: 800,
        messageFilter: 'all',
        archiveNumber: '001',
        charSubtitle: '',
        sectionTitle: 'Story',
        tags: ['Bot', 'Model', 'Prompt'],
        useTranslation: false,
        rangeMode: 'recent',
        recentN: 1,
        botOnly: false
      };
      if (raw) {
        try { return { ...defaults, ...JSON.parse(raw) }; } catch (e) {}
      }
      return defaults;
    } catch (e) {
      console.log('[Mobile Log] 설정 로드 실패:', e);
      return { theme: 'light', boldQuotes: true, highlightQuotes: true, compressImages: true };
    }
  }

  async function saveSettings(settings) {
    try {
      await Risuai.pluginStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.log('[Mobile Log] 설정 저장 실패:', e);
    }
  }

  // ========== 이미지 처리 ==========
  // Risu 에셋 URL 유틸 (모바일 경량 복사용)
  const RISU_ASSET_BASE = 'https://sv.risuai.xyz/rs/assets/';
  function getAssetRisuUrl(key) {
    if (!key) return '';
    if (typeof key === 'string' && key.startsWith('http')) return key;
    if (typeof key === 'string') {
      let filename = key;
      if (filename.startsWith('assets/')) filename = filename.substring(7);
      if (/^[a-f0-9]{16,}\.[a-z0-9]+$/i.test(filename)) {
        return RISU_ASSET_BASE + filename;
      }
    }
    return '';
  }

  async function getAssetDataUri(key) {
    if (!key) return '';
    if (key.startsWith('data:')) return key;
    // 이미 base64 문자열인 경우
    if (/^[A-Za-z0-9+/=]{100,}$/.test(key)) {
      const prefix = key.substring(0, 4);
      if (key.startsWith('iVBOR')) return 'data:image/png;base64,' + key;
      if (key.startsWith('/9j/')) return 'data:image/jpeg;base64,' + key;
      if (key.startsWith('UklG')) return 'data:image/webp;base64,' + key;
      if (key.startsWith('R0lG')) return 'data:image/gif;base64,' + key;
      return 'data:image/png;base64,' + key;
    }
    try {
      let readKey = key;
      let data = await Risuai.readImage(readKey);
      // 파일명으로 재시도
      if (!data && key.includes('/')) {
        const filename = key.split('/').pop();
        data = await Risuai.readImage(filename);
      }
      if (!data) return '';

      if (data instanceof Uint8Array) {
        // magic bytes로 MIME 감지
        let mime = 'image/png';
        if (data[0] === 0xFF && data[1] === 0xD8) mime = 'image/jpeg';
        else if (data[0] === 0x89 && data[1] === 0x50) mime = 'image/png';
        else if (data[0] === 0x52 && data[1] === 0x49) mime = 'image/webp';
        else if (data[0] === 0x47 && data[1] === 0x49) mime = 'image/gif';
        // Uint8Array → base64
        let binary = '';
        const len = data.length;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(data[i]);
        return 'data:' + mime + ';base64,' + btoa(binary);
      }
      if (typeof data === 'string') {
        if (data.startsWith('data:') || data.startsWith('http')) return data;
        return 'data:image/png;base64,' + data;
      }
    } catch (e) {
      console.log('[Mobile Log] 이미지 로드 실패:', key, e);
    }
    return '';
  }

  async function imageUrlToBase64(url, compressOptions) {
    try {
      if (!url || url === 'undefined' || url === 'null') return '';
      if (url.startsWith('data:image')) {
        if (compressOptions && compressOptions.enabled) {
          return await compressImage(url, compressOptions.maxWidth, compressOptions.quality);
        }
        return url;
      }
      let normalizedUrl = url.startsWith('//') ? 'https:' + url : url;
      const response = await fetch(normalizedUrl);
      if (!response.ok) throw new Error('fetch failed: ' + response.status);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
      if (compressOptions && compressOptions.enabled && base64) {
        return await compressImage(base64, compressOptions.maxWidth, compressOptions.quality);
      }
      return base64 || '';
    } catch (e) {
      console.log('[Mobile Log] URL→base64 실패:', url);
      return '';
    }
  }

  async function compressImage(base64, maxWidth, quality) {
    if (!base64) return '';
    maxWidth = maxWidth || 800;
    quality = quality || 70;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality / 100));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  }

  // ========== 번역 캐시 (LogPlus 호환) ==========
  function extractLongestPlainChunk(text) {
    const chunks = text.split(/\[.*?\]|<[^>]*>|\{\{.*?\}\}/gs).map(s => s.trim()).filter(s => s.length > 30);
    return chunks.sort((a, b) => b.length - a.length)[0] || '';
  }

  async function findTranslationFromCache(originalText) {
    try {
      if (typeof Risuai.getTranslationCache !== 'function' || typeof Risuai.searchTranslationCache !== 'function') {
        return { found: false, reason: 'no_api' };
      }

      // 1) 정확 매칭 ("HTML 포맷 전 번역" 사용 시 대부분 여기서 해결)
      const exactMatch = await Risuai.getTranslationCache(originalText);
      if (exactMatch) {
        return { found: true, translation: exactMatch, method: 'exact' };
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
      return { found: true, translation: matches[0].value, method: 'search_fallback' };
    } catch (e) {
      console.log('[Mobile Log] 번역 캐시 조회 오류:', e.message || e);
      return { found: false, reason: 'error', error: e.message || String(e) };
    }
  }

  // ========== 텍스트 처리 ==========
  function processBoldQuotes(html, highlightColor, quoteTextColor) {
    let stylePropsBlock = '';
    let stylePropsInline = '';
    if (highlightColor) {
      const textColor = '#3d3d3d';
      stylePropsBlock = 'background-color:' + highlightColor + ';color:' + textColor + ';font-weight:600;padding:2px 5px;border-radius:3px;';
      stylePropsInline = 'background-color:' + highlightColor + ';color:' + textColor + ';font-weight:600;padding:2px 5px;border-radius:3px;';
    } else {
      stylePropsBlock = 'font-weight:600;';
      stylePropsInline = 'font-weight:600;';
    }
    const parts = html.split(/(<[^>]*>)/g);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] && !parts[i].startsWith('<')) {
        parts[i] = parts[i].replace(/"([^"]*'[^']*'[^"]*)"/g, (match, inner) => {
          const processed = inner.replace(/'([^']+)'/g, '<span style="' + stylePropsInline + '">\'$1\'</span>');
          return '"' + processed + '"';
        });
        parts[i] = parts[i].replace(/\u201c([^\u201d]*\u2018[^\u2019]*\u2019[^\u201d]*)\u201d/g, (match, inner) => {
          const processed = inner.replace(/\u2018([^\u2019]+)\u2019/g, '<span style="' + stylePropsInline + '">\u2018$1\u2019</span>');
          return '\u201c' + processed + '\u201d';
        });
        parts[i] = parts[i].replace(/"([^"']+)"/g, '<span style="' + stylePropsBlock + '">"$1"</span>');
        parts[i] = parts[i].replace(/\u201c([^\u201d\u2018\u2019]+)\u201d/g, '<span style="' + stylePropsBlock + '">\u201c$1\u201d</span>');
        parts[i] = parts[i].replace(/'([^']+)'/g, '<span style="' + stylePropsBlock + '">\'$1\'</span>');
        parts[i] = parts[i].replace(/\u2018([^\u2019]+)\u2019/g, '<span style="' + stylePropsBlock + '">\u2018$1\u2019</span>');
      }
    }
    return parts.join('');
  }

  function processItalicHighlight(html, italicColor) {
    italicColor = italicColor || '#2d5af0';
    const parts = html.split(/(<[^>]*>)/g);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] && !parts[i].startsWith('<')) {
        parts[i] = parts[i].replace(/\*([^*]+)\*/g, '<em style="font-style:italic;color:' + italicColor + ';">$1</em>');
      }
    }
    return parts.join('');
  }

  function removeEmojis(html, mode) {
    let result = html.replace(/\u270f\ufe0f/g, '').replace(/\u270f/g, '');
    if (mode === 'zwj') {
      const zwjSeqRegex = /(?:[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2702}-\u{27B0}])+/gu;
      result = result.replace(zwjSeqRegex, (match) => match.includes('\u200D') ? '' : match);
    } else if (mode === 'all') {
      result = result.replace(/(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{200D}]|[\u{FE0F}]|[\u{FE0E}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{E0061}-\u{E007A}]|[\u{E007F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}])+/gu, '');
    }
    return result;
  }

  function replacePersonaName(text, personaName) {
    if (!personaName || personaName.trim() === '') return text;
    const escaped = personaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(escaped, 'gi'), '{{user}}');
  }

  // ========== DB에서 채팅 메타데이터 추출 (경량 - 이미지 로드 없음) ==========
  async function extractChatMetadata() {
    const db = await Risuai.getDatabase();
    const charIdx = await Risuai.getCurrentCharacterIndex();
    const chatIdx = await Risuai.getCurrentChatIndex();
    if (!db || charIdx === -1 || chatIdx === -1) {
      throw new Error('캐릭터/채팅 정보를 가져올 수 없습니다.');
    }
    const character = db.characters[charIdx];
    const charName = character?.name || character?.data?.name || '캐릭터';

    // 페르소나 정보 (이미지 제외)
    let personaName = '';
    try {
      const personas = db.personas || [];
      const selIdx = db.selectedPersona;
      if (typeof selIdx === 'number' && selIdx >= 0 && selIdx < personas.length) {
        personaName = personas[selIdx].name || '';
      }
    } catch (e) {}

    // 에셋 name→key 매핑 구축 (강화판: 파일명만, 키 역방향 룩업 포함)
    const nameKeyMap = {};
    const nameLookup = {};
    const keyToName = {};        // key → name 역방향
    const filenameLookup = {};   // 파일명만으로 찾기 (경로 제거)
    const stemLookup = {};       // 모든 확장자 제거한 stem → name (파일명.1.webp → 파일명)

    // 모든 확장자 제거 (파일명.1.webp → 파일명)
    function stripAllExts(name) {
      let s = name;
      let prev;
      do { prev = s; s = s.replace(/\.[^.\\/]+$/, ''); } while (s !== prev && s.length > 0);
      return s;
    }

    const charAssets = character.additionalAssets || [];
    for (const asset of charAssets) {
      if (Array.isArray(asset) && asset[0]) {
        const name = asset[0];
        const key = asset[1] || '';
        nameKeyMap[name] = key;
        nameLookup[name.toLowerCase()] = name;
        // 확장자 없는 버전 (마지막 확장자 1개 제거)
        const noExt = name.replace(/\.[^.]+$/, '');
        if (noExt !== name) {
          nameKeyMap[noExt] = key;
          nameLookup[noExt.toLowerCase()] = noExt;
        }
        // 모든 확장자 제거 (stem): "파일명.1.webp" → "파일명"
        const stem = stripAllExts(name);
        if (stem && stem !== name && stem !== noExt) {
          if (!nameKeyMap[stem]) { nameKeyMap[stem] = key; }
          nameLookup[stem.toLowerCase()] = stem;
          stemLookup[stem.toLowerCase()] = name;
        }
        // 파일명만 추출 (경로 프리픽스 제거: "$folder/file.webp" → "file.webp")
        const basename = name.includes('/') ? name.split('/').pop() : (name.includes('\\') ? name.split('\\').pop() : '');
        if (basename && !nameKeyMap[basename]) {
          nameKeyMap[basename] = key;
          nameLookup[basename.toLowerCase()] = basename;
        }
        const basenameNoExt = basename ? basename.replace(/\.[^.]+$/, '') : '';
        if (basenameNoExt && !nameKeyMap[basenameNoExt]) {
          nameKeyMap[basenameNoExt] = key;
          nameLookup[basenameNoExt.toLowerCase()] = basenameNoExt;
        }
        const basenameStem = basename ? stripAllExts(basename) : '';
        if (basenameStem && basenameStem !== basenameNoExt && !nameKeyMap[basenameStem]) {
          nameKeyMap[basenameStem] = key;
          nameLookup[basenameStem.toLowerCase()] = basenameStem;
          stemLookup[basenameStem.toLowerCase()] = name;
        }
        // 키 역방향 룩업
        if (key) {
          keyToName[key] = name;
          keyToName[key.toLowerCase()] = name;
          // assets/ 프리픽스 제거
          if (key.startsWith('assets/')) keyToName[key.substring(7)] = name;
          const keyFilename = key.includes('/') ? key.split('/').pop() : key;
          if (keyFilename) keyToName[keyFilename] = name;
        }
        // 파일명 룩업 (모든 변형)
        filenameLookup[name.toLowerCase()] = name;
        if (basename) filenameLookup[basename.toLowerCase()] = name;
        if (noExt) filenameLookup[noExt.toLowerCase()] = name;
        if (basenameNoExt) filenameLookup[basenameNoExt.toLowerCase()] = name;
        if (stem) filenameLookup[stem.toLowerCase()] = name;
        if (basenameStem) filenameLookup[basenameStem.toLowerCase()] = name;
      }
    }
    try {
      const modules = db.modules || [];
      for (const mod of modules) {
        if (!mod) continue;
        const modAssets = mod.assets || [];
        for (const asset of modAssets) {
          if (Array.isArray(asset) && asset[0] && !nameKeyMap[asset[0]]) {
            const name = asset[0];
            const key = asset[1] || '';
            nameKeyMap[name] = key;
            nameLookup[name.toLowerCase()] = name;
            if (key) { keyToName[key] = name; keyToName[key.toLowerCase()] = name; }
            const basename = name.includes('/') ? name.split('/').pop() : '';
            if (basename && !nameKeyMap[basename]) { nameKeyMap[basename] = key; nameLookup[basename.toLowerCase()] = basename; }
          }
        }
      }
    } catch (e) {}
    console.log('[Mobile Log] 에셋 매핑 구축:', Object.keys(nameKeyMap).length, '개 이름,', Object.keys(keyToName).length, '개 키');

    // 채팅 데이터 추출
    const rawChatData = character.chats[chatIdx];
    const rawMessages = Array.isArray(rawChatData) ? rawChatData : (rawChatData?.message || []);
    const chatName = (!Array.isArray(rawChatData) && rawChatData?.name) || '채팅';

    // 퍼스트 메시지 추출
    let firstMessageText = '';
    try {
      const fmIndex = (!Array.isArray(rawChatData) && rawChatData?.fmIndex != null) ? rawChatData.fmIndex : -1;
      if (fmIndex >= 0) {
        const altGreetings = character.alternateGreetings || character.alternate_greetings
          || (character.data && (character.data.alternateGreetings || character.data.alternate_greetings))
          || [];
        firstMessageText = altGreetings[fmIndex] || '';
      }
      if (!firstMessageText) {
        firstMessageText = character.firstMessage || character.firstmessage || character.first_mes || '';
      }
      if (!firstMessageText && character.data) {
        firstMessageText = character.data.firstMessage || character.data.firstmessage || character.data.first_mes || '';
      }
    } catch (e) {}

    // 메시지 배열 구성 (텍스트만, 이미지 로드 없음)
    const messages = [];
    if (firstMessageText && firstMessageText.trim()) {
      messages.push({ role: 'char', name: charName, data: firstMessageText, isFirstMessage: true });
    }
    for (const msg of rawMessages) {
      const data = msg.data !== undefined ? msg.data : (msg.mes || '');
      if (!data.trim()) continue;
      const role = msg.role === 'user' ? 'user' : (msg.role === 'system' ? 'system' : 'char');
      const name = role === 'user' ? '{{user}}' : (role === 'system' ? '시스템' : charName);
      messages.push({ role, name, data });
    }

    const resolveAssetRef = (ref) => {
      if (!ref) return null;
      if (/^(https?:|data:|blob:)/i.test(ref)) return null;
      // 1. 정확한 이름 매칭
      if (nameKeyMap[ref]) return ref;
      const lo = ref.toLowerCase();
      if (nameLookup[lo]) return nameLookup[lo];
      // 2. 확장자 제거 매칭 (마지막 1개)
      const noExt = ref.replace(/\.[^.]+$/, '').toLowerCase();
      if (nameLookup[noExt]) return nameLookup[noExt];
      // 3. 모든 확장자 제거 stem 매칭 ("파일명" → "파일명.1.webp")
      const stem = stripAllExts(ref).toLowerCase();
      if (stem && nameLookup[stem]) return nameLookup[stem];
      if (stem && stemLookup[stem]) return stemLookup[stem];
      if (stem && filenameLookup[stem]) return filenameLookup[stem];
      // 4. 키 역방향 매칭 (msg에 key가 직접 들어있는 경우)
      if (keyToName[ref]) return keyToName[ref];
      if (keyToName[lo]) return keyToName[lo];
      // 5. 파일명만 추출해서 매칭 ("path/to/file.webp" → "file.webp")
      const filename = ref.includes('/') ? ref.split('/').pop() : (ref.includes('\\') ? ref.split('\\').pop() : '');
      if (filename) {
        if (nameKeyMap[filename]) return filename;
        const flo = filename.toLowerCase();
        if (nameLookup[flo]) return nameLookup[flo];
        if (filenameLookup[flo]) return filenameLookup[flo];
        const fnoExt = filename.replace(/\.[^.]+$/, '').toLowerCase();
        if (nameLookup[fnoExt]) return nameLookup[fnoExt];
        if (filenameLookup[fnoExt]) return filenameLookup[fnoExt];
        const fStem = stripAllExts(filename).toLowerCase();
        if (fStem && nameLookup[fStem]) return nameLookup[fStem];
        if (fStem && stemLookup[fStem]) return stemLookup[fStem];
        if (fStem && filenameLookup[fStem]) return filenameLookup[fStem];
      }
      // 6. assets/ 프리픽스 제거
      if (ref.startsWith('assets/')) {
        const stripped = ref.substring(7);
        if (nameKeyMap[stripped]) return stripped;
        if (keyToName[stripped]) return keyToName[stripped];
      }
      // 7. ref가 에셋 이름의 앞부분인지 확인 ("파일명" → "파일명.1.webp" 등)
      const refLo = lo;
      for (const assetName of Object.keys(nameKeyMap)) {
        const aLo = assetName.toLowerCase();
        // ref가 에셋명의 시작부분이고, 뒤에 확장자(문자)만 남은 경우
        if (aLo.startsWith(refLo) && aLo.length > refLo.length && aLo[refLo.length] === '.') {
          return assetName;
        }
      }
      return null;
    };

    return {
      charName,
      chatName,
      charImageKey: character.image || '',
      personaName,
      personaIconKey: (db.personas && db.personas[db.selectedPersona] && db.personas[db.selectedPersona].icon) || '',
      messages,
      nameKeyMap,
      nameLookup,
      keyToName,
      filenameLookup,
      resolveAssetRef
    };
  }

  // ========== 선택 범위의 에셋만 로드 (지연 로딩) ==========
  async function loadAssetsForRange(metadata, startIdx, endIdx, statusCallback) {
    const { messages, nameKeyMap, resolveAssetRef } = metadata;
    const slice = messages.slice(startIdx, endIdx);
    const assetDataUris = {};

    // 캐릭터/페르소나 이미지 로드
    let charImageUri = '';
    if (metadata.charImageKey) {
      if (statusCallback) statusCallback('캐릭터 이미지 로드 중...');
      try { charImageUri = await getAssetDataUri(metadata.charImageKey); } catch (e) {}
    }

    // 선택 범위 메시지에서 에셋 참조 스캔
    const referencedAssets = new Set();
    const unresolvedRefs = [];  // 디버그용
    for (const msg of slice) {
      const raw = msg.data || '';
      // 1. <img src="..."> 스캔
      const imgMatches = raw.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
      for (const tag of imgMatches) {
        const m = tag.match(/src=["']([^"']+)["']/i);
        if (m) {
          const resolved = resolveAssetRef(m[1]);
          if (resolved) referencedAssets.add(resolved);
          else if (!m[1].startsWith('data:') && !m[1].startsWith('http')) unresolvedRefs.push(m[1]);
        }
      }
      // 2. {{img::name}} 스캔
      const cbsMatches = raw.match(/\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi) || [];
      for (const cbs of cbsMatches) {
        const m = cbs.match(/\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/i);
        if (m) { const resolved = resolveAssetRef(m[1].trim()); if (resolved) referencedAssets.add(resolved); else unresolvedRefs.push(m[1].trim()); }
      }
      // 3. background-image: url('assetRef') 스캔
      const bgMatches = raw.match(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/gi) || [];
      for (const bg of bgMatches) {
        const m = bg.match(/url\(['"]?([^'")]+)['"]?\)/i);
        if (m) {
          const resolved = resolveAssetRef(m[1].trim());
          if (resolved) referencedAssets.add(resolved);
          else if (!m[1].startsWith('data:') && !m[1].startsWith('http')) unresolvedRefs.push(m[1].trim());
        }
      }
      // 4. {{raw::assetName}} 스캔 (미해석 상태로 저장된 경우)
      const rawMatches = raw.match(/\{\{raw\s*::\s*([^\}]+?)\s*\}\}/gi) || [];
      for (const rm of rawMatches) {
        const m = rm.match(/\{\{raw\s*::\s*([^\}]+?)\s*\}\}/i);
        if (m) { const resolved = resolveAssetRef(m[1].trim()); if (resolved) referencedAssets.add(resolved); }
      }
      // 5. 브루트포스: 메시지 안에서 알려진 에셋명 직접 검색
      for (const assetName of Object.keys(nameKeyMap)) {
        if (assetName.length < 3) continue; // 너무 짧은 이름 제외
        if (raw.includes(assetName)) referencedAssets.add(assetName);
      }
    }
    if (unresolvedRefs.length > 0) console.log('[Mobile Log] 미해석 에셋 참조:', unresolvedRefs);
    console.log('[Mobile Log] 스캔된 에셋:', referencedAssets.size, '개', [...referencedAssets]);

    // 에셋 로드 (배치 처리, 진행률 표시)
    const assetList = [...referencedAssets];
    const BATCH = 5;
    for (let i = 0; i < assetList.length; i += BATCH) {
      if (statusCallback) statusCallback('에셋 이미지 로드 중... (' + Math.min(i + BATCH, assetList.length) + '/' + assetList.length + ')');
      const batch = assetList.slice(i, i + BATCH);
      await Promise.all(batch.map(name => {
        const key = nameKeyMap[name];
        if (!key) return Promise.resolve();
        return getAssetDataUri(key).then(uri => { if (uri) assetDataUris[name] = uri; }).catch(() => {});
      }));
      // UI 스레드 양보
      await new Promise(r => setTimeout(r, 0));
    }

    if (assetList.length > 0) console.log('[Mobile Log] ' + Object.keys(assetDataUris).length + '/' + assetList.length + '개 에셋 로드됨');

    // data URI → Risu URL 매핑 생성 (복사 시 경량화용)
    const dataUriToUrl = {};
    for (const name of Object.keys(assetDataUris)) {
      const key = nameKeyMap[name];
      const url = getAssetRisuUrl(key);
      if (url && assetDataUris[name]) {
        dataUriToUrl[assetDataUris[name]] = url;
      }
    }
    // 캐릭터 이미지 URL
    const charImageUrl = getAssetRisuUrl(metadata.charImageKey);

    return { charImageUri, charImageUrl, assetDataUris, dataUriToUrl };
  }

  // ========== 메시지 원문 → HTML 변환 ==========
  function rawToHtml(raw, assetDataUris, resolveAssetRef) {
    if (!raw) return '';
    let html = raw;

    // {{img::name}} → <img> 변환
    html = html.replace(/\{\{img\s*(?:::|[:=])\s*"?([^"\}]+?)"?\s*\}\}/gi, (match, name) => {
      const trimmed = name.trim();
      const resolved = resolveAssetRef ? resolveAssetRef(trimmed) : null;
      const uri = resolved ? assetDataUris[resolved] : (assetDataUris[trimmed] || '');
      if (uri) return '<img src="' + uri + '" style="max-width:100%;height:auto;border-radius:15px;display:block;margin:0 auto;">';
      return '';
    });

    // <img src="assetRef"> → data URI로 교체
    html = html.replace(/<img\b([^>]*)src=["']([^"']+)["']([^>]*)>/gi, (match, pre, src, post) => {
      if (src.startsWith('data:') || src.startsWith('http')) return match;
      const resolved = resolveAssetRef ? resolveAssetRef(src) : null;
      const uri = resolved ? assetDataUris[resolved] : (assetDataUris[src] || '');
      if (uri) return '<img' + pre + 'src="' + uri + '"' + post + '>';
      return match;
    });

    // background-image: url('assetRef') → data URI로 교체
    html = html.replace(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/gi, (match, src) => {
      if (src.startsWith('data:') || src.startsWith('http')) return match;
      const resolved = resolveAssetRef ? resolveAssetRef(src.trim()) : null;
      const uri = resolved ? assetDataUris[resolved] : (assetDataUris[src.trim()] || '');
      if (uri) return 'background-image: url(\'' + uri + '\')';
      return match;
    });

    // {{raw::assetName}} → data URI로 교체 (미해석 매크로)
    html = html.replace(/\{\{raw\s*::\s*([^\}]+?)\s*\}\}/gi, (match, name) => {
      const trimmed = name.trim();
      const resolved = resolveAssetRef ? resolveAssetRef(trimmed) : null;
      const uri = resolved ? assetDataUris[resolved] : (assetDataUris[trimmed] || '');
      return uri || match;
    });

    // 줄바꿈 처리: 블록 요소가 없으면 \n → <br>
    if (!/<(?:p|div|br|table|ul|ol|li|h[1-6])\b/i.test(html)) {
      html = html.replace(/\n/g, '<br>');
    }

    return html;
  }

  // ========== 로그 HTML 생성 (디자인 유지) ==========
  async function generateBasicFormatLog(messages, charInfo, settings) {
    const {
      personaName, boldQuotes, highlightQuotes, metadata, theme,
      removeImages, customHeaderImage, headerImageMode,
      useCustomColor, customThemeColor,
      emojiRemoval,
      compressImages, imageQuality, imageMaxWidth,
      archiveNumber, charSubtitle, sectionTitle, tags,
      userDisplayName, charDisplayName,
      messageFilter,
      assetDataUris, resolveAssetRef
    } = settings;

    const compressOptions = compressImages ? { enabled: true, maxWidth: imageMaxWidth || 800, quality: imageQuality || 70 } : null;
    const color = { ...(COLORS[theme] || COLORS.light) };

    if (useCustomColor && customThemeColor) {
      color.accentColor = customThemeColor;
      color.nameColor = customThemeColor;
      color.quoteBg = hexToRgba(customThemeColor, 0.25);
      color.quoteColor = customThemeColor;
      color.pointColor = customThemeColor;
    } else {
      color.pointColor = color.accentColor;
    }

    const highlightBgColor = highlightQuotes ? color.quoteBg : '';
    const highlightTextColor = highlightQuotes ? color.quoteColor : '';
    const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    const effectiveCompressOptions = compressOptions || { enabled: true, maxWidth: 800, quality: 70 };

    // 헤더 이미지 준비
    let headerImageSrc = EMPTY_IMAGE;
    let useImagePlaceholder = false;
    const imgMode = headerImageMode || 'normal';
    if (!removeImages) {
      if (imgMode === 'placeholder') {
        useImagePlaceholder = true;
      } else if (customHeaderImage) {
        if (customHeaderImage.startsWith('data:') && customHeaderImage.length > 500000) {
          headerImageSrc = await compressImage(customHeaderImage, effectiveCompressOptions.maxWidth, effectiveCompressOptions.quality);
        } else {
          headerImageSrc = customHeaderImage;
        }
      } else if (charInfo.charImageUri) {
        headerImageSrc = charInfo.charImageUri;
        if (effectiveCompressOptions.enabled && headerImageSrc.length > 500000) {
          headerImageSrc = await compressImage(headerImageSrc, effectiveCompressOptions.maxWidth, effectiveCompressOptions.quality);
        }
      }
    }

    // 태그 HTML
    let tagsArray = tags || ['Bot', 'Model', 'Prompt'];
    if (metadata && metadata.show) {
      const newTags = [];
      const modelText = metadata.model === 'custom' ? metadata.customModel : metadata.model;
      const promptText = metadata.prompt === 'custom' ? metadata.customPrompt : metadata.prompt;
      if (modelText) newTags.push(modelText);
      if (promptText) newTags.push(promptText);
      tagsArray.forEach(t => {
        if (t !== 'Model' && t !== 'Prompt' && t !== 'Bot' && !newTags.includes(t)) newTags.push(t);
      });
      if (newTags.length > 0) tagsArray = newTags;
    }
    const tagsHtml = tagsArray.map(tag =>
      '<span style="display:inline-block;background:' + hexToRgba(color.pointColor, 0.1) + ';color:' + color.pointColor + ';padding:clamp(5px,1vw,7px) clamp(12px,2.5vw,16px);margin:0 clamp(6px,1.2vw,8px) clamp(6px,1.2vw,8px) 0;border:1px solid ' + hexToRgba(color.pointColor, 0.3) + ';border-radius:20px;font-size:clamp(10px,1.8vw,11px);font-family:\'Noto Serif KR\',serif;">' + tag + '</span>'
    ).join(' ');

    // === 인트로 헤더 ===
    const wrapperStyle = 'width:100%;max-width:100%;overflow:hidden;box-sizing:border-box;word-break:break-word;';
    const containerStyle = 'box-sizing:border-box;max-width:100%;box-shadow:' + color.shadow + ';margin:10px auto;border-radius:16px;background-color:' + color.background + ';padding:0;font-family:\'Noto Serif KR\',serif;font-size:clamp(13px,2.3vw,14.2px);overflow:hidden;border:1px solid ' + color.border + ';';
    let introHtml = '';

    if (useImagePlaceholder) {
      // 플레이스홀더 모드: 이미지 없이 작은 여백만
      introHtml = '\n<div style="' + wrapperStyle + '">\n<div style="' + containerStyle + '">\n    <div style="width:100%;max-width:100%;box-sizing:border-box;">\n        <div style="width:100%;max-width:100%;min-height:220px;display:table;background-color:' + color.background + ';">\n            <div style="display:table-cell;vertical-align:middle;width:100%;padding:clamp(50px,9vw,75px) clamp(28px,5vw,42px);box-sizing:border-box;text-align:center;">\n                <div style="margin:0 0 clamp(20px,4vw,30px) 0;font-size:clamp(10px,1.8vw,12px);color:' + color.pointColor + ';letter-spacing:12px;">&bull; &bull; &bull;</div>\n                <h1 style="font-size:clamp(42px,9vw,72px);color:' + color.pointColor + ';margin:0 0 clamp(14px,2.5vw,22px) 0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.0;letter-spacing:-1px;word-break:break-word;">' + charInfo.charName + '</h1>\n                <div style="font-size:clamp(13px,2.3vw,15px);letter-spacing:0.3px;color:' + color.textSecondary + ';margin:0 auto clamp(24px,5vw,36px) auto;font-family:\'Noto Serif KR\',serif;line-height:1.7;max-width:85%;word-break:break-word;">' + (charSubtitle || '') + '</div>\n                <div style="font-size:0;padding-top:clamp(20px,4vw,30px);border-top:1px solid ' + color.border + ';">' + tagsHtml + '</div>\n            </div>\n        </div>\n    </div>\n</div>\n</div>';
    } else if (headerImageSrc && headerImageSrc !== EMPTY_IMAGE) {
      introHtml = '\n<div style="' + wrapperStyle + '">\n<div style="' + containerStyle + '">\n    <div style="width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;">\n        <img src="' + headerImageSrc + '" style="width:100%;max-width:100%;height:auto;max-height:50vh;object-fit:cover;object-position:center;display:block;margin:0;">\n        <div style="background-color:' + color.background + ';padding:clamp(36px,7vw,54px) clamp(28px,5vw,42px) clamp(32px,6vw,48px) clamp(28px,5vw,42px);max-width:100%;box-sizing:border-box;">\n            <div style="text-align:center;margin:0 0 clamp(20px,4vw,30px) 0;font-size:clamp(10px,1.8vw,12px);color:' + color.pointColor + ';letter-spacing:12px;">&bull; &bull; &bull;</div>\n            <h1 style="font-size:clamp(42px,9vw,72px);color:' + color.pointColor + ';margin:0 0 clamp(14px,2.5vw,22px) 0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.0;letter-spacing:-1px;text-align:center;word-break:break-word;">' + charInfo.charName + '</h1>\n            <div style="font-size:clamp(13px,2.3vw,15px);letter-spacing:0.3px;color:' + color.textSecondary + ';margin:0 auto clamp(24px,5vw,36px) auto;font-family:\'Noto Serif KR\',serif;line-height:1.7;text-align:center;max-width:85%;word-break:break-word;">' + (charSubtitle || '') + '</div>\n            <div style="text-align:center;font-size:0;padding-top:clamp(20px,4vw,30px);border-top:1px solid ' + color.border + ';">' + tagsHtml + '</div>\n        </div>\n    </div>\n</div>\n</div>';
    } else {
      introHtml = '\n<div style="' + wrapperStyle + '">\n<div style="' + containerStyle + '">\n    <div style="width:100%;max-width:100%;box-sizing:border-box;">\n        <div style="width:100%;max-width:100%;min-height:220px;display:table;background-color:' + color.background + ';">\n            <div style="display:table-cell;vertical-align:middle;width:100%;padding:clamp(50px,9vw,75px) clamp(28px,5vw,42px);box-sizing:border-box;text-align:center;">\n                <div style="margin:0 0 clamp(20px,4vw,30px) 0;font-size:clamp(10px,1.8vw,12px);color:' + color.pointColor + ';letter-spacing:12px;">&bull; &bull; &bull;</div>\n                <h1 style="font-size:clamp(42px,9vw,72px);color:' + color.pointColor + ';margin:0 0 clamp(14px,2.5vw,22px) 0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.0;letter-spacing:-1px;word-break:break-word;">' + charInfo.charName + '</h1>\n                <div style="font-size:clamp(13px,2.3vw,15px);letter-spacing:0.3px;color:' + color.textSecondary + ';margin:0 auto clamp(24px,5vw,36px) auto;font-family:\'Noto Serif KR\',serif;line-height:1.7;max-width:85%;word-break:break-word;">' + (charSubtitle || '') + '</div>\n                <div style="font-size:0;padding-top:clamp(20px,4vw,30px);border-top:1px solid ' + color.border + ';">' + tagsHtml + '</div>\n            </div>\n        </div>\n    </div>\n</div>\n</div>';
    }

    // === 메시지 로그 생성 ===
    let messagesHtml = '';
    let messageIndex = 1;
    let originalIndex = 0;
    let translationStats = { found: 0, missed: 0, methods: {} };

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      let name = msg.name;
      const isUser = msg.role === 'user';
      let rawContent = msg.data;

      originalIndex++;
      if (messageFilter === 'odd' && originalIndex % 2 === 0) continue;
      if (messageFilter === 'even' && originalIndex % 2 === 1) continue;

      // 번역 캐시 조회
      if (useTranslation && rawContent.trim()) {
        const tr = await findTranslationFromCache(rawContent);
        if (tr.found && tr.translation) {
          rawContent = tr.translation;
          translationStats.found++;
          const m = tr.method || 'unknown';
          translationStats.methods[m] = (translationStats.methods[m] || 0) + 1;
        } else {
          translationStats.missed++;
          if (translationStats.missed <= 3) {
            console.log('[Mobile Log] 번역 미발견 #' + originalIndex + ' reason=' + (tr.reason || '?') + ' 원문=' + rawContent.substring(0, 60) + '...');
          }
        }
      }

      // 원문 → HTML 변환
      let messageHtml = rawToHtml(rawContent, assetDataUris || {}, resolveAssetRef);

      // 임시 DOM으로 정리 (iframe 내 document 사용)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = messageHtml;

      // 불필요 요소 제거
      tempDiv.querySelectorAll('script, style, .shadow-lg.rounded-md').forEach(el => el.remove());

      if (removeImages) {
        tempDiv.querySelectorAll('img, bimg, [style*="background-image"]').forEach(el => el.remove());
      } else {
        // 인라인 이미지 처리: 외부 URL → base64 변환
        const imgPromises = [];
        tempDiv.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:') && src.startsWith('http')) {
            imgPromises.push((async () => {
              try {
                const base64 = await imageUrlToBase64(src, effectiveCompressOptions);
                if (base64) img.src = base64;
              } catch (e) {}
            })());
          }
          // 스타일 통일
          if (img.parentNode) {
            img.setAttribute('style', 'max-width:100%!important;height:auto!important;border-radius:15px;display:block;margin:0 auto;');
            img.removeAttribute('width');
            img.removeAttribute('height');
          }
        });
        // bimg 태그 처리
        tempDiv.querySelectorAll('bimg').forEach(bimg => {
          const imgSrc = bimg.getAttribute('src') || bimg.getAttribute('img');
          if (imgSrc) {
            const resolved = resolveAssetRef ? resolveAssetRef(imgSrc) : null;
            const uri = resolved ? (assetDataUris || {})[resolved] : '';
            if (uri) {
              const img = document.createElement('img');
              img.src = uri;
              img.setAttribute('style', 'max-width:100%!important;height:auto!important;border-radius:15px;display:block;margin:0 auto;');
              bimg.parentNode.replaceChild(img, bimg);
            }
          }
        });
        if (imgPromises.length > 0) await Promise.all(imgPromises);
      }

      messageHtml = tempDiv.innerHTML.trim();
      messageHtml = removeEmojis(messageHtml, emojiRemoval || 'none');

      // 빈 태그 제거 및 정리
      messageHtml = messageHtml.replace(/<div[^>]*background-image[^>]*>[\s\S]*?<\/div>/gi, '');
      messageHtml = messageHtml.replace(/<div[^>]*shadow-lg[^>]*>[\s\S]*?<\/div>/gi, '');
      let prevHtml = '';
      let iterations = 0;
      while (prevHtml !== messageHtml && iterations < 5) {
        prevHtml = messageHtml;
        messageHtml = messageHtml.replace(/<(div|p|span|section|article|aside|header|footer|figure|figcaption|main|nav|ul|ol|li)[^>]*>\s*<\/\1>/gi, '');
        iterations++;
      }
      messageHtml = messageHtml.replace(/(<br\s*\/?>\s*){4,}/gi, '<br><br>');
      messageHtml = messageHtml.replace(/^(<br\s*\/?>)+/gi, '');
      messageHtml = messageHtml.replace(/(<br\s*\/?>)+$/gi, '');

      // 텍스트 처리
      if (boldQuotes) {
        messageHtml = processBoldQuotes(messageHtml, highlightBgColor, highlightTextColor);
      }
      messageHtml = processItalicHighlight(messageHtml);
      if (personaName) {
        messageHtml = replacePersonaName(messageHtml, personaName);
        name = replacePersonaName(name, personaName);
      }

      // img max-width 강제
      messageHtml = messageHtml.replace(/<img([^>]*)>/gi, (match, attrs) => {
        if (attrs.includes('max-width')) return match;
        if (attrs.includes('style=')) {
          return match.replace(/style="([^"]*)"/i, 'style="$1;max-width:100%;height:auto;"');
        }
        return '<img style="max-width:100%;height:auto;"' + attrs + '>';
      });

      const textContent = messageHtml.replace(/<[^>]*>/g, '').trim();
      const hasImage = messageHtml.includes('<img');
      if (textContent.length === 0 && !hasImage) continue;

      const displayName = isUser ? (userDisplayName || '{{user}}') : (charDisplayName || charInfo.charName);
      const dividerHtml = '<div style="width:30%;max-width:100%;height:1px;background-color:' + color.border + ';margin:25px auto;"></div>';

      // 본문 포맷팅 - 아카라이브 호환
      let processedContent = messageHtml;
      if (/<\/p>/i.test(processedContent)) {
        processedContent = processedContent.replace(/<\/p>\s*<p>(?!\s*<br\s*\/?\s*>)/gi, '</p>\n<p><br></p>\n<p>');
        processedContent = processedContent.replace(/(<\/p>)\s*(<img)/gi, '$1\n<p><br></p>\n$2');
        processedContent = processedContent.replace(/(<img[^>]*>)\s*(<p>)/gi, '$1\n<p><br></p>\n$2');
        processedContent = processedContent.replace(/(<img[^>]*>)\s*(<img)/gi, '$1\n<p><br></p>\n$2');
        processedContent = processedContent.replace(/(<\/div>)\s*<p>(?!\s*<br\s*\/?\s*>)/gi, '$1\n<p><br></p>\n<p>');
      } else {
        const segments = processedContent.split(/<br\s*\/?>/gi);
        processedContent = '';
        for (let si = 0; si < segments.length; si++) {
          const trimmed = segments[si].trim();
          if (!trimmed) {
            processedContent += '<p><br></p>\n';
          } else if (trimmed.match(/^<img[^>]*>$/i)) {
            processedContent += '<p><br></p>\n<div>' + trimmed + '</div>\n<p><br></p>\n';
          } else if (trimmed.includes('<img')) {
            processedContent += '<p><br></p>\n<div>' + trimmed + '</div>\n<p><br></p>\n';
          } else {
            processedContent += '<p>' + trimmed + '</p>\n<p><br></p>\n';
          }
        }
        processedContent = processedContent.replace(/<p><br><\/p>\s*$/, '');
      }

      const formattedContent = '<div style="margin:0 0 20px;color:' + color.text + ';line-height:2.1;letter-spacing:-0.3px;font-size:14.5px;max-width:100%;word-break:break-word;">' + processedContent + '</div>';

      messagesHtml += '\n<div style="margin:0;max-width:100%;overflow:hidden;box-sizing:border-box;">\n    <div style="width:100%;max-width:100%;display:table;box-sizing:border-box;">\n        <div style="display:table-row;">\n            <div style="display:table-cell;vertical-align:middle;">\n                <div style="display:table;width:100%;max-width:100%;padding:clamp(15px,3vw,20px) 0;box-sizing:border-box;">\n                    <div style="display:table-cell;width:clamp(70px,15vw,100px);vertical-align:middle;padding-left:clamp(30px,5vw,50px);padding-right:clamp(20px,3vw,30px);">\n                        <div style="font-size:clamp(32px,7vw,48px);font-weight:700;color:' + color.pointColor + ';font-family:\'Noto Serif KR\',serif;line-height:1;">' + messageIndex + '</div>\n                    </div>\n                    <div style="display:table-cell;vertical-align:middle;padding-top:0;word-break:break-word;">\n                        <div style="font-size:clamp(14px,2.5vw,16px);font-weight:700;color:' + color.pointColor + ';font-family:\'Noto Serif KR\',serif;line-height:1.3;word-break:break-word;">' + displayName + '</div>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div style="padding:clamp(15px,3vw,20px) clamp(30px,5vw,50px);max-width:100%;box-sizing:border-box;overflow:hidden;word-break:break-word;">\n        ' + dividerHtml + '\n        ' + formattedContent + '\n        ' + dividerHtml + '\n    </div>\n</div>';

      messageIndex++;
    }

    if (useTranslation) {
      const methodStr = Object.entries(translationStats.methods).map(([k,v]) => k + ':' + v).join(', ');
      console.log('[Mobile Log] 번역 캐시 결과 - 번역됨: ' + translationStats.found + ' (' + (methodStr || 'none') + '), 미번역: ' + translationStats.missed);
    }

    // === 섹션 헤더 ===
    let sectionHeaderHtml = '';
    if (useImagePlaceholder) {
      // 플레이스홀더 모드: 이미지 없이 텍스트만
      sectionHeaderHtml = '\n<div style="width:100%;max-width:100%;min-height:100px;display:table;background-color:' + color.background + ';margin-bottom:clamp(20px,4vw,30px);box-sizing:border-box;text-align:center;border-bottom:1px solid ' + color.border + ';">\n    <div style="display:table-cell;vertical-align:middle;padding:clamp(36px,7vw,54px) clamp(28px,5vw,42px);">\n        <div style="margin:0 0 clamp(12px,2vw,18px) 0;font-size:clamp(8px,1.5vw,10px);color:' + color.pointColor + ';letter-spacing:10px;">&bull; &bull; &bull;</div>\n        <span style="display:block;font-size:clamp(11px,2vw,13px);letter-spacing:clamp(1px,0.3vw,2px);color:' + color.textSecondary + ';margin:0 0 clamp(10px,2vw,14px) 0;font-family:\'Noto Serif KR\',serif;">' + charInfo.chatName + '</span>\n        <h1 style="display:block;font-size:clamp(32px,7vw,52px);color:' + color.pointColor + ';margin:0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.1;letter-spacing:-0.5px;">' + (sectionTitle || 'Story') + '</h1>\n    </div>\n</div>';
    } else if (headerImageSrc && headerImageSrc !== EMPTY_IMAGE) {
      sectionHeaderHtml = '\n<div style="width:100%;max-width:100%;overflow:hidden;margin-bottom:clamp(20px,4vw,30px);border-bottom:1px solid ' + color.border + ';box-sizing:border-box;">\n    <img src="' + headerImageSrc + '" style="width:100%;max-width:100%;height:auto;max-height:35vh;object-fit:cover;object-position:center;display:block;margin:0;">\n    <div style="background-color:' + color.background + ';padding:clamp(32px,6vw,48px) clamp(28px,5vw,42px);text-align:center;max-width:100%;box-sizing:border-box;">\n        <div style="margin:0 0 clamp(12px,2vw,18px) 0;font-size:clamp(8px,1.5vw,10px);color:' + color.pointColor + ';letter-spacing:10px;">&bull; &bull; &bull;</div>\n        <span style="display:block;font-size:clamp(11px,2vw,13px);letter-spacing:clamp(1px,0.3vw,2px);color:' + color.textSecondary + ';margin:0 0 clamp(10px,2vw,14px) 0;font-family:\'Noto Serif KR\',serif;word-break:break-word;">' + charInfo.chatName + '</span>\n        <h1 style="display:block;font-size:clamp(32px,7vw,52px);color:' + color.pointColor + ';margin:0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.1;letter-spacing:-0.5px;word-break:break-word;">' + (sectionTitle || 'Story') + '</h1>\n    </div>\n</div>';
    } else {
      sectionHeaderHtml = '\n<div style="width:100%;max-width:100%;min-height:100px;display:table;background-color:' + color.background + ';margin-bottom:clamp(20px,4vw,30px);box-sizing:border-box;text-align:center;border-bottom:1px solid ' + color.border + ';">\n    <div style="display:table-cell;vertical-align:middle;padding:clamp(36px,7vw,54px) clamp(28px,5vw,42px);">\n        <div style="margin:0 0 clamp(12px,2vw,18px) 0;font-size:clamp(8px,1.5vw,10px);color:' + color.pointColor + ';letter-spacing:10px;">&bull; &bull; &bull;</div>\n        <span style="display:block;font-size:clamp(11px,2vw,13px);letter-spacing:clamp(1px,0.3vw,2px);color:' + color.textSecondary + ';margin:0 0 clamp(10px,2vw,14px) 0;font-family:\'Noto Serif KR\',serif;">' + charInfo.chatName + '</span>\n        <h1 style="display:block;font-size:clamp(32px,7vw,52px);color:' + color.pointColor + ';margin:0;font-family:\'Noto Serif KR\',serif;font-weight:700;line-height:1.1;letter-spacing:-0.5px;">' + (sectionTitle || 'Story') + '</h1>\n    </div>\n</div>';
    }

    // === 최종 조합 ===
    const creditHtml = '<div style="text-align:center;padding:clamp(15px,3vw,20px) 0;font-size:clamp(9px,1.5vw,10px);color:#999999;max-width:100%;margin:0 auto;">Template by <a href="https://arca.live/b/characterai/154043179" style="color:#999999;text-decoration:none;">Mobile Log Plugin</a> | Design by <a href="https://arca.live/b/characterai/161701867" style="color:#999999;text-decoration:none;">Log Diary</a></div>';

    const messagesSection = '\n<br>\n<div style="' + wrapperStyle + '">\n<div style="' + containerStyle + 'padding:0 0 clamp(20px,4vw,30px) 0;">\n    ' + sectionHeaderHtml + '\n    ' + messagesHtml + '\n</div>\n</div>\n<br>\n' + creditHtml;

    return { html: introHtml + messagesSection, translationStats: useTranslation ? translationStats : null };
  }

  // ========== 클립보드 ==========
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Android/Galaxy: DOM 렌더 → Selection + execCommand 동기 복사
  function copyHtmlViaDOM(html) {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    const range = document.createRange();
    range.selectNodeContents(wrap);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {
      console.log('[Mobile Log] execCommand copy 예외:', e);
    }
    sel.removeAllRanges();
    document.body.removeChild(wrap);
    if (!ok) {
      // execCommand 실패 시 Clipboard API 폴백
      try { navigator.clipboard.writeText(html); } catch (e2) {}
    }
    console.log('[Mobile Log] copyHtmlViaDOM 결과:', ok, 'HTML 크기:', Math.round(html.length / 1024) + 'KB');
    return ok;
  }

  // iOS: Clipboard API + Blob
  async function copyHtmlViaClipboardAPI(html) {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([html], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })
      ]);
      return true;
    } catch (e) {
      try { await navigator.clipboard.writeText(html); return true; } catch (e2) {}
    }
    return false;
  }

  // 통합 HTML 복사: iOS → Clipboard API, Android → DOM 방식
  async function copyToClipboard(content, format) {
    if (format === 'html') {
      if (isIOS) {
        return await copyHtmlViaClipboardAPI(content);
      } else {
        return copyHtmlViaDOM(content);
      }
    }
    // 텍스트 복사
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  // ========== UI 구성 (iframe 내부) ==========
  function setupUI() {
    // CSS
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: transparent; }
      .ml-overlay { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10001; overflow-y:auto; }
      .ml-modal { background:#fff; color:#212529; border-radius:10px; width:90%; max-width:900px; margin:20px auto; display:flex; flex-direction:column; box-shadow:0 5px 15px rgba(0,0,0,0.3); max-height:calc(100vh - 40px); }
      .ml-header { padding:20px; border-bottom:1px solid #dee2e6; display:flex; justify-content:space-between; align-items:center; }
      .ml-header h2 { margin:0; font-size:1.5em; }
      .ml-close { background:none; border:none; font-size:1.5em; cursor:pointer; color:#6c757d; }
      .ml-close:hover { color:#212529; }
      .ml-content { padding:20px; overflow-y:auto; flex-grow:1; }
      .ml-opt-group { margin-bottom:20px; padding:15px; background:#f8f9fa; border-radius:8px; }
      .ml-opt-group label { display:block; margin-bottom:8px; font-weight:500; }
      .ml-opt-group input[type="text"] { width:100%; padding:8px; border:1px solid #dee2e6; border-radius:4px; font-size:1em; }
      .ml-opt-group input[type="checkbox"] { margin-right:8px; }
      .ml-preview { background:#fff; border:1px solid #dee2e6; border-radius:5px; padding:15px; max-height:400px; overflow-y:auto; overflow-x:hidden; }
      .ml-preview img { max-width:100%!important; width:auto!important; height:auto!important; object-fit:contain; }
      .ml-preview[contenteditable="true"] { border:2px dashed #0066cc!important; background:#f8f9ff; }
      .ml-footer { padding:20px; border-top:1px solid #dee2e6; display:flex; justify-content:flex-end; gap:10px; }
      .ml-btn { background:#0066cc; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-size:1em; }
      .ml-btn:hover { background:#0052a3; }
      .ml-btn.secondary { background:#6c757d; }
      .ml-btn.secondary:hover { background:#5a6268; }
      .ml-btn.danger { background:#dc3545; }
      .ml-btn.danger:hover { background:#c82333; }
      details summary { cursor:pointer; font-weight:600; padding:12px 16px; background:#f8f9fa; border-radius:8px; list-style:none; user-select:none; transition:background 0.2s; }
      details summary::-webkit-details-marker { display:none; }
      details summary:hover { background:#e9ecef; }
      details summary::before { content:'▶'; display:inline-block; margin-right:8px; transition:transform 0.2s; }
      details[open] summary::before { transform:rotate(90deg); }
      details[open] summary { border-radius:8px 8px 0 0; }
      .header-image-upload-btn { display:inline-block; padding:8px 16px; background:#0066cc; color:#fff; border-radius:5px; cursor:pointer; font-size:0.9em; transition:background 0.2s; }
      .header-image-upload-btn:hover { background:#0052a3; }
      input[type="color"] { -webkit-appearance:none; border:none; width:32px; height:32px; border-radius:4px; cursor:pointer; padding:0; vertical-align:middle; }
      input[type="color"]::-webkit-color-swatch-wrapper { padding:0; }
      input[type="color"]::-webkit-color-swatch { border:1px solid #dee2e6; border-radius:4px; }
    `;
    document.head.appendChild(style);

    // Overlay (hidden initially)
    const overlay = document.createElement('div');
    overlay.className = 'ml-overlay';
    overlay.id = 'ml-overlay';
    overlay.innerHTML = `
      <div class="ml-modal">
        <div class="ml-header">
          <h2>📋 로그 내보내기 (Log Diary Style)</h2>
          <button class="ml-close" id="ml-close-x">&times;</button>
        </div>
        <div class="ml-content">
          <details id="options-details">
            <summary>⚙️ 옵션</summary>
            <div style="padding:12px 8px;">
              <div class="ml-opt-group">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <select id="theme-select" style="flex:1;min-width:100px;padding:8px;border:1px solid #dee2e6;border-radius:6px;">
                    <option value="light">🌞 라이트</option>
                    <option value="dark">🌙 다크</option>
                  </select>
                  <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
                    <input type="checkbox" id="use-custom-color">
                    <input type="color" id="custom-theme-color" value="#162a3e" style="width:28px;height:28px;">
                  </label>
                </div>
              </div>
              <div class="ml-opt-group">
                <label style="font-size:0.9em;margin-bottom:8px;display:block;font-weight:600;">📝 인트로 설정</label>
                <div style="display:grid;gap:8px;">
                  <div style="display:flex;gap:8px;align-items:center;">
                    <label style="font-size:0.85em;width:80px;">아카이브 No.</label>
                    <input type="text" id="archive-number" value="001" placeholder="001" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <label style="font-size:0.85em;width:80px;">캐릭터 설명</label>
                    <input type="text" id="char-subtitle" value="" placeholder="예: 귀여운 고양이 메이드" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <label style="font-size:0.85em;width:80px;">섹션 제목</label>
                    <input type="text" id="section-title" value="Story" placeholder="Story" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <label style="font-size:0.85em;width:80px;">메시지 필터</label>
                    <select id="message-filter" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                      <option value="all">전체 메시지</option>
                      <option value="odd">홀수번 메시지만 (1, 3, 5...)</option>
                      <option value="even">짝수번 메시지만 (2, 4, 6...)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="ml-opt-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                  <input type="checkbox" id="bold-quotes" checked> 따옴표 볼드
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;" title="대사(따옴표) 부분에 배경색 하이라이트 적용">
                  <input type="checkbox" id="highlight-quotes" checked> 🖍️ 대사 하이라이트
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                  <input type="checkbox" id="remove-images"> 이미지 제거
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;" title="아카라이브 등에서 복합 이모지가 포함되면 글이 올라가지 않는 문제 방지">
                  이모지 제거
                  <select id="emoji-removal" style="flex:1;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:0.9em;">
                    <option value="none">없음</option>
                    <option value="zwj">복합 이모지만 (아카라이브용)</option>
                    <option value="all">모든 이모지</option>
                  </select>
                </label>
              </div>
              <div class="ml-opt-group" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                  <input type="checkbox" id="use-translation"> 🌐 번역문 사용
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                  <input type="checkbox" id="compress-images" checked> 🗜️ 이미지 압축
                </label>
              </div>
              <div id="compress-options" style="padding:10px;background:#f0f0f0;border-radius:6px;margin-bottom:15px;">
                <div style="margin-bottom:8px;">
                  <label style="font-size:0.85em;">품질: <span id="quality-value">70</span>%</label>
                  <input type="range" id="image-quality" min="10" max="100" step="5" value="70" style="width:100%;">
                </div>
                <div>
                  <label style="font-size:0.85em;">최대너비: <span id="width-value">800</span>px</label>
                  <input type="range" id="image-max-width" min="200" max="1600" step="100" value="800" style="width:100%;">
                </div>
              </div>
              <div class="ml-opt-group">
                <label style="font-size:0.9em;margin-bottom:6px;display:block;">🖼️ 커스텀 헤더</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                  <label class="header-image-upload-btn" style="flex:1;text-align:center;padding:8px;">
                    📷 선택
                    <input type="file" id="header-image-input" accept="image/*" style="display:none;">
                  </label>
                  <button class="ml-btn danger" id="remove-header-image" style="padding:8px 12px;font-size:0.85em;display:none;">🗑️</button>
                </div>
                <select id="header-image-mode" style="width:100%;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.85em;margin-bottom:8px;">
                  <option value="normal">이미지 포함 (기본)</option>
                  <option value="placeholder">이미지 제외 (복사 시 빈 공간)</option>
                </select>
                <div id="header-image-preview-wrap" style="margin-top:0;display:none;">
                  <img id="header-image-preview" style="max-width:100%;max-height:150px;border-radius:8px;border:2px solid #dee2e6;">
                </div>
              </div>
              <div class="ml-opt-group">
                <label style="font-size:0.9em;margin-bottom:6px;display:block;">👤 페르소나 이름 → {{user}}</label>
                <div style="display:flex;gap:6px;">
                  <input type="text" id="persona-name" placeholder="이름 입력 후 엔터 (자동 감지됨)" style="flex:1;">
                  <button id="persona-apply" class="ml-btn" style="padding:8px 12px;font-size:0.85em;">적용</button>
                </div>
              </div>
              <div class="ml-opt-group">
                <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                  <input type="checkbox" id="metadata-toggle"> 📝 모델/프롬프트 표시
                </label>
                <div id="metadata-inputs" style="margin-top:10px;display:none;">
                  <select id="model-select" style="width:100%;padding:6px;border:1px solid #dee2e6;border-radius:4px;margin-bottom:6px;">
                    <option value="">모델 선택</option>
                    <option value="Gemini 3.1 Pro">Gemini 3.1 Pro</option>
                    <option value="Gemini 3.0">Gemini 3.0</option>
                    <option value="Gemini 2.5">Gemini 2.5</option>
                    <option value="Opus 4.6">Opus 4.6</option>
                    <option value="Opus 4.5">Opus 4.5</option>
                    <option value="Sonnet 4.5">Sonnet 4.5</option>
                    <option value="GPT 5.1">GPT 5.1</option>
                    <option value="custom">직접 입력</option>
                  </select>
                  <input type="text" id="custom-model" placeholder="모델명 입력 후 엔터" style="width:100%;padding:6px;border:1px solid #dee2e6;border-radius:4px;margin-bottom:6px;display:none;">
                  <select id="prompt-select" style="width:100%;padding:6px;border:1px solid #dee2e6;border-radius:4px;margin-bottom:6px;">
                    <option value="">프롬프트 선택</option>
                    <option value="소악마">소악마</option>
                    <option value="마나젬">마나젬</option>
                    <option value="마마젬">마마젬</option>
                    <option value="누렁이">누렁이</option>
                    <option value="컵케익">컵케익</option>
                    <option value="custom">직접 입력</option>
                  </select>
                  <input type="text" id="custom-prompt" placeholder="프롬프트명 입력 후 엔터" style="width:100%;padding:6px;border:1px solid #dee2e6;border-radius:4px;display:none;">
                </div>
              </div>
            </div>
          </details>
          <div class="ml-opt-group" style="margin-top:12px;">
            <label style="font-weight:600;margin-bottom:10px;display:block;">📊 메시지 범위 <span id="msg-count" style="font-weight:normal;font-size:0.85em;color:#6c757d;"></span></label>
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <button class="ml-btn" id="mode-range-btn" style="flex:1;padding:8px;font-size:0.85em;background:#6c757d;">📐 범위 지정</button>
              <button class="ml-btn" id="mode-recent-btn" style="flex:1;padding:8px;font-size:0.85em;">🕐 최근 N개</button>
            </div>
            <div id="range-mode-panel" style="display:none;">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:120px;">
                  <label style="font-size:0.85em;white-space:nowrap;">시작</label>
                  <input type="number" id="range-start" value="1" min="1" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                </div>
                <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:120px;">
                  <label style="font-size:0.85em;white-space:nowrap;">끝</label>
                  <input type="number" id="range-end" value="20" min="1" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
                </div>
              </div>
            </div>
            <div id="recent-mode-panel" style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
              <label style="font-size:0.85em;white-space:nowrap;">최근</label>
              <input type="number" id="recent-n" value="1" min="1" style="flex:1;padding:6px;border:1px solid #dee2e6;border-radius:4px;font-size:0.9em;">
              <label style="font-size:0.85em;white-space:nowrap;">개</label>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;">
                <input type="checkbox" id="bot-only-toggle"> 🤖 봇 채팅만 표시
              </label>
              <button class="ml-btn" id="ml-generate-btn" style="margin-left:auto;padding:8px 16px;font-size:0.9em;white-space:nowrap;">🔄 생성</button>
            </div>
            <div style="font-size:0.8em;color:#6c757d;margin-bottom:10px;" id="range-hint">범위를 지정하고 '생성' 버튼을 누르세요.</div>
          </div>
          <div class="ml-opt-group" style="margin-top:0;">
            <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;">미리보기</span>
              <label style="font-weight:normal;font-size:0.85em;display:flex;align-items:center;gap:4px;">
                <input type="checkbox" id="editable-toggle"> 편집 모드
              </label>
            </label>
            <div class="ml-preview" id="preview-container" contenteditable="false">
              <div style="text-align:center;color:#6c757d;padding:30px;">범위를 지정하고 🔄 생성 버튼을 누르세요.</div>
            </div>
          </div>
        </div>
        <div class="ml-footer">
          <button class="ml-btn secondary" id="ml-close-btn">닫기</button>
          <button class="ml-btn" id="ml-copy-btn" disabled style="opacity:0.5;">복사하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // ========== 닫기 버튼 즉시 연결 (setupUI 시점) ==========
    const closeHandler = async () => {
      overlay.style.display = 'none';
      isGenerating = false;
      try { await Risuai.hideContainer(); } catch (e) {}
    };
    document.getElementById('ml-close-x').onclick = closeHandler;
    document.getElementById('ml-close-btn').onclick = closeHandler;
    // 복사 버튼 (항상 동작, 미리보기 내용 복사)
    document.getElementById('ml-copy-btn').onclick = async () => {
      const previewEl = document.getElementById('preview-container');
      let content = previewEl.innerHTML;
      if (!content || content.includes('버튼을 누르세요') || content.includes('로드 중')) {
        return;
      }

      // base64 data URI → Risu URL로 치환하여 경량화
      const copyContent = (function lightweightHtml(html) {
        let result = html;
        // 캐시된 dataUri→URL 매핑 적용 (lastAssetData에서)
        if (window._mlLastDataUriToUrl) {
          for (const [dataUri, url] of Object.entries(window._mlLastDataUriToUrl)) {
            if (url) result = result.split(dataUri).join(url);
          }
        }
        if (window._mlLastCharImageUrl && window._mlLastCharImageUri) {
          result = result.split(window._mlLastCharImageUri).join(window._mlLastCharImageUrl);
        }
        // 남은 base64 제거 (매핑 없는 이미지)
        result = result.replace(/src="data:image\/[^"]{1000,}"/gi, 'src=""');
        result = result.replace(/url\(['"]?data:image\/[^)]{1000,}\)/gi, 'url()');
        return result;
      })(content);

      console.log('[Mobile Log] 복사 시도, 원본:', Math.round(content.length / 1024) + 'KB → 경량:', Math.round(copyContent.length / 1024) + 'KB');
      const success = await copyToClipboard(copyContent, 'html');
      const btn = document.getElementById('ml-copy-btn');
      if (success) {
        const orig = btn.textContent;
        btn.textContent = '✓ 복사 완료!';
        btn.style.backgroundColor = '#28a745';
        setTimeout(() => { btn.textContent = orig; btn.style.backgroundColor = ''; }, 2000);
      } else {
        alert('복사에 실패했습니다.');
      }
    };
  }

  // ========== 생성 상태 ==========
  let isGenerating = false;
  let currentCustomHeaderImage = '';
  let listenersAttached = false;

  // ========== showLog: 경량 로드 + 범위 선택 UI ==========
  async function showLog() {
    const overlay = document.getElementById('ml-overlay');
    const previewEl = document.getElementById('preview-container');
    const msgCountEl = document.getElementById('msg-count');
    const rangeHint = document.getElementById('range-hint');
    const generateBtn = document.getElementById('ml-generate-btn');
    const copyBtn = document.getElementById('ml-copy-btn');
    const $ = (id) => document.getElementById(id);

    // 권한 요청 팝업이 플러그인 전체화면 모달에 가려지는 것을 방지하기 위해,
    // UI를 띄우기 전에 필요한 API들을 먼저 호출합니다.
    let savedSettings;
    try {
      // 1. 메타데이터 로드 (DB 접근 권한)
      chatData = await extractChatMetadata();
      // 2. 설정 로드 (Storage 접근 권한)
      savedSettings = await loadSettings();
    } catch (e) {
      // 에러 발생 시 UI를 띄우고 에러 메시지 표시
      overlay.style.display = 'block';
      previewEl.innerHTML = '<div style="text-align:center;color:#dc3545;padding:20px;">❌ ' + e.message + '</div>';
      console.log('[Mobile Log] 초기 데이터 로드 실패:', e);
      await Risuai.showContainer('fullscreen');
      return;
    }

    // 데이터 로드 성공 후 UI 표시
    overlay.style.display = 'block';
    copyBtn.disabled = true;
    copyBtn.style.opacity = '0.5';
    await Risuai.showContainer('fullscreen');

    const totalMsg = chatData.messages.length;
    msgCountEl.textContent = '(' + totalMsg + '개 메시지 · ' + chatData.charName + ')';

    // 범위 설정 (최대 20개 기본값)
    const defaultEnd = Math.min(totalMsg, 20);
    $('range-start').value = 1;
    $('range-start').max = totalMsg;
    $('range-end').value = defaultEnd;
    $('range-end').max = totalMsg;

    // 범위 모드 초기화
    const savedRangeMode = savedSettings.rangeMode || 'recent';
    $('recent-n').value = savedSettings.recentN || 1;
    $('bot-only-toggle').checked = savedSettings.botOnly || false;
    function setRangeMode(mode) {
      if (mode === 'range') {
        $('range-mode-panel').style.display = 'block';
        $('recent-mode-panel').style.display = 'none';
        $('mode-range-btn').style.background = '#0066cc';
        $('mode-recent-btn').style.background = '#6c757d';
      } else {
        $('range-mode-panel').style.display = 'none';
        $('recent-mode-panel').style.display = 'flex';
        $('mode-range-btn').style.background = '#6c757d';
        $('mode-recent-btn').style.background = '#0066cc';
      }
    }
    setRangeMode(savedRangeMode);
    rangeHint.textContent = '전체 ' + totalMsg + '개 메시지 중 범위를 지정하고 생성 버튼을 누르세요.';

    previewEl.innerHTML = '<div style="text-align:center;color:#6c757d;padding:30px;">범위를 지정하고 🔄 생성 버튼을 누르세요.</div>';

    // 설정 UI 반영
    const saved = savedSettings;
    $('theme-select').value = saved.theme || 'light';
    $('use-custom-color').checked = saved.useCustomColor || false;
    $('custom-theme-color').value = saved.customThemeColor || '#162a3e';
    $('archive-number').value = saved.archiveNumber || '001';
    $('char-subtitle').value = saved.charSubtitle || '';
    $('section-title').value = saved.sectionTitle || 'Story';
    $('message-filter').value = saved.messageFilter || 'all';
    $('bold-quotes').checked = saved.boldQuotes !== false;
    $('highlight-quotes').checked = saved.highlightQuotes !== false;
    $('remove-images').checked = saved.removeImages || false;
    $('emoji-removal').value = saved.emojiRemoval || 'none';
    $('use-translation').checked = saved.useTranslation || false;
    $('compress-images').checked = saved.compressImages !== false;
    $('image-quality').value = saved.imageQuality || 70;
    $('quality-value').textContent = saved.imageQuality || 70;
    $('image-max-width').value = saved.imageMaxWidth || 800;
    $('width-value').textContent = saved.imageMaxWidth || 800;
    $('compress-options').style.display = saved.compressImages !== false ? 'block' : 'none';
    $('metadata-toggle').checked = saved.showMetadata || false;
    $('metadata-inputs').style.display = saved.showMetadata ? 'block' : 'none';
    if (saved.selectedModel) {
      $('model-select').value = saved.selectedModel;
      if (saved.selectedModel === 'custom') $('custom-model').style.display = 'block';
    }
    $('custom-model').value = saved.customModel || '';
    if (saved.selectedPrompt) {
      $('prompt-select').value = saved.selectedPrompt;
      if (saved.selectedPrompt === 'custom') $('custom-prompt').style.display = 'block';
    }
    $('custom-prompt').value = saved.customPrompt || '';
    currentCustomHeaderImage = saved.customHeaderImage || '';
    $('header-image-mode').value = saved.headerImageMode || 'normal';
    if (currentCustomHeaderImage) {
      $('header-image-preview').src = currentCustomHeaderImage;
      $('header-image-preview-wrap').style.display = 'block';
      $('remove-header-image').style.display = 'inline-block';
    } else {
      $('header-image-preview-wrap').style.display = 'none';
      $('remove-header-image').style.display = 'none';
    }

    // 페르소나 자동 감지
    if (chatData.personaName && !saved.personaName) {
      $('persona-name').value = chatData.personaName;
      $('persona-name').placeholder = '자동 감지: ' + chatData.personaName;
    } else {
      $('persona-name').value = saved.personaName || '';
    }

    useTranslation = saved.useTranslation || false;

    // === 생성 함수 (범위 지정) ===
    async function generatePreview() {
      if (isGenerating || !chatData) return;
      isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.textContent = '⏳ 생성 중...';
      copyBtn.disabled = true;
      copyBtn.style.opacity = '0.5';

      // 봇 채팅만 필터링
      const botOnly = $('bot-only-toggle').checked;
      let targetMessages = chatData.messages;
      let targetTotal = totalMsg;
      if (botOnly) {
        targetMessages = chatData.messages.filter(m => m.role === 'char');
        targetTotal = targetMessages.length;
        if (targetTotal === 0) {
          previewEl.innerHTML = '<div style="text-align:center;color:#dc3545;padding:20px;">봇 메시지가 없습니다.</div>';
          isGenerating = false;
          generateBtn.disabled = false;
          generateBtn.textContent = '🔄 생성';
          return;
        }
      }

      // 모드에 따라 범위 계산
      const currentMode = $('recent-mode-panel').style.display !== 'none' ? 'recent' : 'range';
      let startVal, endVal;
      if (currentMode === 'recent') {
        const n = Math.max(1, parseInt($('recent-n').value) || 1);
        endVal = targetTotal;
        startVal = Math.max(1, targetTotal - n + 1);
      } else {
        startVal = Math.max(1, parseInt($('range-start').value) || 1);
        endVal = Math.min(targetTotal, parseInt($('range-end').value) || defaultEnd);
      }
      if (startVal > endVal) {
        previewEl.innerHTML = '<div style="text-align:center;color:#dc3545;padding:20px;">시작 번호가 끝 번호보다 큽니다.</div>';
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = '🔄 생성';
        return;
      }
      const count = endVal - startVal + 1;
      if (count > 100) {
        if (!confirm(count + '개 메시지를 생성합니다. 시간이 오래 걸릴 수 있습니다. 계속할까요?')) {
          isGenerating = false;
          generateBtn.disabled = false;
          generateBtn.textContent = '🔄 생성';
          return;
        }
      }

      const statusUpdate = (msg) => {
        previewEl.innerHTML = '<div style="text-align:center;color:#6c757d;padding:20px;">⏳ ' + msg + '</div>';
      };
      statusUpdate('에셋 이미지 로드 중...');
      await new Promise(r => setTimeout(r, 30));

      try {
        // 선택 범위의 에셋만 로드 (봇 필터 적용된 메시지 기준)
        const slicedMessages = targetMessages.slice(startVal - 1, endVal);

        // 에셋 로드를 위해 원본 인덱스 범위 계산
        let assetStartIdx, assetEndIdx;
        if (botOnly) {
          // 봇 필터 시 slicedMessages의 원본 위치 기준으로 에셋 로드
          const firstMsg = slicedMessages[0];
          const lastMsg = slicedMessages[slicedMessages.length - 1];
          assetStartIdx = chatData.messages.indexOf(firstMsg);
          assetEndIdx = chatData.messages.indexOf(lastMsg) + 1;
        } else {
          assetStartIdx = startVal - 1;
          assetEndIdx = endVal;
        }
        const assets = await loadAssetsForRange(chatData, assetStartIdx, assetEndIdx, statusUpdate);
        statusUpdate('로그 HTML 생성 중... (' + count + '개 메시지)');
        await new Promise(r => setTimeout(r, 30));

        const settings = {
          personaName: $('persona-name').value.trim(),
          boldQuotes: $('bold-quotes').checked,
          highlightQuotes: $('highlight-quotes').checked,
          removeImages: $('remove-images').checked,
          theme: $('theme-select').value,
          useCustomColor: $('use-custom-color').checked,
          customThemeColor: $('custom-theme-color').value,
          showMetadata: $('metadata-toggle').checked,
          selectedModel: $('model-select').value,
          customModel: $('custom-model').value.trim(),
          selectedPrompt: $('prompt-select').value,
          customPrompt: $('custom-prompt').value.trim(),
          customHeaderImage: currentCustomHeaderImage,
          headerImageMode: $('header-image-mode').value,
          emojiRemoval: $('emoji-removal').value,
          compressImages: $('compress-images').checked,
          imageQuality: parseInt($('image-quality').value),
          imageMaxWidth: parseInt($('image-max-width').value),
          archiveNumber: $('archive-number').value.trim() || '001',
          charSubtitle: $('char-subtitle').value.trim(),
          sectionTitle: $('section-title').value.trim() || 'Story',
          messageFilter: $('message-filter').value,
          rangeMode: currentMode,
          recentN: parseInt($('recent-n').value) || 1,
          botOnly: botOnly,
          tags: ['Bot', 'Model', 'Prompt'],
          userDisplayName: '{{user}}',
          charDisplayName: chatData.charName,
          assetDataUris: assets.assetDataUris,
          resolveAssetRef: chatData.resolveAssetRef,
          metadata: {
            show: $('metadata-toggle').checked,
            model: $('model-select').value,
            customModel: $('custom-model').value.trim(),
            prompt: $('prompt-select').value,
            customPrompt: $('custom-prompt').value.trim()
          }
        };
        useTranslation = $('use-translation').checked;

        // 설정 저장
        const toSave = { ...settings };
        delete toSave.assetDataUris;
        delete toSave.resolveAssetRef;
        delete toSave.metadata;
        toSave.useTranslation = useTranslation;
        saveSettings(toSave); // fire-and-forget

        const charInfo = {
          charName: chatData.charName,
          chatName: chatData.chatName,
          charImageUri: assets.charImageUri
        };

        // 복사 시 base64→URL 치환을 위한 매핑 캐시
        window._mlLastDataUriToUrl = assets.dataUriToUrl || {};
        window._mlLastCharImageUri = assets.charImageUri || '';
        window._mlLastCharImageUrl = assets.charImageUrl || '';

        const result = await generateBasicFormatLog(slicedMessages, charInfo, settings);
        previewEl.innerHTML = result.html;
        copyBtn.disabled = false;
        copyBtn.style.opacity = '1';

        let doneText = '✅ ' + (botOnly ? '[봇만] ' : '') + startVal + '~' + endVal + '번 메시지 (' + count + '개) 생성 완료';
        if (result.translationStats) {
          const ts = result.translationStats;
          const total = ts.found + ts.missed;
          doneText += ' | 🌐 번역 ' + ts.found + '/' + total + '개';
          if (ts.methods && Object.keys(ts.methods).length > 0) {
            doneText += ' (' + Object.entries(ts.methods).map(function(e) { return e[0] + ':' + e[1]; }).join(', ') + ')';
          }
        }
        rangeHint.textContent = doneText;

      } catch (e) {
        previewEl.innerHTML = '<div style="text-align:center;color:#dc3545;padding:20px;">❌ 생성 실패: ' + e.message + '</div>';
        console.log('[Mobile Log] 생성 실패:', e);
      } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = '🔄 생성';
      }
    }

    // === 이벤트 리스너 (중복 방지) ===
    if (!listenersAttached) {
      listenersAttached = true;

      // 모드 전환 버튼
      $('mode-range-btn').addEventListener('click', () => { setRangeMode('range'); });
      $('mode-recent-btn').addEventListener('click', () => { setRangeMode('recent'); });

      // 범위 변경 시 힌트 업데이트
      ['range-start', 'range-end'].forEach(id => {
        $(id).addEventListener('input', () => {
          const s = parseInt($('range-start').value) || 1;
          const e = parseInt($('range-end').value) || 1;
          const total = chatData ? chatData.messages.length : '?';
          rangeHint.textContent = '전체 ' + total + '개 중 ' + s + '~' + e + '번 선택 (' + Math.max(0, e - s + 1) + '개)';
        });
      });

      // 최근 N개 변경 시 힌트 업데이트
      $('recent-n').addEventListener('input', () => {
        const n = parseInt($('recent-n').value) || 1;
        const total = chatData ? chatData.messages.length : '?';
        const botOnly = $('bot-only-toggle').checked;
        let effectiveTotal = total;
        if (botOnly && chatData) {
          effectiveTotal = chatData.messages.filter(m => m.role === 'char').length;
        }
        const actualN = Math.min(n, effectiveTotal);
        rangeHint.textContent = '전체 ' + total + '개 중 최근 ' + actualN + '개' + (botOnly ? ' (봇만)' : '') + ' 선택';
      });

      // 봇 필터 변경 시 힌트 업데이트
      $('bot-only-toggle').addEventListener('change', () => {
        const total = chatData ? chatData.messages.length : 0;
        const botOnly = $('bot-only-toggle').checked;
        if (botOnly && chatData) {
          const botCount = chatData.messages.filter(m => m.role === 'char').length;
          rangeHint.textContent = '전체 ' + total + '개 중 봇 메시지 ' + botCount + '개';
        } else {
          rangeHint.textContent = '전체 ' + total + '개 메시지';
        }
      });

      // 생성 버튼
      generateBtn.addEventListener('click', generatePreview);

      // UI 토글 (생성 불필요, 즉시 동작)
      $('compress-images').addEventListener('change', () => {
        $('compress-options').style.display = $('compress-images').checked ? 'block' : 'none';
      });
      $('image-quality').addEventListener('input', () => { $('quality-value').textContent = $('image-quality').value; });
      $('image-max-width').addEventListener('input', () => { $('width-value').textContent = $('image-max-width').value; });
      $('metadata-toggle').addEventListener('change', () => {
        $('metadata-inputs').style.display = $('metadata-toggle').checked ? 'block' : 'none';
      });
      $('model-select').addEventListener('change', () => {
        $('custom-model').style.display = $('model-select').value === 'custom' ? 'block' : 'none';
      });
      $('prompt-select').addEventListener('change', () => {
        $('custom-prompt').style.display = $('prompt-select').value === 'custom' ? 'block' : 'none';
      });

      // 헤더 이미지
      $('header-image-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('이미지 크기는 5MB 이하여야 합니다.'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          currentCustomHeaderImage = ev.target.result;
          $('header-image-preview').src = currentCustomHeaderImage;
          $('header-image-preview-wrap').style.display = 'block';
          $('remove-header-image').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      });
      $('remove-header-image').addEventListener('click', () => {
        currentCustomHeaderImage = '';
        $('header-image-preview').src = '';
        $('header-image-preview-wrap').style.display = 'none';
        $('remove-header-image').style.display = 'none';
        $('header-image-input').value = '';
      });

      // 편집 모드
      $('editable-toggle').addEventListener('change', () => {
        if ($('editable-toggle').checked) {
          previewEl.setAttribute('contenteditable', 'true');
        } else {
          previewEl.setAttribute('contenteditable', 'false');
        }
      });
    }
  }

  // ========== 버튼 등록 ==========
  const registerBtn = async () => {
    if (buttonRef) {
      try { await Risuai.unregisterUIPart(buttonRef.id); } catch (e) {}
      buttonRef = null;
    }
    buttonRef = await Risuai.registerButton({
      name: 'Mobile Log',
      icon: '\uD83D\uDCCB',
      iconType: 'html',
      location: 'chat'
    }, showLog);
  };

  // ========== 초기화 ==========
  setupUI();
  try {
    await registerBtn();
    console.log('[Mobile Log] v3.0 플러그인이 로드되었습니다.');
  } catch (error) {
    console.log('[Mobile Log] 초기화 오류: ' + error.message);
  }
})();
