import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";

type StackClientTemplateContext = {
  enableAlloy: boolean;
  enableOtelClientCollector: boolean;
  enableFluentBit: boolean;
  enableFilebeat: boolean;
  enableVector: boolean;

  alloyImage: string;
  alloyConfigFile: string;
  otelClientImage: string;
  otelClientConfigFile: string;
  fluentBitImage: string;
  fluentBitConfigFile: string;
  filebeatImage: string;
  filebeatConfigFile: string;
  filebeatDataPath: string;
  vectorImage: string;
  vectorConfigFile: string;
  vectorDataPath: string;

  hasAnyConfig: boolean;
  obsNetwork: string;
};

type AlloyConfigTemplateContext = {
  alloyOtlpEndpoint: string;
};

type OTelClientConfigTemplateContext = {
  otelClientOtlpEndpoint: string;
};

type FluentBitConfigTemplateContext = {
  fluentBitOpenSearchHost: string;
  fluentBitOpenSearchPort: number;
  fluentBitOpenSearchTls: boolean;
};

type FilebeatConfigTemplateContext = {
  filebeatOpenSearchEndpoint: string;
};

type VectorConfigTemplateContext = {
  vectorOpenSearchEndpoint: string;
};

type ParsedHttpEndpoint = {
  host: string;
  port: number;
  tls: boolean;
};

async function renderTemplate<TContext>(templatePath: string, context: TContext): Promise<string> {
  const templateSource = await fs.readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSource, { noEscape: true });
  return `${template(context).trimEnd()}\n`;
}

async function writeAtomically(targetFile: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  const tempFile = `${targetFile}.tmp`;
  await fs.writeFile(tempFile, content, "utf8");
  await fs.rename(tempFile, targetFile);
}

function resolveOutputPath(projectRoot: string, outputPath: string): string {
  return path.isAbsolute(outputPath) ? outputPath : path.resolve(projectRoot, outputPath);
}

function toComposePathRef(outputPath: string): string {
  if (path.isAbsolute(outputPath)) {
    return outputPath;
  }
  const normalized = outputPath.replace(/^[.][\\/]/, "").replace(/\\/g, "/");
  return normalized.length > 0 ? `\${PROJECT_ROOT}/${normalized}` : "${PROJECT_ROOT}";
}

