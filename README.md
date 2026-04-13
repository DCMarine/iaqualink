# homebridge-iaqualink

A [Homebridge](https://homebridge.io) plugin for Jandy/Zodiac **iAquaLink** pool and spa controllers. Control your pool equipment — pumps, heaters, lights, auxiliary devices, and more — directly from the Apple Home app and Siri.

[![npm](https://img.shields.io/npm/v/homebridge-iaqualink)](https://www.npmjs.com/package/homebridge-iaqualink)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Homebridge](https://img.shields.io/badge/homebridge-%3E%3D1.6.0-blueviolet)](https://homebridge.io)

---

## Features

- 🏊 **Pool & spa pump** on/off control
- 🔥 **Heater control** with temperature set point (pool and spa)
- 💡 **Lights** — simple on/off, dimmable (25% increments), and multi-color effects
- 🔧 **Auxiliary devices** — auto-discovered; fans, valves, and switches all supported
- 🌡️ **Temperature sensors** — pool, spa, air, and solar temps
- ❄️ **Freeze protection** indicator
- 🔁 **Automatic polling** — keeps HomeKit state in sync (configurable interval)
- 🔐 **Token auto-refresh** — stays authenticated without re-entering credentials
- ✅ **[Homebridge Config UI X](https://github.com/homebridge/homebridge-config-ui-x)** support

---

## Requirements

- [Homebridge](https://homebridge.io) v1.6.0 or later
- Node.js v18.0.0 or later
- A **Jandy/Zodiac iAquaLink** controller with an active iAquaLink account
  - Compatible with **iAqua** systems (iaqualink.net API)
  - Pool controllers: iAquaLink 2.0, iAquaLink RS, etc.

---

## Installation

### Option 1 — Homebridge Config UI X (recommended)

1. Open the **Plugins** tab in Homebridge Config UI X.
2. Search for `homebridge-iaqualink`.
3. Click **Install**.
4. Fill in your credentials in the plugin settings and click **Save**.
5. Restart Homebridge.

### Option 2 — Manual

```bash
npm install -g homebridge-iaqualink
```

Then add the platform to your `~/.homebridge/config.json` (see [Configuration](#configuration) below) and restart Homebridge.

---

## Configuration

### Minimal config

```json
{
  "platforms": [
    {
      "platform": "iAquaLink",
      "name": "iAquaLink",
      "username": "your@email.com",
      "password": "your-password"
    }
  ]
}
```

### All options

```json
{
  "platforms": [
    {
      "platform": "iAquaLink",
      "name": "iAquaLink",
      "username": "your@email.com",
      "password": "your-password",
      "pollingInterval": 30,
      "temperatureUnit": "F"
    }
  ]
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `platform` | `string` | **required** | Must be `"iAquaLink"` |
| `name` | `string` | `"iAquaLink"` | Display name for the platform |
| `username` | `string` | **required** | Email address for your iAquaLink account |
| `password` | `string` | **required** | Password for your iAquaLink account |
| `pollingInterval` | `number` | `30` | How often (seconds) to poll for state updates. Min: 10, Max: 300 |
| `temperatureUnit` | `"F"` \| `"C"` | auto-detected | Override the temperature unit. If omitted, the unit is read from your controller. |
| `auxiliaryDevices` | `array` | — | Optional overrides for individual auxiliary outputs. See [Auxiliary Devices](#auxiliary-devices) below. |

---

## Supported Devices

All devices are **auto-discovered** from your iAquaLink account on startup. No manual configuration is needed for pumps, heaters, temperatures, or named auxiliary devices.

### Pool & Spa Equipment

| iAquaLink Device | HomeKit Service | Notes |
|---|---|---|
| Pool Pump | **Switch** | On/Off |
| Spa Pump | **Switch** | On/Off |
| Pool Heater | **Switch** | On/Off; also controls the Pool Thermostat heating mode |
| Spa Heater | **Switch** | On/Off; also controls the Spa Thermostat heating mode |
| Pool Set Point | **Thermostat** | Current temp (from sensor), target temp, heater on/off |
| Spa Set Point | **Thermostat** | Current temp (from sensor), target temp, heater on/off |
| Pool Temperature | **Temperature Sensor** | Read-only |
| Spa Temperature | **Temperature Sensor** | Read-only |
| Air Temperature | **Temperature Sensor** | Read-only |
| Solar Temperature | **Temperature Sensor** | Read-only |
| Freeze Protection | **Occupancy Sensor** | Active = freeze protection is enabled |

### Auxiliary Devices

Auxiliary outputs are **auto-discovered**. The HomeKit service is determined by the iAquaLink `type` field:

| iAquaLink `type` | HomeKit Service | Example devices |
|---|---|---|
| `0` — generic switch | **Switch** | Spa jets, cleaners, chlorinators |
| `1` — dimmable light | **Lightbulb** (with brightness) | Dimmable pool/spa lights |
| `2` — color light | **Lightbulb** (with effect selector) | Jandy WaterColors, Pentair SAm/SAL |

> **Only named devices appear.** Auxiliary outputs that have not been given a name in the iAquaLink app (i.e. their label is still `aux_1`, `aux_2`, etc.) are automatically hidden. Name them in the iAquaLink app and they will appear on the next Homebridge restart.

#### Overriding the HomeKit service type

Use `auxiliaryDevices` in your config to override how a specific output is presented in HomeKit — useful for fans, water valves, and bubblers that iAquaLink reports as a generic switch:

```json
{
  "platforms": [{
    "platform": "iAquaLink",
    "username": "your@email.com",
    "password": "your-password",
    "auxiliaryDevices": [
      { "aux": "1", "type": "switch", "name": "Spa Jets" },
      { "aux": "2", "type": "fan",    "name": "Aerator" },
      { "aux": "3", "type": "valve",  "name": "Waterfall", "valveType": "faucet" },
      { "aux": "4", "type": "valve",  "name": "Bubblers",  "valveType": "generic" }
    ]
  }]
}
```

| `aux` | The auxiliary output number (`"1"` = Aux 1, `"2"` = Aux 2, …) |
|---|---|
| `type` | `"switch"`, `"fan"`, or `"valve"` |
| `name` | Optional display-name override shown in the Home app |
| `valveType` | Only for `"valve"`: `"generic"`, `"irrigation"`, `"shower"`, or `"faucet"` |

Config overrides take priority over the auto-detected type from iAquaLink.

---

## Building from Source

```bash
# Clone the repo
git clone https://github.com/dcmarine/iaqualink.git
cd iaqualink

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Watch mode (auto-recompile on save)
npm run watch
```

### Linking to Homebridge for local development

```bash
# From the plugin directory
npm link

# In your Homebridge install directory
npm link homebridge-iaqualink
```

---

## Docker / Homebridge Container

If you're running Homebridge in Docker (as in the included `homebridge/compose.yaml`):

### Install from npm (recommended)

```bash
docker exec homebridge npm install -g homebridge-iaqualink
docker restart homebridge
```

### Install from local source

The `dist/` folder is pre-built and included in the repository, so no
compilation step is needed inside the container.

```bash
# Copy the whole repo (including dist/) into the container
docker cp . homebridge:/tmp/homebridge-iaqualink

# Install from the local directory
docker exec homebridge npm install -g /tmp/homebridge-iaqualink

# Restart Homebridge
docker restart homebridge
```

### Reinstall after source changes

After editing `src/` files, rebuild locally first, then re-copy:

```bash
npm run build   # regenerates dist/
docker cp . homebridge:/tmp/homebridge-iaqualink
docker exec homebridge npm install -g /tmp/homebridge-iaqualink
docker restart homebridge
```

---

## Troubleshooting

**Devices not appearing in HomeKit**
- Ensure your iAquaLink system type is `iaqua` (standard Jandy/Zodiac pool controller). eXO chlorinators and Zodiac robotic cleaners use different APIs and are not currently supported.
- Check the Homebridge logs for login or API errors.

**"Service Communication Failure" in Home app**
- Verify your iAquaLink credentials are correct.
- Confirm the iAquaLink app itself can connect to your system.
- Try reducing the `pollingInterval` to avoid rate limiting.

**Temperatures showing as "Not Available"**
- The controller may report empty temperature values when sensors are not connected or the system is offline. This is normal.

**Homebridge log shows 429 errors**
- You are being rate-limited by the iAquaLink API. Increase your `pollingInterval` (e.g., `60` or higher).

---

## Compatibility

| System | Status |
|---|---|
| Jandy iAquaLink 2.0 / RS | ✅ Supported |
| Zodiac iAquaLink | ✅ Supported |
| eXO Chlorinator | ⚠️ Not yet supported |
| Zodiac Robotic Cleaners (Polaris, Cyclonext) | ⚠️ Not yet supported |

> **Note:** This plugin uses the reverse-engineered iAquaLink REST API (`r-api.iaqualink.net`). It is not affiliated with, endorsed by, or supported by Jandy, Zodiac, or Fluidra.

---

## License

MIT — see [LICENSE](LICENSE).
