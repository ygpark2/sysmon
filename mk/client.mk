ALLOY_IMAGE ?= grafana/alloy:v1.5.1
ALLOY_OTLP_ENDPOINT ?= http://otel-collector:4318
ALLOY_CONFIG_FILE ?= config/alloy-client-config.alloy
OTEL_CLIENT_IMAGE ?= otel/opentelemetry-collector-contrib:0.112.0
OTEL_CLIENT_CONFIG_FILE ?= config/otel-client-collector-config.yaml
FLUENT_BIT_IMAGE ?= fluent/fluent-bit:3.1.9
FLUENT_BIT_CONFIG_FILE ?= config/fluent-bit-client.conf
FILEBEAT_IMAGE ?= docker.elastic.co/beats/filebeat:8.15.2
FILEBEAT_CONFIG_FILE ?= config/filebeat-client.yml
VECTOR_IMAGE ?= timberio/vector:0.42.0-alpine
VECTOR_CONFIG_FILE ?= config/vector-client.yaml

ENABLE_CLIENT_ALLOY ?= true
ENABLE_CLIENT_OTELCOL ?= false
ENABLE_CLIENT_FLUENT_BIT ?= false
ENABLE_CLIENT_FILEBEAT ?= false
ENABLE_CLIENT_VECTOR ?= false

CLIENT_OTLP_ENDPOINT ?= http://otel-collector:4318
CLIENT_OPENSEARCH_ENDPOINT ?= http://opensearch:9200
OTEL_CLIENT_OTLP_ENDPOINT ?= $(CLIENT_OTLP_ENDPOINT)
FLUENT_BIT_OPENSEARCH_ENDPOINT ?= $(CLIENT_OPENSEARCH_ENDPOINT)
FILEBEAT_OPENSEARCH_ENDPOINT ?= $(CLIENT_OPENSEARCH_ENDPOINT)
VECTOR_OPENSEARCH_ENDPOINT ?= $(CLIENT_OPENSEARCH_ENDPOINT)
