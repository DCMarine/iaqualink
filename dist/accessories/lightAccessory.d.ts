import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IaquaLinkPlatform } from '../platform.js';
/**
 * Light Accessory
 * Handles: aux_light_switch, aux_dimmable_light, aux_color_light
 *
 * - aux_light_switch  → simple on/off Lightbulb
 * - aux_dimmable_light → Lightbulb with Brightness (0/25/50/75/100%)
 * - aux_color_light   → Lightbulb with effect selector via Brightness (each 10% = one effect)
 */
export declare class LightAccessory {
    private readonly platform;
    private readonly accessory;
    private service;
    constructor(platform: IaquaLinkPlatform, accessory: PlatformAccessory);
    private get device();
    private modelName;
    getOn(): Promise<CharacteristicValue>;
    setOn(value: CharacteristicValue): Promise<void>;
    getBrightness(): Promise<CharacteristicValue>;
    setBrightness(value: CharacteristicValue): Promise<void>;
    getColorEffect(): Promise<CharacteristicValue>;
    setColorEffect(value: CharacteristicValue): Promise<void>;
}