function parseBoolean(value: string | undefined, key: string, defaultValue: boolean): boolean {
  const normalized = (value ?? `${defaultValue}`).toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean: ${value}. ${key} must be true/false.`);
}

function parseHttpEndpoint(raw: string, key: string): ParsedHttpEndpoint {
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(raw);
  } catch {
    throw new Error(`Invalid URL for ${key}: ${raw}`);
  }

  if (endpointUrl.protocol !== "http:" && endpointUrl.protocol !== "https:") {
    throw new Error(`${key} must use http:// or https://`);
  }

  const tls = endpointUrl.protocol === "https:";
  const port = endpointUrl.port
    ? Number.parseInt(endpointUrl.port, 10)
    : tls
      ? 443
      : 80;

  return {
    host: endpointUrl.hostname,
    port,
    tls,
  };
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = process.env.PROJECT_ROOT ?? path.resolve(scriptDir, "../..");
  const clientStackFile = process.env.CLIENT_STACK_FILE ?? "deploy/stack.client.yml";
  const obsNetwork = process.env.OBS_NETWORK ?? "obs_observability";

  const enableAlloy = parseBoolean(process.env.ENABLE_CLIENT_ALLOY, "ENABLE_CLIENT_ALLOY", true);
  const enableOtelClientCollector = parseBoolean(
    process.env.ENABLE_CLIENT_OTELCOL,
    "ENABLE_CLIENT_OTELCOL",
    false,
  );
  const enableFluentBit = parseBoolean(
    process.env.ENABLE_CLIENT_FLUENT_BIT,
    "ENABLE_CLIENT_FLUENT_BIT",
    false,
  );
  const enableFilebeat = parseBoolean(
    process.env.ENABLE_CLIENT_FILEBEAT,
    "ENABLE_CLIENT_FILEBEAT",
    false,
  );
  const enableVector = parseBoolean(process.env.ENABLE_CLIENT_VECTOR, "ENABLE_CLIENT_VECTOR", false);

  const hasAnyService =
    enableAlloy || enableOtelClientCollector || enableFluentBit || enableFilebeat || enableVector;
  if (!hasAnyService) {
    throw new Error("At least one client agent must be enabled.");
  }

  const clientOtlpEndpoint = process.env.CLIENT_OTLP_ENDPOINT ?? "http://otel-collector:4318";
  const clientOpenSearchEndpoint = process.env.CLIENT_OPENSEARCH_ENDPOINT ?? "http://opensearch:9200";

  const alloyImage = process.env.ALLOY_IMAGE ?? "grafana/alloy:v1.5.1";
  const alloyOtlpEndpoint = process.env.ALLOY_OTLP_ENDPOINT ?? clientOtlpEndpoint;
  const alloyConfigFile = process.env.ALLOY_CONFIG_FILE ?? "config/alloy-client-config.alloy";

  const otelClientImage = process.env.OTEL_CLIENT_IMAGE ?? "otel/opentelemetry-collector-contrib:0.112.0";
  const otelClientOtlpEndpoint = process.env.OTEL_CLIENT_OTLP_ENDPOINT ?? clientOtlpEndpoint;
  const otelClientConfigFile =
    process.env.OTEL_CLIENT_CONFIG_FILE ?? "config/otel-client-collector-config.yaml";

  const fluentBitImage = process.env.FLUENT_BIT_IMAGE ?? "fluent/fluent-bit:3.1.9";
  const fluentBitOpenSearchEndpoint =
    process.env.FLUENT_BIT_OPENSEARCH_ENDPOINT ?? clientOpenSearchEndpoint;
  const fluentBitConfigFile = process.env.FLUENT_BIT_CONFIG_FILE ?? "config/fluent-bit-client.conf";

  const filebeatImage = process.env.FILEBEAT_IMAGE ?? "docker.elastic.co/beats/filebeat:8.15.2";
  const filebeatOpenSearchEndpoint = process.env.FILEBEAT_OPENSEARCH_ENDPOINT ?? clientOpenSearchEndpoint;
  const filebeatConfigFile = process.env.FILEBEAT_CONFIG_FILE ?? "config/filebeat-client.yml";

  const vectorImage = process.env.VECTOR_IMAGE ?? "timberio/vector:0.42.0-alpine";
  const vectorOpenSearchEndpoint = process.env.VECTOR_OPENSEARCH_ENDPOINT ?? clientOpenSearchEndpoint;
  const vectorConfigFile = process.env.VECTOR_CONFIG_FILE ?? "config/vector-client.yaml";

  const stackTemplatePath = path.resolve(scriptDir, "../templates/stack.client.yml.hbs");
  const alloyTemplatePath = path.resolve(scriptDir, "../templates/alloy-client-config.alloy.hbs");
  const otelClientTemplatePath = path.resolve(
    scriptDir,
    "../templates/otel-client-collector-config.yaml.hbs",
  );
  const fluentBitTemplatePath = path.resolve(scriptDir, "../templates/fluent-bit-client.conf.hbs");
  const filebeatTemplatePath = path.resolve(scriptDir, "../templates/filebeat-client.yml.hbs");
  const vectorTemplatePath = path.resolve(scriptDir, "../templates/vector-client.yaml.hbs");

  const renderedStack = await renderTemplate<StackClientTemplateContext>(stackTemplatePath, {
    enableAlloy,
    enableOtelClientCollector,
    enableFluentBit,
    enableFilebeat,
    enableVector,
    alloyImage,
    alloyConfigFile: toComposePathRef(alloyConfigFile),
    otelClientImage,
    otelClientConfigFile: toComposePathRef(otelClientConfigFile),
    fluentBitImage,
    fluentBitConfigFile: toComposePathRef(fluentBitConfigFile),
    filebeatImage,
    filebeatConfigFile: toComposePathRef(filebeatConfigFile),
    filebeatDataPath: toComposePathRef("./data/filebeat"),
    vectorImage,
    vectorConfigFile: toComposePathRef(vectorConfigFile),
    vectorDataPath: toComposePathRef("./data/vector"),
    hasAnyConfig: hasAnyService,
    obsNetwork,
  });

  await writeAtomically(resolveOutputPath(projectRoot, clientStackFile), renderedStack);
  console.log(`Generated ${clientStackFile}`);

  if (enableAlloy) {
    const renderedAlloyConfig = await renderTemplate<AlloyConfigTemplateContext>(alloyTemplatePath, {
      alloyOtlpEndpoint,
    });
    await writeAtomically(resolveOutputPath(projectRoot, alloyConfigFile), renderedAlloyConfig);
    console.log(`Generated ${alloyConfigFile}`);
  }

  if (enableOtelClientCollector) {
    const renderedOtelClientConfig = await renderTemplate<OTelClientConfigTemplateContext>(
      otelClientTemplatePath,
      {
        otelClientOtlpEndpoint,
      },
    );
    await writeAtomically(resolveOutputPath(projectRoot, otelClientConfigFile), renderedOtelClientConfig);
    console.log(`Generated ${otelClientConfigFile}`);
  }

  if (enableFluentBit) {
    const parsedFluentBitOpenSearchEndpoint = parseHttpEndpoint(
      fluentBitOpenSearchEndpoint,
      "FLUENT_BIT_OPENSEARCH_ENDPOINT",
    );
    const renderedFluentBitConfig = await renderTemplate<FluentBitConfigTemplateContext>(
      fluentBitTemplatePath,
      {
        fluentBitOpenSearchHost: parsedFluentBitOpenSearchEndpoint.host,
        fluentBitOpenSearchPort: parsedFluentBitOpenSearchEndpoint.port,
        fluentBitOpenSearchTls: parsedFluentBitOpenSearchEndpoint.tls,
      },
    );
    await writeAtomically(resolveOutputPath(projectRoot, fluentBitConfigFile), renderedFluentBitConfig);
    console.log(`Generated ${fluentBitConfigFile}`);
  }

  if (enableFilebeat) {
    const renderedFilebeatConfig = await renderTemplate<FilebeatConfigTemplateContext>(filebeatTemplatePath, {
      filebeatOpenSearchEndpoint,
    });
    await writeAtomically(resolveOutputPath(projectRoot, filebeatConfigFile), renderedFilebeatConfig);
    console.log(`Generated ${filebeatConfigFile}`);
  }

  if (enableVector) {
    const renderedVectorConfig = await renderTemplate<VectorConfigTemplateContext>(vectorTemplatePath, {
      vectorOpenSearchEndpoint,
    });
    await writeAtomically(resolveOutputPath(projectRoot, vectorConfigFile), renderedVectorConfig);
    console.log(`Generated ${vectorConfigFile}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
