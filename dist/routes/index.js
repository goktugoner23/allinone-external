"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const spot_1 = __importDefault(require("./spot"));
const futures_1 = __importDefault(require("./futures"));
const coinm_1 = __importDefault(require("./coinm"));
const websocket_1 = __importDefault(require("./websocket"));
const health_1 = __importDefault(require("./health"));
const router = (0, express_1.Router)();
// Health check routes
router.use('/', health_1.default);
// Trading API routes
router.use('/api/binance/spot', spot_1.default);
router.use('/api/binance/futures', futures_1.default);
router.use('/api/binance/coinm', coinm_1.default);
// WebSocket subscription routes
router.use('/api/binance', websocket_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map