LOKI_IMAGE ?= grafana/loki:3.0.0
HAPROXY_IMAGE ?= haproxy:2.9-alpine
GRAFANA_IMAGE ?= grafana/grafana:11.1.0
GRAFANA_USER ?= 1000:1000
PROMETHEUS_IMAGE ?= prom/prometheus:v2.54.1
PROMETHEUS_USER ?= 1000:1000
OTEL_COLLECTOR_IMAGE ?= otel/opentelemetry-collector-contrib:0.112.0
LOKI_DATA_PATH ?= ./data/loki
HAPROXY_CONFIG_FILE ?= config/haproxy.cfg
OTEL_COLLECTOR_CONFIG_FILE ?= config/otel-collector-config.yaml
GRAFANA_DATASOURCES_FILE ?= config/grafana/provisioning/datasources/datasources.yml

OPENSEARCH_MAJOR ?= 2
OPENSEARCH_VERSION ?=
OPENSEARCH_NODES ?= 1

ENABLE_OPENSEARCH ?= true
ENABLE_LOKI ?= false
ENABLE_GRAFANA ?= true
ENABLE_HAPROXY ?= true
ENABLE_PROMETHEUS ?= true
ENABLE_OTEL ?= true
