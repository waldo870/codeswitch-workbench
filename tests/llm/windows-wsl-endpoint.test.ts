import { OllamaAdapter } from '../../src/llm/ollama-adapter.js';
import { it, expect } from 'vitest';
import { gatewayFromRoutes, windowsWslEndpoint, configuredLMStudioOptions } from '../../src/llm/windows-wsl-endpoint.js';
import { lmstudioEndpoint } from '../../src/llm/lmstudio-adapter.js';
const routes = 'Iface Destination Gateway Flags\neth0 00000000 0190A8C0 0003\n';
const environment = { kernel: 'microsoft-standard-WSL2', routes: () => routes };
const endpoint = 'http://192.168.144.1:1234';
it('decodes the current NAT gateway from trusted kernel route data', () => {
 expect(gatewayFromRoutes(routes)).toBe('192.168.144.1');
 expect(gatewayFromRoutes(routes + 'eth1 00000000 0100000A 0003\n')).toBeNull();
 expect(gatewayFromRoutes('Iface Destination Gateway Flags\n')).toBeNull();
});
it('requires explicit matching WSL NAT host; default adapter stays loopback-only', () => {
 expect(windowsWslEndpoint(endpoint, '192.168.144.1', environment)).toBe(endpoint);
 expect(() => lmstudioEndpoint(endpoint)).toThrow('loopback');
 expect(lmstudioEndpoint()).toBe('http://127.0.0.1:1234');
 expect(configuredLMStudioOptions({})).toEqual({});
});
it.each(['http://192.168.144.2:1234','http://192.168.144.1:8000','https://192.168.144.1:1234','http://user:pass@192.168.144.1:1234','http://192.168.144.1:1234/v1','http://192.168.144.1:1234/?x=1','http://192.168.144.1:1234/#x','http://example.test:1234'])('rejects endpoint escape %s', value => {
 expect(() => windowsWslEndpoint(value, '192.168.144.1', environment)).toThrow();
});
it.each(['8.8.8.8','169.254.169.254','127.0.0.1','192.168.144.2','192.168.144.01','localhost','192.168.144.1:1234',''])('rejects untrusted configured host %s', host => {
 expect(() => windowsWslEndpoint(endpoint, host, environment)).toThrow();
});
it('requires WSL and a single gateway even for private addresses', () => {
 expect(() => windowsWslEndpoint(endpoint, '192.168.144.1', { ...environment, kernel: 'linux-native' })).toThrow();
 expect(() => windowsWslEndpoint(endpoint, '192.168.144.1', { ...environment, routes: () => '' })).toThrow();
});

it('Windows opt-in does not widen Ollama or permit URL configuration', () => {
 expect(() => new OllamaAdapter('test-only', { endpoint: 'http://192.168.144.1:11434', windowsWslHost: '192.168.144.1' })).toThrow();
 expect(() => configuredLMStudioOptions({ CODESWITCH_WINDOWS_WSL_HOST: 'https://example.test' })).toThrow();
 expect(() => configuredLMStudioOptions({ CODESWITCH_WINDOWS_WSL_HOST: '' })).toThrow();
});
