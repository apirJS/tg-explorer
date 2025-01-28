const selectors = {
  k: {
    home: {
      SETTINGS_BUTTON: {
        value:
          '#LeftMainHeader > div.DropdownMenu.main-menu > div > div > div:nth-child(5) > i',
        FULLNAME_CONTAINER: {
          value:
            '#Settings > div > div.settings-content.custom-scroll > div.settings-main-menu.self-profile > div.ProfileInfo > div > div.title> h3',
        },
      },
    },
  },
};

export function getFullName() {
  const mouseEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    composed: true,
  });

  function openMenu() {
    const element = document.querySelector(
      '#column-left > div > div > div.sidebar-header.can-have-forum > div.sidebar-header__btn-container > button'
    );
    if (!element) {
      console.error('Menu button not found');
      return false;
    }
    element.dispatchEvent(mouseEvent);
    return true;
  }

  if (!openMenu()) {
    return null;
  }

  const spans = document.querySelectorAll(
    '#column-left > div > div > div.sidebar-header.can-have-forum > div.sidebar-header__btn-container > button > div.btn-menu.bottom-right.has-footer.active.was-open > div > span:nth-child(3)'
  );

  let settingsSpanFound = false;
  spans.forEach((span) => {
    if (span.innerHTML === 'Settings') {
      span.dispatchEvent(mouseEvent);
      settingsSpanFound = true;
    }
  });

  if (!settingsSpanFound) {
    console.error('Settings span not found');
    return null;
  }

  const fullNameElement = document.querySelector(
    '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.settings-container.profile-container.is-collapsed.active > div.sidebar-content > div > div.profile-content.is-me > div.profile-avatars-container > div.profile-avatars-info > div.profile-name > span'
  );

  if (!fullNameElement) {
    console.error('Full name element not found');
    return null;
  }

  return fullNameElement.innerHTML || null;
}

export default selectors;
