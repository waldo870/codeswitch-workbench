// Node-only opt-in. Product browser code must not import this runtime configuration.
import { readFileSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { release } from 'node:os';
import type { TransportOptions } from './local-transport.js';
export function gatewayFromRoutes(routes: string): string | null {
  const gateways = new Set(routes.trim().split('\n').slice(1).flatMap(line => {
    const fields = line.trim().split(/\s+/);
    if (fields[1] !== '00000000' || !/^[0-9A-Fa-f]{8}$/.test(fields[2] ?? '') || (parseInt(fields[3] ?? '0', 16) & 3) !== 3) return [];
    return [fields[2]!.match(/../g)!.reverse().map(b => parseInt(b, 16)).join('.')];
  }));
  return gateways.size === 1 ? [...gateways][0]! : null;
}
export function windowsWslEndpoint(value: string, host: string, environment = { kernel: release(), routes: () => readFileSync('/proc/net/route', 'utf8') }): string {
  const url = new URL(value);
  const privateIp = isIPv4(host) && (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host));
  if (!/microsoft|wsl/i.test(environment.kernel) || !privateIp || host !== gatewayFromRoutes(environment.routes()) || url.protocol !== 'http:' || url.hostname !== host || url.port !== '1234' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Windows endpoint must be the explicitly configured current WSL NAT gateway on HTTP port 1234.');
  return url.origin;
}
export function configuredLMStudioOptions(env: NodeJS.ProcessEnv = process.env): TransportOptions {
  const host = env.CODESWITCH_WINDOWS_WSL_HOST;
  if (host === undefined) return {};
  // Host only, never a URL; malformed/empty configuration fails closed.
  const endpoint = windowsWslEndpoint(`http://${host}:1234`, host);
  return { endpoint, windowsWslHost: host };
}
