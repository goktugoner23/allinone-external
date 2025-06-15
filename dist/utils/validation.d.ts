export interface ValidationResult<T = any> {
    error?: string;
    value?: T;
}
export declare const symbolSchema: (symbol: string) => ValidationResult<string>;
export declare const sideSchema: (side: string) => ValidationResult<string>;
export declare const quantitySchema: (quantity: number) => ValidationResult<number>;
export declare const priceSchema: (price: number) => ValidationResult<number>;
export declare const spotOrderSchema: (orderData: any) => ValidationResult<any>;
export declare const futuresOrderSchema: (orderData: any) => ValidationResult<any>;
export declare const tpslSchema: (tpslData: any) => ValidationResult<any>;
export declare const assetSchema: (asset: string) => ValidationResult<string>;
export declare function validateInput<T>(schema: (data: any) => ValidationResult<T>, data: any): ValidationResult<T>;
//# sourceMappingURL=validation.d.ts.map