export type CiConfig = {
    headed: boolean;
    isCI: boolean;
    outputDir: string;
};
export declare function getCiDefaults(options?: Partial<CiConfig>): CiConfig;
