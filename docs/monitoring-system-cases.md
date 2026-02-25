# Monitoring System Cases (Service + Client Combinations)

이 문서는 현재 스택 옵션(`make stack`, `make client-stack`)을 조합해서 만들 수 있는 대표 모니터링 구축 케이스를 정리합니다.

## Quick Rule

- 서비스 백엔드 선택:
  - `ENABLE_OPENSEARCH=true|false`
  - `ENABLE_LOKI=true|false`
  - 최소 하나는 `true`여야 함
- 클라이언트 선택:
  - `ENABLE_CLIENT_ALLOY`
  - `ENABLE_CLIENT_OTELCOL`
  - `ENABLE_CLIENT_FLUENT_BIT`
  - `ENABLE_CLIENT_FILEBEAT`
  - `ENABLE_CLIENT_VECTOR`
  - 최소 하나는 `true`여야 함

## Compatibility Matrix

- `Alloy`, `OTel Client Collector`:
  - 서버 `otel-collector`로 OTLP 전송
  - OpenSearch/Loki/둘 다 백엔드와 호환
- `Fluent Bit`, `Filebeat`, `Vector`:
  - 현재 템플릿 기준 OpenSearch 계열 endpoint로 전송
  - Loki-only 백엔드에는 직접 호환되지 않음

## Common Deploy Flow

```bash
npm install
make stack ...옵션...
make deploy
make client-stack ...옵션...
docker stack deploy -c deploy/stack.client.yml <CLIENT_STACK_NAME>
```

- 기본 클라이언트 네트워크는 `OBS_NETWORK=<STACK_NAME>_observability`
- 서버 `STACK_NAME=obs`라면 기본값은 `obs_observability`

## Case 1: OpenSearch + Alloy (기본 권장)

용도:
- 가장 단순한 기본 구성
- 앱 OTLP(log/metric/trace)를 중앙 수집

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=false
make deploy
make client-stack ENABLE_CLIENT_ALLOY=true ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=false ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=false
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 2: Loki + Alloy (로그를 Loki 중심으로)

용도:
- 로그 저장소를 Loki로 단순화
- OTLP 기반 수집만 운영할 때

```bash
make stack ENABLE_OPENSEARCH=false ENABLE_LOKI=true
make deploy
make client-stack ENABLE_CLIENT_ALLOY=true ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=false ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=false
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 3: OpenSearch + Loki 동시 운영 (마이그레이션/비교)

용도:
- 두 백엔드 동시 저장/검증
- 대시보드/검색 성능 비교

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=true
make deploy
make client-stack ENABLE_CLIENT_ALLOY=true ENABLE_CLIENT_OTELCOL=true ENABLE_CLIENT_FLUENT_BIT=false ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=false
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 4: OpenSearch + Fluent Bit (호스트 로그 중심)

용도:
- `/var/log/*.log` 수집 중심
- 경량 로그 포워딩

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=false
make deploy
make client-stack ENABLE_CLIENT_ALLOY=false ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=true ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=false FLUENT_BIT_OPENSEARCH_ENDPOINT=http://opensearch:9200
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 5: OpenSearch + Filebeat (Elastic/Beats 운영팀 친화)

용도:
- Beats 기반 운영 표준 사용
- 파일 로그 수집 + OpenSearch 적재

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=false
make deploy
make client-stack ENABLE_CLIENT_ALLOY=false ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=false ENABLE_CLIENT_FILEBEAT=true ENABLE_CLIENT_VECTOR=false FILEBEAT_OPENSEARCH_ENDPOINT=http://opensearch:9200
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 6: OpenSearch + Vector (고성능 파이프라인)

용도:
- 고성능/고유연성 수집 파이프라인
- 파일 로그 중심 처리

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=false
make deploy
make client-stack ENABLE_CLIENT_ALLOY=false ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=false ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=true VECTOR_OPENSEARCH_ENDPOINT=http://opensearch:9200
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 7: Hybrid (Alloy + Fluent Bit 동시)

용도:
- 앱 OTLP 텔레메트리 + 호스트 파일 로그 동시 수집
- 팀/워크로드별 수집 경로 분리

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=false
make deploy
make client-stack ENABLE_CLIENT_ALLOY=true ENABLE_CLIENT_OTELCOL=false ENABLE_CLIENT_FLUENT_BIT=true ENABLE_CLIENT_FILEBEAT=false ENABLE_CLIENT_VECTOR=false FLUENT_BIT_OPENSEARCH_ENDPOINT=http://opensearch:9200
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Case 8: Full Collector Lab (거의 모든 클라이언트 테스트)

용도:
- 수집기 기능 비교/벤치마크
- 운영 전 PoC

```bash
make stack ENABLE_OPENSEARCH=true ENABLE_LOKI=true
make deploy
make client-stack ENABLE_CLIENT_ALLOY=true ENABLE_CLIENT_OTELCOL=true ENABLE_CLIENT_FLUENT_BIT=true ENABLE_CLIENT_FILEBEAT=true ENABLE_CLIENT_VECTOR=true FLUENT_BIT_OPENSEARCH_ENDPOINT=http://opensearch:9200 FILEBEAT_OPENSEARCH_ENDPOINT=http://opensearch:9200 VECTOR_OPENSEARCH_ENDPOINT=http://opensearch:9200
docker stack deploy -c deploy/stack.client.yml obs-client
```

## Notes

- OpenSearch를 끄는(`ENABLE_OPENSEARCH=false`) 경우:
  - `Fluent Bit`, `Filebeat`, `Vector`는 기본 템플릿 기준 직접 타겟이 없어 비권장
  - `Alloy`, `OTel Client Collector` 위주로 구성 권장
- 클라이언트 endpoint 기본값:
  - `CLIENT_OTLP_ENDPOINT=http://otel-collector:4318`
  - `CLIENT_OPENSEARCH_ENDPOINT=http://opensearch:9200`
- 데이터 경로:
  - OpenSearch: `./data/opensearch*`
  - Loki: `./data/loki`
  - Prometheus: `./data/prometheus`
  - Grafana: `./data/grafana`
