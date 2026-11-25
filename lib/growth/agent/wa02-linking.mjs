/** WA-02: mock-only owner binding and incoming replay contract. No live accounts. */
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {WA02_VERSION,inspectSignedWhatsAppWebhook} from './wa02-webhook.mjs';
