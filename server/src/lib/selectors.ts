const selectors = {
  k: {
    home: {
      SEARCH_INPUT: {
        selector:
          '#column-left > div > div > div.sidebar-header.can-have-forum > div.input-search > input',
        SEARCH_HELPER_LIST: {
          selector:
            '.search-group.search-group-contacts > .chatlist > a > div.dialog-title > div.user-title > span',
        },
        BACK_TO_HOME_BUTTON: {
          selector:
            '#column-left > div > div > div.sidebar-header.can-have-forum > div.sidebar-header__btn-container > div.btn-icon.sidebar-back-button',
        },
      },
      PEN_ICON_BUTTON: {
        selector: '#new-menu',
        NEW_CHANNEL_BUTTON: {
          selector:
            '#new-menu > div.btn-menu.top-left.active.was-open > div:nth-child(1)',
          CHANNEL_NAME_INPUT: {
            selector:
              "div.input-field-input[contenteditable='true'][data-no-linebreaks='1']",
          },
          ARROW_BUTTON: {
            selector:
              '.new-channel-container > .sidebar-content > button.btn-circle.btn-corner.z-depth-1.rp:has(div.c-ripple,span)',
              
          },
        },
      },
    },
    channel: {
      MESSAGES: {
        selector: 'section.bubbles-date-group > div.bubbles-group > div',
        isNodeList: true,
      },
      FIRST_CHAT_BUBBLE_GROUP: {
        selector:
          '#column-center > div > div > div.bubbles.is-chat-input-hidden.has-groups.has-sticky-dates > div.scrollable.scrollable-y > div > section > div.bubbles-group.bubbles-group-first',
      },
      SCROLLABLE: {
        selector:
          '#column-center > div > div > div.bubbles.is-chat-input-hidden.has-groups.has-sticky-dates > div.scrollable.scrollable-y',
      },
    },
  },
};

export default selectors;
