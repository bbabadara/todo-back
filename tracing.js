'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const serviceName = process.env.OTEL_SERVICE_NAME || 'todo-back';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317';
const envAttr = process.env.OTEL_RESOURCE_ATTRIBUTES || 'deployment.environment=development';

const resourceAttributes = { [SemanticResourceAttributes.SERVICE_NAME]: serviceName };
envAttr.split(',').forEach((pair) => {
  const [key, value] = pair.trim().split('=');
  if (key && value) resourceAttributes[key.trim()] = value.trim();
});

const sdk = new NodeSDK({
  resource: new Resource(resourceAttributes),
  traceExporter: new OTLPTraceExporter({ url: endpoint }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
console.log(`[otel] started (service=${serviceName}, endpoint=${endpoint})`);

process.on('SIGTERM', () => {
  sdk.shutdown().then(
    () => process.exit(0),
    () => process.exit(1)
  );
});

module.exports = { sdk };