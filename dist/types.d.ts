export interface IaquaLinkConfig {
    platform: string;
    name: string;
    username: string;
    password: string;
    pollingInterval?: number;
    temperatureUnit?: 'F' | 'C';
}
export interface DeviceState {
    name: string;
    state: string;
    label?: string;
    type?: string;
    subtype?: string;
    aux?: string;
}
export type DeviceType = 'pool_pump' | 'spa_pump' | 'pool_heater' | 'spa_heater' | 'pool_set_point' | 'spa_set_point' | 'pool_temp' | 'spa_temp' | 'air_temp' | 'solar_temp' | 'freeze_protection' | 'aux_switch' | 'aux_light_switch' | 'aux_dimmable_light' | 'aux_color_light' | 'sensor';
export interface ParsedDevice {
    serial: string;
    systemName: string;
    name: string;
    label: string;
    state: string;
    deviceType: DeviceType;
    aux?: string;
    subtype?: string;
    tempUnit?: string;
}
