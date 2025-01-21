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
        value:
          '.ProfileInfo > div:nth-child(2) > div > h3',
      },
    },
  },
  NEW_CHAT_BUTTON: {
    value:
      '#LeftColumn-main > div.NewChatButton.revealed > button > i.icon.icon-new-chat-filled',
    children: {
      NEW_CHANNEL_BUTTON: {
        value: '.NewChatButton > .Menu > div:nth-child(2) > div > i',
        children: {
          NEXT_ARROW_BUTTON: {
            value: '.NewChat-inner > button',
          },
        },
      },
    },
  },
};

export default selectors;
