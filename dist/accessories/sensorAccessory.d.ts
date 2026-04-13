import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Sensor Accessory
 * Handles:
 *   - pool_temp, spa_temp, air_temp, solar_temp → TemperatureSensor service
 *   - freeze_protection → OccupancySensor service (active = freeze protection is ON)
 */
export declare class SensorAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private get device();
    private get isFahrenheit();
    private modelName;
    getTemperature(): Promise<CharacteristicValue>;
    getFreezeProtection(): Promise<CharacteristicValue>;
}
