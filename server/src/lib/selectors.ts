const selectors = {
  HAMBURGER_MENU: {
    value:
      '#LeftMainHeader > div.DropdownMenu.main-menu > button > div.ripple-container',
    children: {
      SETTINGS_BUTTON:
        '#LeftMainHeader > div.DropdownMenu.main-menu > div > div.bubble.menu-container.custom-scroll.with-footer.opacity-transition.fast.left.top.shown.open > div:nth-child(4)',
      
    },
  },
};

export default selectors;
