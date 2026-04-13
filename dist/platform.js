"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IaquaLinkPlatform = void 0;
const settings_js_1 = require("./settings.js");
const iaqualinkApi_js_1 = require("./iaqualinkApi.js");
const switchAccessory_js_1 = require("./accessories/switchAccessory.js");
const thermostatAccessory_js_1 = require("./accessories/thermostatAccessory.js");
const lightAccessory_js_1 = require("./accessories/lightAccessory.js");
const sensorAccessory_js_1 = require("./accessories/sensorAccessory.js");
class IaquaLinkPlatform {
    constructor(log, config, homebridgeApi) {
        this.log = log;
        this.homebridgeApi = homebridgeApi;
        this.accessories = [];
        this.Service = homebridgeApi.hap.Service;
        this.Characteristic = homebridgeApi.hap.Characteristic;
        this.config = config;
        this.pollingInterval = (this.config.pollingInterval ?? 30) * 1000;
        this.api = new iaqualinkApi_js_1.IAqualinkApiClient(this.config.username, this.config.password);
        this.homebridgeApi.on('didFinishLaunching', () => {
            this.log.debug('Finished launching, starting device discovery');
            this.discoverDevices();
        });
        this.homebridgeApi.on('shutdown', () => {
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
            }
        });
    }
    configureAccessory(accessory) {
        this.log.info('Restoring cached accessory:', accessory.displayName);
        this.accessories.push(accessory);
    }
    async discoverDevices() {
        try {
            this.log.info('Logging in to iAquaLink...');
            await this.api.login();
            this.log.info('Login successful.');
        }
        catch (err) {
            this.log.error('Failed to log in to iAquaLink:', String(err));
            return;
        }
        let systems = [];
        try {
            systems = await this.api.getDevices();
            this.log.info(`Found ${systems.length} iAquaLink system(s).`);
        }
        catch (err) {
            this.log.error('Failed to fetch devices:', String(err));
            return;
        }
        for (const system of systems) {
            if (system.device_type !== 'iaqua') {
                this.log.debug(`Skipping non-iaqua device: ${system.name} (${system.device_type})`);
                continue;
            }
            await this.discoverSystemDevices(system);
        }
        this.pollingTimer = setInterval(() => this.pollAll(systems), this.pollingInterval);
    }
    async discoverSystemDevices(system) {
        this.log.info(`Discovering devices for system: ${system.name} (${system.serial_number})`);
        try {
            const homeData = await this.api.getHomeScreen(system.serial_number);
            const devicesData = await this.api.getDevicesScreen(system.serial_number);
            const tempUnit = homeData?.home_screen?.[3]?.temp_scale ?? 'F';
            const parsedDevices = [
                ...this.parseHomeScreen(homeData, system, tempUnit),
                ...this.parseDevicesScreen(devicesData, system, tempUnit),
            ];
            for (const device of parsedDevices) {
                this.registerDevice(device);
            }
        }
        catch (err) {
            this.log.error(`Failed to discover devices for ${system.name}:`, String(err));
        }
    }
    parseHomeScreen(data, system, tempUnit) {
        const screen = data?.home_screen;
        if (!screen) {
            return [];
        }
        const parsed = [];
        for (const item of screen.slice(4)) {
            const name = Object.keys(item)[0];
            const state = String(Object.values(item)[0]);
            const deviceType = this.inferHomeDeviceType(name);
            if (!deviceType) {
                continue;
            }
            parsed.push({
                serial: system.serial_number,
                systemName: system.name,
                name,
                label: name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
                state,
                deviceType,
                tempUnit,
            });
        }
        return parsed;
    }
    parseDevicesScreen(data, system, tempUnit) {
        const screen = data?.devices_screen;
        if (!screen) {
            return [];
        }
        const parsed = [];
        for (const item of screen.slice(3)) {
            const auxKey = Object.keys(item)[0];
            const attrs = { aux: auxKey.replace('aux_', '') };
            for (const sub of Object.values(item)[0]) {
                Object.assign(attrs, sub);
            }
            if (!attrs.name || attrs.state === undefined) {
                continue;
            }
            const deviceType = this.inferAuxDeviceType(attrs);
            if (!deviceType) {
                continue;
            }
            const rawLabel = attrs.label ?? attrs.name;
            parsed.push({
                serial: system.serial_number,
                systemName: system.name,
                name: attrs.name,
                label: rawLabel.split(/[\s_]+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' '),
                state: String(attrs.state),
                deviceType,
                aux: attrs.aux,
                subtype: attrs.subtype,
                tempUnit,
            });
        }
        return parsed;
    }
    inferHomeDeviceType(name) {
        const map = {
            pool_pump: 'pool_pump', spa_pump: 'spa_pump',
            pool_heater: 'pool_heater', spa_heater: 'spa_heater',
            pool_set_point: 'pool_set_point', spa_set_point: 'spa_set_point',
            pool_temp: 'pool_temp', spa_temp: 'spa_temp',
            air_temp: 'air_temp', solar_temp: 'solar_temp',
            freeze_protection: 'freeze_protection',
        };
        return map[name] ?? null;
    }
    inferAuxDeviceType(attrs) {
        if (attrs.type === '2') { return 'aux_color_light'; }
        if (attrs.type === '1') { return 'aux_dimmable_light'; }
        if (attrs.label && attrs.label.toUpperCase().includes('LIGHT')) { return 'aux_light_switch'; }
        return 'aux_switch';
    }
    registerDevice(device) {
        const uuid = this.homebridgeApi.hap.uuid.generate(`${device.serial}-${device.name}`);
        const existing = this.accessories.find(a => a.UUID === uuid);
        let accessory;
        if (existing) {
            this.log.info(`Restoring existing accessory: ${device.label}`);
            accessory = existing;
            accessory.context.device = device;
        }
        else {
            this.log.info(`Adding new accessory: ${device.label}`);
            accessory = new this.homebridgeApi.platformAccessory(device.label, uuid);
            accessory.context.device = device;
            this.homebridgeApi.registerPlatformAccessories(settings_js_1.PLUGIN_NAME, settings_js_1.PLATFORM_NAME, [accessory]);
            this.accessories.push(accessory);
        }
        this.createAccessoryHandler(accessory, device);
    }
    createAccessoryHandler(accessory, device) {
        switch (device.deviceType) {
            case 'pool_pump':
            case 'spa_pump':
            case 'pool_heater':
            case 'spa_heater':
            case 'aux_switch':
                new switchAccessory_js_1.SwitchAccessory(this, accessory);
                break;
            case 'pool_set_point':
            case 'spa_set_point':
                new thermostatAccessory_js_1.ThermostatAccessory(this, accessory);
                break;
            case 'aux_light_switch':
            case 'aux_dimmable_light':
            case 'aux_color_light':
                new lightAccessory_js_1.LightAccessory(this, accessory);
                break;
            case 'pool_temp':
            case 'spa_temp':
            case 'air_temp':
            case 'solar_temp':
            case 'freeze_protection':
                new sensorAccessory_js_1.SensorAccessory(this, accessory);
                break;
            default:
                this.log.debug(`No handler for device type: ${device.deviceType}`);
        }
    }
    async pollAll(systems) {
        this.log.debug('Polling iAquaLink for updates...');
        try {
            await this.api.refreshAuth();
        }
        catch (err) {
            this.log.warn('Token refresh failed during poll:', String(err));
        }
        for (const system of systems) {
            if (system.device_type !== 'iaqua') { continue; }
            try {
                const homeData = await this.api.getHomeScreen(system.serial_number);
                const devicesData = await this.api.getDevicesScreen(system.serial_number);
                const tempUnit = homeData?.home_screen?.[3]?.temp_scale ?? 'F';
                const updates = [
                    ...this.parseHomeScreen(homeData, system, tempUnit),
                    ...this.parseDevicesScreen(devicesData, system, tempUnit),
                ];
                for (const update of updates) {
                    const uuid = this.homebridgeApi.hap.uuid.generate(`${update.serial}-${update.name}`);
                    const accessory = this.accessories.find(a => a.UUID === uuid);
                    if (accessory) {
                        accessory.context.device = update;
                    }
                }
            }
            catch (err) {
                this.log.debug(`Poll error for ${system.name}:`, String(err));
            }
        }
    }
}
exports.IaquaLinkPlatform = IaquaLinkPlatform;
