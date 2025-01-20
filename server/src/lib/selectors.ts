const selectors = {
  HAMBURGER_MENU: {
    value:
      '#LeftMainHeader > div.DropdownMenu.main-menu > button > div.ripple-container',
    children: {
      SETTINGS_ICON: {
        value: '.icon-settings',
      },
      FULLNAME_CONTAINER: {
        value: '.ProfileInfo > div:nth-child(2) > div > h3',
      },
    },
  },
};

export default selectors;
