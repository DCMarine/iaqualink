"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settings_js_1 = require("./settings.js");
const platform_js_1 = require("./platform.js");
exports.default = (api) => {
    api.registerPlatform(settings_js_1.PLATFORM_NAME, platform_js_1.IaquaLinkPlatform);
};
