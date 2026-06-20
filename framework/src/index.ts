// framework/src/index.ts

// --- Model layer ---
export { Model } from './model/Model.js';
export { ModelCollection } from './model/ModelCollection.js';
export type { CallConfig, ModelCtor } from './model/Model.js';
export { registerModel } from './register.js';

// --- Config ---
export {
  configureSublime,
  getConfig,
  getHttpConfig,
  getDatabaseAdapter,
  type SublimeConfig,
  type StorageAdapter,
} from './config/Config.js';

// --- Error tree (transport-neutral) ---
export { DataError, type DataErrorCode } from './errors/DataError.js';
export { HttpError } from './gateway/HttpError.js';
export { NetworkError } from './errors/NetworkError.js';
export { AuthError } from './errors/AuthError.js';
export { ValidationError } from './errors/ValidationError.js';
export { NotFoundError } from './errors/NotFoundError.js';
export { ConfigError } from './errors/ConfigError.js';
export { StorageError } from './errors/StorageError.js';
// Back-compat: ApiError is the old name for HttpError (runtime value alias).
export { ApiError } from './gateway/ApiError.js';

// --- Gateway interface + types + strategies ---
export type { Gateway, Row, Id, RequestCapableGateway } from './gateway/Gateway.js';
export { isRequestCapable } from './gateway/Gateway.js';
export type { GatewayDeps, GatewayClass } from './gateway/GatewayDeps.js';
export { HttpGateway } from './gateway/HttpGateway.js';
export { InMemoryGateway } from './gateway/InMemoryGateway.js';
export { DbGateway } from './gateway/DbGateway.js';

// --- Query object ---
export type {
  Query,
  FilterOp,
  FilterValue,
  QueryFilter,
  QuerySort,
  LegacyQuery,
} from './gateway/Query.js';

// --- DatabaseAdapter port (types only; adapters ship in @sublime-ui/storage) ---
export type { DatabaseAdapter } from './gateway/DatabaseAdapter.js';

// --- HTTP-internal (kept for advanced REST consumers; NOT part of the Model
//     data contract — gateways return raw Row, not this envelope). ---
export type { ApiResponse } from './entities/ApiResponse.js';

// --- Store ---
export { store, registerReducer } from './store/store.js';
export type { RootState, AppDispatch } from './store/store.js';
export { useAppDispatch, useAppSelector } from './store/hooks.js';
