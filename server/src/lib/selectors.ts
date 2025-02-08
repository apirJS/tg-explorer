const selectors = {
  k: {
    home: {
      SEARCH_INPUT: {
        selector:
          '#column-left > div > div > div.sidebar-header.can-have-forum > div.input-search > input',
        isNodeList: false,
        SEARCH_HELPER_LIST: {
          selector:
            '#search-container > div.search-super-tabs-scrollable.menu-horizontal-scrollable.sticky > div > div > div > div.selector-user-title > span',
          isNodeList: true,
        },
      },
      PEN_ICON_BUTTON: {
        selector: '#new-menu',
        isNodeList: false,
        NEW_CHANNEL_BUTTON: {
          selector:
            '#new-menu > div.btn-menu.top-left.active.was-open > div:nth-child(1)',
          isNodeList: false,
          CHANNEL_NAME_INPUT: {
            selector:
              '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.new-channel-container.active > div.sidebar-content > div > div > div.sidebar-left-section > div > div.input-wrapper > div:nth-child(1) > div.input-field-input',
            isNodeList: false,
          },
          CONTINUE_BUTTON: {
            selector:
              '#column-left > div > div.tabs-tab.sidebar-slider-item.scrolled-top.scrolled-bottom.scrollable-y-bordered.new-channel-container.active > div.sidebar-content > button',
            isNodeList: false,
          },
        },
      },
    },
    channel: {
      MESSAGES: {
        selector: "section.bubbles-date-group > div.bubbles-group > div",
        isNodeList: true,
      }
    }
  },
};

export default selectors;
