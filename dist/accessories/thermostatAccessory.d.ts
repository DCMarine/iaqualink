import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Thermostat Accessory
 * Handles: pool_set_point, spa_set_point
 * HomeKit requires temperatures in Celsius.
 */
export declare class ThermostatAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private get device();
    private get isFahrenheit();
    private toHomeKit;
    private fromHomeKit;
    /** Find the matching sensor temp device from other accessories */
    private getCurrentTempFromContext;
    getCurrentTemperature(): Promise<CharacteristicValue>;
    getTargetTemperature(): Promise<CharacteristicValue>;
    setTargetTemperature(value: CharacteristicValue): Promise<void>;
    getCurrentHeatingCoolingState(): Promise<CharacteristicValue>;
    getTargetHeatingCoolingState(): Promise<CharacteristicValue>;
    setTargetHeatingCoolingState(value: CharacteristicValue): Promise<void>;
    getTemperatureDisplayUnits(): Promise<CharacteristicValue>;
}
