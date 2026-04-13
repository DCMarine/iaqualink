"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightAccessory = void 0;
class LightAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jandy / Zodiac')
            .setCharacteristic(this.platform.Characteristic.Model, this.modelName(device))
            .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device.serial}-${device.name}`);
        this.service = accessory.getService(this.platform.Service.Lightbulb)
            || accessory.addService(this.platform.Service.Lightbulb);
        this.service.setCharacteristic(this.platform.Characteristic.Name, device.label);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .onGet(this.getOn.bind(this))
            .onSet(this.setOn.bind(this));
        if (device.deviceType === 'aux_dimmable_light') {
            this.service.getCharacteristic(this.platform.Characteristic.Brightness)
                .onGet(this.getBrightness.bind(this))
                .onSet(this.setBrightness.bind(this))
                .setProps({ minValue: 0, maxValue: 100, minStep: 25 });
        }
        if (device.deviceType === 'aux_color_light') {
            this.service.getCharacteristic(this.platform.Characteristic.Brightness)
                .onGet(this.getColorEffect.bind(this))
                .onSet(this.setColorEffect.bind(this))
                .setProps({ minValue: 0, maxValue: 100, minStep: 10 });
        }
    }
    get device() { return this.accessory.context.device; }
    modelName(device) {
        if (device.deviceType === 'aux_dimmable_light') { return 'Dimmable Light'; }
        if (device.deviceType === 'aux_color_light') { return 'Color Light'; }
        return 'Light Switch';
    }
    async getOn() {
        const isOn = this.device.state === '1';
        this.platform.log.debug(`[${this.device.label}] GET On -> ${isOn}`);
        return isOn;
    }
    async setOn(value) {
        const on = value;
        this.platform.log.info(`[${this.device.label}] SET On -> ${on}`);
        const current = this.device.state === '1';
        if (on === current) { return; }
        try {
            if (this.device.deviceType === 'aux_dimmable_light') {
                await this.platform.api.setLight(this.device.serial, this.device.aux, on ? '100' : '0');
            }
            else if (this.device.deviceType === 'aux_color_light') {
                await this.platform.api.setLight(this.device.serial, this.device.aux, on ? '1' : '0', this.device.subtype);
            }
            else {
                await this.platform.api.setAux(this.device.serial, this.device.aux);
            }
            this.device.state = on ? '1' : '0';
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set light:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
    }
    async getBrightness() {
        const brightness = parseInt(this.device.subtype ?? '100', 10);
        this.platform.log.debug(`[${this.device.label}] GET Brightness -> ${brightness}%`);
        return brightness;
    }
    async setBrightness(value) {
        const brightness = value;
        const snapped = Math.round(brightness / 25) * 25;
        this.platform.log.info(`[${this.device.label}] SET Brightness -> ${snapped}%`);
        try {
            await this.platform.api.setLight(this.device.serial, this.device.aux, String(snapped));
            this.device.subtype = String(snapped);
            this.device.state = snapped > 0 ? '1' : '0';
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set brightness:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
    }
    async getColorEffect() {
        const effectId = parseInt(this.device.state ?? '0', 10);
        const brightness = Math.min(effectId * 10, 100);
        this.platform.log.debug(`[${this.device.label}] GET ColorEffect -> ${brightness}% (effect ${effectId})`);
        return brightness;
    }
    async setColorEffect(value) {
        const brightness = value;
        const effectId = Math.round(brightness / 10);
        this.platform.log.info(`[${this.device.label}] SET ColorEffect -> effect ${effectId}`);
        try {
            await this.platform.api.setLight(this.device.serial, this.device.aux, String(effectId), this.device.subtype);
            this.device.state = String(effectId > 0 ? 1 : 0);
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set color effect:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
    }
}
exports.LightAccessory = LightAccessory;
