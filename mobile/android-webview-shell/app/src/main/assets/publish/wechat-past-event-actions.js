window.GameModules = window.GameModules || {};

const wechatChatPromptForwarders = {
  isWechatPastEventQuestion: 'isWechatPastEventQuestion',
  wechatPastEventContext: 'wechatPastEventContext',
  wechatReplyPrompt: 'wechatReplyPrompt',
};

function callWechatChatPromptHelper(name, context, ...args) {
  return window.GameModules.app.wechat.chatPromptHelpers[name].call(context, ...args);
}

Object.assign(window.GameModules.wechatChatActions || {}, Object.fromEntries(
  Object.entries(wechatChatPromptForwarders).map(([name, helperName]) => [
    name,
    function wechatChatPromptFacade(...args) {
      return callWechatChatPromptHelper(helperName, this, ...args);
    },
  ]),
));
