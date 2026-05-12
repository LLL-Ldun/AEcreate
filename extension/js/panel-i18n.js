(function (root) {
  var storageKey = 'aecreate.panelLanguage';
  var translations = {
    zh: {
      appTitle: 'AEcreate Codex Bridge',
      languageLabel: '界面语言',
      contextTitle: '上下文',
      noContextExported: '尚未导出上下文。',
      refreshContext: '刷新上下文',
      chooseBridge: '选择桥接目录',
      openBridge: '打开桥接目录',
      markersTitle: '标记',
      markerKill: '击杀',
      markerImpact: '冲击',
      markerRewind: '回溯',
      markerCustom: '自定义',
      noMarkersLoaded: '暂无标记。',
      libraryTitle: '预设库',
      scanPresets: '扫描预设',
      presetNotScanned: '尚未扫描预设缓存。',
      pendingTitle: '待应用方案',
      noPendingAction: '暂无待应用动作。',
      applyChecked: '应用勾选',
      discardPending: '丢弃',
      saveFavorite: '收藏方案',
      openLogs: '打开日志',
      markerPrompt: '标记名称'
    },
    en: {
      appTitle: 'AEcreate Codex Bridge',
      languageLabel: 'Language',
      contextTitle: 'Context',
      noContextExported: 'No context exported.',
      refreshContext: 'Refresh Context',
      chooseBridge: 'Choose Bridge',
      openBridge: 'Open Bridge Folder',
      markersTitle: 'Markers',
      markerKill: 'Kill',
      markerImpact: 'Impact',
      markerRewind: 'Rewind',
      markerCustom: 'Custom',
      noMarkersLoaded: 'No markers loaded.',
      libraryTitle: 'Library',
      scanPresets: 'Scan Presets',
      presetNotScanned: 'Preset cache not scanned.',
      pendingTitle: 'Pending Plan',
      noPendingAction: 'No pending action.',
      applyChecked: 'Apply Checked',
      discardPending: 'Discard',
      saveFavorite: 'Save Favorite',
      openLogs: 'Open Logs',
      markerPrompt: 'Marker name'
    }
  };

  function normalizeLanguage(language) {
    return language === 'en' ? 'en' : 'zh';
  }

  function t(language, key) {
    var normalized = normalizeLanguage(language);
    return translations[normalized][key] || translations.en[key] || key;
  }

  function apply(documentRef, language) {
    var normalized = normalizeLanguage(language);
    if (documentRef.documentElement) {
      documentRef.documentElement.setAttribute('lang', normalized === 'zh' ? 'zh-CN' : 'en');
    }
    var nodes = documentRef.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(normalized, nodes[i].getAttribute('data-i18n'));
    }
  }

  function loadLanguage(storage) {
    try {
      if (storage) return normalizeLanguage(storage.getItem(storageKey));
    } catch (error) {}
    return 'zh';
  }

  function saveLanguage(storage, language) {
    try {
      if (storage) storage.setItem(storageKey, normalizeLanguage(language));
    } catch (error) {}
  }

  root.AECreatePanelI18n = {
    storageKey: storageKey,
    translations: translations,
    normalizeLanguage: normalizeLanguage,
    t: t,
    apply: apply,
    loadLanguage: loadLanguage,
    saveLanguage: saveLanguage
  };
}(typeof window !== 'undefined' ? window : this));
