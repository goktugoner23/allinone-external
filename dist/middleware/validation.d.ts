import { Request, Response, NextFunction } from 'express';
export declare const validate: (schema: (data: any) => any, source?: "body" | "params" | "query") => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSpotOrder: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateFuturesOrder: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateTPSL: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSymbol: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateAsset: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateOrderId: (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map