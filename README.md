# AOBS Stack

Generate Docker Swarm stack files from TypeScript + Handlebars templates, controlling log backends (OpenSearch/Loki), OpenSearch version, and per-service enablement.

**Docs**

- Monitoring system composition cases: `docs/monitoring-system-cases.md`

**Default Config Files**

- `mk/base.mk`: common stack defaults
- `mk/stack.mk`: server stack defaults
- `mk/client.mk`: client stack defaults
- `mk/local.mk` (optional): local override file loaded automatically if present
- `.env` (or `ENV_FILE`): loaded last and overrides `mk/*.mk` defaults

**Quick Start**

1. Install dependencies:

```bash
npm --prefix src install
```

2. Generate `deploy/stack.yml` with defaults:

```bash
make stack
```

3. Deploy:

```bash
make deploy
```

4. Generate client collector stack file (`deploy/stack.client.yml`):

```bash
make client-stack
```

**Update Notes**

- `package.json` / `tsconfig.json` are under `src/`, and Make targets run scripts with `npm --prefix src ...`.
- `make stack` / `make client-stack` run `npm --prefix src install` automatically when dependencies are missing.
- `make stack` / `make client-stack` auto-create required data directories under `./data`.
- Generated stack bind-mount paths use `${PROJECT_ROOT}/...`, so `config/` and `data/` are resolved from project root even when stack files are under `deploy/`.
- `config/prometheus.yml` is auto-generated during `make stack` when Prometheus is enabled.
- `logs-<service>` target is available, for example: `make logs-otel-collector`.
- HAProxy support was added for Grafana: with `ENABLE_HAPROXY=true` (default), port `80` proxies to Grafana `3000`.
- `HAPROXY_IMAGE`, `GRAFANA_IMAGE`, `PROMETHEUS_IMAGE`, and `OTEL_COLLECTOR_IMAGE` are configurable.
- `GRAFANA_USER` and `PROMETHEUS_USER` are configurable (`uid:gid`) for bind-mount permission control.
- `GRAFANA_INSTALL_PLUGINS` controls Grafana plugin pre-install list (default includes OpenSearch plugin).
- `OPENSEARCH_INITIAL_ADMIN_PASSWORD` is used for OpenSearch bootstrap.
- `OPENSEARCH_ADMIN_PASSWORD` is used by Grafana/OTel OpenSearch auth and defaults to `OPENSEARCH_INITIAL_ADMIN_PASSWORD` when unset.
- `make stack` generates Grafana datasource provisioning and a default OpenSearch logs dashboard automatically.

**Options**

- Defaults shown below come from `env/base.mk`, `env/stack.mk`, and `env/client.mk`.
- If you want to change any option, declare it in `.env` (or pass another file with `ENV_FILE=...`), because `.env` is loaded last and overrides defaults.

```bash
# .env
STACK_NAME=my-ovs
ENABLE_LOKI=true
OPENSEARCH_NODES=3
CLIENT_OPENSEARCH_ENDPOINT=http://my-opensearch:9200
```

