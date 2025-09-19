// Default ports for E2B sandbox containers
export const DEFAULT_CONTAINER_PORTS = [49999, 49983, 6080];

// Port descriptions for documentation
export const PORT_DESCRIPTIONS = {
  49999: 'Main E2B API port',
  49983: 'ENVD',
  6080: 'noVNC web interface',
} as const;

// TCP forwarder listen ports (external ports that clients connect to)
// export const TCP_FORWARDER_PORTS = {
//   main: 9999,    // Routes to container port 49999
//   jupyter: 9888, // Routes to container port 49983
// } as const;

// // Mapping from forwarder ports to container ports
// export const FORWARDER_TO_CONTAINER_PORT_MAP = {
//   [TCP_FORWARDER_PORTS.main]: 49999,
//   [TCP_FORWARDER_PORTS.jupyter]: 49983,
// } as const;