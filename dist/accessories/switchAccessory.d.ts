import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Switch Accessory
 * Handles: pool_pump, spa_pump, pool_heater, spa_heater, aux_switch
 */
export declare class SwitchAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private modelName;
    getOn(): Promise<CharacteristicValue>;
    setOn(value: CharacteristicValue): Promise<void>;
}