- `STACK_NAME`: Docker stack name (default: `ovs`)
- `ENV_FILE`: override file path loaded last (default: `.env`)
- `OPENSEARCH_MAJOR`: `2` or `3` (default: `2`)
- `OPENSEARCH_VERSION`: override image tag explicitly (optional)
- `OPENSEARCH_NODES`: cluster node count (default: `1`)
- `ENABLE_OPENSEARCH`: enable OpenSearch backend service (default: `true`)
- `ENABLE_LOKI`: enable Loki backend service (default: `false`)
- `LOKI_IMAGE`: Loki image (default: `grafana/loki:3.0.0`)
- `HAPROXY_IMAGE`: HAProxy image for Grafana reverse proxy (default: `haproxy:2.9-alpine`)
- `GRAFANA_IMAGE`: Grafana image (default: `grafana/grafana:11.1.0`)
- `GRAFANA_USER`: Grafana container user uid:gid (default: `1000:1000`)
- `GRAFANA_INSTALL_PLUGINS`: Grafana plugin list for startup install (default: `grafana-opensearch-datasource`)
- `PROMETHEUS_IMAGE`: Prometheus image (default: `prom/prometheus:v2.54.1`)
- `PROMETHEUS_USER`: Prometheus container user uid:gid (default: `1000:1000`)
- `OTEL_COLLECTOR_IMAGE`: OTel Collector image (default: `otel/opentelemetry-collector-contrib:0.112.0`)
- `LOKI_DATA_PATH`: Loki data bind path (default: `./data/loki`)
- `HAPROXY_CONFIG_FILE`: generated HAProxy config path (default: `config/haproxy.cfg`)
- `ENABLE_GRAFANA`: `true|false` (default: `true`)
- `ENABLE_HAPROXY`: enable HAProxy (maps port `80` to Grafana `3000`) (default: `true`)
- `ENABLE_PROMETHEUS`: `true|false` (default: `true`)
- `ENABLE_OTEL`: `true|false` (default: `true`)
- `STACK_FILE`: output file name (default: `deploy/stack.yml`)
- `CLIENT_STACK_FILE`: client output file name (default: `deploy/stack.client.yml`)
- `OTEL_COLLECTOR_CONFIG_FILE`: generated OTel Collector config path (default: `config/otel-collector-config.yaml`)
- `OPENSEARCH_OTEL_ENDPOINT`: OpenSearch endpoint used by OTel exporter (default: `https://opensearch:9200`)
- `OPENSEARCH_OTEL_LOGS_INDEX`: OpenSearch logs index pattern for OTel exporter (default: `ss4o_logs-%{stack}-%{service_name}-%{environment}`)
- `OPENSEARCH_OTEL_LOGS_INDEX_FALLBACK`: fallback value used when an OTel log index placeholder is missing (default: `default`)
- `GRAFANA_DATASOURCES_FILE`: generated Grafana datasource provisioning file (default: `config/grafana/provisioning/datasources/datasources.yml`)
- `GRAFANA_DASHBOARDS_PROVIDER_FILE`: generated Grafana dashboard provider file (default: `config/grafana/provisioning/dashboards/dashboards.yml`)
- `GRAFANA_STAGING_LOGS_DASHBOARD_FILE`: generated Grafana staging logs dashboard file (default: `config/grafana/provisioning/dashboards/json/jts-staging-logs-overview.json`)
- `GRAFANA_PROD_LOGS_DASHBOARD_FILE`: generated Grafana prod logs dashboard file (default: `config/grafana/provisioning/dashboards/json/jts-prod-logs-overview.json`)
- `GRAFANA_STAGING_METRICS_DASHBOARD_FILE`: generated Grafana staging metrics dashboard file (default: `config/grafana/provisioning/dashboards/json/jts-staging-metrics-overview.json`)
- `GRAFANA_PROD_METRICS_DASHBOARD_FILE`: generated Grafana prod metrics dashboard file (default: `config/grafana/provisioning/dashboards/json/jts-prod-metrics-overview.json`)
- `GRAFANA_OPENSEARCH_LOGS_INDEX`: Grafana OpenSearch logs index pattern (default: `ss4o_logs-*`)
- `OVS_NETWORK`: external Swarm network for client stack (default: `<STACK_NAME>_observability`)
- `ALLOY_IMAGE`: Alloy image (default: `grafana/alloy:v1.5.1`)
- `ALLOY_OTLP_ENDPOINT`: upstream OTLP/HTTP endpoint (default: `http://otel-collector:4318`)
- `ALLOY_CONFIG_FILE`: generated Alloy config path (default: `config/alloy-client-config.alloy`)
- `ENABLE_CLIENT_ALLOY`: include Alloy in client stack (default: `true`)
- `ENABLE_CLIENT_OTELCOL`: include OpenTelemetry Collector in client stack (default: `false`)
- `ENABLE_CLIENT_FLUENT_BIT`: include Fluent Bit in client stack (default: `false`)
- `ENABLE_CLIENT_FILEBEAT`: include Filebeat in client stack (default: `false`)
- `ENABLE_CLIENT_VECTOR`: include Vector in client stack (default: `false`)
- `CLIENT_OTLP_ENDPOINT`: shared OTLP upstream endpoint default for Alloy/OTel client (default: `http://otel-collector:4318`)
- `CLIENT_OPENSEARCH_ENDPOINT`: shared OpenSearch endpoint default for Fluent Bit/Filebeat/Vector (default: `http://opensearch:9200`)
- `OTEL_CLIENT_IMAGE`: OTel client image (default: `otel/opentelemetry-collector-contrib:0.112.0`)
- `OTEL_CLIENT_OTLP_ENDPOINT`: OTel client upstream endpoint (default: `$(CLIENT_OTLP_ENDPOINT)`)
- `OTEL_CLIENT_CONFIG_FILE`: generated OTel client config path (default: `config/otel-client-collector-config.yaml`)
- `FLUENT_BIT_IMAGE`: Fluent Bit image (default: `fluent/fluent-bit:3.1.9`)
- `FLUENT_BIT_OPENSEARCH_ENDPOINT`: Fluent Bit OpenSearch endpoint (default: `$(CLIENT_OPENSEARCH_ENDPOINT)`)
- `FLUENT_BIT_CONFIG_FILE`: generated Fluent Bit config path (default: `config/fluent-bit-client.conf`)
- `FILEBEAT_IMAGE`: Filebeat image (default: `docker.elastic.co/beats/filebeat:8.15.2`)
- `FILEBEAT_OPENSEARCH_ENDPOINT`: Filebeat OpenSearch endpoint (default: `$(CLIENT_OPENSEARCH_ENDPOINT)`)
- `FILEBEAT_CONFIG_FILE`: generated Filebeat config path (default: `config/filebeat-client.yml`)
- `VECTOR_IMAGE`: Vector image (default: `timberio/vector:0.42.0-alpine`)
- `VECTOR_OPENSEARCH_ENDPOINT`: Vector OpenSearch endpoint (default: `$(CLIENT_OPENSEARCH_ENDPOINT)`)
- `VECTOR_CONFIG_FILE`: generated Vector config path (default: `config/vector-client.yaml`)

