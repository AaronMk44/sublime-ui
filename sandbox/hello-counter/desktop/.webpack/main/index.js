/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "electron"
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
(module) {

module.exports = require("electron");

/***/ },

/***/ "./node_modules/@sublime-ui/desktop/dist/bridge/main-router.js"
/*!*********************************************************************!*\
  !*** ./node_modules/@sublime-ui/desktop/dist/bridge/main-router.js ***!
  \*********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   installNativeRouter: () => (/* binding */ installNativeRouter)
/* harmony export */ });
/* harmony import */ var _registry_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../registry.js */ "./node_modules/@sublime-ui/desktop/dist/registry.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../errors.js */ "./node_modules/@sublime-ui/desktop/dist/errors.js");


function installNativeRouter(ipcMain) {
  ipcMain.handle(
    "native:invoke",
    async (_event, mod, method, args = []) => {
      try {
        const fn = (0,_registry_js__WEBPACK_IMPORTED_MODULE_0__.resolve)(mod, method);
        if (fn === void 0) {
          throw new _errors_js__WEBPACK_IMPORTED_MODULE_1__.NativeError(`Unknown native method ${mod}:${method}`);
        }
        return await fn(...args);
      } catch (e) {
        const envelope = { __nativeError: (0,_errors_js__WEBPACK_IMPORTED_MODULE_1__.serializeError)(e) };
        return envelope;
      }
    }
  );
}



/***/ },

/***/ "./node_modules/@sublime-ui/desktop/dist/errors.js"
/*!*********************************************************!*\
  !*** ./node_modules/@sublime-ui/desktop/dist/errors.js ***!
  \*********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NativeError: () => (/* binding */ NativeError),
/* harmony export */   deserializeError: () => (/* binding */ deserializeError),
/* harmony export */   serializeError: () => (/* binding */ serializeError)
/* harmony export */ });
class NativeError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.name = "NativeError";
    if (code !== void 0) {
      this.code = code;
    }
  }
}
function serializeError(e) {
  if (e instanceof Error) {
    const code = e.code;
    const out = { name: e.name, message: e.message };
    if (typeof code === "string") {
      out.code = code;
    }
    return out;
  }
  return { name: "Error", message: String(e) };
}
function deserializeError(s) {
  return new NativeError(s.message, s.code);
}



/***/ },

/***/ "./node_modules/@sublime-ui/desktop/dist/registry.js"
/*!***********************************************************!*\
  !*** ./node_modules/@sublime-ui/desktop/dist/registry.js ***!
  \***********************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   clearRegistry: () => (/* binding */ clearRegistry),
/* harmony export */   registerNative: () => (/* binding */ registerNative),
/* harmony export */   resolve: () => (/* binding */ resolve)
/* harmony export */ });
const services = /* @__PURE__ */ new Map();
function registerNative(toRegister) {
  for (const service of toRegister) {
    services.set(service.name, service);
  }
}
function resolve(mod, method) {
  const methods = services.get(mod)?.methods;
  if (methods === void 0) {
    return void 0;
  }
  return Object.prototype.hasOwnProperty.call(methods, method) ? methods[method] : void 0;
}
function clearRegistry() {
  services.clear();
}



/***/ },

/***/ "./node_modules/@sublime-ui/desktop/dist/shell/create-window.js"
/*!**********************************************************************!*\
  !*** ./node_modules/@sublime-ui/desktop/dist/shell/create-window.js ***!
  \**********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createWindow: () => (/* binding */ createWindow)
/* harmony export */ });

function resolveCtor() {
  const require2 = /* createRequire() */ undefined;
  const electron = __webpack_require__(/*! electron */ "electron");
  return electron.BrowserWindow;
}
function isUrl(entry) {
  return /^https?:\/\//.test(entry);
}
function createWindow(opts) {
  const Ctor = opts.BrowserWindowCtor ?? resolveCtor();
  const win = new Ctor({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: opts.preload
    }
  });
  if (isUrl(opts.entry)) {
    win.loadURL(opts.entry);
  } else {
    win.loadFile(opts.entry);
  }
  return win;
}



/***/ },

/***/ "./node_modules/@sublime-ui/desktop/dist/shell/main.js"
/*!*************************************************************!*\
  !*** ./node_modules/@sublime-ui/desktop/dist/shell/main.js ***!
  \*************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   startDesktop: () => (/* binding */ startDesktop)
/* harmony export */ });
/* harmony import */ var _create_window_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./create-window.js */ "./node_modules/@sublime-ui/desktop/dist/shell/create-window.js");
/* harmony import */ var _bridge_main_router_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../bridge/main-router.js */ "./node_modules/@sublime-ui/desktop/dist/bridge/main-router.js");


function startDesktop(opts) {
  const onError = opts.onError ?? ((error) => {
    console.error("[sublime/desktop] startDesktop failed:", error);
  });
  void opts.app.whenReady().then(() => {
    (0,_bridge_main_router_js__WEBPACK_IMPORTED_MODULE_1__.installNativeRouter)(opts.ipcMain);
    (0,_create_window_js__WEBPACK_IMPORTED_MODULE_0__.createWindow)({
      entry: opts.entry,
      preload: opts.preload,
      ...opts.BrowserWindowCtor !== void 0 ? { BrowserWindowCtor: opts.BrowserWindowCtor } : {}
    });
  }).catch(onError);
}



/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/asset-relocator-loader */
/******/ 	if (typeof __webpack_require__ !== 'undefined') __webpack_require__.ab = __dirname + "/native_modules/";
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./src/main/main.ts ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _sublime_ui_desktop__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @sublime-ui/desktop */ "./node_modules/@sublime-ui/desktop/dist/shell/main.js");


(0,_sublime_ui_desktop__WEBPACK_IMPORTED_MODULE_1__.startDesktop)({
    app: electron__WEBPACK_IMPORTED_MODULE_0__.app,
    ipcMain: electron__WEBPACK_IMPORTED_MODULE_0__.ipcMain,
    entry: 'http://localhost:3000/main_window/index.html',
    preload: 'C:\\Users\\Aaron Mkandawire\\VSCodeProjects\\Sublime\\sandbox\\hello-counter\\desktop\\.webpack\\renderer\\main_window\\preload.js',
    isDev: !electron__WEBPACK_IMPORTED_MODULE_0__.app.isPackaged,
});

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map