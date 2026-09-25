import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";

type OpenSearchNode = {
  name: string;
  dataPath: string;
  exposePorts: boolean;
};

type StackTemplateContext = {
  enableOpenSearch: boolean;
  enableLoki: boolean;
  enableGrafana: boolean;
  enableHaproxy: boolean;
  enablePrometheus: boolean;
  enableOtel: boolean;
  isSingleNode: boolean;
  openSearchImageTag: string;
  openSearchSeedHosts: string;
  openSearchMasterNodes: string;
  openSearchSingleNodeDataPath: string;
  openSearchNodes: OpenSearchNode[];
  lokiImage: string;
  haproxyImage: string;
  grafanaImage: string;
  grafanaUser: string;
  prometheusImage: string;
  prometheusUser: string;
  otelCollectorImage: string;
  lokiDataPath: string;
  haproxyConfigFile: string;
  otelCollectorConfigFile: string;
  grafanaDataPath: string;
  grafanaProvisioningPath: string;
  prometheusConfigFile: string;
  prometheusDataPath: string;
  hasGrafanaDependsOn: boolean;
  grafanaDependsOn: string[];
  hasHaproxyDependsOn: boolean;
  haproxyDependsOn: string[];
  hasOtelDependsOn: boolean;
  otelDependsOn: string[];
};

type HaproxyTemplateContext = {
  haproxyDomain: string;
};

type OTelCollectorTemplateContext = {
  isOpenSearchBackend: boolean;
  isLokiBackend: boolean;
  logExporters: string[];
  openSearchOtelEndpoint: string;
  openSearchLogsIndex: string;
  openSearchLogsIndexFallback: string;
};

type GrafanaDatasourceTemplateContext = {
  isOpenSearchBackend: boolean;
  isLokiBackend: boolean;
  openSearchLogsIndex: string;
  openSearchVersion: string;
};

type GrafanaDashboardProviderTemplateContext = {
  dashboardPath: string;
};

type GrafanaLogsDashboardTemplateContext = {
  openSearchLogsDatasource: string;
  dashboardUid: string;
  dashboardTitle: string;
};

type GrafanaMetricsDashboardTemplateContext = {
  prometheusDatasource: string;
  openSearchLogsDatasource: string;
  dashboardUid: string;
  dashboardTitle: string;
};

type TelegramReceiver = {
  uid: string;
  chatId: string;
};

type GrafanaAlertingTemplateContext = {
  telegramReceivers: TelegramReceiver[];
};

