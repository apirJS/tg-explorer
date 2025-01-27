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
    element?.dispatchEvent(mouseEvent);
  }

  openMenu();

  const spans = document.querySelectorAll(
    '#column-left > div > div > div.sidebar-header.can-have-forum > div.sidebar-header__btn-container > button > div.btn-menu.bottom-right.has-footer.active.was-open > div > span:nth-child(3)'
  );
  spans.forEach((span) => {
    if (span.innerHTML === 'Settings') {
      span.dispatchEvent(mouseEvent);
    }
  });

  const fullName = document.querySelector(
    '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.settings-container.profile-container.is-collapsed.active > div.sidebar-content > div > div.profile-content.is-me > div.profile-avatars-container > div.profile-avatars-info > div.profile-name > span'
  )?.innerHTML;

  return fullName;
}

export default selectors;
