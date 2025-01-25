const selectors = {
  HAMBURGER_MENU: {
    value:
      '#column-left > div > div > div.sidebar-header.can-have-forum > div.sidebar-header__btn-container > button',

    children: {
      SETTINGS_BUTTON: {
        value:
          '#LeftMainHeader > div.DropdownMenu.main-menu > div > div > div:has(i.icon-settings)',
      },
      FULLNAME_CONTAINER: {
        value: '.ProfileInfo > div:nth-child(2) > div > h3',
      },
    },
  },
  NEW_CHANNEL_BUTTON: {
    value:
      '#LeftColumn-main > div.NewChatButton > div > div > div:nth-child(1)',
    children: {
      NEXT_BUTTON: {
        value: '#NewChat > div > div.NewChat-inner.step-1 > button',
        children: {
          NEXT_BUTTON: {
            value:
              '#NewChat > div.NewChat.step-1.Transition_slide.Transition_slide-active > div.NewChat-inner.step-1 > button',
          },
          CHANNEL_NAME: {
            value:
              '#NewChat > div.NewChat.Transition_slide.Transition_slide-active > button',
          },
        },
      },
    },
  },
};

export default selectors;
