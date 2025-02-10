const selectors = {
  k: {
    home: {
      SEARCH_INPUT: {
        selector:
          '#column-left > div > div > div.sidebar-header.can-have-forum > div.input-search > input',
        SEARCH_HELPER_LIST: {
          selector:
            '.search-group.search-group-contacts > .chatlist > a >div.dialog-title > div.user-title > span',
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
              '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.new-channel-container.active > div.sidebar-content > div > div.sidebar-left-section-container > div.sidebar-left-section > div > div.input-wrapper > div:nth-child(1) > div.input-field-input',
          },
          ARROW_BUTTON: {
            selector:
              '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.new-channel-container.active > div.sidebar-content > button',
          },
        },
      },
    },
    channel: {
      MESSAGES: {
        selector: 'section.bubbles-date-group > div.bubbles-group > div',
        isNodeList: true,
      },
    },
  },
};

export default selectors;
