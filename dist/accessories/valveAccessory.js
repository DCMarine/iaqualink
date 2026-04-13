"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValveAccessory = void 0;
const VALVE_TYPE_MAP = {
    generic: 0,
    irrigation: 1,
    shower: 2,
    faucet: 3,
};
class ValveAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jandy / Zodiac')
            .setCharacteristic(this.platform.Characteristic.Model, 'Valve')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device.serial}-${device.name}`);
        const stale = accessory.getService(this.platform.Service.Switch);
        if (stale) { accessory.removeService(stale); }
        this.service = accessory.getService(this.platform.Service.Valve)
            || accessory.addService(this.platform.Service.Valve);
        this.service.setCharacteristic(this.platform.Characteristic.Name, device.label);
        const override = this.platform.config.auxiliaryDevices?.find(a => a.aux === device.aux);
        const valveTypeKey = override?.valveType ?? 'generic';
        this.service.setCharacteristic(this.platform.Characteristic.ValveType, VALVE_TYPE_MAP[valveTypeKey]);
        this.service.getCharacteristic(this.platform.Characteristic.Active)
            .onGet(this.getActive.bind(this))
            .onSet(this.setActive.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.InUse)
            .onGet(this.getInUse.bind(this));
    }
    get device() { return this.accessory.context.device; }
    get isOn() { return this.device.state === '1' || this.device.state === '3'; }
    async getActive() {
        this.platform.log.debug(`[${this.device.label}] GET Active -> ${this.isOn}`);
        return this.isOn
            ? this.platform.Characteristic.Active.ACTIVE
            : this.platform.Characteristic.Active.INACTIVE;
    }
    async setActive(value) {
        const active = value;
        const on = active === this.platform.Characteristic.Active.ACTIVE;
        this.platform.log.info(`[${this.device.label}] SET Active -> ${on}`);
        if (on === this.isOn) { return; }
        try {
            await this.platform.api.setAux(this.device.serial, this.device.aux);
            this.device.state = on ? '1' : '0';
            this.service.updateCharacteristic(
                this.platform.Characteristic.InUse,
                on
                    ? this.platform.Characteristic.InUse.IN_USE
                    : this.platform.Characteristic.InUse.NOT_IN_USE,
            );
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set valve state:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
    }
    async getInUse() {
        this.platform.log.debug(`[${this.device.label}] GET InUse -> ${this.isOn}`);
        return this.isOn
            ? this.platform.Characteristic.InUse.IN_USE
            : this.platform.Characteristic.InUse.NOT_IN_USE;
    }
}
exports.ValveAccessory = ValveAccessory;
