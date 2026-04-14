"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanAccessory = void 0;
/**
 * Fan Accessory
 * Handles: aux_fan
 * Uses the modern Fanv2 service (Active characteristic).
 */
class FanAccessory {
    platform;
    accessory;
    service;
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jandy / Zodiac')
            .setCharacteristic(this.platform.Characteristic.Model, 'Fan')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device.serial}-${device.name}`);
        // Remove any stale service from a previous type assignment
        const stale = accessory.getService(this.platform.Service.Switch);
        if (stale) {
            accessory.removeService(stale);
        }
        this.service = accessory.getService(this.platform.Service.Fanv2)
            || accessory.addService(this.platform.Service.Fanv2);
        this.service.setCharacteristic(this.platform.Characteristic.Name, device.label);
        this.service.getCharacteristic(this.platform.Characteristic.Active)
            .onGet(this.getActive.bind(this))
            .onSet(this.setActive.bind(this));
    }
    get device() {
        return this.accessory.context.device;
    }
    async getActive() {
        const isOn = this.device.state === '1' || this.device.state === '3';
        this.platform.log.debug(`[${this.device.label}] GET Active -> ${isOn}`);
        return isOn
            ? this.platform.Characteristic.Active.ACTIVE
            : this.platform.Characteristic.Active.INACTIVE;
    }
    async setActive(value) {
        const active = value;
        const on = active === this.platform.Characteristic.Active.ACTIVE;
        this.platform.log.info(`[${this.device.label}] SET Active -> ${on}`);
        const currentOn = this.device.state === '1' || this.device.state === '3';
        if (on === currentOn) {
            return;
        }
        try {
            await this.platform.api.setAux(this.device.serial, this.device.aux);
            this.device.state = on ? '1' : '0';
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set fan state:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(-70402 /* this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
    }
}
exports.FanAccessory = FanAccessory;
