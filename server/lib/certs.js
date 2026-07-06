import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { X509Certificate } from 'crypto';
import selfsigned from 'selfsigned';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, '..', 'data', 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');

// Browsers only allow microphone access (getUserMedia) on a secure context.
// localhost gets a free pass over plain HTTP, but a LAN address like
// 192.168.1.50 does not - so recording from a phone needs real HTTPS, even
// if the certificate is self-signed and unknown to the phone's browser.
function currentLanIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}

function certCoversIPs(certPem, ips) {
  try {
    const cert = new X509Certificate(certPem);
    const san = cert.subjectAltName || '';
    return ips.every(ip => san.includes(`IP Address:${ip}`));
  } catch {
    return false;
  }
}

async function generate(ips) {
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...ips.map(ip => ({ type: 7, ip })),
  ];
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'highvolt.local' }], {
    keySize: 2048,
    notAfterDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years - avoid re-prompting the phone's "unsafe site" warning often
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'subjectAltName', altNames },
    ],
  });
  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);
  return { cert: pems.cert, key: pems.private };
}

// Reuses the cert on disk as long as it's unexpired and already covers every
// LAN IP this machine currently has (regenerating on IP change, e.g. after
// reconnecting to Wi-Fi, so the phone's browser isn't shown a hostname
// mismatch on top of the usual self-signed warning).
export async function ensureCert() {
  const ips = currentLanIPs();
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const cert = fs.readFileSync(certPath, 'utf-8');
    const key = fs.readFileSync(keyPath, 'utf-8');
    const x509 = new X509Certificate(cert);
    const notExpired = new Date(x509.validTo) > new Date();
    if (notExpired && certCoversIPs(cert, ips)) {
      return { cert, key };
    }
  }
  return generate(ips);
}
