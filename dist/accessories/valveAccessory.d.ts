import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Valve Accessory
 * Handles: aux_valve
 * Exposes a HomeKit Valve service — suitable for water features, bubblers,
 * misters, irrigation, showers, and any water-flow auxiliary output.
 *
 * The valveType (generic/irrigation/shower/faucet) is read from the
 * auxiliaryDevices config override.
 */
export declare class ValveAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private get device();
    private get isOn();
    getActive(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
    getInUse(): Promise<CharacteristicValue>;
}
