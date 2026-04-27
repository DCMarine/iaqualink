import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { IAqualinkApiClient, IAqualinkDevice } from './iaqualinkApi.js';
import { IaquaLinkConfig } from './types.js';
export declare class IaquaLinkPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly homebridgeApi: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    readonly api: IAqualinkApiClient;
    readonly config: IaquaLinkConfig;
    private readonly pollingInterval;
    private pollingTimer?;
    private retryTimer?;
    constructor(log: Logger, config: PlatformConfig, homebridgeApi: API);
    configureAccessory(accessory: PlatformAccessory): void;
    discoverDevices(): Promise<void>;
    private discoverSystemDevices;
    /** Searches home_screen for the temp_scale entry regardless of its position. */
    private extractTempUnit;
    private parseHomeScreen;
    private parseDevicesScreen;
    private inferHomeDeviceType;
    private inferAuxDeviceType;
    private registerDevice;
    private createAccessoryHandler;
    pollAll(systems: IAqualinkDevice[]): Promise<void>;
    private applyUpdates;
}