Persistent service data is bind-mounted under `./data`:
- OpenSearch nodes: `./data/opensearch1`, `./data/opensearch2`, ...
- Loki: `./data/loki`
- Prometheus: `./data/prometheus`
- Grafana: `./data/grafana`

You can enable `ENABLE_OPENSEARCH`, `ENABLE_LOKI`, or both. At least one of them must be enabled.

**Templates**

- Main stack template: `src/templates/stack.yml.hbs`
- HAProxy template: `src/templates/haproxy.cfg.hbs`
- OTel Collector template: `src/templates/otel-collector-config.yaml.hbs`
- Grafana datasources template: `src/templates/grafana-datasources.yml.hbs`
- Grafana dashboard provider template: `src/templates/grafana-dashboards.yml.hbs`
- Grafana logs dashboard template: `src/templates/grafana-logs-dashboard.json.hbs`
- Grafana Prometheus dashboard template: `src/templates/grafana-prometheus-dashboard.json.hbs`
- Client stack template: `src/templates/stack.client.yml.hbs`
- Alloy client config template: `src/templates/alloy-client-config.alloy.hbs`
- OTel client config template: `src/templates/otel-client-collector-config.yaml.hbs`
- Fluent Bit client config template: `src/templates/fluent-bit-client.conf.hbs`
- Filebeat client config template: `src/templates/filebeat-client.yml.hbs`
- Vector client config template: `src/templates/vector-client.yaml.hbs`

**Examples**

Generate OpenSearch 2 stack:

```bash
make stack OPENSEARCH_MAJOR=2
```

Generate Loki-only stack:

```bash
make stack ENABLE_OPENSEARCH=false ENABLE_LOKI=true
```

Generate both OpenSearch and Loki:

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=true
```

Generate OpenSearch 3 stack:

```bash
make stack OPENSEARCH_MAJOR=3
```

Generate a 3-node OpenSearch cluster:

```bash
make stack OPENSEARCH_NODES=3
```

Disable some services:

```bash
make stack ENABLE_GRAFANA=false ENABLE_PROMETHEUS=false
```

Expose Grafana on port 80 via HAProxy (default behavior):

```bash
make stack ENABLE_HAPROXY=true
```

Use a specific OpenSearch tag:

```bash
make stack OPENSEARCH_VERSION=2.11.0
```

Deploy with custom output file:

```bash
make deploy STACK_FILE=deploy/stack.yml
```

Generate client stack for a specific network and endpoint:

```bash
make client-stack OVS_NETWORK=ovs_observability ALLOY_OTLP_ENDPOINT=http://otel-collector:4318
```

Generate client stack with multiple optional collectors:

```bash
make client-stack ENABLE_CLIENT_OTELCOL=true ENABLE_CLIENT_FLUENT_BIT=true ENABLE_CLIENT_FILEBEAT=true ENABLE_CLIENT_VECTOR=true
```
