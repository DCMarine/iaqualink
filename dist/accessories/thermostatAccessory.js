"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatAccessory = void 0;
const TEMP_C_MIN = 1;
const TEMP_C_MAX = 40;
function fahrenheitToCelsius(f) {
    return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}
function celsiusToFahrenheit(c) {
    return Math.round((c * 9) / 5 + 32);
}
class ThermostatAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const device = accessory.context.device;
        accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jandy / Zodiac')
            .setCharacteristic(this.platform.Characteristic.Model, device.deviceType === 'pool_set_point' ? 'Pool Thermostat' : 'Spa Thermostat')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, `${device.serial}-${device.name}`);
        this.service = accessory.getService(this.platform.Service.Thermostat)
            || accessory.addService(this.platform.Service.Thermostat);
        this.service.setCharacteristic(this.platform.Characteristic.Name, device.label);
        this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .onGet(this.getCurrentTemperature.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
            .onGet(this.getTargetTemperature.bind(this))
            .onSet(this.setTargetTemperature.bind(this))
            .setProps({ minValue: TEMP_C_MIN, maxValue: TEMP_C_MAX, minStep: 1 });
        this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
            .onGet(this.getCurrentHeatingCoolingState.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
            .onGet(this.getTargetHeatingCoolingState.bind(this))
            .onSet(this.setTargetHeatingCoolingState.bind(this))
            .setProps({ validValues: [0, 1] });
        this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
            .onGet(this.getTemperatureDisplayUnits.bind(this));
    }
    get device() { return this.accessory.context.device; }
    get isFahrenheit() { return (this.device.tempUnit ?? 'F') === 'F'; }
    toHomeKit(temp) { return this.isFahrenheit ? fahrenheitToCelsius(temp) : temp; }
    fromHomeKit(temp) { return this.isFahrenheit ? celsiusToFahrenheit(temp) : temp; }
    getCurrentTempFromContext() {
        const isPool = this.device.deviceType === 'pool_set_point';
        const sensorName = isPool ? 'pool_temp' : 'spa_temp';
        const uuid = this.platform.homebridgeApi.hap.uuid.generate(`${this.device.serial}-${sensorName}`);
        const sensorAccessory = this.platform.accessories.find(a => a.UUID === uuid);
        if (sensorAccessory) {
            const temp = parseFloat(sensorAccessory.context.device.state);
            if (!isNaN(temp)) { return this.toHomeKit(temp); }
        }
        return this.toHomeKit(parseFloat(this.device.state) || 72);
    }
    async getCurrentTemperature() {
        const temp = this.getCurrentTempFromContext();
        this.platform.log.debug(`[${this.device.label}] GET CurrentTemp -> ${temp}°C`);
        return temp;
    }
    async getTargetTemperature() {
        const raw = parseFloat(this.device.state);
        const temp = this.toHomeKit(isNaN(raw) ? (this.isFahrenheit ? 80 : 27) : raw);
        this.platform.log.debug(`[${this.device.label}] GET TargetTemp -> ${temp}°C`);
        return temp;
    }
    async setTargetTemperature(value) {
        const tempC = value;
        const tempNative = this.fromHomeKit(tempC);
        this.platform.log.info(`[${this.device.label}] SET TargetTemp -> ${tempC}°C (${tempNative}° native)`);
        const isPool = this.device.deviceType === 'pool_set_point';
        const spaUuid = this.platform.homebridgeApi.hap.uuid.generate(`${this.device.serial}-spa_set_point`);
        const spaExists = this.platform.accessories.some(a => a.UUID === spaUuid);
        const tempKey = isPool && spaExists ? 'temp2' : 'temp1';
        try {
            await this.platform.api.setTemps(this.device.serial, { [tempKey]: String(tempNative) });
            this.device.state = String(tempNative);
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to set temperature:`, String(err));
            throw new this.platform.homebridgeApi.hap.HapStatusError(this.platform.homebridgeApi.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        }
    }
    async getCurrentHeatingCoolingState() {
        const isPool = this.device.deviceType === 'pool_set_point';
        const heaterName = isPool ? 'pool_heater' : 'spa_heater';
        const uuid = this.platform.homebridgeApi.hap.uuid.generate(`${this.device.serial}-${heaterName}`);
        const heaterAccessory = this.platform.accessories.find(a => a.UUID === uuid);
        if (heaterAccessory) {
            const isOn = heaterAccessory.context.device.state === '1' || heaterAccessory.context.device.state === '3';
            return isOn
                ? this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
                : this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
        return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }
    async getTargetHeatingCoolingState() { return this.getCurrentHeatingCoolingState(); }
    async setTargetHeatingCoolingState(value) {
        this.platform.log.info(`[${this.device.label}] SET HeatingCoolingState -> ${value}`);
        const isPool = this.device.deviceType === 'pool_set_point';
        try {
            if (isPool) { await this.platform.api.setPoolHeater(this.device.serial); }
            else { await this.platform.api.setSpaHeater(this.device.serial); }
        }
        catch (err) {
            this.platform.log.error(`[${this.device.label}] Failed to toggle heater:`, String(err));
        }
    }
    async getTemperatureDisplayUnits() {
        return this.isFahrenheit
            ? this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT
            : this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
    }
}
exports.ThermostatAccessory = ThermostatAccessory;
