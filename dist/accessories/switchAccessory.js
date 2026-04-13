"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwitchAccessory = void 0;
/**
 * Switch Accessory
 * Handles: pool_pump, spa_pump, pool_heater, spa_heater, aux_switch
 */
class SwitchAccessory {
    platform;
    accessory;
    service;
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        // Set accessory information
        accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jandy / Zodiac')
            .setCharacteristic(this.platform.Characteristic.Model, this.modelName(device.deviceType))
            .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device.serial}-${device.name}`);
        // Use Switch service
        this.service = accessory.getService(this.platform.Service.Switch)
            || accessory.addService(this.platform.Service.Switch);
        this.service.setCharacteristic(this.platform.Characteristic.Name, device.label);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this))
            .onSet(this.setOn.bind(this));
    }
    modelName(type) {
        const map = {
            pool_pump: 'Pool Pump',
            spa_pump: 'Spa Pump',
            pool_heater: 'Pool Heater',
            spa_heater: 'Spa Heater',
            aux_switch: 'Auxiliary Switch',
        };
        return map[type] ?? 'Switch';
    }
    async getOn() {
        const device = this.accessory.context.device;
        const isOn = device.state === '1' || device.state === '3';
        this.platform.log.debug(`[${device.label}] GET On -> ${isOn}`);
        return isOn;
    }
    async setOn(value) {
        const device = this.accessory.context.device;
        this.platform.log.info(`[${device.label}] SET On -> ${value}`);
        const on = value;
        const currentOn = device.state === '1' || device.state === '3';
        // Only toggle if state actually needs to change
        if (on === currentOn) {
            return;
        }
        try {
            switch (device.deviceType) {
                case 'pool_pump':
                    await this.platform.api.setPoolPump(device.serial);
                    break;
                case 'spa_pump':
                    await this.platform.api.setSpaPump(device.serial);
                    break;
                case 'pool_heater':
                    await this.platform.api.setPoolHeater(device.serial);
                    break;
                case 'spa_heater':
                    await this.platform.api.setSpaHeater(device.serial);
                    break;
                case 'aux_switch':
                    if (device.aux) {
                        await this.platform.api.setAux(device.serial, device.aux);
                    }
                    break;
                default:
                    this.platform.log.warn(`[${device.label}] Unknown device type for setOn: ${device.deviceType}`);
            }
            // Optimistically update state
            device.state = on ? '1' : '0';
        }
        catch (err) {
            this.platform.log.error(`[${device.label}] Failed to set switch state:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(-70402 /* this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
    }
}
exports.SwitchAccessory = SwitchAccessory;
