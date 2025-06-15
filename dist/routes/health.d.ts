declare const router: import("express-serve-static-core").Router;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
export default router;
//# sourceMappingURL=health.d.ts.map