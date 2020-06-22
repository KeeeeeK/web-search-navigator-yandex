// Based on https://developer.chrome.com/extensions/optionsV2

// Authorized urls for compatible search engines
const OPTIONAL_PERMISSIONS_URLS = {
  'startpage': [
    // It used to be 'https://www.startpage.com/*/*search*' but when requesting
    // this URL chrome actually grants permission to the URL below. This
    // discrepancy causes the options page to think that we don't have
    // permission for startpage.
    'https://www.startpage.com/*',
    'https://startpage.com/*',
  ],
  'youtube': [
    'https://www.youtube.com/*',
  ],
  'google-scholar': ['https://scholar.google.com/*'],
  'amazon': [
    'https://www.amazon.com/*',
    // TODO: Add other Amazon domains (UK etc).
  ],
};

const DIV_TO_OPTION_NAME = {
  nextKey: 'next-key',
  previousKey: 'previous-key',
  navigatePreviousResultPage: 'navigate-previous-result-page',
  navigateNextResultPage: 'navigate-next-result-page',
  navigateKey: 'navigate-key',
  navigateNewTabKey: 'navigate-new-tab-key',
  navigateNewTabBackgroundKey: 'navigate-new-tab-background-key',
  navigateSearchTab: 'navigate-search-tab',
  navigateImagesTab: 'navigate-images-tab',
  navigateVideosTab: 'navigate-videos-tab',
  navigateMapsTab: 'navigate-maps-tab',
  navigateNewsTab: 'navigate-news-tab',
  navigateShoppingTab: 'navigate-shopping-tab',
  navigateBooksTab: 'navigate-books-tab',
  navigateFlightsTab: 'navigate-flights-tab',
  navigateFinancialTab: 'navigate-financial-tab',
  focusSearchInput: 'focus-search-input',
  navigateShowAll: 'navigate-show-all',
  navigateShowHour: 'navigate-show-hour',
  navigateShowDay: 'navigate-show-day',
  navigateShowWeek: 'navigate-show-week',
  navigateShowMonth: 'navigate-show-month',
  navigateShowYear: 'navigate-show-year',
  toggleSort: 'toggle-sort',
};

/**
* Add other search engines domain on user input
* @param {Element} checkbox
*/
const setSearchEnginePermission_ = async (checkbox) => {
  const urls = OPTIONAL_PERMISSIONS_URLS[checkbox.name];
  if (checkbox.checked) {
    checkbox.checked = false;
    // eslint-disable-next-line no-undef
    const granted = await browser.permissions.request(
        {permissions: ['tabs'], origins: urls});
    checkbox.checked = granted;
  } else {
    // eslint-disable-next-line no-undef
    browser.permissions.remove({origins: urls});
  }
};

class OptionsPageManager {
  async init() {
    await this.loadOptions();
    const startpage = document.getElementById('startpage');
    startpage.addEventListener('change', () => {
      setSearchEnginePermission_(startpage);
    });
    const youtube = document.getElementById('youtube');
    youtube.addEventListener('change', () => {
      setSearchEnginePermission_(youtube);
    });
    const googleScholar = document.getElementById('google-scholar');
    googleScholar.addEventListener('change', () => {
      setSearchEnginePermission_(googleScholar);
    });
    const amazon = document.getElementById('amazon');
    amazon.addEventListener('change', () => {
      setSearchEnginePermission_(amazon);
    });
    // NOTE: this.saveOptions cannot be passed directly or otherwise `this`
    // won't be bound to the object.
    document.getElementById('save').addEventListener('click', () => {
      this.saveOptions();
    });
  }

  // Saves options from the DOM to browser.storage.sync.
  async saveOptions() {
    const options = this.options.values;
    // Handle non-keybindings settings first
    options.wrapNavigation = document.getElementById('wrap-navigation').checked;
    options.autoSelectFirst = document.getElementById(
        'auto-select-first').checked;
    options.hideOutline = document.getElementById('hide-outline').checked;
    options.delay = document.getElementById('delay').value;
    options.googleIncludeCards = document.getElementById(
        'google-include-cards').value;
    // Handle keybinding options
    for (const [key, optName] of Object.entries(DIV_TO_OPTION_NAME)) {
      // Options take commands as strings separated by commas.
      // Split them into the arrays Moustrap requires.
      options[key] = document.getElementById(optName).value.split(',').map(
          (t) => t.trim());
    }
    const customCSS = document.getElementById('custom-css-textarea').value;
    // eslint-disable-next-line no-undef
    if (options.customCSS !== DEFAULT_CSS || customCSS !== DEFAULT_CSS) {
      if (customCSS.trim()) {
        options.customCSS = customCSS;
      } else {
        // eslint-disable-next-line no-undef
        options.customCSS = DEFAULT_CSS;
      }
    }
    try {
      await this.options.save();
      this.flashMessage('Options saved');
    } catch (e) {
      this.flashMessage('Error when saving options');
    }
  }

  loadSearchEnginePermissions_(permissions) {
    // Check what URLs we have permission for.
    const startpage = document.getElementById('startpage');
    startpage.checked = OPTIONAL_PERMISSIONS_URLS['startpage'].every((url) => {
      return permissions.origins.includes(url);
    });
    const youtube = document.getElementById('youtube');
    youtube.checked = OPTIONAL_PERMISSIONS_URLS['youtube'].every((url) => {
      return permissions.origins.includes(url);
    });
    const googleScholar = document.getElementById('google-scholar');
    googleScholar.checked = OPTIONAL_PERMISSIONS_URLS['google-scholar'].every(
        (url) => {
          return permissions.origins.includes(url);
        });
    const amazon = document.getElementById('amazon');
    amazon.checked = OPTIONAL_PERMISSIONS_URLS['amazon'].every((url) => {
      return permissions.origins.includes(url);
    });
  }

  // Load options from browser.storage.sync to the DOM.
  async loadOptions() {
    // eslint-disable-next-line no-undef
    this.options = createSyncedOptions();
    const [, permissions] = await Promise.all([
      this.options.load(),
      // eslint-disable-next-line no-undef
      browser.permissions.getAll(),
    ]);
    this.loadSearchEnginePermissions_(permissions);
    const options = this.options.values;
    // Handle checks separately.
    document.getElementById('wrap-navigation').checked = options.wrapNavigation;
    document.getElementById('auto-select-first').checked =
      options.autoSelectFirst;
    document.getElementById('hide-outline').checked =
      options.hideOutline;
    document.getElementById('delay').value = options.delay;
    document.getElementById('google-include-cards').checked =
      options.googleIncludeCards;
    // Restore options from divs.
    for (const [key, optName] of Object.entries(DIV_TO_OPTION_NAME)) {
      // Options are stored as arrays.
      // Split them into comma-separated string for the user.
      const optTemp = options[key];
      document.getElementById(optName).value =
          Array.isArray(optTemp) ? optTemp.join(', ') : optTemp;
    }
    // Load custom CSS
    document.getElementById('custom-css-textarea').value = options.customCSS;
  }

  flashMessage(message) {
    // Update status to let user know.
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }
}

const manager = new OptionsPageManager();
// NOTE: manager.init cannot be passed directly or otherwise `this` won't be
// bound to the object.
document.addEventListener('DOMContentLoaded', () => {
  manager.init();
});