function parseBoolean(
  value: string | undefined,
  key: string,
  defaultValue: boolean,
): boolean {
  const normalized = (value ?? `${defaultValue}`).toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean: ${value}. ${key} must be true/false.`);
}

function parsePositiveInteger(
  value: string | undefined,
  key: string,
  defaultValue: number,
): number {
  const resolved = value ?? `${defaultValue}`;
  if (!/^[0-9]+$/.test(resolved)) {
    throw new Error(`${key} must be a positive integer.`);
  }

  const parsed = Number.parseInt(resolved, 10);
  if (parsed < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}

function resolveOpenSearchImageTag(
  major: string | undefined,
  version: string | undefined,
): string {
  if (version && version.trim().length > 0) {
    return version.trim();
  }

  switch (major ?? "2") {
    case "2":
      return "2.11.0";
    case "3":
      return "3.0.0";
    default:
      throw new Error(`Unsupported OPENSEARCH_MAJOR: ${major}. Use 2 or 3.`);
  }
}

async function renderTemplate(
  templatePath: string,
  context: StackTemplateContext,
): Promise<string> {
  const templateSource = await fs.readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSource, { noEscape: true });
  return `${template(context).trimEnd()}\n`;
}

async function renderGenericTemplate<TContext>(
  templatePath: string,
  context: TContext,
): Promise<string> {
  const templateSource = await fs.readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSource, { noEscape: true });
  return `${template(context).trimEnd()}\n`;
}

async function writeAtomically(
  targetFile: string,
  content: string,
): Promise<void> {
  const directory = path.dirname(targetFile);
  await fs.mkdir(directory, { recursive: true });

  const tempFile = `${targetFile}.tmp`;
  await fs.writeFile(tempFile, content, "utf8");
  await fs.rename(tempFile, targetFile);
}

async function removeIfExists(targetFile: string): Promise<void> {
  try {
    await fs.unlink(targetFile);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function resolveOutputPath(projectRoot: string, outputPath: string): string {
  return path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(projectRoot, outputPath);
}

function toComposePathRef(outputPath: string): string {
  if (path.isAbsolute(outputPath)) {
    return outputPath;
  }
  const normalized = outputPath.replace(/^[.][\\/]/, "").replace(/\\/g, "/");
  return normalized.length > 0
    ? `\${PROJECT_ROOT}/${normalized}`
    : "${PROJECT_ROOT}";
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot =
    process.env.PROJECT_ROOT ?? path.resolve(scriptDir, "../..");
  const stackFile = process.env.STACK_FILE ?? "deploy/stack.yml";
  const enableOpenSearch = parseBoolean(
    process.env.ENABLE_OPENSEARCH,
    "ENABLE_OPENSEARCH",
    true,
  );
  const enableLoki = parseBoolean(
    process.env.ENABLE_LOKI,
    "ENABLE_LOKI",
    false,
  );
  if (!enableOpenSearch && !enableLoki) {
    throw new Error(
      "At least one backend must be enabled: ENABLE_OPENSEARCH or ENABLE_LOKI.",
    );
  }
  const enableGrafana = parseBoolean(
    process.env.ENABLE_GRAFANA,
    "ENABLE_GRAFANA",
    true,
  );
  const enableHaproxyInput = parseBoolean(
    process.env.ENABLE_HAPROXY,
    "ENABLE_HAPROXY",
    true,
  );
  const enableHaproxy = enableGrafana && enableHaproxyInput;
  const enablePrometheus = parseBoolean(
    process.env.ENABLE_PROMETHEUS,
    "ENABLE_PROMETHEUS",
    true,
  );
  const enableOtel = parseBoolean(process.env.ENABLE_OTEL, "ENABLE_OTEL", true);
  const lokiImage = process.env.LOKI_IMAGE ?? "grafana/loki:3.0.0";
  const haproxyImage = process.env.HAPROXY_IMAGE ?? "haproxy:2.9-alpine";
  const haproxyDomain = process.env.HAPROXY_DOMAIN ?? "ovs.yeto.it.kr";
  const grafanaImage = process.env.GRAFANA_IMAGE ?? "grafana/grafana:11.1.0";
  const grafanaUser = process.env.GRAFANA_USER ?? "1000:1000";
  const prometheusImage =
    process.env.PROMETHEUS_IMAGE ?? "prom/prometheus:v2.54.1";
  const prometheusUser = process.env.PROMETHEUS_USER ?? "1000:1000";
  const otelCollectorImage =
    process.env.OTEL_COLLECTOR_IMAGE ??
    "otel/opentelemetry-collector-contrib:0.112.0";
  const lokiDataPath = process.env.LOKI_DATA_PATH ?? "./data/loki";
  const haproxyConfigFile =
    process.env.HAPROXY_CONFIG_FILE ?? "config/haproxy.cfg";
  const otelCollectorConfigFile =
    process.env.OTEL_COLLECTOR_CONFIG_FILE ??
    "config/otel-collector-config.yaml";
  const openSearchOtelEndpoint =
    process.env.OPENSEARCH_OTEL_ENDPOINT ?? "https://opensearch:9200";
  const openSearchLogsIndex =
    process.env.OPENSEARCH_OTEL_LOGS_INDEX ??
    "ss4o_logs-%{stack}-%{service_name}-%{environment}";
  const openSearchLogsIndexFallback =
    process.env.OPENSEARCH_OTEL_LOGS_INDEX_FALLBACK ?? "default";
  const grafanaDatasourcesFile =
    process.env.GRAFANA_DATASOURCES_FILE ??
    "config/grafana/provisioning/datasources/datasources.yml";
  const grafanaDashboardsProviderFile =
    process.env.GRAFANA_DASHBOARDS_PROVIDER_FILE ??
    "config/grafana/provisioning/dashboards/dashboards.yml";
  const grafanaLogsDashboardFile =
    process.env.GRAFANA_LOGS_DASHBOARD_FILE ??
    "config/grafana/provisioning/dashboards/json/jungto-logs-overview.json";
  const grafanaMetricsDashboardFile =
    process.env.GRAFANA_METRICS_DASHBOARD_FILE ??
    "config/grafana/provisioning/dashboards/json/jungto-metrics-overview.json";
  const grafanaOpenSearchLogsIndex =
    process.env.GRAFANA_OPENSEARCH_LOGS_INDEX ?? "ss4o_logs-*";
  const grafanaAlertingFile =
    process.env.GRAFANA_ALERTING_FILE ??
    "config/grafana/provisioning/alerting/alerting.yml";
  const telegramBotToken = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const rawTelegramChatIds =
    process.env.TELEGRAM_CHAT_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "";
  const parsedTelegramChatIds = rawTelegramChatIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  const hasTelegramCredentials =
    telegramBotToken.length > 0 && parsedTelegramChatIds.length > 0;

  const enableTelegramAlertInput = process.env.ENABLE_TELEGRAM_ALERT;
  const enableTelegramAlert =
    enableTelegramAlertInput !== undefined && enableTelegramAlertInput !== ""
      ? parseBoolean(enableTelegramAlertInput, "ENABLE_TELEGRAM_ALERT", false) &&
        hasTelegramCredentials
      : hasTelegramCredentials;

  const openSearchNodesCount = enableOpenSearch
    ? parsePositiveInteger(process.env.OPENSEARCH_NODES, "OPENSEARCH_NODES", 1)
    : 1;
  const isSingleNode = openSearchNodesCount === 1;
  const openSearchImageTag = enableOpenSearch
    ? resolveOpenSearchImageTag(
        process.env.OPENSEARCH_MAJOR,
        process.env.OPENSEARCH_VERSION,
      )
    : "";

  const openSearchNames = Array.from(
    { length: openSearchNodesCount },
    (_, index) => `opensearch${index + 1}`,
  );

  const openSearchNodes: OpenSearchNode[] = isSingleNode
    ? []
    : openSearchNames.map((name, index) => ({
        name,
        dataPath: toComposePathRef(`./data/${name}`),
        exposePorts: index === 0,
      }));

  const backendDependencyNames: string[] = [];
  if (enableOpenSearch) {
    backendDependencyNames.push(isSingleNode ? "opensearch" : "opensearch1");
  }
  if (enableLoki) {
    backendDependencyNames.push("loki");
  }

  const grafanaDependsOn: string[] = [];
  if (enablePrometheus) {
    grafanaDependsOn.push("prometheus");
  }
  grafanaDependsOn.push(...backendDependencyNames);

  const otelDependsOn: string[] = [];
  otelDependsOn.push(...backendDependencyNames);
  if (enablePrometheus) {
    otelDependsOn.push("prometheus");
  }
  const haproxyDependsOn: string[] = enableHaproxy ? ["grafana"] : [];

  const context: StackTemplateContext = {
    enableOpenSearch,
    enableLoki,
    enableGrafana,
    enableHaproxy,
    enablePrometheus,
    enableOtel,
    isSingleNode,
    openSearchImageTag,
    openSearchSeedHosts: openSearchNames.join(","),
    openSearchMasterNodes: openSearchNames.join(","),
    openSearchSingleNodeDataPath: toComposePathRef("./data/opensearch1"),
    openSearchNodes,
    lokiImage,
    haproxyImage,
    grafanaImage,
    grafanaUser,
    prometheusImage,
    prometheusUser,
    otelCollectorImage,
    lokiDataPath: toComposePathRef(lokiDataPath),
    haproxyConfigFile: toComposePathRef(haproxyConfigFile),
    otelCollectorConfigFile: toComposePathRef(otelCollectorConfigFile),
    grafanaDataPath: toComposePathRef("./data/grafana"),
    grafanaProvisioningPath: toComposePathRef("./config/grafana/provisioning"),
    prometheusConfigFile: toComposePathRef("./config/prometheus.yml"),
    prometheusDataPath: toComposePathRef("./data/prometheus"),
    hasGrafanaDependsOn: grafanaDependsOn.length > 0,
    grafanaDependsOn,
    hasHaproxyDependsOn: haproxyDependsOn.length > 0,
    haproxyDependsOn,
    hasOtelDependsOn: otelDependsOn.length > 0,
    otelDependsOn,
  };

  const templatePath = path.resolve(scriptDir, "../templates/stack.yml.hbs");
  const rendered = await renderTemplate(templatePath, context);
  await writeAtomically(resolveOutputPath(projectRoot, stackFile), rendered);
  console.log(`Generated ${stackFile}`);

  if (enablePrometheus) {
    const prometheusTemplatePath = path.resolve(
      scriptDir,
      "../templates/prometheus.yml.hbs",
    );
    const renderedPrometheusConfig = await renderGenericTemplate<
      Record<string, never>
    >(prometheusTemplatePath, {});
    const prometheusConfigFile = "config/prometheus.yml";
    await writeAtomically(
      resolveOutputPath(projectRoot, prometheusConfigFile),
      renderedPrometheusConfig,
    );
    console.log(`Generated ${prometheusConfigFile}`);
  }

  if (enableHaproxy) {
    const haproxyTemplatePath = path.resolve(
      scriptDir,
      "../templates/haproxy.cfg.hbs",
    );
    const renderedHaproxyConfig =
      await renderGenericTemplate<HaproxyTemplateContext>(haproxyTemplatePath, {
        haproxyDomain,
      });
    await writeAtomically(
      resolveOutputPath(projectRoot, haproxyConfigFile),
      renderedHaproxyConfig,
    );
    console.log(`Generated ${haproxyConfigFile}`);
  }

  if (enableOtel) {
    const otelTemplatePath = path.resolve(
      scriptDir,
      "../templates/otel-collector-config.yaml.hbs",
    );
    const renderedOtelConfig =
      await renderGenericTemplate<OTelCollectorTemplateContext>(
        otelTemplatePath,
        {
          isOpenSearchBackend: enableOpenSearch,
          isLokiBackend: enableLoki,
          logExporters: [
            ...(enableOpenSearch ? ["opensearch"] : []),
            ...(enableLoki ? ["loki"] : []),
          ],
          openSearchOtelEndpoint,
          openSearchLogsIndex,
          openSearchLogsIndexFallback,
        },
      );
    await writeAtomically(
      resolveOutputPath(projectRoot, otelCollectorConfigFile),
      renderedOtelConfig,
    );
    console.log(`Generated ${otelCollectorConfigFile}`);
  }

  if (enableGrafana) {
    const grafanaDatasourceTemplatePath = path.resolve(
      scriptDir,
      "../templates/grafana-datasources.yml.hbs",
    );
    const grafanaDashboardProviderTemplatePath = path.resolve(
      scriptDir,
      "../templates/grafana-dashboards.yml.hbs",
    );
    const grafanaLogsDashboardTemplatePath = path.resolve(
      scriptDir,
      "../templates/grafana-logs-dashboard.json.hbs",
    );
    const grafanaMetricsDashboardTemplatePath = path.resolve(
      scriptDir,
      "../templates/grafana-prometheus-dashboard.json.hbs",
    );
    const grafanaAlertingTemplatePath = path.resolve(
      scriptDir,
      "../templates/grafana-alerting.yml.hbs",
    );

    const renderedGrafanaDatasource =
      await renderGenericTemplate<GrafanaDatasourceTemplateContext>(
        grafanaDatasourceTemplatePath,
        {
          isOpenSearchBackend: enableOpenSearch,
          isLokiBackend: enableLoki,
          openSearchLogsIndex: grafanaOpenSearchLogsIndex,
          openSearchVersion: openSearchImageTag,
        },
      );
    await writeAtomically(
      resolveOutputPath(projectRoot, grafanaDatasourcesFile),
      renderedGrafanaDatasource,
    );
    console.log(`Generated ${grafanaDatasourcesFile}`);

    const renderedGrafanaDashboardProvider =
      await renderGenericTemplate<GrafanaDashboardProviderTemplateContext>(
        grafanaDashboardProviderTemplatePath,
        {
          dashboardPath: "/etc/grafana/provisioning/dashboards/json",
        },
      );
    await writeAtomically(
      resolveOutputPath(projectRoot, grafanaDashboardsProviderFile),
      renderedGrafanaDashboardProvider,
    );
    console.log(`Generated ${grafanaDashboardsProviderFile}`);

    const logsDashboardTarget = resolveOutputPath(
      projectRoot,
      grafanaLogsDashboardFile,
    );
    const metricsDashboardTarget = resolveOutputPath(
      projectRoot,
      grafanaMetricsDashboardFile,
    );
    if (enableOpenSearch) {
      const renderedLogsDashboard =
        await renderGenericTemplate<GrafanaLogsDashboardTemplateContext>(
          grafanaLogsDashboardTemplatePath,
          {
            openSearchLogsDatasource: "OpenSearch",
            dashboardUid: "jungto-logs-overview",
            dashboardTitle: "Jungto Logs Overview",
          },
        );
      await writeAtomically(logsDashboardTarget, renderedLogsDashboard);
      console.log(`Generated ${grafanaLogsDashboardFile}`);
    } else {
      await removeIfExists(logsDashboardTarget);
    }

    if (enablePrometheus) {
      const renderedMetricsDashboard =
        await renderGenericTemplate<GrafanaMetricsDashboardTemplateContext>(
          grafanaMetricsDashboardTemplatePath,
          {
            prometheusDatasource: "Prometheus",
            openSearchLogsDatasource: "OpenSearch",
            dashboardUid: "jungto-metrics-overview",
            dashboardTitle: "Jungto Metrics Overview",
          },
        );
      await writeAtomically(metricsDashboardTarget, renderedMetricsDashboard);
      console.log(`Generated ${grafanaMetricsDashboardFile}`);
    } else {
      await removeIfExists(metricsDashboardTarget);
    }

    const alertingTarget = resolveOutputPath(
      projectRoot,
      grafanaAlertingFile,
    );
    if (enableTelegramAlert && enableOpenSearch) {
      const telegramReceivers: TelegramReceiver[] = parsedTelegramChatIds.map(
        (chatId, index) => ({
          uid: `telegram-receiver-${index + 1}`,
          chatId,
        }),
      );

      const renderedAlerting =
        await renderGenericTemplate<GrafanaAlertingTemplateContext>(
          grafanaAlertingTemplatePath,
          {
            telegramReceivers,
          },
        );
      await writeAtomically(alertingTarget, renderedAlerting);
      console.log(`Generated ${grafanaAlertingFile}`);
    } else {
      await removeIfExists(alertingTarget);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
