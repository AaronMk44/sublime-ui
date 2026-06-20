import { contextBridge, ipcRenderer } from 'electron';
import { exposeNativeBridge } from '@sublime-ui/desktop/preload';

// Exposes exactly one function (`window.sublimeNative.invoke`) over the single
// `native:invoke` channel — nothing else crosses the isolation boundary.
exposeNativeBridge(contextBridge, ipcRenderer);
