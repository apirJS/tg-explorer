const selectors = {
  HAMBURGER_MENU: {
    value:
      '#LeftMainHeader > div.DropdownMenu.main-menu > button > div.ripple-container',
    children: {
      SETTINGS_BUTTON:
        '#LeftMainHeader > div.DropdownMenu.main-menu > div > div.bubble.menu-container.custom-scroll.with-footer.opacity-transition.fast.left.top.shown.open > div:nth-child(4)',
      FULLNAME_CONTAINER:
        '#Settings > div > div.settings-content.custom-scroll > div.settings-main-menu.self-profile > div > div > div.title > h3',
    },
  },
};

export default selectors;
