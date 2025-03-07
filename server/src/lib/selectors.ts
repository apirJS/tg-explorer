const selectors = {
  k: {
    home: {
      SEARCH_INPUT: {
        selector: ".input-search input[type='text']",
        SEARCH_HELPER_LIST: {
          selector:
            '.search-group.search-group-contacts > .chatlist > a > div.dialog-title > div.user-title > span',
        },
        BACK_TO_HOME_BUTTON: {
          selector:
            'div.sidebar-header__btn-container > div.btn-icon.sidebar-back-button',
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
      SCROLL_TO_BOTTOM: {
        selector:
          '#column-center > div > div > div.chat-input.chat-input-main > div > button.btn-circle.btn-corner.z-depth-1.bubbles-corner-button.chat-secondary-button.bubbles-go-down.rp.is-broadcast',
      },
      MESSAGES: {
        selector: 'div.document-message[data-mid]',
      },
      SCROLLABLE: {
        selector:
          '#column-center > div > div > div.bubbles.is-chat-input-hidden.has-groups.has-sticky-dates > div.scrollable.scrollable-y',
      },
      UPLOAD_MENU_ICON: {
        selector: 'div.attach-file',
        UPLOAD_MENU_BUTTON: {
          selector:
            'div.attach-file > div.btn-menu > div.btn-menu-item:has(span.btn-menu-item-text):nth-child(2)',
        },
        FILES_INPUT: {
          selector: 'input[type=file][multiple]',
        },
        CONFIRMATION_POPUP_CONTAINER: {
          selector: 'body > div.popup.popup-send-photo.popup-new-media.active',
          FILES_CONTAINER: {
            selector:
              'body > div.popup.popup-send-photo.popup-new-media.active > div > div.popup-body > div > div.popup-photo',
            SEND_FILES_BUTTON: {
              selector:
                'body > div.popup.popup-send-photo.popup-new-media.active > div > div.popup-input-container > button',
            },
          },
        },
      },
      FIRST_CHAT_BUBBLE_GROUP: {
        selector:
          '#column-center > div > div > div.bubbles.is-chat-input-hidden.has-groups.has-sticky-dates > div.scrollable.scrollable-y > div > section > div.bubbles-group.bubbles-group-first',
      },
      LAST_CHAT_BUBBLE_GROUP: {
        selector: 'div.bubbles-group.bubbles-group-last',
      },
    },
  },
};

export default selectors;
