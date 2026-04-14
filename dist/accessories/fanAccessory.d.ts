import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Fan Accessory
 * Handles: aux_fan
 * Uses the modern Fanv2 service (Active characteristic).
 */
export declare class FanAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private get device();
    getActive(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
}
